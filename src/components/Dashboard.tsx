'use client'

import TokenInfo from './TokenInfo'
import SaleInfo from './SaleInfo'
import { BuyToken } from './BuyToken'
import styles from './Dashboard.module.css'
import RaffleInfo from './RaffleInfo'
export default function Dashboard() {
  return (
    <div className={styles.mainContainer}>
      <div className={styles.contentSection}>
        <TokenInfo />
        <BuyToken />
        <SaleInfo />
        <RaffleInfo />
      </div>
    </div>
  )
} 