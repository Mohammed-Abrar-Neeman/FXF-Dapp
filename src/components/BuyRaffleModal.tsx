'use client'

import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useSaleContractRead, useSaleContractWrite } from '@/hooks/useSaleContract'
import { useTokenContractRead, useTokenContractWrite } from '@/hooks/useTokenContract'
import { toast } from 'react-hot-toast'
import styles from './BuyRaffleModal.module.css'

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
  onSuccess?: () => void
}

export default function BuyRaffleModal({ isOpen, onClose, raffleId, ticketPrice, prize, onSuccess }: BuyRaffleModalProps) {
  const [quantity, setQuantity] = useState(1)
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
    if (!fxfPrice || !ethPrice) {
      console.log('Missing prices:', { fxfPrice, ethPrice })
      return '0'
    }
    
    try {
      const fxfPriceNum = Number(formatUnits(BigInt(fxfPrice.toString()), 18))
      const usdAmount = fxfAmount * fxfPriceNum
      console.log('Price calculations:', {
        fxfAmount,
        fxfPriceNum,
        usdAmount
      })

      switch (method) {
        case 'ETH':
          const ethPriceNum = Number(formatUnits(BigInt(ethPrice.toString()), 8))
          const ethAmount = usdAmount / ethPriceNum
          // Add a small buffer (1%) to ensure we have enough ETH
          const ethAmountWithBuffer = ethAmount * 1.01
          console.log('ETH calculations:', {
            ethPriceNum,
            ethAmount,
            ethAmountWithBuffer
          })
          return ethAmountWithBuffer.toString()
        case 'USDC':
        case 'USDT':
          return usdAmount.toString()
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating payment amount:', error)
      return '0'
    }
  }

  // Calculate total costs
  const totalFxfCost = Number(formatFxfAmount(ticketPrice)) * quantity
  const paymentAmount = calculatePaymentAmount(totalFxfCost, paymentMethod)

  // Add contract price calculation check
  const { data: contractCalculation } = useSaleContractRead(
    'calculateBuy',
    [
      paymentMethod === 'ETH' ? ETH_ADDRESS :
      paymentMethod === 'USDT' ? USDT_ADDRESS : USDC_ADDRESS,
      parseUnits(paymentAmount, paymentMethod === 'ETH' ? 18 : 6),
      BigInt(raffleId)
    ]
  )

  // Add debugging logs
  useEffect(() => {
    console.log('Debug Values:', {
      ticketPrice: ticketPrice.toString(),
      formattedTicketPrice: formatFxfAmount(ticketPrice),
      totalFxfCost,
      fxfPrice: fxfPrice?.toString(),
      ethPrice: ethPrice?.toString(),
      paymentAmount,
      quantity
    })

    if (contractCalculation) {
      const [fxfAmount, costUSD, fxfForTickets, ticketCount, leftoverFxf] = contractCalculation as [bigint, bigint, bigint, bigint, bigint]
      console.log('Contract Calculation:', {
        fxfAmount: formatUnits(fxfAmount, 18),
        costUSD: formatUnits(costUSD, 18),
        fxfForTickets: formatUnits(fxfForTickets, 18),
        ticketCount: ticketCount.toString(),
        leftoverFxf: formatUnits(leftoverFxf, 18)
      })
    }
  }, [ticketPrice, fxfPrice, ethPrice, paymentAmount, quantity, contractCalculation])

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

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = useTokenContractRead(
    tokenAddress || '',
    'allowance',
    [address, process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS]
  )

  // Token approval
  const { write: approveToken } = useTokenContractWrite(tokenAddress || '', 'approve')

  // Monitor approval transaction
  const { isLoading: isApprovalPending, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
    confirmations: 1,
    pollingInterval: 1_000,
  })

  // Handle transaction completion
  useEffect(() => {
    if (!approvalTxHash) return

    if (isApprovalSuccess) {
      setApprovalTxHash(undefined)
      setIsApproveLoading(false)
      setHasAllowance(true)
      refetchAllowance?.()
    }
  }, [approvalTxHash, isApprovalSuccess, refetchAllowance])

  // Update allowance check
  useEffect(() => {
    const checkAllowance = async () => {
      if (paymentMethod === 'ETH') {
        setHasAllowance(true)
        return
      }

      if (allowance && tokenAddress) {
        try {
          const decimals = 6 // USDC and USDT both use 6 decimals
          const exactAmount = parseUnits(paymentAmount, decimals)
          const hasEnoughAllowance = BigInt(allowance.toString()) >= exactAmount
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
  }, [allowance, paymentMethod, paymentAmount, tokenAddress])

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

  // Handle approval
  const handleApprove = async () => {
    if (!address || !tokenAddress) return
    
    setIsApproveLoading(true)
    
    try {
      const decimals = 6 // USDC and USDT both use 6 decimals
      const exactAmount = parseUnits(paymentAmount, decimals)
      
      const tx = await approveToken([process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`, exactAmount])
      if (tx) {
        setApprovalTxHash(tx as `0x${string}`)
      }
    } catch (error) {
      console.error('Approval error:', error)
      setIsApproveLoading(false)
      setApprovalTxHash(undefined)
    }
  }

  // Add purchase transaction states
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false)
  const [purchaseTxHash, setPurchaseTxHash] = useState<`0x${string}` | undefined>()

  // Add purchase contract interaction
  const { write: buyRaffle } = useSaleContractWrite('buy')

  // Monitor purchase transaction
  const { isLoading: isPurchasePending, isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
    hash: purchaseTxHash,
    confirmations: 1,
    pollingInterval: 1_000,
  })

  // Handle purchase success
  useEffect(() => {
    if (!purchaseTxHash) return

    if (isPurchaseSuccess) {
      setPurchaseTxHash(undefined)
      setIsPurchaseLoading(false)
      onSuccess?.()
      onClose()
    }
  }, [purchaseTxHash, isPurchaseSuccess, onSuccess, onClose])

  // Handle purchase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsPurchaseLoading(true)
      
      const tokenAddress = paymentMethod === 'ETH' ? ETH_ADDRESS :
                          paymentMethod === 'USDT' ? USDT_ADDRESS :
                          paymentMethod === 'USDC' ? USDC_ADDRESS : null
      
      if (!tokenAddress) {
        throw new Error('Invalid payment method')
      }

      const decimals = paymentMethod === 'ETH' ? 18 : 6
      const parsedAmount = parseUnits(paymentAmount, decimals)

      const tx = await buyRaffle([
        tokenAddress,
        paymentMethod === 'ETH' ? BigInt(0) : parsedAmount,
        true, // forRaffle
        BigInt(raffleId)
      ], {
        value: paymentMethod === 'ETH' ? parsedAmount : BigInt(0)
      })

      if (tx) {
        setPurchaseTxHash(tx as `0x${string}`)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      setIsPurchaseLoading(false)
      setPurchaseTxHash(undefined)
    }
  }

  // Update getButtonState to handle all states
  const getButtonState = () => {
    if (isPurchasePending || purchaseTxHash) {
      return {
        text: 'Confirming Purchase...',
        disabled: true,
        onClick: () => {}
      }
    }

    if (isPurchaseLoading && !purchaseTxHash) {
      return {
        text: 'Confirm in Wallet...',
        disabled: true,
        onClick: () => {}
      }
    }

    if (paymentMethod === 'ETH' || hasAllowance) {
      return {
        text: `Purchase with ${paymentMethod}`,
        disabled: false,
        onClick: handleSubmit
      }
    }

    if (isApproveLoading && !approvalTxHash) {
      return {
        text: 'Confirm in Wallet...',
        disabled: true,
        onClick: () => {}
      }
    }

    if (approvalTxHash) {
      return {
        text: 'Awaiting Confirmation...',
        disabled: true,
        onClick: () => {}
      }
    }

    if (!hasAllowance) {
      return {
        text: `Enable ${paymentMethod}`,
        disabled: false,
        onClick: handleApprove
      }
    }

    return {
      text: `Purchase with ${paymentMethod}`,
      disabled: false,
      onClick: handleSubmit
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalRoot}>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Buy Raffle Tickets</h3>
            <button className={styles.closeButton} onClick={onClose}>&times;</button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.raffleInfo}>
              <div className={styles.raffleHeader}>
                <h4>Raffle #{raffleId}</h4>
                <span className={styles.prizeTag}>{prize}</span>
              </div>
              <div className={styles.ticketPrice}>
                <span>Ticket Price:</span>
                <span className={styles.priceValue}>{formatFxfAmount(ticketPrice)} FXF</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.buyForm}>
              <div className={styles.formGroup}>
                <label htmlFor="quantity">Number of Tickets</label>
                <div className={styles.quantityInput}>
                  <button 
                    type="button" 
                    className={styles.quantityBtn}
                    onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  >
                    -
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                  <button 
                    type="button" 
                    className={styles.quantityBtn}
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Payment Method</label>
                <div className={styles.paymentMethods}>
                  {(['ETH', 'USDT', 'USDC'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`${styles.paymentMethodBtn} ${paymentMethod === method ? styles.active : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className={styles.paymentMethodContent}>
                        <span className={styles.methodName}>{method}</span>
                        <span className={styles.methodBalance}>{getBalanceForMethod(method)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.totalCost}>
                <div className={styles.costRow}>
                  <span>Total FXF:</span>
                  <span className={styles.amount}>{totalFxfCost.toFixed(2)} FXF</span>
                </div>
                <div className={`${styles.costRow} ${styles.highlight}`}>
                  <span>Payment Amount:</span>
                  <span className={styles.amount}>{formatDisplayAmount(paymentAmount, paymentMethod)}</span>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} {...getButtonState()}>
                {getButtonState().text}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 