# FXFSale Contract Documentation

## Overview
The FXFSale contract is a comprehensive smart contract that manages token sales, raffles, and vesting functionality. It integrates with Chainlink VRF for random winner selection and Chainlink Price Feeds for price oracles. The contract supports multiple payment methods (ETH, USDT, USDC) and includes sophisticated vesting mechanisms.

## Core Functions

### Token Sale Functions

#### `buy`
```solidity
function buy(address token, uint256 amount, bool forRaffle, uint256 raffleId) external payable
```
- Unified buy function for ETH and ERC20 payments
- Parameters:
  - `token`: Token address (ETH_ADDRESS for ETH, USDT_ADDRESS for USDT, USDC_ADDRESS for USDC)
  - `amount`: Amount of tokens to spend (0 for ETH)
  - `forRaffle`: Whether the purchase is for raffle tickets
  - `raffleId`: ID of the raffle to participate in
- Features:
  - Automatic price calculation using Chainlink oracles
  - Immediate treasury transfers
  - Support for both direct token purchases and raffle ticket purchases
  - Vesting schedule creation for raffle purchases

#### `calculateBuy`
```solidity
function calculateBuy(address token, uint256 amount, uint256 raffleId) external view returns (
    uint256 fxfAmount,
    uint256 costUSD,
    uint256 fxfForTickets,
    uint256 ticketCount,
    uint256 leftoverFxf
)
```
- Calculates purchase details before transaction
- Returns:
  - `fxfAmount`: Total FXF tokens received
  - `costUSD`: Cost in USD (18 decimals)
  - `fxfForTickets`: FXF used for tickets
  - `ticketCount`: Number of tickets purchased
  - `leftoverFxf`: Remaining FXF after ticket purchase

#### `calculateEthForFxf`
```solidity
function calculateEthForFxf(uint256 fxfAmount) public view returns (uint256 ethAmount)
```
- Calculates ETH amount needed for desired FXF amount
- Uses Chainlink price feeds for accurate calculations
- Returns ETH amount in wei (18 decimals)

### Raffle Functions

#### `createRaffle`
```solidity
function createRaffle(
    uint256 ticketPrice,
    uint256 minimumTickets,
    uint256 startTime,
    string calldata prize,
    string calldata imageurl
) external onlyOwner
```
- Creates a new raffle with detailed tracking
- Parameters:
  - `ticketPrice`: Price in FXF tokens
  - `minimumTickets`: Required tickets to start
  - `startTime`: Future start time
  - `prize`: Prize description
  - `imageurl`: Prize image URL
- Features:
  - Payment tracking (ETH, USDT, USDC)
  - Ticket ownership mapping
  - Automatic vesting schedule creation

#### `selectWinner`
```solidity
function selectWinner(uint256 raffleId) external onlyOwner
```
- Initiates Chainlink VRF for random winner selection
- Requirements:
  - Minimum tickets sold
  - Raffle not completed
  - Valid raffle ID

#### `getRaffleInfo`
```solidity
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
)
```
- Returns comprehensive raffle information
- Includes payment tracking and ticket ownership

### Vesting Functions

#### `releaseVestedTokens`
```solidity
function releaseVestedTokens(uint256 raffleId) external
```
- Releases vested tokens for a specific raffle
- Features:
  - Monthly release percentage (20%)
  - 6-month lock period
  - Automatic vesting calculations

#### `releaseAllVestedTokens`
```solidity
function releaseAllVestedTokens() external
```
- Releases all vested tokens across all raffles
- Handles multiple vesting schedules

#### `getVestingPurchases`
```solidity
function getVestingPurchases(address user, uint256 raffleId) external view returns (
    uint256[] memory amounts,
    uint256[] memory releasedAmounts,
    uint256[] memory startTimes,
    uint256[] memory vestedAmounts
)
```
- Returns detailed vesting information
- Tracks individual purchases and releases

### Price Feed Functions

#### `getFxfPrice`
```solidity
function getFxfPrice() public view returns (uint256)
```
- Gets FXF price from Uniswap V2 pairs
- Supports both USDT and USDC pairs
- Returns price in 1e18 format

#### `getLatestETHPrice`
```solidity
function getLatestETHPrice() public view returns (uint256)
```
- Gets ETH price from Chainlink oracle
- Returns price with 8 decimals
- Includes price freshness checks

### Admin Functions

#### `setGuardian`
```solidity
function setGuardian(address _guardian, bool _status) external onlyOwner
```
- Manages guardian addresses for emergency functions

#### `setTreasury`
```solidity
function setTreasury(address _treasury) external onlyOwner
```
- Updates treasury address for payments

