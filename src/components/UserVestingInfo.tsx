'use client'

import { useSaleContractRead, useSaleContractWrite } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { useMemo, useState, useEffect, useCallback } from 'react'
import styles from './UserVestingInfo.module.css'
import { toast } from 'react-hot-toast'
// import FXFSaleABI from '../abi/FXFSale.json'
// import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
// import { toast } from 'react-hot-toast'

//const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''


// const decodeContractError = (error: any): string => {
//   try {
//     console.log('🔍 Raw error:', error)

//     // Helper to clean error message
//     const cleanErrorMessage = (msg: string): string => {
//       // Remove common prefixes
//       const prefixes = [
//         'execution reverted:',
//         'reverted:',
//         'FxF:',
//         'Error:'
//       ]
      
//       let cleaned = msg.trim()
//       for (const prefix of prefixes) {
//         if (cleaned.includes(prefix)) {
//           cleaned = cleaned.split(prefix).pop()?.trim() || cleaned
//         }
//       }
//       return cleaned
//     }

//     // Try to get error from different possible locations
//     let errorMessage: string | undefined

//     // Check viem error format first
//     if (error?.shortMessage) {
//       errorMessage = cleanErrorMessage(error.shortMessage)
//     }
//     // Check error data
//     else if (error?.data) {
//       errorMessage = cleanErrorMessage(error.data.toString())
//     }
//     // Check error message
//     else if (error?.message) {
//       errorMessage = cleanErrorMessage(error.message)
//     }
//     // Check nested error
//     else if (error?.error?.message) {
//       errorMessage = cleanErrorMessage(error.error.message)
//     }

//     // Log the extracted message
//     console.log('📝 Extracted error:', {
//       original: error?.message || error?.shortMessage || error?.data,
//       cleaned: errorMessage,
//       timestamp: new Date().toISOString()
//     })

//     return errorMessage || 'Unknown error'
//   } catch (e) {
//     console.error('Error decoding contract error:', e)
//     return 'Unknown error'
//   }
// }

// function ReleaseButton({ raffleId, isComplete }: { raffleId: bigint, isComplete: boolean }) {
//   const [isReleasing, setIsReleasing] = useState(false)
//   const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
//   const { address: userAddress } = useAccount()

//   const { 
//     writeContract, 
//     isPending, 
//     error: writeError, 
//     isSuccess: isWriteSuccess, 
//     data: writeData 
//   } = useWriteContract({
//     mutation: {
//       onMutate: () => {
//         console.log('🚀 Starting release transaction:', {
//           raffleId: raffleId.toString(),
//           status: 'pending',
//           timestamp: new Date().toISOString()
//         })
//         toast.loading('Preparing transaction...', { id: 'release' })
//       },
//       onSuccess: (hash: `0x${string}`) => {
//         console.log('✅ Release transaction sent:', {
//           hash,
//           status: 'sent',
//           timestamp: new Date().toISOString()
//         })
//         setTxHash(hash)
//         toast.loading('Transaction sent, waiting for confirmation...', { id: 'release' })
//       },
//       onError: (err: any) => {
//         const errorMessage = decodeContractError(err)
//         console.error('❌ Contract error:', {
//           message: errorMessage,
//           raw: err,
//           timestamp: new Date().toISOString()
//         })
//         setIsReleasing(false)
//         setTxHash(undefined)
//         toast.error(errorMessage, { id: 'release' })
//       }
//     }
//   })

//   // Monitor transaction with detailed logging
//   const { 
//     isLoading: isConfirming, 
//     data: txData, 
//     isSuccess,
//     isError,
//     error: txError
//   } = useWaitForTransactionReceipt({
//     hash: txHash,
//     confirmations: 1,
//     query: {
//       onSuccess: (data:any) => {
//         console.log('✅ Transaction receipt:', {
//           hash: txHash,
//           status: data.status,
//           blockNumber: data.blockNumber,
//           from: data.from,
//           to: data.to,
//           logs: data.logs,
//           timestamp: new Date().toISOString()
//         })
//       }
//     }
//   })

//   // Log state changes
//   useEffect(() => {
//     if (isConfirming) {
//       console.log('⏳ Transaction confirming:', {
//         hash: txHash,
//         timestamp: new Date().toISOString()
//       })
//       toast.loading('Confirming transaction...', { id: 'release' })
//     }
//   }, [isConfirming, txHash])

//   // Update transaction error handling
//   useEffect(() => {
//     if (isError && txError) {
//       const errorMessage = decodeContractError(txError)
//       setIsReleasing(false)
//       setTxHash(undefined)
//       toast.error(errorMessage, { id: 'release' })
//     }
//   }, [isError, txError, txHash])

