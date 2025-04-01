'use client'

import { useSaleContractRead, useSaleContractWrite } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { useMemo, useState, useEffect, useCallback } from 'react'
import FXFSaleABI from '../abi/FXFSale.json'
import { useWaitForTransactionReceipt } from 'wagmi'
import { useWriteContract } from 'wagmi'
import { Toaster, toast } from 'react-hot-toast'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

// Add vesting duration constant (180 days in seconds)
const VESTING_DURATION = 180n * 24n * 60n * 60n // 180 days in seconds

interface VestingPurchase {
  amount: bigint
  releasedAmount: bigint
  startTime: bigint
  vestedAmount: bigint
}

interface RaffleVesting {
  raffleId: bigint
  purchases: VestingPurchase[]
}

// Add a helper function to calculate remaining time
const calculateRemainingTime = (startTime: bigint) => {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const endTime = startTime + VESTING_DURATION
  const remaining = endTime - now

  if (remaining <= 0n) return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true }

  const days = Number(remaining / 86400n)
  const hours = Number((remaining % 86400n) / 3600n)
  const minutes = Number((remaining % 3600n) / 60n)
  const seconds = Number(remaining % 60n)

  return { days, hours, minutes, seconds, isComplete: true }
}

function VestingCountdown({ startTime }: { startTime: bigint }) {
  const [remaining, setRemaining] = useState(calculateRemainingTime(startTime))

  useEffect(() => {
    // Initial calculation
    setRemaining(calculateRemainingTime(startTime))

    // Update every second
    const timer = setInterval(() => {
      const newRemaining = calculateRemainingTime(startTime)
      setRemaining(newRemaining)

      // Clear interval if vesting is complete
      if (newRemaining.isComplete) {
        clearInterval(timer)
      }
    }, 1000) // Update every second instead of minute

    // Cleanup on unmount
    return () => clearInterval(timer)
  }, [startTime])

  if (remaining.isComplete) {
    return <span className="completed">Vesting Complete</span>
  }

  // Format numbers to always show two digits
  const format = (num: number) => num.toString().padStart(2, '0')

  return (
    <span className="countdown">
      {remaining.days}d {format(remaining.hours)}:{format(remaining.minutes)}:{format(remaining.seconds)}
    </span>
  )
}

const decodeContractError = (error: any): string => {
  try {
    console.log('🔍 Raw error:', error)

    // Helper to clean error message
    const cleanErrorMessage = (msg: string): string => {
      // Remove common prefixes
      const prefixes = [
        'execution reverted:',
        'reverted:',
        'FxF:',
        'Error:'
      ]
      
      let cleaned = msg.trim()
      for (const prefix of prefixes) {
        if (cleaned.includes(prefix)) {
          cleaned = cleaned.split(prefix).pop()?.trim() || cleaned
        }
      }
      return cleaned
    }

    // Try to get error from different possible locations
    let errorMessage: string | undefined

    // Check viem error format first
    if (error?.shortMessage) {
      errorMessage = cleanErrorMessage(error.shortMessage)
    }
    // Check error data
    else if (error?.data) {
      errorMessage = cleanErrorMessage(error.data.toString())
    }
    // Check error message
    else if (error?.message) {
      errorMessage = cleanErrorMessage(error.message)
    }
    // Check nested error
    else if (error?.error?.message) {
      errorMessage = cleanErrorMessage(error.error.message)
    }

    // Log the extracted message
    console.log('📝 Extracted error:', {
      original: error?.message || error?.shortMessage || error?.data,
      cleaned: errorMessage,
      timestamp: new Date().toISOString()
    })

    return errorMessage || 'Unknown error'
  } catch (e) {
    console.error('Error decoding contract error:', e)
    return 'Unknown error'
  }
}