#### `rescueTokens`
```solidity
function rescueTokens(address recipient, address token, uint256 value) external onlyOwner
```
- Emergency function to recover stuck tokens
- Supports both ETH and ERC20 tokens

#### `pause`/`unpause`
```solidity
function pause() external
function unPause() external onlyOwner
```
- Emergency stop mechanism
- Guardian addresses can pause
- Only owner can unpause

#### `setUsePair`
```solidity
function setUsePair(bool _useUsdtPair) external onlyOwner
```
- Switches between USDT and USDC price pairs

## Events

### `SetGuardian`
```solidity
event SetGuardian(address indexed guardian, bool status)
```
- Emitted when guardian status changes

### `TokensPurchased`
```solidity
event TokensPurchased(
    address indexed buyer,
    address indexed token,
    uint256 paymentAmount,
    uint256 fxfAmount,
    bool forRaffle,
    uint256 raffleId
)
```
- Emitted on token purchases

### `RaffleCreated`
```solidity
event RaffleCreated(
    uint256 indexed raffleId,
    uint256 ticketPrice,
    uint256 minimumTickets,
    uint256 startTime,
    string prize
)
```
- Emitted on raffle creation

### `RaffleTicketIssued`
```solidity
event RaffleTicketIssued(
    uint256 indexed raffleId,
    address indexed buyer,
    uint256 ticketNumber
)
```
- Emitted when tickets are issued

### `RaffleWinnerSelected`
```solidity
event RaffleWinnerSelected(
    uint256 indexed raffleId,
    address indexed winner,
    uint256 winningTicket
)
```
- Emitted when winner is selected

### `SetTreasury`
```solidity
event SetTreasury(address indexed newTreasury)
```
- Emitted when treasury address changes

### `VestingScheduleCreated`
```solidity
event VestingScheduleCreated(
    address indexed beneficiary,
    uint256 amount,
    uint256 startTime,
    uint256 duration,
    uint256 indexed raffleId
)
```
- Emitted when vesting schedule is created

### `TokensVested`
```solidity
event TokensVested(
    address indexed beneficiary,
    uint256 amount,
    uint256 indexed raffleId
)
```
- Emitted when tokens are vested

## Constants

- `VESTING_DURATION`: 180 days (6 months)
- `MONTHLY_RELEASE_PERCENTAGE`: 20%
- `TOTAL_SUPPLY`: 1,000,000,000 * 1e18
- `ETH_ADDRESS`: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
- `USDC_ADDRESS`: 0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905
- `USDT_ADDRESS`: 0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46

## Security Features

- Chainlink VRF for provably fair winner selection
- Chainlink Price Feeds for accurate pricing
- Guardian system for emergency functions
- Pausable functionality
- Reentrancy protection
- Comprehensive access control
- Vesting mechanism with lock period
- Payment tracking and validation
- Treasury management
- Emergency token recovery

## Deployment Instructions

### Chainlink VRF Setup

