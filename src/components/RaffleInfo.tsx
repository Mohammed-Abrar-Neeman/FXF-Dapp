'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import { useReadContracts, useAccount } from 'wagmi'
import { useMemo, useState } from 'react'
import FXFSaleABI from '../abi/FXFSale.json'
import type { Abi } from 'viem'
import styles from './RaffleInfo.module.css'
import BuyRaffleModal from './BuyRaffleModal'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

export default function RaffleInfo() {
  const mounted = useClientMounted()
  const [selectedRaffle, setSelectedRaffle] = useState<{
    id: number
    ticketPrice: bigint
    prize: string
  } | null>(null)
  
  const { address } = useAccount()
  const isWalletConnected = !!address

  // Get current raffle ID
  const { data: currentRaffleId } = useSaleContractRead('currentRaffleId')

  // Create contract calls for all raffles
  const raffleCalls = useMemo(() => {
    if (!currentRaffleId) return []
    
    return Array.from({ length: Number(currentRaffleId) }, (_, index) => ({
      address: SALE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FXFSaleABI as Abi,
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
    <div className={styles.raffleInfo}>
      <h2 className={styles.title}>All Raffles</h2>
      
      {(!raffleResults || raffleResults.length === 0) ? (
        <div className={styles.noRaffles}>
          <div className={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h3>No Raffles Available</h3>
            <p>There are no active raffles at the moment. Please check back later for new opportunities!</p>
          </div>
        </div>
      ) : (
        <div className={styles.rafflesGrid}>
          {raffleResults?.map((result, index) => {
            if (!result.result) return null

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

            return (
              <div key={index} className={`${styles.raffleCard} ${safeRaffle.completed ? styles.completed : ''}`}>
                <div className={styles.raffleHeader}>
                  <div className={styles.headerContent}>
                    <h3>Raffle #{index + 1}</h3>
                    <span className={styles.prize}>{safeRaffle.prize}</span>
                  </div>
                  <span className={`${styles.status} ${safeRaffle.completed ? styles.completed : styles.active}`}>
                    {safeRaffle.completed ? 'Completed' : 'Active'}
                  </span>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoColumn}>
                    <div className={styles.infoItem}>
                      <label>Ticket Price</label>
                      <span>{formatFxfAmount(safeRaffle.ticketPrice)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Min. Tickets</label>
                      <span>{safeRaffle.minimumTickets.toString()}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Total Tickets</label>
                      <span>{safeRaffle.totalTickets.toString()}</span>
                    </div>
                  </div>

                  <div className={styles.infoColumn}>
                    <div className={styles.infoItem}>
                      <label>Start Time</label>
                      <span>{formatDate(safeRaffle.startTime)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Total Amount</label>
                      <span>{formatFxfAmount(safeRaffle.totalAmount)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Winner</label>
                      <span>{formatAddress(safeRaffle.winner)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.paymentsSection}>
                  <div className={styles.paymentsGrid}>
                    <div className={styles.paymentItem}>
                      <label>ETH</label>
                      <span>{formatEthAmount(safeRaffle.totalEthReceived)}</span>
                    </div>
                    <div className={styles.paymentItem}>
                      <label>USDT</label>
                      <span>{formatUSDAmount(safeRaffle.totalUsdtReceived)}</span>
                    </div>
                    <div className={styles.paymentItem}>
                      <label>USDC</label>
                      <span>{formatUSDAmount(safeRaffle.totalUsdcReceived)}</span>
                    </div>
                  </div>
                </div>

                {!safeRaffle.completed && (
                  <div className={styles.buySection}>
                    <button 
                      className={styles.buyButton}
                      disabled={!isWalletConnected}
                      onClick={() => setSelectedRaffle({
                        id: index + 1,
                        ticketPrice: safeRaffle.ticketPrice,
                        prize: safeRaffle.prize
                      })}
                    >
                      {!isWalletConnected ? 'Connect Wallet' : 'Buy Tickets'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedRaffle && (
        <BuyRaffleModal
          isOpen={!!selectedRaffle}
          onClose={() => setSelectedRaffle(null)}
          raffleId={selectedRaffle.id}
          ticketPrice={selectedRaffle.ticketPrice}
          prize={selectedRaffle.prize}
        />
      )} 
    </div>
  )
} 