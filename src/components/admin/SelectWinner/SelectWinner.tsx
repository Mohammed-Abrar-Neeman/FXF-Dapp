'use client'

import { useState } from 'react'
import { useSaleContractWrite, useSaleContractRead } from '@/hooks/useSaleContract'
import { useReadContracts } from 'wagmi'
import { toast } from 'react-hot-toast'
import styles from './SelectWinner.module.css'
import FXFSaleABI from '@/abi/FXFSale.json'
import type { Abi } from 'viem'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

interface RaffleInfo {
  ticketPrice: bigint
  minimumTickets: bigint
  startTime: bigint
  prize: string
  imageURL: string
  completed: boolean
  totalTickets: bigint
  totalAmount: bigint
  winningTicket: bigint
  winner: string
}

export default function SelectWinner() {
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current raffle ID
  const { data: currentRaffleId } = useSaleContractRead('currentRaffleId')

  // Create contract calls for all raffles
  const raffleCalls = currentRaffleId 
    ? Array.from({ length: Number(currentRaffleId) }, (_, index) => ({
        address: SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI as Abi,
        functionName: 'getRaffleInfo',
        args: [BigInt(index + 1)]
      }))
    : []

  // Batch fetch all raffle info
  const { data: raffleResults, isLoading } = useReadContracts({
    contracts: raffleCalls
  })

  // Process raffle results
  const activeRaffles = raffleResults
    ?.map((result, index) => {
      if (!result.result) return null
      const [
        ticketPrice,
        minimumTickets,
        startTime,
        prize,
        imageURL,
        completed,
        totalTickets,
        totalAmount,
        winningTicket,
        winner
      ] = result.result as any[]

      if (completed) return null
      return {
        id: index + 1,
        prize: prize || 'No prize description',
        minimumTickets,
        totalTickets
      }
    })
    .filter((raffle): raffle is {id: number, prize: string, minimumTickets: bigint, totalTickets: bigint} => raffle !== null) || []

  // Select winner function
  const { write: selectWinner } = useSaleContractWrite('selectWinner')

  const handleSelectWinner = async () => {
    if (!selectedRaffleId) {
      toast.error('Please select a raffle')
      return
    }

    try {
      setIsSubmitting(true)
      await selectWinner([BigInt(selectedRaffleId)])
      toast.success('Winner selection process started!')
    } catch (error) {
      console.error('Error selecting winner:', error)
      toast.error('Failed to select winner')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected raffle info
  const selectedRaffle = activeRaffles.find(raffle => raffle.id === Number(selectedRaffleId))
  const canSelectWinner = selectedRaffle && selectedRaffle.totalTickets >= selectedRaffle.minimumTickets

  return (
    <div className={styles.container}>
      <h2>Select Raffle Winner</h2>
      
      <div className={styles.formGroup}>
        <label htmlFor="raffleSelect">Select Raffle</label>
        <select
          id="raffleSelect"
          value={selectedRaffleId}
          onChange={(e) => setSelectedRaffleId(e.target.value)}
          className={styles.select}
          disabled={isLoading || isSubmitting || activeRaffles.length === 0}
        >
          <option value="">Select a raffle</option>
          {activeRaffles.map((raffle) => (
            <option key={raffle.id} value={raffle.id}>
              Raffle #{raffle.id} - {raffle.prize} (Tickets: {raffle.totalTickets.toString()}/{raffle.minimumTickets.toString()})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSelectWinner}
        className={styles.button}
        disabled={isLoading || isSubmitting || !selectedRaffleId || !canSelectWinner}
      >
        {isSubmitting ? 'Selecting Winner...' : 'Select Winner'}
      </button>

      {selectedRaffle && !canSelectWinner && (
        <p className={styles.warning}>
          Cannot select winner: Not enough tickets sold ({selectedRaffle.totalTickets.toString()}/{selectedRaffle.minimumTickets.toString()} required)
        </p>
      )}

      {activeRaffles.length === 0 && !isLoading && (
        <p className={styles.noRaffles}>No active raffles available</p>
      )}
    </div>
  )
} 