function ReleaseButton({ raffleId, isComplete }: { raffleId: bigint, isComplete: boolean }) {
  const [isReleasing, setIsReleasing] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { address: userAddress } = useAccount()

  const { writeContract, isPending, error: writeError } = useWriteContract({
    mutation: {
      onMutate: () => {
        console.log('🚀 Starting release transaction:', {
          raffleId: raffleId.toString(),
          status: 'pending',
          timestamp: new Date().toISOString()
        })
        toast.loading('Preparing transaction...', { id: 'release' })
      },
      onSuccess: (hash: `0x${string}`) => {
        console.log('✅ Release transaction sent:', {
          hash,
          status: 'sent',
          timestamp: new Date().toISOString()
        })
        setTxHash(hash)
        toast.loading('Transaction sent, waiting for confirmation...', { id: 'release' })
      },
      onError: (err: any) => {
        const errorMessage = decodeContractError(err)
        console.error('❌ Contract error:', {
          message: errorMessage,
          raw: err,
          timestamp: new Date().toISOString()
        })
        setIsReleasing(false)
        setTxHash(undefined)
        toast.error(errorMessage, { id: 'release' })
      }
    }
  })

  // Monitor transaction with detailed logging
  const { 
    isLoading: isConfirming, 
    data: txData, 
    isSuccess,
    isError,
    error: txError
  } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    onSuccess: (data) => {
      console.log('✅ Transaction receipt:', {
        hash: txHash,
        status: data.status,
        blockNumber: data.blockNumber,
        from: data.from,
        to: data.to,
        logs: data.logs,
        timestamp: new Date().toISOString()
      })
    }
  })

  // Log state changes
  useEffect(() => {
    if (isConfirming) {
      console.log('⏳ Transaction confirming:', {
        hash: txHash,
        timestamp: new Date().toISOString()
      })
      toast.loading('Confirming transaction...', { id: 'release' })
    }
  }, [isConfirming, txHash])

  // Update transaction error handling
  useEffect(() => {
    if (isError && txError) {
      const errorMessage = decodeContractError(txError)
      // console.error('💥 Transaction error:', {
      //   message: errorMessage,
      //   hash: txHash,
      //   raw: txError,
      //   timestamp: new Date().toISOString()
      // })
      setIsReleasing(false)
      setTxHash(undefined)
      toast.error(errorMessage, { id: 'release' })
    }
  }, [isError, txError, txHash])

  const handleRelease = async () => {
    try {
      if (writeError) {
        console.error('Previous write error:', writeError)
      }
      
      // Log contract call details
      console.log('📝 Release tokens contract call:', {
        contract: SALE_CONTRACT_ADDRESS,
        function: 'releaseVestedTokens',
        params: {
          raffleId: raffleId.toString(),
          caller: userAddress,
        },
        timestamp: new Date().toISOString()
      })
      
      setIsReleasing(true)
      
      await writeContract({
        address: SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI,
        functionName: 'releaseVestedTokens',
        args: [raffleId]
      })
    } catch (error) {
      console.error('Release call error:', {
        error,
        contract: SALE_CONTRACT_ADDRESS,
        function: 'releaseVestedTokens',
        params: {
          raffleId: raffleId.toString(),
          caller: userAddress,
        },
        timestamp: new Date().toISOString()
      })
      setIsReleasing(false)
      setTxHash(undefined)
      toast.error(`Failed to release: ${decodeContractError(error)}`, { id: 'release' })
    }
  }

  const getButtonText = () => {
    if (isPending) return 'Confirm in Wallet...'
    if (isConfirming) return 'Confirming...'
    if (isReleasing) return 'Releasing...'
    return 'Release Tokens'
  }

  if (!isComplete) return null

  return (
    <button 
      onClick={handleRelease}
      disabled={isReleasing || isConfirming || isPending}
      className="release-button"
    >
      {getButtonText()}
      <style jsx>{`
        .release-button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          max-width: 200px;
        }

        .release-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .release-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </button>
  )
}

export default function UserVestingInfo() {
  const mounted = useClientMounted()
  const { address: userAddress } = useAccount()

  // Add refresh interval state (default 1 day in milliseconds)
  const REFRESH_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

  // Get user's raffle IDs
  const { data: userRaffles } = useSaleContractRead('getUserRaffles', [userAddress || '0x0'])

  // Create contract calls for vesting info
  const vestingCalls = useMemo(() => {
    if (!userRaffles?.length) return []
    
    return userRaffles.map((raffleId: bigint) => ({
      address: SALE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FXFSaleABI,
      functionName: 'getVestingPurchases',
      args: [userAddress || '0x0', raffleId]
    }))
  }, [userRaffles, userAddress])

  // Update your batch fetch to include refetch
  const { data: vestingResults, refetch } = useReadContracts({
    contracts: vestingCalls,
    query: {
      // Enable auto background refresh every hour
      refetchInterval: 60 * 60 * 1000
    }
  })

  // Create a refresh function after contract setup
  const refreshVestingData = useCallback(() => {
    console.log('🔄 Refreshing vesting data...')
    if (vestingResults?.length) {
      vestingResults.forEach((result: any, index: number) => {
        console.log(`Refreshing data for raffle ${index + 1}`)
      })
    }
    // Trigger a refetch of the contract data
    refetch?.()
  }, [vestingResults, refetch])

  // Add auto-refresh effect
  useEffect(() => {
    // Initial refresh
    refreshVestingData()

    // Set up interval for periodic refresh
    const intervalId = setInterval(refreshVestingData, REFRESH_INTERVAL)

    // Cleanup on unmount
    return () => clearInterval(intervalId)
  }, [refreshVestingData, REFRESH_INTERVAL])

  // Add manual refresh function
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered')
    refreshVestingData()
  }

  // Process results
  const raffleVestingData = useMemo(() => {
    if (!userRaffles?.length || !vestingResults?.length) return []

    return userRaffles.map((raffleId: bigint, index) => {
      const vestingInfo = vestingResults[index]?.result
      if (!vestingInfo) return null

      const [amounts, releasedAmounts, startTimes, vestedAmounts] = vestingInfo
      
      const purchases = amounts.map((_, purchaseIndex) => ({
        amount: amounts[purchaseIndex],
        releasedAmount: releasedAmounts[purchaseIndex],
        startTime: startTimes[purchaseIndex],
        vestedAmount: vestedAmounts[purchaseIndex]
      }))

      return {
        raffleId,
        purchases
      }
    }).filter(Boolean)
  }, [userRaffles, vestingResults])

  if (!mounted || !userAddress) return null

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

  if (!raffleVestingData?.length) {
    return (
      <div className="vesting-info">
        <h2 className="title">Your Vesting Information</h2>
        <p className="no-data">No vesting schedules found</p>
      </div>
    )
  }

  return (
    <div className="vesting-info">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
      <div className="title-row">
        <h2 className="title">Your Vesting Information</h2>
        <button onClick={handleManualRefresh} className="refresh-button">
          Refresh
        </button>
      </div>
      
      <div className="raffles-grid">
        {raffleVestingData.map((raffle) => (
          <div key={raffle.raffleId.toString()} className="raffle-card">
            <h3>Raffle #{raffle.raffleId.toString()}</h3>
            
            <div className="purchases-grid">
              {raffle.purchases.map((purchase, index) => (
                <div key={index} className="purchase-card">
                  <h4>Purchase #{index + 1}</h4>
                  <div className="purchase-info">
                    <div className="info-row">
                      <span>Total Amount:</span>
                      <span>{formatFxfAmount(purchase.amount)}</span>
                    </div>
                    <div className="info-row">
                      <span>Released:</span>
                      <span>{formatFxfAmount(purchase.releasedAmount)}</span>
                    </div>
                    <div className="info-row">
                      <span>Vested Amount:</span>
                      <span>{formatFxfAmount(BigInt(purchase.vestedAmount))}</span>
                    </div>
                    <div className="info-row">
                      <span>Amount to be Released:</span>
                      <span>{formatFxfAmount(BigInt(purchase.vestedAmount) - BigInt(purchase.releasedAmount))}</span>
                    </div>
                    <div className="info-row">
                      <span>Start Date:</span>
                      <span>{formatDate(BigInt(purchase.startTime))}</span>
                    </div>
                    <div className="info-row">
                      <span>Vesting Period:</span>
                      <span>180 days</span>
                    </div>
                    <div className="info-row countdown-row">
                      <span>Time Remaining:</span>
                      <VestingCountdown startTime={BigInt(purchase.startTime)} />
                    </div>

                    <div className="release-row">
                      <ReleaseButton 
                        raffleId={raffle.raffleId} 
                        isComplete={calculateRemainingTime(BigInt(purchase.startTime)).isComplete}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .vesting-info {
          width: 100%;
          margin-top: 40px;
        }

        .title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
        }

        .no-data {
          text-align: center;
          color: #666;
          padding: 24px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .raffles-grid {
          display: grid;
          gap: 24px;
        }

        .raffle-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .raffle-card h3 {
          font-size: 18px;
          color: #1a1a1a;
          margin: 0 0 16px 0;
        }

        .purchases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .purchase-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
        }

        .purchase-card h4 {
          font-size: 14px;
          color: #666;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .purchase-info {
          display: grid;
          gap: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .info-row span:first-child {
          color: #666;
        }

        .info-row span:last-child {
          font-weight: 500;
          color: #1a1a1a;
        }

        .countdown-row {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #eee;
        }

        .countdown {
          color: #2563eb;
          font-weight: 600;
          font-family: monospace;
          font-size: 1.1em;
        }

        .completed {
          color: #16a34a;
          font-weight: 600;
        }

        .info-row span:last-child {
          font-weight: 500;
          color: #1a1a1a;
          text-align: right;
        }

        @media (max-width: 768px) {
          .purchases-grid {
            grid-template-columns: 1fr;
          }
        }

        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .refresh-button {
          background: #f8f9fa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          background: #e2e8f0;
        }

        .release-row {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: center;
        }

        .release-button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          max-width: 200px;
        }

        .release-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .release-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
} 