//   // Update success effect to use correct variables
//   useEffect(() => {
//     if (isWriteSuccess && writeData?.status === 1) {
//       // Wait for success toast to be visible then reload
//       setTimeout(() => {
//         window.location.reload()
//       }, 1500)
//     }
//   }, [isWriteSuccess, writeData])

//   const handleRelease = async () => {
//     try {
//       if (writeError) {
//         console.error('Previous write error:', writeError)
//       }
      
//       // Log contract call details
//       console.log('📝 Release tokens contract call:', {
//         contract: SALE_CONTRACT_ADDRESS,
//         function: 'releaseVestedTokens',
//         params: {
//           raffleId: raffleId.toString(),
//           caller: userAddress,
//         },
//         timestamp: new Date().toISOString()
//       })
      
//       setIsReleasing(true)
      
//       await writeContract({
//         address: SALE_CONTRACT_ADDRESS as `0x${string}`,
//         abi: FXFSaleABI,
//         functionName: 'releaseVestedTokens',
//         args: [raffleId]
//       })
//     } catch (error) {
//       console.error('Release call error:', {
//         error,
//         contract: SALE_CONTRACT_ADDRESS,
//         function: 'releaseVestedTokens',
//         params: {
//           raffleId: raffleId.toString(),
//           caller: userAddress,
//         },
//         timestamp: new Date().toISOString()
//       })
//       setIsReleasing(false)
//       setTxHash(undefined)
//       toast.error(`Failed to release: ${decodeContractError(error)}`, { id: 'release' })
//     }
//   }

//   const getButtonText = () => {
//     if (isPending) return 'Confirm in Wallet...'
//     if (isConfirming) return 'Confirming...'
//     if (isReleasing) return 'Releasing...'
//     return 'Release Tokens'
//   }

//   if (!isComplete) return null

//   return (
//     <button 
//       onClick={handleRelease}
//       disabled={isReleasing || isConfirming || isPending}
//       className="release-button"
//     >
//       {getButtonText()}
//       <style jsx>{`
//         .release-button {
//           background: #2563eb;
//           color: white;
//           border: none;
//           border-radius: 6px;
//           padding: 8px 16px;
//           font-size: 14px;
//           font-weight: 500;
//           cursor: pointer;
//           transition: all 0.2s;
//           width: 100%;
//           max-width: 200px;
//         }

//         .release-button:hover:not(:disabled) {
//           background: #1d4ed8;
//         }

//         .release-button:disabled {
//           background: #94a3b8;
//           cursor: not-allowed;
//           opacity: 0.7;
//         }
//       `}</style>
//     </button>
//   )
// }

// function ReleaseAllButton() {
//   const [isReleasing, setIsReleasing] = useState(false)
//   const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
//   const { address: userAddress } = useAccount()

//   const { 
//     writeContract, 
//     isPending, 
//     error: writeError, 
//     isSuccess: isWriteSuccess, 
//     data: writeData 
//   } = useWriteContract({
//     mutation: {
//       onMutate: () => {
//         console.log('🚀 Starting release all transaction')
//         toast.loading('Preparing transaction...', { id: 'release-all' })
//       },
//       onSuccess: (hash: `0x${string}`) => {
//         console.log('✅ Release all transaction sent:', { hash })
//         setTxHash(hash)
//         toast.loading('Transaction sent, waiting for confirmation...', { id: 'release-all' })
//       },
//       onError: (err: any) => {
//         const errorMessage = decodeContractError(err)
//         console.error('❌ Release all failed:', { error: errorMessage })
//         setIsReleasing(false)
//         setTxHash(undefined)
//         toast.error(errorMessage, { id: 'release-all' })
//       }
//     }
//   })

//   const { isLoading: isConfirming, isError, error: txError } = useWaitForTransactionReceipt({
//     hash: txHash,
//     confirmations: 1,
//     query: {
//       onSuccess: () => {
//         toast.success('All tokens released successfully!', { id: 'release-all' })
//         setTimeout(() => window.location.reload(), 2000)
//       }
//     }
//   })

//   useEffect(() => {
//     if (isError && txError) {
//       const errorMessage = decodeContractError(txError)
//       setIsReleasing(false)
//       setTxHash(undefined)
//       toast.error(errorMessage, { id: 'release-all' })
//     }
//   }, [isError, txError])

//   // Update success effect to use correct variables
//   useEffect(() => {
//     if (isWriteSuccess && writeData?.status === 1) {
//       setTimeout(() => {
//         window.location.reload()
//       }, 1500)
//     }
//   }, [isWriteSuccess, writeData])

