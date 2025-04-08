'use client'

import { useState } from 'react'
import styles from './BuyRaffleModal.module.css'

interface BuyRaffleModalProps {
  isOpen: boolean
  onClose: () => void
  raffleId: number
  ticketPrice: string
  prize: string
}

export default function BuyRaffleModal({ isOpen, onClose, raffleId, ticketPrice, prize }: BuyRaffleModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'USDT' | 'USDC'>('ETH')

  if (!isOpen) return null

  return (
    <div className={styles.modalRoot}>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Buy Raffle Tickets</h3>
            <button className={styles.closeButton} onClick={onClose}>&times;</button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.raffleInfo}>
              <div className={styles.raffleHeader}>
                <h4>Raffle #{raffleId}</h4>
                <span className={styles.prizeTag}>{prize}</span>
              </div>
              <div className={styles.ticketPrice}>
                <span>Ticket Price:</span>
                <span className={styles.priceValue}>{ticketPrice} FXF</span>
              </div>
            </div>

            <form className={styles.buyForm}>
              <div className={styles.formGroup}>
                <label htmlFor="quantity">Number of Tickets</label>
                <div className={styles.quantityInput}>
                  <button 
                    type="button" 
                    className={styles.quantityBtn}
                    onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  >
                    -
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                  <button 
                    type="button" 
                    className={styles.quantityBtn}
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Payment Method</label>
                <div className={styles.paymentMethods}>
                  {(['ETH', 'USDT', 'USDC'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`${styles.paymentMethodBtn} ${paymentMethod === method ? styles.active : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className={styles.paymentMethodContent}>
                        <span className={styles.methodName}>{method}</span>
                        <span className={styles.methodBalance}>0 {method}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.totalCost}>
                <div className={styles.costRow}>
                  <span>Total FXF:</span>
                  <span className={styles.amount}>0 FXF</span>
                </div>
                <div className={`${styles.costRow} ${styles.highlight}`}>
                  <span>Payment Amount:</span>
                  <span className={styles.amount}>0 {paymentMethod}</span>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Purchase with {paymentMethod}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 