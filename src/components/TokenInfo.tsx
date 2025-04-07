'use client'

import { useContractRead } from '../hooks/useContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'
import styles from './TokenInfo.module.css'

export default function TokenInfo() {
  const mounted = useClientMounted()
  const { address: userAddress } = useAccount()

  // Token basic info
  const { data: name } = useContractRead('name')
  const { data: symbol } = useContractRead('symbol')
  const { data: decimals } = useContractRead('decimals')
  const { data: totalSupply } = useContractRead('totalSupply')
  const { data: userBalance } = useContractRead('balanceOf', [userAddress || '0x0'])

  if (!mounted) return null

  const formatBalance = (value: bigint | undefined) => {
    if (!value || !symbol) return '0'
    try {
      return `${formatEther(value)} ${symbol}`
    } catch (error) {
      return '0'
    }
  }

  return (
    <div className={styles.tokenInfo}>
      <h2 className={styles.title}>Token Information</h2>
      
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <h3>Token Name</h3>
          <p>{(name as string) ?? 'Loading...'}</p>
        </div>

        <div className={styles.infoCard}>
          <h3>Symbol</h3>
          <p>{(symbol as string) ?? 'Loading...'}</p>
        </div>

        <div className={styles.infoCard}>
          <h3>Decimals</h3>
          <p>{(decimals as number)?.toString() ?? 'Loading...'}</p>
        </div>

        <div className={styles.infoCard}>
          <h3>Total Supply</h3>
          <p>{formatBalance(totalSupply as bigint)}</p>
        </div>

        <div className={`${styles.infoCard} ${styles.highlight}`}>
          <h3>Your Balance</h3>
          <p>{formatBalance(userBalance as bigint)}</p>
        </div>
      </div>
    </div>
  )
} 