//   const handleReleaseAll = async () => {
//     try {
//       setIsReleasing(true)
//       await writeContract({
//         address: SALE_CONTRACT_ADDRESS as `0x${string}`,
//         abi: FXFSaleABI,
//         functionName: 'releaseAllVestedTokens',
//         args: []
//       })
//     } catch (error) {
//       console.error('Release all error:', error)
//       setIsReleasing(false)
//       setTxHash(undefined)
//       toast.error(decodeContractError(error), { id: 'release-all' })
//     }
//   }

//   const getButtonText = () => {
//     if (isPending) return 'Confirm in Wallet...'
//     if (isConfirming) return 'Confirming...'
//     if (isReleasing) return 'Releasing...'
//     return 'Release All'
//   }

//   return (
//     <button 
//       onClick={handleReleaseAll}
//       disabled={isReleasing || isConfirming || isPending}
//       className="release-all-button"
//     >
//       {getButtonText()}
//       <style jsx>{`
//         .release-all-button {
//           background: #2563eb;
//           color: white;
//           border: none;
//           border-radius: 6px;
//           padding: 8px 16px;
//           font-size: 14px;
//           font-weight: 500;
//           cursor: pointer;
//           transition: all 0.2s;
//         }

//         .release-all-button:hover:not(:disabled) {
//           background: #1d4ed8;
//         }

//         .release-all-button:disabled {
//           background: #94a3b8;
//           cursor: not-allowed;
//           opacity: 0.7;
//         }
//       `}</style>
//     </button>
//   )
// }

// Add proper types for contract data
interface VestingData {
  amounts: bigint[]
  releasedAmounts: bigint[]
  startTimes: bigint[]
  vestedAmounts: bigint[]
}

function ReleaseButton({ raffleId }: { raffleId: bigint }) {
  const { write: releaseTokens, isLoading } = useSaleContractWrite('releaseVestedTokens', {
    onSuccess: () => {
      toast.success('Tokens released successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to release tokens')
    }
  })

  const handleRelease = () => {
    releaseTokens([raffleId])
  }

  return (
    <button 
      onClick={handleRelease}
      disabled={isLoading}
      className={styles.releaseButton}
    >
      {isLoading ? 'Releasing...' : 'Release Tokens'}
    </button>
  )
}

