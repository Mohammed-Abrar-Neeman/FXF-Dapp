'use client'

import { useSaleContractRead, useSaleContractWrite } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { useMemo, useState, useEffect, useCallback } from 'react'
import styles from './UserVestingInfo.module.css'
import { toast } from 'react-hot-toast'
interface VestingData {
  amounts: bigint[]
  releasedAmounts: bigint[]
  startTimes: bigint[]
  vestedAmounts: bigint[]
}

function ReleaseButton({ raffleId, amountToRelease }: { raffleId: bigint, amountToRelease: bigint }) {
  const { write, isLoading, status } = useSaleContractWrite('releaseVestedTokens')

  useEffect(() => {
    if (status === 'error') {
      // Don't show error toast here as we'll handle it in the catch block
    } else if (status === 'success') {
      toast.success('Tokens released successfully!')
    }
  }, [status])

  const handleRelease = async () => {
    try {
      await write([raffleId])
    } catch (error: any) {
      // Handle MetaMask specific errors
      if (error.message?.includes('user rejected')) {
        toast.error('Transaction was rejected by user')
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas')
      } else if (error.message?.includes('nonce')) {
        toast.error('Transaction nonce error. Please try again')
      } else {
        toast.error('Failed to release tokens')
      }
    }
  }

  const isDisabled = amountToRelease === BigInt(0) || isLoading || status === 'preparing' || status === 'pending'

  return (
    <button 
      onClick={handleRelease}
      disabled={isDisabled}
      className={styles.releaseButton}
    >
      {isLoading || status === 'preparing' || status === 'pending' ? 'Releasing...' : 'Release Tokens'}
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
        console.log('Raw vesting duration from contract:', data)
        if (typeof data === 'string' || typeof data === 'number') {
          return BigInt(data)
        }
        // Default to 3600 (1 hour) if no duration is set
        return BigInt(3600)
      }
    }
  )

  // Define calculateRemainingTime first
  const calculateRemainingTime = useCallback((startTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    // Ensure we always have a valid duration
    const duration = (typeof vestingDuration === 'bigint' && vestingDuration > 0) 
      ? vestingDuration 
      : BigInt(3600) // 1 hour in seconds as fallback
    const endTime = startTime + duration

    // Detailed debug logs
    console.log('🕒 Detailed Time Calculation:', {
      currentTime: {
        timestamp: now.toString(),
        date: new Date(Number(now) * 1000).toLocaleString(),
      },
      vestingDetails: {
        startTimestamp: startTime.toString(),
        startDate: new Date(Number(startTime) * 1000).toLocaleString(),
        endTimestamp: endTime.toString(),
        endDate: new Date(Number(endTime) * 1000).toLocaleString(),
        durationSeconds: duration.toString(),
        durationHours: Number(duration) / 3600,
        rawVestingDuration: vestingDuration?.toString() || 'not set'
      },
      conditions: {
        isBeforeStart: now < startTime,
        isDuringVesting: now >= startTime && now < endTime,
        isAfterEnd: now >= endTime
      }
    })

    // If current time is before start time
    if (now < startTime) {
      const remaining = startTime - now
      const days = Number(remaining / BigInt(86400))
      const hours = Number((remaining % BigInt(86400)) / BigInt(3600))
      const minutes = Number((remaining % BigInt(3600)) / BigInt(60))
      const seconds = Number(remaining % BigInt(60))

      console.log('⏳ Time until start:', {
        remaining: remaining.toString(),
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
      })

      return { 
        days, 
        hours, 
        minutes, 
        seconds, 
        isComplete: false,
        notStarted: true,
        isVesting: false
      }
    }

    // If vesting is in progress
    if (now >= startTime && now < endTime) {
      const remaining = endTime - now
      const days = Number(remaining / BigInt(86400))
      const hours = Number((remaining % BigInt(86400)) / BigInt(3600))
      const minutes = Number((remaining % BigInt(3600)) / BigInt(60))
      const seconds = Number(remaining % BigInt(60))

      console.log('⌛ Vesting in progress:', {
        remaining: remaining.toString(),
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
      })

      return { 
        days, 
        hours, 
        minutes, 
        seconds, 
        isComplete: false,
        notStarted: false,
        isVesting: true
      }
    }

    console.log('✅ Vesting completed')

    // Vesting completed
    return { 
      days: 0, 
      hours: 0, 
      minutes: 0, 
      seconds: 0, 
      isComplete: true,
      notStarted: false,
      isVesting: false
    }
  }, [vestingDuration])

  // Then define VestingCountdown with better error handling
  const VestingCountdown = useCallback(({ startTime }: { startTime: bigint }) => {
    const format = (num: number) => num.toString().padStart(2, '0')
    const [remaining, setRemaining] = useState(() => {
      const initial = calculateRemainingTime(startTime)
      console.log('🔄 Initial countdown state:', initial)
      return initial
    })

    useEffect(() => {
      const updateTimer = () => {
        const newRemaining = calculateRemainingTime(startTime)
        console.log('🔄 Updating countdown:', newRemaining)
        setRemaining(newRemaining)
        return newRemaining
      }

      // Initial update
      const initial = updateTimer()

      // Set up interval only if not complete
      const timer = !initial.isComplete ? setInterval(updateTimer, 1000) : null

      return () => {
        if (timer) clearInterval(timer)
      }
    }, [startTime, calculateRemainingTime])

    console.log('🎯 Rendering countdown state:', remaining)

    if (remaining.isComplete) {
      return <span className={styles.completed}>Vesting Complete</span>
    }

    if (remaining.notStarted) {
      return (
        <span className={styles.notStarted}>
          Starts in: {remaining.days}d {format(remaining.hours)}:{format(remaining.minutes)}:{format(remaining.seconds)}
        </span>
      )
    }

    return (
      <span className={styles.countdown}>
        Vesting: {remaining.days}d {format(remaining.hours)}:{format(remaining.minutes)}:{format(remaining.seconds)}
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

  const formatDuration = (duration: unknown) => {
    if (typeof duration === 'bigint') {
      const seconds = Number(duration)
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const remainingSeconds = seconds % 60

      if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`
      } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`
      } else {
        return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
      }
    }
    return '0 seconds'
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
                        <span>Total Vested Amount:</span>
                        <span>{formatFxfAmount(purchase.amount)}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Released:</span>
                        <span>{formatFxfAmount(purchase.releasedAmount)}</span>
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
                        <span>{formatDuration(vestingDuration)}</span>
                      </div>
                      <div className={`${styles.infoRow} ${styles.countdownRow}`}>
                        <span>Time Remaining:</span>
                        <VestingCountdown startTime={purchase.startTime} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.releaseRow}>
                {(() => {
                  const totalToRelease = raffle.purchases.reduce((sum, purchase) => {
                    return sum + (BigInt(purchase.vestedAmount) - BigInt(purchase.releasedAmount));
                  }, BigInt(0));
                  
                  return (
                    <>
                      <div className={styles.amountToRelease}>
                        Amount to be Released: {formatFxfAmount(totalToRelease)}
                      </div>
                      {totalToRelease > BigInt(0) && (
                        <ReleaseButton 
                          raffleId={raffle.raffleId} 
                          amountToRelease={totalToRelease} 
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 