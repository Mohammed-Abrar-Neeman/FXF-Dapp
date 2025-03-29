'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useReadContracts } from 'wagmi'
import { useMemo, useState } from 'react'
import FXFSaleABI from '../abi/FXFSale.json'
import BuyRaffleModal from './BuyRaffleModal'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

interface Raffle {
  ticketPrice: bigint
  minimumTickets: bigint
  startTime: bigint
  prize: string
  completed: boolean
  totalTickets: bigint
  totalAmount: bigint
  winner: string
  winningTicket: bigint
  totalEthReceived: bigint
  totalUsdtReceived: bigint
  totalUsdcReceived: bigint
}

export default function RaffleInfo() {
  const mounted = useClientMounted()
  const [selectedRaffle, setSelectedRaffle] = useState<{
    id: number
    ticketPrice: bigint
    prize: string
  } | null>(null)

  // Get current raffle ID
  const { data: currentRaffleId } = useSaleContractRead('currentRaffleId')

  // Create contract calls for all raffles
  const raffleCalls = useMemo(() => {
    if (!currentRaffleId) return []
    
    return Array.from({ length: Number(currentRaffleId) }, (_, index) => ({
      address: SALE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FXFSaleABI,
      functionName: 'raffles',
      args: [BigInt(index + 1)]
    }))
  }, [currentRaffleId])

  // Batch fetch all raffle info
  const { data: raffleResults } = useReadContracts({
    contracts: raffleCalls
  })

  if (!mounted) return null

  const formatFxfAmount = (amount: bigint | undefined) => {
    if (!amount) return '0 FXF'
    try {
      return `${formatUnits(amount, 18)} FXF`
    } catch (error) {
      console.error('FXF formatting error:', error)
      return '0 FXF'
    }
  }

  const formatEthAmount = (amount: bigint | undefined) => {
    if (!amount) return '0 ETH'
    try {
      return `${formatUnits(amount, 18)} ETH`
    } catch (error) {
      console.error('ETH formatting error:', error)
      return '0 ETH'
    }
  }

  const formatUSDAmount = (amount: bigint | undefined) => {
    if (!amount) return '$0'
    try {
      return `$${formatUnits(amount, 6)}`
    } catch (error) {
      console.error('USD formatting error:', error)
      return '$0'
    }
  }

  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return 'TBA'
    try {
      const date = new Date(Number(timestamp) * 1000)
      return date.toLocaleDateString()
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  const formatAddress = (address: string | undefined) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'Not Selected'
    try {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    } catch (error) {
      console.error('Address formatting error:', error)
      return 'Invalid address'
    }
  }

  // Add debug logging
  console.log('Raffle Results:', raffleResults?.map(r => r.result))

  return (
    <div className="raffle-info">
      <h2 className="title">All Raffles</h2>
      
      <div className="raffles-grid">
        {raffleResults?.map((result, index) => {
          if (!result.result) return null

          // The result is an array, so we need to destructure it properly
          const [
            ticketPrice,
            minimumTickets,
            startTime,
            prize,
            completed,
            totalTickets,
            totalAmount,
            winner,
            winningTicket,
            totalEthReceived,
            totalUsdtReceived,
            totalUsdcReceived
          ] = result.result as any[]

          const safeRaffle = {
            ticketPrice: BigInt(ticketPrice?.toString() || '0'),
            minimumTickets: BigInt(minimumTickets?.toString() || '0'),
            startTime: BigInt(startTime?.toString() || '0'),
            prize: prize || 'TBA',
            completed: completed || false,
            totalTickets: BigInt(totalTickets?.toString() || '0'),
            totalAmount: BigInt(totalAmount?.toString() || '0'),
            winner: winner || '0x0',
            winningTicket: BigInt(winningTicket?.toString() || '0'),
            totalEthReceived: BigInt(totalEthReceived?.toString() || '0'),
            totalUsdtReceived: BigInt(totalUsdtReceived?.toString() || '0'),
            totalUsdcReceived: BigInt(totalUsdcReceived?.toString() || '0')
          }

          // Add debug logging
          console.log('Raffle data:', {
            raw: result.result,
            processed: safeRaffle
          })

          return (
            <div key={index} className={`raffle-card ${safeRaffle.completed ? 'completed' : ''}`}>
              <div className="raffle-header">
                <div className="header-content">
                  <h3>Raffle #{index + 1}</h3>
                  <span className="prize">{safeRaffle.prize}</span>
                </div>
                <span className={`status ${safeRaffle.completed ? 'completed' : 'active'}`}>
                  {safeRaffle.completed ? 'Completed' : 'Active'}
                </span>
              </div>

              <div className="info-grid">
                <div className="info-column">
                  <div className="info-item">
                    <label>Ticket Price</label>
                    <span>{formatFxfAmount(safeRaffle.ticketPrice)}</span>
                  </div>
                  <div className="info-item">
                    <label>Min. Tickets</label>
                    <span>{safeRaffle.minimumTickets.toString()}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Tickets</label>
                    <span>{safeRaffle.totalTickets.toString()}</span>
                  </div>
                </div>

                <div className="info-column">
                  <div className="info-item">
                    <label>Start Time</label>
                    <span>{formatDate(safeRaffle.startTime)}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Amount</label>
                    <span>{formatFxfAmount(safeRaffle.totalAmount)}</span>
                  </div>
                  <div className="info-item">
                    <label>Winner</label>
                    <span>{formatAddress(safeRaffle.winner)}</span>
                  </div>
                </div>
              </div>

              <div className="payments-section">
                <div className="payments-grid">
                  <div className="payment-item">
                    <label>ETH</label>
                    <span>{formatEthAmount(safeRaffle.totalEthReceived)}</span>
                  </div>
                  <div className="payment-item">
                    <label>USDT</label>
                    <span>{formatUSDAmount(safeRaffle.totalUsdtReceived)}</span>
                  </div>
                  <div className="payment-item">
                    <label>USDC</label>
                    <span>{formatUSDAmount(safeRaffle.totalUsdcReceived)}</span>
                  </div>
                </div>
              </div>

              {!safeRaffle.completed && (
                <div className="buy-section">
                  <button 
                    className="buy-button"
                    onClick={() => setSelectedRaffle({
                      id: index + 1,
                      ticketPrice: safeRaffle.ticketPrice,
                      prize: safeRaffle.prize
                    })}
                  >
                    Buy Tickets
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BuyRaffleModal
        isOpen={!!selectedRaffle}
        onClose={() => setSelectedRaffle(null)}
        raffleId={selectedRaffle?.id || 0}
        ticketPrice={selectedRaffle?.ticketPrice || BigInt(0)}
        prize={selectedRaffle?.prize || ''}
      />

      <style jsx>{`
        .raffle-info {
          width: 100%;
          margin-top: 40px;
        }

        .title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
        }

        .raffles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .raffle-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #eee;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .raffle-card.completed {
          background: #f8f9fa;
        }

        .raffle-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .raffle-header h3 {
          font-size: 16px;
          margin: 0;
          color: #666;
        }

        .prize {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .status {
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
        }

        .status.active {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status.completed {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .info-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .info-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-item label {
          color: #666;
          font-size: 12px;
        }

        .info-item span {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .payments-section {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .payments-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .payment-item {
          background: #f8f9fa;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
        }

        .payment-item label {
          display: block;
          font-size: 11px;
          color: #666;
          margin-bottom: 2px;
        }

        .payment-item span {
          font-size: 12px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .buy-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .buy-button {
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          max-width: 200px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .buy-button:hover {
          background: #1565c0;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .buy-button:active {
          transform: translateY(0);
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .raffles-grid {
            grid-template-columns: 1fr;
          }

          .raffle-card {
            padding: 12px;
          }

          .buy-section {
            padding-top: 10px;
            margin-top: 10px;
          }

          .buy-button {
            padding: 8px 12px;
            font-size: 13px;
            min-height: 36px;
          }
        }

        @media (max-width: 480px) {
          .raffle-card {
            padding: 10px;
          }

          .buy-button {
            padding: 8px;
            font-size: 12px;
            min-height: 32px;
          }
        }
      `}</style>
    </div>
  )
} 