1. **Create VRF Subscription**
   - Go to [Chainlink VRF Subscription Manager](https://vrf.chain.link/)
   - Connect your wallet
   - Click "Create Subscription"
   - Choose your network (e.g., Sepolia)
   - Fund your subscription with LINK tokens
   - Note down your subscription ID

2. **Get VRF Parameters**
   After creating the subscription, you'll see these values in your subscription details:
   
   From the subscription page, copy these values and add in sale contract:
   ```solidity
   // VRF Coordinator - Copy from subscription page
   address private vrfCoordinator = 0xDA3b641D438362C440Ac5458c57e00a712b66700;
   
   // Key Hash - Copy from subscription page
   bytes32 private keyHash = 0x8596b430971ac45bdf6088665b9ad8e8630c9d5049ab54b14dff711bee7c0e26;
   ```

   Additional parameters to configure:
   ```solidity
   // Other parameters with recommended values
   uint16 requestConfirmations = 3;
   uint32 callbackGasLimit = 200000;
   uint32 numWords = 1;
   ```

3. **Deploy FXF Token Contract**
   - Deploy the FXF ERC20 token contract first
   - Note down the deployed token address

4. **Deploy FXFSale Contract**
   
   Before deployment, get your subscription ID:
   - Find your subscription in "My Subscriptions" table
   - Copy the ID (e.g., "400515...5918")
   - This ID will be used as `subscriptionId` in the constructor

   Deploy the contract with:
   ```solidity
   constructor(
       address _fxfToken,      // FXF token address
       address _treasury,      // Treasury address
       uint256 subscriptionId  // Chainlink VRF subscription ID from above
   )
   ```

5. **Add Contract as Consumer**
   After deploying your contract:
   ![Add Consumer](add-consumer.png)
   - Go back to [VRF Subscription Manager](https://vrf.chain.link/)
   - Select your subscription
   - Click "Add consumer" button as shown in the screenshot
   - Enter your deployed contract address
   - Confirm the transaction

   > **Note**: Your subscription must have sufficient LINK balance before adding consumers. You can fund your subscription using the "Fund subscription" button 

6. **Initialize Contract Parameters**
   After deployment, call these functions in order:

   a. Set Guardian Addresses (optional):
   ```solidity
   setGuardian(address _guardian, bool _status)
   ```

   b. Set Price Feed Pairs:
   ```solidity
   setUsePair(bool _useUsdtPair)  // true for USDT, false for USDC
   ```

7. **Update Token Addresses and Create Uniswap Pairs**
   
   a. Create Uniswap V2 Pairs:
   - Go to Uniswap V2 Factory
   - Create FXF/USDT pair
   - Create FXF/USDC pair
   - Note down both pair addresses

   b. Update Contract State Variables:
   ```solidity
   // Token Addresses - Update with actual network addresses
   address public USDC = 0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905; // Update with actual USDC address
   address public USDT = 0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46; // Update with actual USDT address

   // Uniswap V2 Pairs - Update with created pair addresses
   IUniswapV2Pair public fxfUsdtPair = IUniswapV2Pair(0x256d86beA32E81B3f3f7b5FC5c0C73B169EF2D60); // Update with actual FXF/USDT pair
   IUniswapV2Pair public fxfUsdcPair = IUniswapV2Pair(0x1dc2c47CBA421de13BCA0bb082D5c51a2868873f); // Update with actual FXF/USDC pair
   ```

   c. Add Initial Liquidity:
   - Approve tokens for Uniswap router
   - Add liquidity to FXF/USDT pair
   - Add liquidity to FXF/USDC pair
   - Ensure sufficient liquidity for accurate price feeds

   d. Verify Pair Setup:
   ```solidity
   // Check if pairs are working correctly
   function getFxfPrice() public view returns (uint256)
   ```
   - Call this function to verify price calculation
   - Test with both USDT and USDC pairs using setUsePair

   > **Important**: 
   > - Ensure sufficient liquidity in both pairs for accurate pricing
   > - Test price calculations with small amounts first
   > - Monitor price feeds for any anomalies
   > - Keep record of all addresses and pair contracts for future reference

8. **Fund FXFSale Contract**
   The contract needs FXF tokens to distribute for purchases and raffles:

   a. From FXF token contract:
   ```solidity
   // Approve FXFSale contract to spend tokens
   function approve(address spender, uint256 amount) public returns (bool)
   ```
   - Call this function from the FXF token contract
   - Set `spender` as the FXFSale contract address
   - Set `amount` to the total amount of FXF tokens to be sold

   b. Transfer FXF tokens:
   ```solidity
   // Transfer FXF tokens to sale contract
   function transfer(address recipient, uint256 amount) public returns (bool)
   ```
   - Call this function from the FXF token contract
   - Set `recipient` as the FXFSale contract address
   - Set `amount` to the total amount of FXF tokens to be sold

   > **Important**: 
   > - Ensure you transfer enough FXF tokens to cover all potential sales and raffles
   > - You can check the contract's FXF balance using:
   >   ```solidity
   >   function getFxfBalance() public view returns (uint256)
   >   ```
   > - You can check available balance for purchases using:
   >   ```solidity
   >   function getAvailableBalance() public view returns (uint256)
   >   ```
   > - The difference between total balance and available balance is the amount reserved for vesting

## Running the UI Application

### Prerequisites

## Usage

1. Go to [Reown Cloud](https://cloud.reown.com) and create a new project.
2. Copy your `Project ID`
3. Create `.env` and paste your `Project ID` as the value for `NEXT_PUBLIC_PROJECT_ID`
4. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SALE_CONTRACT_ADDRESS=your_fxf_sale_address
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_fxf_token_address
   ```


## Resources

- [Reown — Docs](https://docs.reown.com)
- [Next.js — Docs](https://nextjs.org/docs)

### Installation
```bash
# Install dependencies
yarn install

# Build the application
yarn build

# Start the development server
yarn dev
```

### Available Scripts
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run linting

### Application Structure
```
FXF-Dapp/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel pages
│   ├── components/        # Shared components
│   ├── hooks/            # Custom React hooks
│   └── page.tsx          # Main page
├── public/               # Static files
└── styles/              # Global styles
```

### Key Features
1. **Connect Wallet**
   - Support for multiple wallet providers
   - Network switching capability
   - Account management

2. **User Dashboard**
   - View available raffles
   - Purchase FXF tokens
   - Buy raffle tickets
   - Check vesting schedule

3. **Admin Panel**
   - Create new raffles
   - Select winners

