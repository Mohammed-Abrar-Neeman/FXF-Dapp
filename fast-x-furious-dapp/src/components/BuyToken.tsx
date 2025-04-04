'use client'
import { useClientMounted } from '@/hooks/useClientMount'
import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useSaleContractRead } from '@/hooks/useSaleContract'
import FXFSaleABI from '@/abi/FXFSale.json'
import { toast } from 'react-hot-toast'

const USDC_ADDRESS = '0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905'
const USDT_ADDRESS = '0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46'
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

type PaymentMethod = 'ETH' | 'USDT' | 'USDC'

export default function BuyToken() {
  const mounted = useClientMounted()
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputType, setInputType] = useState<'FXF' | 'PAYMENT'>('FXF')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ETH')
  const { address } = useAccount()

  // Get latest prices
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')

  // Helper functions
  const calculatePaymentAmount = (fxfAmount: number, method: PaymentMethod) => {
    if (!fxfPrice || !fxfAmount || isNaN(fxfAmount)) return '0'
    
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

  // Updated calculation functions
  const calculateFxfAmount = (paymentAmount: number, method: PaymentMethod) => {
    if (!fxfPrice || !ethPrice || !paymentAmount || isNaN(paymentAmount)) return '0'
    
    try {
      switch (method) {
        case 'ETH':
          const usdAmount = paymentAmount * Number(formatUnits(ethPrice, 8))
          return (usdAmount / Number(formatUnits(fxfPrice, 18))).toString()
        case 'USDC':
        case 'USDT':
          return (paymentAmount / Number(formatUnits(fxfPrice, 18))).toString()
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating FXF amount:', error)
      return '0'
    }
  }

  // Calculate display amounts
  const fxfAmount = inputType === 'FXF' ? inputAmount : calculateFxfAmount(Number(inputAmount) || 0, paymentMethod)
  const paymentAmount = inputType === 'PAYMENT' ? inputAmount : calculatePaymentAmount(Number(inputAmount) || 0, paymentMethod)

  // Get balances
  const { data: ethBalance } = useBalance({ address })
  const { data: usdcBalance } = useBalance({ address, token: USDC_ADDRESS })
  const { data: usdtBalance } = useBalance({ address, token: USDT_ADDRESS })

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

  // Add this helper function to get max amount
  const getMaxAmount = (method: PaymentMethod) => {
    switch (method) {
      case 'ETH':
        return ethBalance ? formatUnits(ethBalance.value, 18) : '0'
      case 'USDC':
        return usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'
      case 'USDT':
        return usdtBalance ? formatUnits(usdtBalance.value, 6) : '0'
      default:
        return '0'
    }
  }

  // Purchase states
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false)
  const [purchaseTxHash, setPurchaseTxHash] = useState<`0x${string}` | undefined>()

  // Purchase contract interaction
  const { writeContract: buyTokens, isPending } = useWriteContract({
    mutation: {
      onMutate: () => {
        setIsPurchaseLoading(true)
      },
      onSuccess: (hash: `0x${string}`) => {
        console.log('✅ Purchase transaction sent:', { hash })
        setPurchaseTxHash(hash)
      },
      onError: (error) => {
        console.error('❌ Purchase failed:', error)
        setIsPurchaseLoading(false)
        setPurchaseTxHash(undefined)
        toast.error('Failed to send transaction', { id: 'purchase-status' })
      }
    }
  })

  // Monitor purchase transaction
  const { isLoading: isPurchasePending, data: purchaseData } = useWaitForTransactionReceipt({
    hash: purchaseTxHash,
    onSuccess(data) {
      if (data.status === 1) {
        toast.success('Purchase successful!', { id: 'purchase-status' })
        setIsPurchaseLoading(false)
        setPurchaseTxHash(undefined)
        setInputAmount('')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error('Transaction failed', { id: 'purchase-status' })
        setIsPurchaseLoading(false)
        setPurchaseTxHash(undefined)
      }
    },
    onError() {
      toast.error('Transaction failed', { id: 'purchase-status' })
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  })

  // Add this function to check if amount exceeds balance
  const isExceedingBalance = () => {
    if (!inputAmount || inputAmount === '0') return false
    
    try {
      const amount = Number(inputType === 'PAYMENT' ? inputAmount : paymentAmount)
      const maxAmount = Number(getMaxAmount(paymentMethod))
      
      return amount > maxAmount
    } catch (error) {
      console.error('Error checking balance:', error)
      return false
    }
  }

  // Add this state for error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Add this check for wallet connection
  const isWalletConnected = !!address

 

  // Update the handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous error
    setErrorMessage(null)
    
    // Check if amount exceeds balance
    if (isExceedingBalance()) {
      setErrorMessage(`Insufficient ${paymentMethod} balance`)
      toast.error(`Insufficient ${paymentMethod} balance`, { id: 'purchase-status' })
      return
    }
    
    // Show initial loading toast
    toast.loading('Processing purchase...', { id: 'purchase-status' })
    
    try {
      const tokenAddress = paymentMethod === 'ETH' ? ETH_ADDRESS :
                          paymentMethod === 'USDT' ? USDT_ADDRESS :
                          paymentMethod === 'USDC' ? USDC_ADDRESS : null
      
      if (!tokenAddress) {
        throw new Error('Invalid payment method')
      }

      const decimals = paymentMethod === 'ETH' ? 18 : 6
      const parsedAmount = parseUnits(paymentAmount, decimals)

      await buyTokens({
        address: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI,
        functionName: 'buy',
        args: [
          tokenAddress,
          paymentMethod === 'ETH' ? BigInt(0) : parsedAmount,
          false,
          BigInt(0)
        ],
        value: paymentMethod === 'ETH' ? parsedAmount : BigInt(0)
      })

    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Transaction failed', { id: 'purchase-status' })
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }

  // Add effect to check balance when input changes
  useEffect(() => {
    if (isExceedingBalance()) {
      setErrorMessage(`Insufficient ${paymentMethod} balance`)
    } else {
      setErrorMessage(null)
    }
  }, [inputAmount, inputType, paymentMethod, paymentAmount])

  if (!mounted) return null

  // Update the formatLargeNumber function
  const formatLargeNumber = (value: string | number) => {
    // Handle empty or invalid inputs
    if (!value || value === '' || isNaN(Number(value))) {
      return '0'
    }

    // Convert to string and remove scientific notation
    const num = typeof value === 'string' ? value : value.toString()
    if (num.includes('e')) {
      // Convert scientific notation to regular number
      const [base, exponent] = num.split('e')
      const exp = parseInt(exponent)
      if (exp > 0) {
        return parseFloat(base).toFixed(6).replace(/\.?0+$/, '') + '0'.repeat(exp)
      }
    }
    // Format regular number with up to 6 decimal places, remove trailing zeros
    const formatted = parseFloat(num).toFixed(6).replace(/\.?0+$/, '')
    return formatted || '0'
  }

  return (
    <div className="buy-token-container">
      <div className="buy-token-box">
        <h3 className="title">Buy FXF Tokens</h3>
        
        <form onSubmit={handleSubmit} className="buy-form">
          <div className="swap-card">
            {/* From Section */}
            <div className="swap-section">
              <div className="swap-header">
                <span>From</span>
                <div className="balance-section">
                  <span className="balance">Balance: {getBalanceForMethod(paymentMethod)}</span>
                  <button
                    type="button"
                    className="max-button"
                    onClick={() => {
                      setInputType('PAYMENT')
                      setInputAmount(getMaxAmount(paymentMethod))
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>
              
              {/* Token Selection Buttons - Moved above input */}
              <div className="token-select">
                {['ETH', 'USDC', 'USDT'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`token-button ${paymentMethod === method ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method as PaymentMethod)}
                  >
                    {method}
                  </button>
                ))}
              </div>
              
              {/* Input Field - Now below token selection */}
              <div className="input-section">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={formatLargeNumber(inputType === 'PAYMENT' ? inputAmount : paymentAmount)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '')
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputType('PAYMENT')
                      setInputAmount(value)
                    }
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="swap-arrow">↓</div>

            {/* To Section */}
            <div className="swap-section">
              <div className="swap-header">
                <span>To</span>
              </div>
              
              {/* Token Display - Moved above input */}
              <div className="token-display">FXF</div>
              
              {/* Input Field - Now below token display */}
              <div className="input-section">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={formatLargeNumber(inputType === 'FXF' ? inputAmount : fxfAmount)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '')
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputType('FXF')
                      setInputAmount(value)
                    }
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <button
            type="submit"
            disabled={!isWalletConnected || isPurchaseLoading || isPurchasePending || isPending || isExceedingBalance()}
            className="buy-button"
          >
            {!isWalletConnected ? 'Connect Wallet' :
             isPending ? 'Confirm in Wallet...' :
             isPurchasePending ? 'Confirming...' :
             isPurchaseLoading ? 'Preparing...' :
             isExceedingBalance() ? `Insufficient ${paymentMethod}` :
             'Buy Tokens'}
          </button>
        </form>
      </div>

      

      <style jsx>{`
        .buy-token-container {
          width: 100%;
          margin: 80px 0;
          display: flex;
          justify-content: center;
        }

        .buy-token-box {
          max-width: 480px;
          width: 100%;
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #E5E7EB;
        }

        .title {
          font-size: 22px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 24px;
          text-align: center;
          position: relative;
        }

        .title:after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: #2563EB;
          border-radius: 2px;
        }

        .swap-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #E5E7EB;
          margin-bottom: 20px;
        }

        .swap-section {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 4px;
        }

        .swap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          color: #6B7280;
          font-size: 14px;
        }

        .balance {
          color: #374151;
          font-weight: 500;
        }

        .input-section {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-section input {
          width: 100%;
          background: transparent;
          border: none;
          color: #1F2937;
          font-size: 24px;
          font-family: monospace;
          outline: none;
          padding: 4px 0;
          text-align: left;
        }

        .token-select {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          justify-content: center;
        }

        .token-button {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          color: #374151;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          padding: 6px 12px;
          transition: all 0.2s;
        }

        .token-button:hover {
          background: #F3F4F6;
          border-color: #D1D5DB;
        }

        .token-button.active {
          background: #2563EB;
          border-color: #2563EB;
          color: white;
        }

        .token-display {
          margin-bottom: 12px;
          display: block;
          text-align: center;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .swap-arrow {
          color: #9CA3AF;
          font-size: 24px;
          text-align: center;
          margin: 8px 0;
          background: white;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid #E5E7EB;
          margin: 8px auto;
        }

        .buy-button {
          width: 100%;
          max-width: 300px;
          background: #2563EB;
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          margin: 16px auto 0;
          padding: 12px;
          transition: all 0.2s;
          display: block;
        }

        .buy-button:hover:not(:disabled) {
          background: #1D4ED8;
        }

        .buy-button:disabled {
          background: #E5E7EB;
          color: #9CA3AF;
          cursor: not-allowed;
        }

        .balance-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .max-button {
          background: transparent;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          color: #2563EB;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 6px;
          transition: all 0.2s;
        }

        .max-button:hover {
          background: #EFF6FF;
          border-color: #2563EB;
        }

        .error-message {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #B91C1C;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-top: 12px;
          text-align: center;
        }

        .wallet-message {
          text-align: center;
          color: #6B7280;
          font-size: 14px;
          margin-top: 12px;
        }

        @media (max-width: 768px) {
          .buy-token-container {
            margin: 60px 16px;
          }
          
          .buy-token-box {
            padding: 20px;
          }
        }

        @media (max-width: 480px) {
          .input-section {
            flex-direction: column;
            align-items: stretch;
          }
          
          .input-section input {
            width: 100%;
            margin-bottom: 8px;
            font-size: 18px;
          }
          
          .token-select, .token-display {
            margin-left: 0;
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  )
} 