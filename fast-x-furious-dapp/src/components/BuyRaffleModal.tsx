'use client'

import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useSaleContractRead, useSaleContractWrite } from '@/hooks/useSaleContract'
import FXFSaleABI from '@/abi/FXFSale.json'

const USDC_ADDRESS = '0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905'
const USDT_ADDRESS = '0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46'
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

type PaymentMethod = 'ETH' | 'USDT' | 'USDC'

interface BuyRaffleModalProps {
  isOpen: boolean
  onClose: () => void
  raffleId: number
  ticketPrice: bigint
  prize: string
}

// Remove the erc20ABI import and define the ABI we need
const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "owner",
        "type": "address"
      },
      {
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function BuyRaffleModal({ isOpen, onClose, raffleId, ticketPrice, prize }: BuyRaffleModalProps) {
  // Basic state
  const [quantity, setQuantity] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ETH')
  const { address } = useAccount()

  // Get latest prices
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')

  // Helper functions
  const formatFxfAmount = (amount: bigint) => {
    try {
      return formatUnits(amount, 18)
    } catch (error) {
      return '0'
    }
  }

  const calculatePaymentAmount = (fxfAmount: number, method: PaymentMethod) => {
    if (!fxfPrice) return '0'
    
    try {
      switch (method) {
        case 'ETH':
          if (!ethPrice) return '0'
          const usdAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          const ethAmount = usdAmount / Number(formatUnits(ethPrice, 8))
          return ethAmount.toString()
        case 'USDC':
        case 'USDT':
          const stableAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          return stableAmount.toString()
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating payment amount:', error)
      return '0'
    }
  }

  // Calculate total costs - Move these up before they're used
  const totalFxfCost = Number(formatFxfAmount(ticketPrice)) * quantity
  const paymentAmount = calculatePaymentAmount(totalFxfCost, paymentMethod)

  // Approval states
  const [isApproveLoading, setIsApproveLoading] = useState(false)
  const [hasAllowance, setHasAllowance] = useState(false)
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>()

  // Get token contract for approval
  const tokenAddress = paymentMethod === 'USDC' ? USDC_ADDRESS : 
                      paymentMethod === 'USDT' ? USDT_ADDRESS : undefined

  // Get balances
  const { data: ethBalance } = useBalance({ address })
  const { data: usdcBalance } = useBalance({ address, token: USDC_ADDRESS })
  const { data: usdtBalance } = useBalance({ address, token: USDT_ADDRESS })

  // Update the allowance check to use the new ABI
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && tokenAddress ? [
      address,
      process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`
    ] : undefined,
    query: {
      enabled: paymentMethod !== 'ETH' && !!address && !!tokenAddress,
    }
  })

  // Token approval
  const { writeContract: approveToken } = useWriteContract({
    mutation: {
      onMutate: (variables) => {
        console.log('🚀 Starting transaction:', {
          type: 'approve',
          variables,
          timestamp: new Date().toISOString()
        })
      },
      onSuccess: (hash: `0x${string}`) => {
        console.log('✅ Transaction sent to network:', {
          hash,
          timestamp: new Date().toISOString()
        })
        setApprovalTxHash(hash)
        setIsApproveLoading(true)
      },
      onError: (error) => {
        console.error('❌ Transaction failed:', {
          error,
          timestamp: new Date().toISOString()
        })
        setIsApproveLoading(false)
      }
    }
  })

  // Monitor approval transaction with detailed logging
  const { isLoading: isApprovalPending, data: txData } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
    confirmations: 1,
    pollingInterval: 1_000,
  })

  // Handle transaction completion via useEffect
  useEffect(() => {
    if (!txData) return

    console.log('🔍 Transaction data received:', {
      data: txData,
      hash: approvalTxHash,
      timestamp: new Date().toISOString()
    })

    // Log transaction receipt details
    console.log('📝 Transaction receipt:', {
      blockNumber: txData.blockNumber,
      blockHash: txData.blockHash,
      status: txData.status,
      from: txData.from,
      to: txData.to,
      timestamp: new Date().toISOString()
    })

    // Check transaction status
    const isSuccess = txData.status === 'success' || txData.status === 1 || txData.status === '0x1'
    
    if (isSuccess) {
      console.log('✨ Transaction confirmed:', {
        hash: approvalTxHash,
        status: txData.status,
        blockNumber: txData.blockNumber,
        timestamp: new Date().toISOString()
      })
      
      setApprovalTxHash(undefined)
      setIsApproveLoading(false)
      setHasAllowance(true)
      
      setTimeout(() => {
        console.log('🔄 Refreshing allowance...')
        refetchAllowance?.()
      }, 1000)
    } else {
      console.error('⚠️ Transaction reverted:', {
        status: txData.status,
        timestamp: new Date().toISOString()
      })
      setApprovalTxHash(undefined)
      setIsApproveLoading(false)
      setHasAllowance(false)
    }
  }, [txData, approvalTxHash, refetchAllowance])

  // Update the approval function
  const handleApprove = async () => {
    if (!address || !tokenAddress) {
      console.log('❌ Missing address or token address')
      return
    }
    
    // Set loading state immediately when user clicks approve
    setIsApproveLoading(true)
    
    console.log('🚀 Starting approval process...', {
      tokenAddress,
      spender: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS
    })
    
    try {
      const decimals = paymentMethod === 'ETH' ? 18 : 6
      const exactAmount = parseUnits(paymentAmount, decimals)
      
      console.log('📝 Preparing approval with:', {
        token: tokenAddress,
        spender: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS,
        amount: paymentAmount,
        decimals,
        parsedAmount: exactAmount.toString()
      })

      await approveToken({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [
          process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`,
          exactAmount
        ]
      })
    } catch (error) {
      console.error('❌ Approval error:', error)
      setIsApproveLoading(false)
    }
  }

  // Update allowance check to match exact amount
  useEffect(() => {
    const checkAllowance = async () => {
      if (paymentMethod === 'ETH') {
        setHasAllowance(true)
        return
      }

      if (allowance) {
        console.log('💰 New allowance received:', allowance.toString())
        try {
          const decimals = paymentMethod === 'ETH' ? 18 : 6
          const exactAmount = parseUnits(paymentAmount, decimals)
          const hasEnoughAllowance = allowance >= exactAmount
          
          console.log('🔍 Checking allowance:', {
            current: allowance.toString(),
            needed: exactAmount.toString(),
            hasEnough: hasEnoughAllowance,
            decimals
          })
          
          setHasAllowance(hasEnoughAllowance)
        } catch (error) {
          console.error('Error parsing payment amount:', error)
          setHasAllowance(false)
        }
      } else {
        setHasAllowance(false)
      }
    }

    checkAllowance()
  }, [allowance, paymentMethod, paymentAmount])

  // Helper functions
  const formatDisplayAmount = (amount: string, method: PaymentMethod) => {
    return `${Number(amount).toFixed(6)} ${method}`
  }

  const getBalanceForMethod = (method: PaymentMethod) => {
    switch (method) {
      case 'ETH':
        return ethBalance ? `${Number(formatUnits(ethBalance.value, 18)).toFixed(4)} ETH` : '0 ETH'
      case 'USDC':
        return usdcBalance ? `${Number(formatUnits(usdcBalance.value, 6)).toFixed(2)} USDC` : '0 USDC'
      case 'USDT':
        return usdtBalance ? `${Number(formatUnits(usdtBalance.value, 6)).toFixed(2)} USDT` : '0 USDT'
      default:
        return '0'
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setQuantity(value)
    }
  }

  // Add purchase transaction states
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false)
  const [purchaseTxHash, setPurchaseTxHash] = useState<`0x${string}` | undefined>()

  // Add purchase contract interaction
  const { writeContract: buyRaffle } = useWriteContract({
    mutation: {
      onSuccess: (hash: `0x${string}`) => {
        console.log('✅ Purchase transaction sent:', {
          hash,
          timestamp: new Date().toISOString()
        })
        setPurchaseTxHash(hash)
      },
      onError: (error) => {
        console.error('❌ Purchase failed:', error)
        setIsPurchaseLoading(false)
      }
    }
  })

  // Monitor purchase transaction
  const { isLoading: isPurchasePending, data: purchaseData } = useWaitForTransactionReceipt({
    hash: purchaseTxHash,
    confirmations: 1,
    pollingInterval: 1_000,
  })

  // Handle purchase transaction completion
  useEffect(() => {
    if (!purchaseData) return

    console.log('📝 Purchase receipt:', {
      data: purchaseData,
      status: purchaseData.status,
      timestamp: new Date().toISOString()
    })

    const isSuccess = purchaseData.status === 'success' || purchaseData.status === 1 || purchaseData.status === '0x1'
    
    if (isSuccess) {
      console.log('🎉 Purchase confirmed!')
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
      onClose() // Close modal on success
    } else {
      console.error('❌ Purchase reverted:', purchaseData.status)
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }, [purchaseData, onClose])

  // Update handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsPurchaseLoading(true) // Set loading state immediately
      
      const tokenAddress = paymentMethod === 'ETH' ? ETH_ADDRESS :
                          paymentMethod === 'USDT' ? USDT_ADDRESS :
                          paymentMethod === 'USDC' ? USDC_ADDRESS : null
      
      if (!tokenAddress) {
        throw new Error('Invalid payment method')
      }

      const decimals = paymentMethod === 'ETH' ? 18 : 6
      const parsedAmount = parseUnits(paymentAmount, decimals)

      console.log('💰 Preparing purchase:', {
        token: tokenAddress,
        amount: paymentAmount,
        parsedAmount: parsedAmount.toString(),
        forRaffle: true,
        raffleId,
        value: paymentMethod === 'ETH' ? parsedAmount : BigInt(0)
      })

      await buyRaffle({
        address: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI,
        functionName: 'buy',
        args: [
          tokenAddress,
          paymentMethod === 'ETH' ? BigInt(0) : parsedAmount, // amount is 0 for ETH
          true, // forRaffle
          BigInt(raffleId)
        ],
        value: paymentMethod === 'ETH' ? parsedAmount : BigInt(0) // ETH value
      })

    } catch (error) {
      console.error('❌ Purchase error:', error)
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }

  // Update getButtonState to handle all states
  const getButtonState = () => {
    // Log current state for debugging
    console.log('🔄 Button state:', {
      isApprovalPending,
      isApproveLoading,
      hasAllowance,
      approvalTxHash,
      isPurchaseLoading,
      isPurchasePending,
      purchaseTxHash,
      paymentMethod
    })

    // If purchase transaction is pending on blockchain
    if (isPurchasePending || purchaseTxHash) {
      return {
        text: 'Confirming Purchase...',
        disabled: true,
        onClick: () => {}
      }
    }

    // If waiting for user to confirm purchase in wallet
    if (isPurchaseLoading && !purchaseTxHash) {
      return {
        text: 'Confirm in Wallet...',
        disabled: true,
        onClick: () => {}
      }
    }

    // For ETH or approved token payments
    if (paymentMethod === 'ETH' || hasAllowance) {
      return {
        text: `Purchase with ${paymentMethod}`,
        disabled: false,
        onClick: handleSubmit
      }
    }

    // If transaction is being prepared
    if (isApproveLoading && !approvalTxHash) {
      return {
        text: 'Confirm in Wallet...',
        disabled: true,
        onClick: () => {}
      }
    }

    // If transaction is pending on blockchain
    if (approvalTxHash) {
      return {
        text: 'Awaiting Confirmation...',
        disabled: true,
        onClick: () => {}
      }
    }

    // For token payments that need approval
    if (!hasAllowance) {
      return {
        text: `Enable ${paymentMethod}`,
        disabled: false,
        onClick: handleApprove
      }
    }

    // For approved token payments
    return {
      text: `Purchase with ${paymentMethod}`,
      disabled: false,
      onClick: handleSubmit
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-root">
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Buy Raffle Tickets</h3>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-body">
            <div className="raffle-info">
              <div className="raffle-header">
                <h4>Raffle #{raffleId}</h4>
                <span className="prize-tag">{prize}</span>
              </div>
              <div className="ticket-price">
                <span>Ticket Price:</span>
                <span className="price-value">{formatFxfAmount(ticketPrice)} FXF</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="buy-form">
              <div className="form-group">
                <label htmlFor="quantity">Number of Tickets</label>
                <div className="quantity-input">
                  <button 
                    type="button" 
                    className="quantity-btn"
                    onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  >
                    -
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityChange}
                  />
                  <button 
                    type="button" 
                    className="quantity-btn"
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-methods">
                  {(['ETH', 'USDT', 'USDC'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`payment-method-btn ${paymentMethod === method ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className="payment-method-content">
                        <span className="method-name">{method}</span>
                        <span className="method-balance">{getBalanceForMethod(method)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="total-cost">
                <div className="cost-row">
                  <span>Total FXF:</span>
                  <span className="amount">{totalFxfCost.toFixed(2)} FXF</span>
                </div>
                <div className="cost-row highlight">
                  <span>Payment Amount:</span>
                  <span className="amount">{formatDisplayAmount(paymentAmount, paymentMethod)}</span>
                </div>
              </div>

              <button type="submit" className="submit-btn" {...getButtonState()}>
                {getButtonState().text}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          pointer-events: none;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 10000;
          pointer-events: auto;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 10001;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #1a1a1a;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 24px;
        }

        .raffle-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .raffle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .raffle-header h4 {
          margin: 0;
          font-size: 18px;
          color: #1a1a1a;
        }

        .prize-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
        }

        .ticket-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #666;
        }

        .price-value {
          font-weight: 500;
          color: #1a1a1a;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .quantity-input {
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .quantity-btn {
          background: #f8f9fa;
          border: none;
          padding: 8px 16px;
          font-size: 18px;
          cursor: pointer;
          color: #1976d2;
        }

        .quantity-input input {
          width: 80px;
          text-align: center;
          border: none;
          padding: 8px;
          font-size: 16px;
        }

        .payment-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .payment-method-btn {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .payment-method-btn.active {
          border-color: #1976d2;
          background: #e3f2fd;
        }

        .payment-method-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .method-name {
          font-weight: 500;
          color: #1a1a1a;
        }

        .method-balance {
          font-size: 12px;
          color: #666;
        }

        .total-cost {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          color: #666;
        }

        .cost-row.highlight {
          border-top: 1px solid #eee;
          margin-top: 8px;
          padding-top: 16px;
          color: #1a1a1a;
          font-weight: 500;
        }

        .amount {
          font-family: monospace;
        }

        .submit-btn {
          width: 100%;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover {
          background: #1565c0;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
} 