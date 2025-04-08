'use client'

import TokenInfo from '../TokenInfo/TokenInfo'
import SaleInfo from '../SaleInfo/SaleInfo'
import { BuyToken } from '../BuyToken/BuyToken'
import RaffleInfo from '../RaffleInfo/RaffleInfo'
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