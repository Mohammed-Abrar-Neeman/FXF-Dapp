'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useAccount } from 'wagmi'
import { useClientMounted } from "@/hooks/useClientMount"
import CreateRaffleForm from '@/components/admin/CreateRaffleForm/CreateRaffleForm'
import SelectWinner from '@/components/admin/SelectWinner/SelectWinner'
import styles from './admin.module.css'
import { ConnectButton } from "@/components/ConnectButton"

export default function AdminPage() {
  const mounted = useClientMounted()
  const { address, isConnected } = useAccount()
  const { data: owner, isLoading: isOwnerLoading } = useSaleContractRead('owner')

  if (!mounted) return null

  // Ensure owner is a string before comparison
  const isAdmin = isConnected && 
    address && 
    owner && 
    typeof owner === 'string' && 
    address.toLowerCase() === owner.toLowerCase()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <ConnectButton />
      </div>
      
      {!isConnected ? (
        <div className={styles.connectMessage}>
          <p>Please connect your wallet to access the admin dashboard</p>
        </div>
      ) : isOwnerLoading ? (
        <div className={styles.loading}>
          <p>Loading admin status...</p>
        </div>
      ) : !isAdmin ? (
        <div className={styles.accessDenied}>
          <h1>Access Denied</h1>
          <p>Only the contract owner can access this page.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Create New Raffle</h2>
            <CreateRaffleForm />
          </div>
          <div className={styles.card}>
            <h2>Select Winner</h2>
            <SelectWinner/>
          </div>
        </div>
      )}
    </div>
  )
} 