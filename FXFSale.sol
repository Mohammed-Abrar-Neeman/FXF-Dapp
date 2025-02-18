// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.25;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FxFSale is
    Pausable,
    Ownable2Step,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // Events
    event SetGuardian(address indexed guardian, bool status);
    event SetTreasury(address indexed treasury);
    event Buy(
        address indexed buyer,
        address indexed token,
        uint256 amount,
        uint256 cost,
        uint256 fxfPrice,
        uint256 amountContributed
    );
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // Errors
    error AMOUNT_MUST_BE_POSITIVE();
    error AMOUNT_MUST_BE_ZERO();
    error INVALID_TOKEN();
    error SOLD_OUT();

    // Variables
    address public immutable ETH; 
    address public immutable WETH;
    address public immutable USDC;
    address public immutable USDT;
    address public treasury;
    address public immutable fxfToken;
    uint256 public tokensSold;
    uint256 public immutable tokensCap;
    uint256 public tokensPrice;

    // Mappings
    mapping(address => uint256) public purchases;
    mapping(address => bool) private _guardians;

    // Chainlink ETH/USD price feed
    AggregatorV3Interface private immutable ethPriceFeed;

    constructor(
        address _ETH,
        address _WETH,
        address _USDC,
        address _USDT,
        address _fxfToken,
        address _ethPriceFeed,
        address _treasury,
        uint256 _tokensCap,
        uint256 _tokensPrice
    ) Ownable(_treasury) {
        require(_ETH != address(0), "Invalid ETH address");
        require(_WETH != address(0), "Invalid WETH address");
        require(_USDC != address(0), "Invalid USDC address");
        require(_USDT != address(0), "Invalid USDT address");
        require(_fxfToken != address(0), "Invalid FxF address");
        require(_ethPriceFeed != address(0), "Invalid price feed address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_tokensCap > 0, "Invalid tokens cap");
        require(_tokensPrice > 0, "Invalid tokens price");

        ETH = _ETH;
        WETH = _WETH;
        USDC = _USDC;
        USDT = _USDT;
        fxfToken = _fxfToken;
        ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
        treasury = _treasury;
        tokensCap = _tokensCap;
        tokensPrice = _tokensPrice;

        _pause(); // Start paused
    }

    /**
     * @notice Function to set a guardian address
     * @param _guardian The guardian address
     * @param _status The status of the guardian
     * @dev Only the owner can call this function
     */
    function setGuardian(address _guardian, bool _status) external onlyOwner {
        require(_guardian != address(0), "Invalid guardian address");
        _guardians[_guardian] = _status;
        emit SetGuardian(_guardian, _status);
    }

    /**
     * @notice Function to set the treasury address
     * @param _treasury The treasury address
     * @dev Only the owner can call this function
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        emit SetTreasury(_treasury);
    }

    /**
     * @notice Rescue accidental tokens that are stuck in the contract
     * @param recipient Treasury address
     * @param token Token address
     * @param value Value to rescue
     * @dev Only treasury multisig can invoke this function
     */
    function rescueTokens(
        address recipient,
        address token,
        uint256 value
    ) external onlyOwner {
        require(recipient != address(0), "recipient is address zero");
        require(value > 0, "value is zero");
        if (token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            uint256 balance = address(this).balance;
            uint256 ethValue = value > balance ? balance : value;
            (bool success, ) = payable(recipient).call{value: ethValue}("");
            require(success, "ETH transfer failed");
        } else {
            uint256 balanceOfToken = IERC20(token).balanceOf(address(this));
            uint256 erc20Value = value;
            if (value > balanceOfToken) {
                erc20Value = balanceOfToken;
            }
            IERC20(token).safeTransfer(recipient, erc20Value);
        }
    }

    /**
     * @notice Unpause the token transferability
     * @dev Only treasury multisig can invoke this function
     */
    function unPause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Pause token transferability
     * @dev Only treasury multisig and guardians can invoke this function
     */
    function pause() external {
        require(
            _msgSender() == owner() || _guardians[_msgSender()],
            "Invalid multisig or guardian"
        );
        _pause();
    }

    /**
     * @notice Unified buy function to handle ETH and ERC20 (WETH, USDC, USDT) payments
     * @param token The token address (use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH)
     * @param amount The amount of tokens sent (set to 0 when paying with ETH)
     */
    function buy(
        address token,
        uint256 amount
    ) external payable whenNotPaused nonReentrant {
        if (token != ETH && token != USDC && token != USDT && token != WETH) revert INVALID_TOKEN();

        uint256 costUSD;
        uint256 ethPrice = getLatestETHPrice(); // ETH price in USD with 8 decimals

        if (token == ETH) {
            // Buying with ETH
            if (msg.value == 0) revert AMOUNT_MUST_BE_POSITIVE();
            costUSD = (msg.value * ethPrice) / 1e8; // Convert WEI -> ETH * USD price, result should have 18 decimals
        } else {
            // Buying with ERC20 tokens
            if (msg.value != 0) revert AMOUNT_MUST_BE_ZERO();
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
            if (token == WETH) {
                costUSD = (amount * ethPrice) / 1e8; // Normalize WETH to 18 decimals
            } else {
                // USDC or USDT
                costUSD = amount * 1e12; // Normalize USDC/USDT to 18 decimals (6 decimals to 18 decimals)
            }
        }

        uint256 remainingUSD = costUSD;
        uint256 totalFxFAmount = 0;
        uint256 weightedPriceSum = 0;

        // Calculate the FxF amount and handle the contribution logic
        uint256 remainingFxF = tokensCap - tokensSold;
        uint256 costPerFxF = (remainingFxF * tokensPrice) / 1e18;

        if (remainingUSD <= costPerFxF) {
            totalFxFAmount = (remainingUSD * 1e18) / tokensPrice;
            tokensSold += totalFxFAmount;
            purchases[_msgSender()] += totalFxFAmount;
            weightedPriceSum += totalFxFAmount * tokensPrice;
            remainingUSD = 0;
        } else {
            totalFxFAmount = (costPerFxF * 1e18) / tokensPrice;
            tokensSold += totalFxFAmount;
            purchases[_msgSender()] += totalFxFAmount;
            weightedPriceSum += totalFxFAmount * tokensPrice;
            remainingUSD -= costPerFxF;
        }

        // Refund logic for excess contribution
        uint256 refundAmount;
        if (remainingUSD > 0) {
            if (token == ETH) {
                refundAmount = (remainingUSD * 1e8) / ethPrice;
                (bool success, ) = _msgSender().call{value: refundAmount}("");
                require(success, "Refund ETH transfer failed");
            } else {
                if (token == WETH) {
                    refundAmount = (remainingUSD * 1e8) / ethPrice;
                } else {
                    refundAmount = remainingUSD / 1e12;
                }
                IERC20(token).safeTransfer(_msgSender(), refundAmount);
            }
        }

        // Transfer tokens to treasury
        if (token == ETH) {
            (bool success, ) = payable(treasury).call{value: address(this).balance}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(treasury, amount - refundAmount);
        }

        // Transfer FxF tokens to the buyer
        IERC20(fxfToken).safeTransfer(_msgSender(), totalFxFAmount);

        // Check if the token sale is sold out
        if (weightedPriceSum == 0 || totalFxFAmount == 0) revert SOLD_OUT();

        // Calculate weighted average price
        uint256 averagePrice = weightedPriceSum / totalFxFAmount;

        // Calculate the amount contributed
        uint256 amountContributed = token == ETH ? msg.value : amount;

        // Emit the Buy event
        emit Buy(
            _msgSender(),
            token,
            totalFxFAmount,
            costUSD - remainingUSD,
            averagePrice,
            amountContributed
        );
    }

    /**
     * @notice Calculate the cost and amount of FxF tokens based on the given contribution
     * @param token The token address (use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH)
     * @param amount The amount of tokens to contribute
     * @return fxfAmount The amount of FxF tokens to receive
     * @return costUSD The cost in USD
     */
    function calculateBuy(
        address token,
        uint256 amount
    )
        external
        view
        whenNotPaused
        returns (uint256 fxfAmount, uint256 costUSD)
    {
        if (token != ETH && token != USDC && token != USDT && token != WETH)
            revert INVALID_TOKEN();

        uint256 ethPrice = getLatestETHPrice(); // ETH price in USD with 8 decimals

        if (token == ETH) {
            // Buying with ETH
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            costUSD = (amount * ethPrice) / 1e8; // Convert WEI -> ETH * USD price, result should have 18 decimals
        } else {
            // Buying with ERC20 tokens
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            if (token == WETH) {
                costUSD = (amount * ethPrice) / 1e8; // Normalize WETH to 18 decimals
            } else {
                // USDC or USDT
                costUSD = amount * 1e12; // Normalize USDC/USDT to 18 decimals (6 decimals to 18 decimals)
            }
        }

        uint256 remainingUSD = costUSD;
        uint256 remainingFxF = tokensCap - tokensSold;
        uint256 costPerFxF = (remainingFxF * tokensPrice) / 1e18;

        if (remainingUSD <= costPerFxF) {
            fxfAmount = (remainingUSD * 1e18) / tokensPrice;
            remainingUSD = 0;
        } else {
            fxfAmount = (costPerFxF * 1e18) / tokensPrice;
            remainingUSD -= costPerFxF;
        }

        if (remainingUSD > 0) {
            costUSD -= remainingUSD;
        }

        return (fxfAmount, costUSD);
    }

    /**
     * @notice Get FxF Token sale data
     * @return _tokensCap The total amount of FxF tokens to be sold
     * @return _price The price of each FxF token in USD
     * @return _availableTokensToBuy The remaining FxF tokens available to buy
     * @return maxEth The maximum ETH required to buy remaining FxF tokens
     * @return maxUsd The maximum USD required to buy remaining FxF tokens
     * @return _paused The current sale status
     */
    function getAggregatedSaleData()
        external
        view
        returns (
            uint256 _tokensCap,
            uint256 _price,
            uint256 _availableTokensToBuy,
            uint256 maxEth,
            uint256 maxUsd,
            bool _paused
        )
    {
        (maxEth, maxUsd) = calculateMaxContribution();
        return (
            tokensCap,
            tokensPrice,
            tokensCap - tokensSold,
            maxEth,
            maxUsd,
            paused()
        );
    }

    /**
     * @notice View authorized guardians
     * @param guardian Guardian address
     */
    function isGuardian(
        address guardian
    ) external view returns (bool guardianStatus) {
        return _guardians[guardian];
    }

    /**
     * @notice Gets the FxF price
     * @return The FxF price in USD
     */
    function getCurrentPrice() external view returns (uint256) {
        if (tokensSold < tokensCap) {
            return tokensPrice;
        }
        revert SOLD_OUT();
    }

    /**
     * @notice Returns the latest ETH price
     * @return The latest ETH price in USD with 8 decimals
     */
    function getLatestETHPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int answer,
            ,
            uint256 updateTime,
            uint80 answeredInRound
        ) = ethPriceFeed.latestRoundData();
        require(answer > 0, "Chainlink price <= 0");
        require(updateTime != 0, "Incomplete round");
        require(answeredInRound >= roundId, "Stale price");
        require(block.timestamp - updateTime < 90 minutes, "Price is outdated");
        return uint256(answer);
    }

    /**
     * @notice Calculate the maximum contribution in ETH and USD for remaining tokens
     * @return maxEth The maximum ETH required to buy remaining FxF tokens
     * @return maxUsd The maximum USD (for USDC/USDT) required to buy remaining FxF tokens
     */
    function calculateMaxContribution()
        public
        view
        returns (uint256 maxEth, uint256 maxUsd)
    {
        uint256 ethPrice = getLatestETHPrice(); // ETH price in USD with 8 decimals
        uint256 remainingTokens = tokensCap - tokensSold;

        // Calculate max contribution in USD
        maxUsd = (remainingTokens * tokensPrice) / 1e18;

        // Convert USD to ETH
        maxEth = (maxUsd * 1e8) / ethPrice;
    }

    /**
     * @notice Updates the price of WLFI tokens
     * @param _newPrice The new price per token in USD (18 decimals)
     * @dev Only owner can call this function
     */
    function updateTokenPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Invalid price");
        uint256 oldPrice = tokensPrice;
        tokensPrice = _newPrice;
        emit TokenPriceUpdated(oldPrice, _newPrice);
    }
}