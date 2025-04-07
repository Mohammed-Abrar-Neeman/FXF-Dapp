import { useState, useEffect } from 'react'
import { useTokenContractRead, useTokenContractWrite } from '../hooks/useTokenContract'
import { useSaleContractRead, useSaleContractWrite } from '../hooks/useSaleContract'
import { toast } from 'react-hot-toast'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import styles from './BuyToken.module.css'

const USDC_ADDRESS = '0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905'
const USDT_ADDRESS = '0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46'
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

type PaymentMethod = 'ETH' | 'USDT' | 'USDC'

export function BuyToken() {
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputType, setInputType] = useState<'FXF' | 'PAYMENT'>('FXF')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ETH')
  const { address } = useAccount()

  // Use token contract hooks for USDC and USDT
  const { write: approveUsdcWrite, isLoading: isApprovingUsdc, isSuccess: isApproveUsdcSuccess, error: approveUsdcError, status: approveUsdcStatus, hash: approveUsdcHash, setHash: setApproveUsdcHash } = useTokenContractWrite(USDC_ADDRESS, 'approve')
  const { write: approveUsdtWrite, isLoading: isApprovingUsdt, isSuccess: isApproveUsdtSuccess, error: approveUsdtError, status: approveUsdtStatus, hash: approveUsdtHash, setHash: setApproveUsdtHash } = useTokenContractWrite(USDT_ADDRESS, 'approve')
  const { write: buyWrite, isLoading: isBuying, isSuccess: isBuySuccess, error: buyError, status: buyStatus, hash: buyHash, setHash: setBuyHash } = useSaleContractWrite('buy')

  // Get latest prices
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')

  // Get allowances for both USDC and USDT
  const { data: usdcAllowance, refetch: refetchUsdcAllowance, isLoading: isUsdcAllowanceLoading } = useTokenContractRead(USDC_ADDRESS, 'allowance', [address, process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS])
  const { data: usdtAllowance, refetch: refetchUsdtAllowance, isLoading: isUsdtAllowanceLoading } = useTokenContractRead(USDT_ADDRESS, 'allowance', [address, process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS])

  // Refetch allowances when approval is successful or on component mount
  useEffect(() => {
    if (address) {
      refetchUsdcAllowance()
      refetchUsdtAllowance()
    }
  }, [address, refetchUsdcAllowance, refetchUsdtAllowance])

  // Handle successful approval
  useEffect(() => {
    if (isApproveUsdcSuccess) {
      console.log('USDC Approval successful, refetching allowance')
      refetchUsdcAllowance()
    }
    if (isApproveUsdtSuccess) {
      console.log('USDT Approval successful, refetching allowance')
      refetchUsdtAllowance()
    }
  }, [isApproveUsdcSuccess, isApproveUsdtSuccess, refetchUsdcAllowance, refetchUsdtAllowance])

  // Handle successful purchase
  useEffect(() => {
    if (isBuySuccess) {
      console.log('Purchase successful, resetting and checking allowances')
      // Reset input amount after successful purchase
      setInputAmount('')
      // Refetch allowances to check if more approval is needed
      if (paymentMethod === 'USDC') {
        console.log('Refetching USDC allowance')
        refetchUsdcAllowance()
      } else if (paymentMethod === 'USDT') {
        console.log('Refetching USDT allowance')
        refetchUsdtAllowance()
      }
    }
  }, [isBuySuccess, paymentMethod, refetchUsdcAllowance, refetchUsdtAllowance])

  // Add logging for allowance changes
  useEffect(() => {
    console.log('Allowance values updated:')
    console.log('USDC Allowance:', usdcAllowance?.toString())
    console.log('USDT Allowance:', usdtAllowance?.toString())
  }, [usdcAllowance, usdtAllowance])

  // Get token address based on payment method
  const tokenAddress = paymentMethod === 'USDC' ? USDC_ADDRESS : paymentMethod === 'USDT' ? USDT_ADDRESS : undefined

  // Helper functions
  const calculatePaymentAmount = (amount: number, method: PaymentMethod, isFxfInput: boolean) => {
    if (!fxfPrice || !amount || isNaN(amount)) return '0'
    
    try {
      switch (method) {
        case 'ETH':
          if (!ethPrice) return '0'
          if (isFxfInput) {
            // Convert FXF to ETH
            const usdAmount = amount * Number(formatUnits(BigInt(fxfPrice.toString()), 18))
            const ethAmount = usdAmount / Number(formatUnits(BigInt(ethPrice.toString()), 8))
            return ethAmount.toString()
          } else {
            // Convert ETH to FXF
            const usdAmount = amount * Number(formatUnits(BigInt(ethPrice.toString()), 8))
            const fxfAmount = usdAmount / Number(formatUnits(BigInt(fxfPrice.toString()), 18))
            return fxfAmount.toString()
          }
        case 'USDC':
        case 'USDT':
          if (isFxfInput) {
            // Convert FXF to USD
            const usdAmount = amount * Number(formatUnits(BigInt(fxfPrice.toString()), 18))
            return usdAmount.toString()
          } else {
            // Convert USD to FXF
            const fxfAmount = amount / Number(formatUnits(BigInt(fxfPrice.toString()), 18))
            return fxfAmount.toString()
          }
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating payment amount:', error)
      return '0'
    }
  }

  // Calculate display amounts
  const fxfAmount = inputType === 'FXF' ? inputAmount : calculatePaymentAmount(Number(inputAmount) || 0, paymentMethod, false)
  const paymentAmount = inputType === 'PAYMENT' ? inputAmount : calculatePaymentAmount(Number(inputAmount) || 0, paymentMethod, true)

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

  const handleApprove = async () => {
    try {
      if (!inputAmount) {
        toast.error('Please enter an amount')
        return
      }

      const amount = parseUnits(paymentAmount, 6) // Both USDC and USDT use 6 decimals
      const spenderAddress = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`
      
      if (paymentMethod === 'USDC') {
        await approveUsdcWrite([spenderAddress, amount])
      } else if (paymentMethod === 'USDT') {
        await approveUsdtWrite([spenderAddress, amount])
      }

      toast.success('Approval submitted!')
    } catch (err: any) {
      console.error('Approval error:', err)
      const errorMessage = err.message.split('\n')[0].split('Request Arguments')[0].trim()
      toast.error(errorMessage || 'Failed to approve tokens')
    }
  }

  const handleBuy = async () => {
    try {
      if (!inputAmount) {
        toast.error('Please enter an amount')
        return
      }

      const amount = parseUnits(paymentAmount, paymentMethod === 'ETH' ? 18 : 6)
      const tokenAddress = paymentMethod === 'ETH' 
        ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' 
        : paymentMethod === 'USDC' 
          ? USDC_ADDRESS 
          : USDT_ADDRESS

      // If using ETH, we need to pass the value in the transaction
      if (paymentMethod === 'ETH') {
        await buyWrite([tokenAddress, amount, false, 0], { value: amount })
      } else {
        await buyWrite([tokenAddress, amount, false, 0])
      }

      toast.success('Transaction submitted!')
    } catch (err: any) {
      console.error('Buy error:', err)
      const errorMessage = err.message.split('\n')[0].replace('Error: Request Arguments:', '')
      toast.error(errorMessage || 'Failed to buy tokens')
    }
  }

  const formatLargeNumber = (value: string | number) => {
    if (!value || value === '' || isNaN(Number(value))) {
      return '0'
    }

    const num = typeof value === 'string' ? value : value.toString()
    if (num.includes('e')) {
      const [base, exponent] = num.split('e')
      const exp = parseInt(exponent)
      if (exp > 0) {
        return parseFloat(base).toFixed(6).replace(/\.?0+$/, '') + '0'.repeat(exp)
      }
    }
    const formatted = parseFloat(num).toFixed(6).replace(/\.?0+$/, '')
    return formatted || '0'
  }

  // Update the approval check logic
  const needsApproval = () => {
    if (paymentMethod === 'ETH') {
      console.log('Payment method is ETH, no approval needed')
      return false
    }
    if (!inputAmount || inputAmount === '0') {
      console.log('No input amount, no approval needed')
      return false
    }
    if (isUsdcAllowanceLoading || isUsdtAllowanceLoading) {
      console.log('Allowance loading, showing approve button')
      return true
    }
    
    const amount = parseUnits(paymentAmount || '0', 6)
    console.log('Current allowance check:')
    console.log('Payment Method:', paymentMethod)
    console.log('Input Amount:', inputAmount)
    console.log('Payment Amount:', paymentAmount)
    console.log('Parsed Amount:', amount.toString())
    
    if (paymentMethod === 'USDC') {
      console.log('USDC Allowance:', usdcAllowance?.toString())
      const needs = !usdcAllowance || BigInt(usdcAllowance.toString()) < amount
      console.log('USDC Needs Approval:', needs)
      return needs
    } else if (paymentMethod === 'USDT') {
      console.log('USDT Allowance:', usdtAllowance?.toString())
      const needs = !usdtAllowance || BigInt(usdtAllowance.toString()) < amount
      console.log('USDT Needs Approval:', needs)
      return needs
    }
    return false
  }

  // Handle payment method change
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setInputAmount('')
    setInputType('PAYMENT')
    // Reset all transaction states
    setApproveUsdcHash(null)
    setApproveUsdtHash(null)
    setBuyHash(null)
  }

  return (
    <div className={styles.buyTokenContainer}>
      <div className={styles.buyTokenBox}>
        <h3 className={styles.tokenApprovalTitle}>Buy Tokens</h3>
        
        <div className={styles.swapCard}>
          {/* From Section */}
          <div className={styles.swapSection}>
            <div className={styles.swapHeader}>
              <span>From</span>
              <div className={styles.balanceSection}>
                <span className={styles.tokenBalance}>Balance: {getBalanceForMethod(paymentMethod)}</span>
                <button
                  type="button"
                  className={styles.maxButton}
                  onClick={() => {
                    setInputType('PAYMENT')
                    setInputAmount(getMaxAmount(paymentMethod))
                  }}
                >
                  MAX
                </button>
              </div>
            </div>
            
            <div className={styles.tokenSelect}>
              {['ETH', 'USDC', 'USDT'].map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`${styles.tokenButton} ${paymentMethod === method ? styles.active : ''}`}
                  onClick={() => handlePaymentMethodChange(method as PaymentMethod)}
                >
                  {method}
                </button>
              ))}
            </div>
            
            <div className={styles.inputSection}>
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
          <div className={styles.swapArrow}>↓</div>

          {/* To Section */}
          <div className={styles.swapSection}>
            <div className={styles.swapHeader}>
              <span>To</span>
            </div>
            
            <div className={styles.tokenDisplay}>FXF</div>
            
            <div className={styles.inputSection}>
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

        {!inputAmount || inputAmount === '0' ? (
          <button
            disabled={true}
            className={styles.approveButton}
          >
            Enter Amount
          </button>
        ) : paymentMethod !== 'ETH' && needsApproval() ? (
          <button
            onClick={handleApprove}
            disabled={
              (paymentMethod === 'USDC' && isApprovingUsdc) || 
              (paymentMethod === 'USDT' && isApprovingUsdt) || 
              !inputAmount
            }
            className={styles.approveButton}
          >
            {(paymentMethod === 'USDC' && isApprovingUsdc) || 
             (paymentMethod === 'USDT' && isApprovingUsdt) 
              ? 'Approving...' 
              : 'Approve Tokens'}
          </button>
        ) : (
          <button
            onClick={handleBuy}
            disabled={isBuying || !inputAmount}
            className={styles.approveButton}
          >
            {isBuying ? 'Buying...' : 'Buy Tokens'}
          </button>
        )}

        {paymentMethod === 'USDC' && approveUsdcHash && (
          <div className={styles.successMessage}>
            Approval successful! Transaction hash: {approveUsdcHash}
          </div>
        )}

        {paymentMethod === 'USDT' && approveUsdtHash && (
          <div className={styles.successMessage}>
            Approval successful! Transaction hash: {approveUsdtHash}
          </div>
        )}

        {buyHash && (
          <div className={styles.successMessage}>
            Purchase successful! Transaction hash: {buyHash}
          </div>
        )}
      </div>
    </div>
  )
} 