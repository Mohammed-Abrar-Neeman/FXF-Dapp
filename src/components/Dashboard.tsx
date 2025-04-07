'use client'

import TokenInfo from './TokenInfo'
import SaleInfo from './SaleInfo'
import { TokenApproval } from './TokenApproval'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  return (
    <div className={styles.mainContainer}>
      <div className={styles.contentSection}>
        <TokenInfo />
        {/* <BuyToken /> */}
        <SaleInfo />
        <TokenApproval />
      </div>
    </div>
  )
} 