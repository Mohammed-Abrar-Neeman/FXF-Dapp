// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.25;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts@1.3.0/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts@1.3.0/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Pair.sol";

contract FxFSale is
    VRFConsumerBaseV2Plus,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // Events
    event SetGuardian(address indexed guardian, bool status);

    // Events
    event TokensPurchased(
        address indexed buyer,
        address indexed token,
        uint256 paymentAmount,
        uint256 fxfAmount,
        bool forRaffle,
        uint256 raffleId
    );
    event RaffleCreated(
        uint256 indexed raffleId,
        uint256 ticketPrice,
        uint256 minimumTickets,
        uint256 startTime,
        string prize
    );
    event RaffleTicketIssued(
        uint256 indexed raffleId,
        address indexed buyer,
        uint256 ticketNumber
    );
    event RaffleWinnerSelected(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 winningTicket
    );
    event SetTreasury(address indexed newTreasury);
    event VestingScheduleCreated(
        address indexed beneficiary, 
        uint256 amount, 
        uint256 startTime, 
        uint256 duration,
        uint256 indexed raffleId
    );
    event TokensVested(
        address indexed beneficiary, 
        uint256 amount,
        uint256 indexed raffleId
    );

    // Errors
    error AMOUNT_MUST_BE_POSITIVE();
    error AMOUNT_MUST_BE_ZERO();
    error INVALID_TOKEN();

    // Structs
    struct Raffle {
        uint256 ticketPrice;      // Price in FXF tokens
        uint256 minimumTickets;   // Minimum number of tickets that need to be sold
        uint256 startTime;        // Start time of the raffle
        string prize;             // Prize description
        string imageURL;          // image url
        bool completed;           // Whether raffle is completed
        uint256 totalTickets;     // Total tickets sold
        uint256 totalAmount;      // Total amount collected from ticket sales
        address winner;           // Winner address
        uint256 winningTicket;    // Winning ticket number
        mapping(uint256 => address) ticketOwners;  // Ticket number to owner mapping
        
        // Add payment tracking
        uint256 totalEthReceived;    // Total ETH received for this raffle
        uint256 totalUsdtReceived;   // Total USDT received for this raffle
        uint256 totalUsdcReceived;   // Total USDC received for this raffle
    }

    // Add event for payment tracking
    event RafflePaymentReceived(
        uint256 indexed raffleId,
        address indexed token,
        uint256 amount
    );

    // Variables
    address public ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public USDC = 0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905;
    address public USDT = 0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46;
    address public treasury;
    address public fxfToken;
    uint256 public tokensSold;
    uint256 public currentRaffleId;
    mapping(uint256 => Raffle) public raffles;
    mapping(uint256 => uint256) private requestIdToRaffleId;
    IUniswapV2Pair public fxfUsdtPair = IUniswapV2Pair(0x256d86beA32E81B3f3f7b5FC5c0C73B169EF2D60);
    IUniswapV2Pair public fxfUsdcPair = IUniswapV2Pair(0x1dc2c47CBA421de13BCA0bb082D5c51a2868873f);
    bool public useUsdtPair; // true = use USDT pair, false = use USDC pair

    // Constants
    uint256 public VESTING_DURATION = 180 days; // 6 months lock period
    uint256 private constant TOTAL_SUPPLY = 1_000_000_000 * 1e18; // 1 billion tokens
    uint256 public MONTHLY_RELEASE_PERCENTAGE = 20; // 20% monthly release after lock

    // State variables
    // user => raffleId => VestingSchedule
    mapping(address => mapping(uint256 => VestingSchedule)) public vestingSchedules;

    // user => array of raffleIds they participated in
    mapping(address => uint256[]) private userRaffleIds;

    // user => raffleId => hasParticipated
    mapping(address => mapping(uint256 => bool)) private hasParticipated;

    // struct to track individual purchases
    struct VestingPurchase {
        uint256 amount;          // Amount of tokens in this purchase
        uint256 releasedAmount;  // Amount released from this purchase
        uint256 startTime;       // Purchase timestamp
        uint256 lockDuration;    // Lock duration for this purchase
    }

    // Update the VestingSchedule struct
    struct VestingSchedule {
        uint256 totalAmount;      // Total amount across all purchases
        uint256 releasedAmount;   // Total released amount
        uint256 purchaseCount;    // Number of purchases made
        bool exists;              // To check if schedule exists
        mapping(uint256 => VestingPurchase) purchases;  // Purchase ID => Purchase details
    }

    // mapping to track individual purchases
    mapping(address => mapping(uint256 => uint256)) public userPurchaseCount;  // user => raffleId => number of purchases

    // Mappings
    mapping(address => uint256) public purchases;
    mapping(address => bool) private _guardians;

    // Updated VRF v2.5 variables
    uint256 public s_subscriptionId;
    address private vrfCoordinator = 0xDA3b641D438362C440Ac5458c57e00a712b66700;
    bytes32 private keyHash = 0x8596b430971ac45bdf6088665b9ad8e8630c9d5049ab54b14dff711bee7c0e26;
    uint16 private minimumRequestConfirmations = 3;
    uint32 private callbackGasLimit = 200000;
    uint32 private numWords = 1;

    // Chainlink ETH/USD price feed
    AggregatorV3Interface private ethPriceFeed = AggregatorV3Interface(0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526);

    // state variable to track total vested amount
    uint256 public totalVestedAmount;

    constructor(
        address _fxfToken,
        address _treasury,
        uint256 subscriptionId
    ) VRFConsumerBaseV2Plus(vrfCoordinator){
        require(_fxfToken != address(0), "Invalid FxF address");
        require(_treasury != address(0), "Invalid treasury address");

        fxfToken = _fxfToken;
        treasury = _treasury;
        s_subscriptionId = subscriptionId;
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
        uint256 amount,
        bool forRaffle,
        uint256 raffleId
    ) external payable whenNotPaused nonReentrant {
        if (token != ETH && token != USDC && token != USDT) revert INVALID_TOKEN();

        uint256 costUSD;

        // Calculate USD value
        if (token == ETH) {
            if (msg.value == 0) revert AMOUNT_MUST_BE_POSITIVE();
            uint256 ethPrice = getLatestETHPrice();
            costUSD = (msg.value * ethPrice) / 1e8;
            
            // Transfer ETH to treasury immediately
            (bool success, ) = payable(treasury).call{value: msg.value}("");
            require(success, "ETH transfer failed");

            // Track ETH payment if for raffle
            if (forRaffle) {
                raffles[raffleId].totalEthReceived += msg.value;
                emit RafflePaymentReceived(raffleId, ETH, msg.value);
            }
        } else {
            if (msg.value != 0) revert AMOUNT_MUST_BE_ZERO();
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            
            // Transfer tokens to treasury immediately
            IERC20(token).safeTransferFrom(msg.sender, treasury, amount);
            costUSD = amount * 1e12; // Convert USDC/USDT to 18 decimals

            // Track token payments if for raffle
            if (forRaffle) {
                if (token == USDT) {
                    raffles[raffleId].totalUsdtReceived += amount;
                } else if (token == USDC) {
                    raffles[raffleId].totalUsdcReceived += amount;
                }
                emit RafflePaymentReceived(raffleId, token, amount);
            }
        }

        // Calculate FXF amount using the updated price mechanism
        uint256 fxfPrice = getFxfPrice();
        uint256 totalFxFAmount = (costUSD * 1e18) / fxfPrice;

        // Check if contract has enough available balance
        require(getAvailableBalance() >= totalFxFAmount, "Insufficient available balance");

        // Update state
        tokensSold += totalFxFAmount;
        purchases[msg.sender] += totalFxFAmount;

        if (forRaffle) {
            require(raffleId > 0 && raffleId <= currentRaffleId, "Invalid raffle ID");
            Raffle storage raffle = raffles[raffleId];

            require(!raffle.completed, "Raffle completed");
            require(block.timestamp >= raffle.startTime, "Raffle not started");
            require(totalFxFAmount >= raffle.ticketPrice, "Insufficient FXF for ticket");
            
            uint256 ticketCount = totalFxFAmount / raffle.ticketPrice;
            uint256 fxfForTickets = ticketCount * raffle.ticketPrice;
            uint256 leftoverFxf = totalFxFAmount - fxfForTickets;

            // Update raffle state
            raffle.totalAmount += fxfForTickets;
            
            // Issue tickets
            for (uint256 i = 0; i < ticketCount; i++) {
                uint256 ticketNumber = ++raffle.totalTickets;
                raffle.ticketOwners[ticketNumber] = msg.sender;
                emit RaffleTicketIssued(raffleId, msg.sender, ticketNumber);
            }

            // Create vesting schedule for raffle tickets
            createVestingSchedule(msg.sender, fxfForTickets, raffleId);

            // Transfer leftover FXF directly
            if (leftoverFxf > 0) {
                IERC20(fxfToken).safeTransfer(msg.sender, leftoverFxf);
            }
        } else {
            // Direct purchase - transfer all FXF
            IERC20(fxfToken).safeTransfer(msg.sender, totalFxFAmount);
        }

        emit TokensPurchased(
            msg.sender,
            token,
            token == ETH ? msg.value : amount,
            totalFxFAmount,
            forRaffle,
            raffleId
        );
    }

    /**
     * @notice Create a new raffle event
     * @param ticketPrice Price per ticket in FXF tokens
     * @param minimumTickets Minimum number of tickets that need to be sold
     * @param startTime Start time of the raffle
     * @param prize Description of the prize
     */
    function createRaffle(
        uint256 ticketPrice,
        uint256 minimumTickets,
        uint256 startTime,
        string calldata prize,
        string calldata imageurl
    ) external onlyOwner {
        require(ticketPrice > 0, "Invalid ticket price");
        require(minimumTickets > 0, "Invalid minimum tickets");
        require(startTime > block.timestamp, "Start time must be in future");

        currentRaffleId++;
        Raffle storage raffle = raffles[currentRaffleId];
        raffle.ticketPrice = ticketPrice;
        raffle.minimumTickets = minimumTickets;
        raffle.startTime = startTime;
        raffle.prize = prize;
        raffle.imageURL = imageurl;
        raffle.completed = false;
        raffle.totalTickets = 0;
        raffle.totalAmount = 0;
        raffle.winner = address(0);
        raffle.winningTicket = 0;
        raffle.totalEthReceived = 0;
        raffle.totalUsdtReceived = 0;
        raffle.totalUsdcReceived = 0;  

        emit RaffleCreated(
            currentRaffleId,
            ticketPrice,
            minimumTickets,
            startTime,
            prize
        );
    }

    /**
     * @notice Select winner for a raffle using Chainlink VRF
     * @param raffleId ID of the raffle
     */
    function selectWinner(uint256 raffleId) external onlyOwner {
        require(raffleId > 0 && raffleId <= currentRaffleId, "Invalid raffle ID");
        Raffle storage raffle = raffles[raffleId];
        require(!raffle.completed, "Raffle already completed");
        require(raffle.totalTickets >= raffle.minimumTickets, "Minimum tickets not sold");

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: minimumRequestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        requestIdToRaffleId[requestId] = raffleId;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 raffleId = requestIdToRaffleId[requestId];
        Raffle storage raffle = raffles[raffleId];
        // Calculate winning ticket number (1-based index)
        uint256 winningTicket = (randomWords[0] % raffle.totalTickets) + 1;
        address winner = raffle.ticketOwners[winningTicket];

        // Update raffle state
        raffle.completed = true;
        raffle.winner = winner;
        raffle.winningTicket = winningTicket;  // Store winning ticket number

         emit RaffleWinnerSelected(raffleId, winner, winningTicket);
       
    }


    // View functions //not required duplicate
    function getRaffleInfo(uint256 raffleId) external view returns (
        uint256 ticketPrice,
        uint256 minimumTickets,
        uint256 startTime,
        string memory prize,
        string memory imageurl,
        bool completed,
        uint256 totalTickets,
        uint256 totalAmount,
        uint256 winningTicket,
        address winner
    ) {
        Raffle storage raffle = raffles[raffleId];
        return (
            raffle.ticketPrice,
            raffle.minimumTickets,
            raffle.startTime,
            raffle.prize,
            raffle.imageURL,
            raffle.completed,
            raffle.totalTickets,
            raffle.totalAmount,
            raffle.winningTicket,
            raffle.winner
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
        uint256 amount,
        uint256 raffleId
    )
        external
        view
        whenNotPaused
        returns (uint256 fxfAmount, uint256 costUSD, uint256 fxfForTickets, uint256 ticketCount, uint256 leftoverFxf)
    {
        if (token != ETH && token != USDC && token != USDT)
            revert INVALID_TOKEN();

        // Calculate USD value (in 18 decimals)
        if (token == ETH) {
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            uint256 ethPrice = getLatestETHPrice(); // ETH price in USD with 8 decimals
            costUSD = (amount * ethPrice) / 1e8; // Result in 18 decimals
        } else {
            if (amount == 0) revert AMOUNT_MUST_BE_POSITIVE();
            // USDC/USDT (6 decimals) to USD (18 decimals)
            costUSD = amount * 1e12;
        }

        // Get FXF price where 1e18 = 1 USD
        uint256 fxfPrice = getFxfPrice(); // Returns price in 1e18 format (e.g., 1e15 means 1 USD = 1000 FXF)
        
        // Calculate FXF amount: If price is 1e15 (0.001 USD per FXF), then 1 USD gets 1000 FXF
        fxfAmount = (costUSD * 1e18) / fxfPrice;

        if (raffleId > 0 && raffleId <= currentRaffleId) {
            Raffle storage raffle = raffles[raffleId];
            // Calculate tickets and leftover
            ticketCount = fxfAmount / raffle.ticketPrice;
            fxfForTickets = ticketCount * raffle.ticketPrice;
            leftoverFxf = fxfAmount - fxfForTickets;
        }

        return (fxfAmount, costUSD, fxfForTickets, ticketCount, leftoverFxf);
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
     * @notice Get FXF price from Uniswap
     * @return price FXF price in USD (1e18 = 1 USD)
     * For example: if 1 USD = 1000 FXF, this function should return 1e15 (0.001 * 1e18)
     */
    function getFxfPrice() public view returns (uint256) {
        IUniswapV2Pair pair = useUsdtPair ? fxfUsdtPair : fxfUsdcPair;
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        
        address token0 = pair.token0();
        bool isFxfToken0 = token0 == fxfToken;
        
        // Both USDT and USDC have 6 decimals, FXF has 18 decimals
        uint256 stablecoinReserve;
        uint256 fxfReserve;
        
        if (isFxfToken0) {
            fxfReserve = uint256(reserve0);    // 18 decimals
            stablecoinReserve = uint256(reserve1);  // 6 decimals
        } else {
            stablecoinReserve = uint256(reserve0);  // 6 decimals
            fxfReserve = uint256(reserve1);    // 18 decimals
        }

        // Calculate price: (stablecoin_amount * 1e18) / fxf_amount
        // Example: If pool has 1000 USDT (1000 * 1e6) and 1,000,000 FXF (1,000,000 * 1e18)
        // Price = (1000 * 1e6 * 1e18) / (1,000,000 * 1e18) = 1e15 (0.001 * 1e18)
        // This means 1 FXF = 0.001 USD, or 1 USD = 1000 FXF
        return (stablecoinReserve * 1e30) / fxfReserve;
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

    // admin function to switch between USDT and USDC pairs
    function setUsePair(bool _useUsdtPair) external onlyOwner {
        useUsdtPair = _useUsdtPair;
    }

    /**
     * @notice Create vesting schedule for raffle ticket purchase
     * @param beneficiary Address to receive tokens
     * @param amount Amount of tokens to vest
     * @param raffleId ID of the raffle event
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 raffleId
    ) internal {
        require(beneficiary != address(0), "FxF: invalid beneficiary");
        require(amount > 0, "FxF: amount must be positive");
        require(raffleId > 0, "FxF: invalid raffle ID");

        VestingSchedule storage schedule = vestingSchedules[beneficiary][raffleId];
        
        if (!schedule.exists) {
            schedule.exists = true;
            schedule.totalAmount = 0;
            schedule.releasedAmount = 0;
            schedule.purchaseCount = 0;
        }

        // Create new purchase
        uint256 purchaseId = schedule.purchaseCount++;
        VestingPurchase storage purchase = schedule.purchases[purchaseId];
        purchase.amount = amount;
        purchase.releasedAmount = 0;
        purchase.startTime = block.timestamp;
        purchase.lockDuration = VESTING_DURATION;

        // Update total amount
        schedule.totalAmount += amount;
        userPurchaseCount[beneficiary][raffleId]++;

        // Update total vested amount
        totalVestedAmount += amount;

        // Track participation for the first purchase
        if (!hasParticipated[beneficiary][raffleId]) {
            userRaffleIds[beneficiary].push(raffleId);
            hasParticipated[beneficiary][raffleId] = true;
        }
        
        emit VestingScheduleCreated(
            beneficiary, 
            amount, 
            block.timestamp, 
            VESTING_DURATION,
            raffleId
        );
    }

    /**
     * @notice Release vested tokens for a specific raffle
     * @param raffleId ID of the raffle event
     */
    function releaseVestedTokens(uint256 raffleId) external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender][raffleId];
        require(schedule.exists, "FxF: no schedule found");
        require(schedule.releasedAmount < schedule.totalAmount, "FxF: fully released");

        uint256 totalReleasable = 0;

        // Process each purchase
        for (uint256 i = 0; i < schedule.purchaseCount; i++) {
            VestingPurchase storage purchase = schedule.purchases[i];
            
            uint256 vestedAmount = _getVestedAmountForPurchase(purchase);
            uint256 releasable = vestedAmount - purchase.releasedAmount;
            
            if (releasable > 0) {
                purchase.releasedAmount += releasable;
                totalReleasable += releasable;
            }
        }

        require(totalReleasable > 0, "FxF: no tokens to release");
        
        // Check if contract has enough balance
        require(getFxfBalance() >= totalReleasable, "Insufficient FXF balance in contract");
        
        schedule.releasedAmount += totalReleasable;
        totalVestedAmount -= totalReleasable; // Decrease total vested amount
        
        IERC20(fxfToken).safeTransfer(msg.sender, totalReleasable);
        emit TokensVested(msg.sender, totalReleasable, raffleId);
    }

    /**
     * @notice Release vested tokens from all raffles
     */
    function releaseAllVestedTokens() external {
        uint256[] memory raffleIds = userRaffleIds[msg.sender];
        uint256 totalReleasable = 0;

        // Calculate total releasable amount first
        for (uint256 i = 0; i < raffleIds.length; i++) {
            uint256 raffleId = raffleIds[i];
            VestingSchedule storage schedule = vestingSchedules[msg.sender][raffleId];
            
            if (!schedule.exists || schedule.releasedAmount >= schedule.totalAmount) {
                continue;
            }

            // Process each purchase in this raffle
            for (uint256 j = 0; j < schedule.purchaseCount; j++) {
                VestingPurchase storage purchase = schedule.purchases[j];
                
                uint256 vestedAmount = _getVestedAmountForPurchase(purchase);
                uint256 releasable = vestedAmount - purchase.releasedAmount;
                
                if (releasable > 0) {
                    purchase.releasedAmount += releasable;
                    totalReleasable += releasable;
                    emit TokensVested(msg.sender, releasable, raffleId);
                }
            }
            
            schedule.releasedAmount += totalReleasable;
        }

        require(totalReleasable > 0, "FxF: no tokens to release");
        
        // Check if contract has enough balance
        require(getFxfBalance() >= totalReleasable, "Insufficient FXF balance in contract");
        
        totalVestedAmount -= totalReleasable; // Decrease total vested amount
        IERC20(fxfToken).safeTransfer(_msgSender(), totalReleasable);
    }

    /**
     * @notice Get all raffle IDs a user has participated in
     * @param user Address of the user
     * @return Array of raffle IDs
     */
    function getUserRaffles(address user) external view returns (uint256[] memory) {
        return userRaffleIds[user];
    }

    /**
     * @notice Get vesting info for a specific raffle
     * @param user Address of the user
     * @param raffleId ID of the raffle
     * @return totalAmount Total tokens vested
     * @return releasedAmount Tokens already released
     * @return vestedAmount Currently vested amount
     * @return startTime Start time of first purchase
     * @return lockDuration Duration of lock period
     */
    function getVestingInfo(address user, uint256 raffleId) 
        external 
        view 
        returns (
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 vestedAmount,
            uint256 startTime,
            uint256 lockDuration
        ) 
    {
        VestingSchedule storage schedule = vestingSchedules[user][raffleId];
        require(schedule.exists, "FxF: no schedule found");

        // Calculate total vested amount across all purchases
        uint256 _totalVestedAmount = 0;
        for (uint256 i = 0; i < schedule.purchaseCount; i++) {
            VestingPurchase storage purchase = schedule.purchases[i];
            _totalVestedAmount += _getVestedAmountForPurchase(purchase);
        }

        return (
            schedule.totalAmount,
            schedule.releasedAmount,
            _totalVestedAmount,
            // Return the start time of the first purchase if it exists
            schedule.purchaseCount > 0 ? schedule.purchases[0].startTime : 0,
            VESTING_DURATION
        );
    }

    /**
     * @notice Get the owner of a specific ticket in a raffle
     * @param raffleId The ID of the raffle
     * @param ticketNumber The ticket number to query
     * @return The address of the ticket owner
     */
    function getTicketOwner(
        uint256 raffleId,
        uint256 ticketNumber
    ) external view returns (address) {
        require(raffleId > 0 && raffleId <= currentRaffleId, "Invalid raffle ID");
        require(ticketNumber > 0 && ticketNumber <= raffles[raffleId].totalTickets, "Invalid ticket number");
        
        return raffles[raffleId].ticketOwners[ticketNumber];
    }

    /**
     * @notice Get all tickets owned by a user in a specific raffle
     * @param raffleId The ID of the raffle
     * @param user The address of the user
     * @return An array of ticket numbers owned by the user
     */
    function getTicketsByOwner(
        uint256 raffleId,
        address user
    ) external view returns (uint256[] memory) {
        require(raffleId > 0 && raffleId <= currentRaffleId, "Invalid raffle ID");
        Raffle storage raffle = raffles[raffleId];
        
        // First count how many tickets the user owns
        uint256 ticketCount = 0;
        for (uint256 i = 1; i <= raffle.totalTickets; i++) {
            if (raffle.ticketOwners[i] == user) {
                ticketCount++;
            }
        }
        
        // Create array of appropriate size
        uint256[] memory userTickets = new uint256[](ticketCount);
        
        // Fill array with user's ticket numbers
        uint256 arrayIndex = 0;
        for (uint256 i = 1; i <= raffle.totalTickets; i++) {
            if (raffle.ticketOwners[i] == user) {
                userTickets[arrayIndex] = i;
                arrayIndex++;
            }
        }
        
        return userTickets;
    }

    // Add new function to calculate vested amount for a single purchase
    function _getVestedAmountForPurchase(VestingPurchase memory purchase) internal view returns (uint256) {
        // Nothing is vested before lock period ends
        if (block.timestamp < purchase.startTime + purchase.lockDuration) {
            return 0;
        }

        // Calculate months passed after lock period
        uint256 monthsAfterLock = (block.timestamp - (purchase.startTime + purchase.lockDuration)) / 30 days;
        
        // Calculate release percentage (20% per month)
        uint256 releasePercentage = monthsAfterLock * MONTHLY_RELEASE_PERCENTAGE;
        
        // Cap at 100%
        if (releasePercentage > 100) {
            releasePercentage = 100;
        }

        // Calculate vested amount
        return (purchase.amount * releasePercentage) / 100;
    }

    // Add function to get vesting details for all purchases
    function getVestingPurchases(
        address user,
        uint256 raffleId
    ) external view returns (
        uint256[] memory amounts,
        uint256[] memory releasedAmounts,
        uint256[] memory startTimes,
        uint256[] memory vestedAmounts
    ) {
        VestingSchedule storage schedule = vestingSchedules[user][raffleId];
        require(schedule.exists, "FxF: no schedule found");

        uint256 count = schedule.purchaseCount;
        amounts = new uint256[](count);
        releasedAmounts = new uint256[](count);
        startTimes = new uint256[](count);
        vestedAmounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            VestingPurchase storage purchase = schedule.purchases[i];
            amounts[i] = purchase.amount;
            releasedAmounts[i] = purchase.releasedAmount;
            startTimes[i] = purchase.startTime;
            vestedAmounts[i] = _getVestedAmountForPurchase(purchase);
        }

        return (amounts, releasedAmounts, startTimes, vestedAmounts);
    }

    /**
     * @notice Calculate ETH amount needed for desired FXF amount
     * @param fxfAmount Amount of FXF tokens wanted (18 decimals)
     * @return ethAmount Amount of ETH needed (18 decimals)
     */
    function calculateEthForFxf(uint256 fxfAmount) public view returns (uint256 ethAmount) {
        uint256 ethPrice = getLatestETHPrice(); // 8 decimals
        uint256 fxfPrice = getFxfPrice();       // 18 decimals
        
        // Calculate USD cost: (fxfAmount * fxfPrice) / 1e18
        uint256 usdCost = (fxfAmount * fxfPrice) / 1e18;
        
        // Calculate ETH amount: (usdCost * 1e8) / ethPrice
        ethAmount = (usdCost * 1e8) / ethPrice;
        
        return ethAmount;
    }

    // function to check FXF balance
    function getFxfBalance() public view returns (uint256) {
        return IERC20(fxfToken).balanceOf(address(this));
    }

    // function to check available balance for purchases
    function getAvailableBalance() public view returns (uint256) {
        return (getFxfBalance() - totalVestedAmount);
    }
}