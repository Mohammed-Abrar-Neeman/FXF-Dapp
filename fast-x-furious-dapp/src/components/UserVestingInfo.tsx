'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { useMemo } from 'react'
import FXFSaleABI from '../abi/FXFSale.json'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

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

export default function UserVestingInfo() {
  const mounted = useClientMounted()
  const { address: userAddress } = useAccount()

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

  // Batch fetch all vesting info
  const { data: vestingResults } = useReadContracts({
    contracts: vestingCalls
  })

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
      <h2 className="title">Your Vesting Information</h2>
      
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
                      <span>{formatFxfAmount(BigInt(purchase.amount - purchase.releasedAmount))}</span>
                    </div>
                    <div className="info-row">
                      <span>Start Date:</span>
                      <span>{formatDate(BigInt(purchase.startTime))}</span>
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

        @media (max-width: 768px) {
          .purchases-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
} 