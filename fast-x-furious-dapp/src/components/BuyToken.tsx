'use client'

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
        toast.loading('Preparing purchase...', { id: 'purchase-token' })
      },
      onSuccess: (hash: `0x${string}`) => {
        console.log('✅ Purchase transaction sent:', { hash })
        setPurchaseTxHash(hash)
        toast.loading('Transaction sent, waiting for confirmation...', { id: 'purchase-token' })
      },
      onError: (error) => {
        console.error('❌ Purchase failed:', error)
        setIsPurchaseLoading(false)
        toast.error('Failed to send transaction', { id: 'purchase-token' })
      }
    }
  })

  // Monitor purchase transaction
  const { isLoading: isPurchasePending, data: purchaseData } = useWaitForTransactionReceipt({
    hash: purchaseTxHash,
    confirmations: 1
  })

  // Handle purchase transaction completion
  useEffect(() => {
    if (!purchaseData) return

    const isSuccess = purchaseData.status === 'success' || purchaseData.status === 1
    
    if (isSuccess) {
      toast.success('Purchase successful!', { id: 'purchase-token' })
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
      setInputAmount('')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      toast.error('Purchase failed', { id: 'purchase-token' })
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }, [purchaseData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const tokenAddress = paymentMethod === 'ETH' ? ETH_ADDRESS :
                          paymentMethod === 'USDT' ? USDT_ADDRESS :
                          paymentMethod === 'USDC' ? USDC_ADDRESS : null
      
      if (!tokenAddress) {
        throw new Error('Invalid payment method')
      }

      const decimals = paymentMethod === 'ETH' ? 18 : 6
      const parsedAmount = parseUnits(paymentAmount, decimals)

      console.log('💰 Preparing token purchase:', {
        token: tokenAddress,
        amount: paymentAmount,
        parsedAmount: parsedAmount.toString(),
        forRaffle: false,
        raffleId: 0
      })

      await buyTokens({
        address: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI,
        functionName: 'buy',
        args: [
          tokenAddress,
          paymentMethod === 'ETH' ? BigInt(0) : parsedAmount, // amount is 0 for ETH
          false, // forRaffle
          BigInt(0) // raffleId
        ],
        value: paymentMethod === 'ETH' ? parsedAmount : BigInt(0) // ETH value
      })

    } catch (error) {
      console.error('❌ Purchase error:', error)
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }

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
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="swap-arrow">↓</div>

          {/* To Section */}
          <div className="swap-section">
            <div className="swap-header">
              <span>To</span>
            </div>
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
              <div className="token-display">FXF</div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPurchaseLoading || isPurchasePending || isPending}
          className="buy-button"
        >
          {isPending ? 'Confirm in Wallet...' :
           isPurchasePending ? 'Confirming...' :
           isPurchaseLoading ? 'Preparing...' :
           'Buy Tokens'}
        </button>

        <style jsx>{`
          .buy-token-container {
            max-width: 480px;
            margin: 32px auto;
            width: 100%;
          }

          .title {
            font-size: 20px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 16px;
            text-align: center;
          }

          .swap-card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #E5E7EB;
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
            gap: 12px;
          }

          .input-section input {
            flex: 1;
            background: transparent;
            border: none;
            color: #1F2937;
            font-size: 24px;
            font-family: monospace;
            outline: none;
            padding: 0;
            text-align: left;
            width: 0;
            min-width: 0;
          }

          .input-section input::placeholder {
            color: #9CA3AF;
          }

          .token-select {
            display: flex;
            gap: 8px;
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
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            padding: 6px 12px;
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
            background: #2563EB;
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            margin-top: 16px;
            padding: 12px;
            transition: all 0.2s;
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

          @media (max-width: 480px) {
            .buy-token-container {
              padding: 0 16px;
            }
          }
        `}</style>
      </form>
    </div>
  )
} 