export default function UserVestingInfo() {
  const mounted = useClientMounted()
  const { address: userAddress } = useAccount()

  // Get VESTING_DURATION with proper type handling
  const { data: vestingDuration } = useSaleContractRead(
    'VESTING_DURATION',
    [],
    {
      select: (data: unknown): bigint => {
        if (typeof data === 'string' || typeof data === 'number') {
          return BigInt(data)
        }
        return BigInt(0)
      }
    }
  )

  // Define calculateRemainingTime first
  const calculateRemainingTime = useCallback((startTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const duration = typeof vestingDuration === 'bigint' ? vestingDuration : BigInt(0)
    const endTime = startTime + duration
    const remaining = endTime - now

    if (remaining <= BigInt(0)) return { 
      days: 0, 
      hours: 0, 
      minutes: 0, 
      seconds: 0, 
      isComplete: true 
    }

    const days = Number(remaining / BigInt(86400))
    const hours = Number((remaining % BigInt(86400)) / BigInt(3600))
    const minutes = Number((remaining % BigInt(3600)) / BigInt(60))
    const seconds = Number(remaining % BigInt(60))

    return { days, hours, minutes, seconds, isComplete: false }
  }, [vestingDuration])

  // Then define VestingCountdown
  const VestingCountdown = useCallback(({ startTime }: { startTime: bigint }) => {
    const [remaining, setRemaining] = useState(() => calculateRemainingTime(startTime))

    useEffect(() => {
      setRemaining(calculateRemainingTime(startTime))

      const timer = setInterval(() => {
        const newRemaining = calculateRemainingTime(startTime)
        setRemaining(newRemaining)

        if (newRemaining.isComplete) {
          clearInterval(timer)
        }
      }, 1000)

      return () => clearInterval(timer)
    }, [startTime])

    if (remaining.isComplete) {
      return <span className={styles.completed}>Vesting Complete</span>
    }

    const format = (num: number) => num.toString().padStart(2, '0')

    return (
      <span className={styles.countdown}>
        {remaining.days}d {format(remaining.hours)}:{format(remaining.minutes)}:{format(remaining.seconds)}
      </span>
    )
  }, [calculateRemainingTime])

  // Add type assertion for userRaffles
  const { data: userRaffles = [] } = useSaleContractRead(
    'getUserRaffles',
    userAddress ? [userAddress] : [],
    {
      enabled: !!userAddress,
      select: (data: unknown): bigint[] => {
        if (!Array.isArray(data)) return []
        return data.filter((id): id is bigint => typeof id === 'bigint')
      }
    }
  ) as { data: bigint[] }

  // Get vesting info with proper type assertion
  const defaultVestingData: VestingData = {
    amounts: [],
    releasedAmounts: [],
    startTimes: [],
    vestedAmounts: []
  }

  const { 
    data: vestingInfo = defaultVestingData,
    isLoading: isLoadingVesting,
    error: vestingError,
    isError 
  } = useSaleContractRead(
    'getVestingPurchases',
    userAddress && userRaffles.length ? [userAddress, userRaffles[0]] : [],
    {
      enabled: !!userAddress && userRaffles.length > 0,
      select: (data: unknown): VestingData => {
        if (!Array.isArray(data)) return defaultVestingData
        const [amounts, releasedAmounts, startTimes, vestedAmounts] = data as [bigint[], bigint[], bigint[], bigint[]]
        return { amounts, releasedAmounts, startTimes, vestedAmounts }
      }
    }
  )

  // Debug logs
  useEffect(() => {
    console.log('Debug Data:', {
      userAddress,
      vestingDuration: vestingDuration?.toString(),
      userRaffles: userRaffles?.map(id => id.toString()),
      vestingInfo,
      isError,
      vestingError: vestingError?.message
    })
  }, [userAddress, vestingDuration, userRaffles, vestingInfo, isError, vestingError])

  // Show error state if there's an error
  if (isError) {
    return <div>Error loading vesting information. Please try again later.</div>
  }

  // Process vesting data
  const raffleVestingData = useMemo(() => {
    if (!vestingInfo || !userRaffles?.length) return []

    return userRaffles
      .map((raffleId: bigint) => {
        const data = vestingInfo as VestingData
        const { amounts, releasedAmounts, startTimes, vestedAmounts } = data

        if (!amounts?.length) return null

        const validPurchases = amounts
          .map((amount: bigint, index: number) => ({
            amount,
            releasedAmount: releasedAmounts[index] || BigInt(0),
            startTime: startTimes[index] || BigInt(0),
            vestedAmount: vestedAmounts[index] || BigInt(0)
          }))
          .filter((p): p is { amount: bigint; releasedAmount: bigint; startTime: bigint; vestedAmount: bigint } => 
            p.amount > BigInt(0))

        if (!validPurchases.length) return null

        return { raffleId, purchases: validPurchases }
      })
      .filter((raffle): raffle is NonNullable<typeof raffle> => raffle !== null)
  }, [vestingInfo, userRaffles])

  if (!mounted || !userAddress) return null

  // Show loading state only if actively loading
  if (isLoadingVesting) {
    return <div>Loading vesting information...</div>
  }

  // Show no data message if we have loaded but found no data
  if (!raffleVestingData.length) {
    return <div>No vesting schedules found. Please check back later.</div>
  }

  const formatFxfAmount = (amount: bigint) => {
    try {
      const formattedAmount = formatUnits(amount, 18)
      return `${Number(formattedAmount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} FXF`
    } catch (error) {
      return '0.00 FXF'
    }
  }

  const formatDate = (timestamp: bigint) => {
    try {
      const date = new Date(Number(timestamp) * 1000)
      return date.toLocaleDateString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  return (
    <div className={styles.vestingInfoContainer}>
      <div className={styles.vestingInfo}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Your Vesting Information</h2>
        </div>
        
        <div className={styles.rafflesGrid}>
          {raffleVestingData.map((raffle) => (
            <div key={raffle.raffleId.toString()} className={styles.raffleCard}>
              <h3>Raffle #{raffle.raffleId.toString()}</h3>
              
              <div className={styles.purchasesGrid}>
                {raffle.purchases.map((purchase, index) => (
                  <div key={index} className={styles.purchaseCard}>
                    <h4>Purchase #{index + 1}</h4>
                    <div className={styles.purchaseInfo}>
                      <div className={styles.infoRow}>
                        <span>Total Amount:</span>
                        <span>{formatFxfAmount(purchase.amount)}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Released:</span>
                        <span>{formatFxfAmount(purchase.releasedAmount)}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Vested Amount:</span>
                        <span>{formatFxfAmount(purchase.vestedAmount)}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Amount to be Released:</span>
                        <span>{formatFxfAmount(BigInt(purchase.vestedAmount) - BigInt(purchase.releasedAmount))}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Start Date:</span>
                        <span>{formatDate(purchase.startTime)}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Vesting Period:</span>
                        <span>180 days</span>
                      </div>
                      <div className={`${styles.infoRow} ${styles.countdownRow}`}>
                        <span>Time Remaining:</span>
                        <VestingCountdown startTime={purchase.startTime} />
                      </div>
                      {calculateRemainingTime(purchase.startTime).isComplete && (
                        <div className={styles.releaseRow}>
                          <ReleaseButton raffleId={raffle.raffleId} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 