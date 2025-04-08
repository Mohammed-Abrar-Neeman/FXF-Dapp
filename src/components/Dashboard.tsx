'use client'

import TokenInfo from './TokenInfo'
import SaleInfo from './SaleInfo'
import { BuyToken } from './BuyToken'
import RaffleInfo from './RaffleInfo'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  return (
    <main className={styles.mainContainer}>
      <div className={styles.contentSection}>
        <TokenInfo />
        <BuyToken />
        <SaleInfo />
        <RaffleInfo />
      </div>
    </main>
  )
} 