'use client'

import { useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { useSaleContractRead } from '@/hooks/useSaleContract'

const USDC_ADDRESS = '0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905'
const USDT_ADDRESS = '0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46'
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

type PaymentMethod = 'ETH' | 'USDT' | 'USDC'

interface BuyRaffleModalProps {
  isOpen: boolean
  onClose: () => void
  raffleId: number
  ticketPrice: bigint
  prize: string
}

export default function BuyRaffleModal({ isOpen, onClose, raffleId, ticketPrice, prize }: BuyRaffleModalProps) {
  // Basic state
  const [quantity, setQuantity] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ETH')
  const { address } = useAccount()

  // Get latest prices
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')

  // Get balances
  const { data: ethBalance } = useBalance({ address })
  const { data: usdcBalance } = useBalance({ address, token: USDC_ADDRESS })
  const { data: usdtBalance } = useBalance({ address, token: USDT_ADDRESS })

  // Helper functions
  const formatFxfAmount = (amount: bigint) => {
    try {
      return formatUnits(amount, 18)
    } catch (error) {
      return '0'
    }
  }

  const calculatePaymentAmount = (fxfAmount: number, method: PaymentMethod) => {
    if (!fxfPrice) return '0'
    
    try {
      switch (method) {
        case 'ETH':
          if (!ethPrice) return '0'
          const usdAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          const ethAmount = usdAmount / Number(formatUnits(ethPrice, 8))
          return ethAmount.toString()
        case 'USDC':
        case 'USDT':
          const stableAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          return stableAmount.toString()
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating payment amount:', error)
      return '0'
    }
  }

  const formatDisplayAmount = (amount: string, method: PaymentMethod) => {
    return `${Number(amount).toFixed(6)} ${method}`
  }

  // Calculate total costs
  const totalFxfCost = Number(formatFxfAmount(ticketPrice)) * quantity
  const paymentAmount = calculatePaymentAmount(totalFxfCost, paymentMethod)

  const getBalanceForMethod = (method: PaymentMethod) => {
    switch (method) {
      case 'ETH':
        return ethBalance ? `${Number(formatUnits(ethBalance.value, 18)).toFixed(4)} ETH` : '0 ETH'
      case 'USDC':
        return usdcBalance ? `${Number(formatUnits(usdcBalance.value, 6)).toFixed(2)} USDC` : '0 USDC'
      case 'USDT':
        return usdtBalance ? `${Number(formatUnits(usdtBalance.value, 6)).toFixed(2)} USDT` : '0 USDT'
      default:
        return '0'
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setQuantity(value)
    }
  }

  // Temporary placeholder functions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit clicked:', { paymentMethod, quantity, paymentAmount })
  }

  if (!isOpen) return null

  return (
    <div className="modal-root">
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Buy Raffle Tickets</h3>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-body">
            <div className="raffle-info">
              <div className="raffle-header">
                <h4>Raffle #{raffleId}</h4>
                <span className="prize-tag">{prize}</span>
              </div>
              <div className="ticket-price">
                <span>Ticket Price:</span>
                <span className="price-value">{formatFxfAmount(ticketPrice)} FXF</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="buy-form">
              <div className="form-group">
                <label htmlFor="quantity">Number of Tickets</label>
                <div className="quantity-input">
                  <button 
                    type="button" 
                    className="quantity-btn"
                    onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  >
                    -
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityChange}
                  />
                  <button 
                    type="button" 
                    className="quantity-btn"
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-methods">
                  {(['ETH', 'USDT', 'USDC'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`payment-method-btn ${paymentMethod === method ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className="payment-method-content">
                        <span className="method-name">{method}</span>
                        <span className="method-balance">{getBalanceForMethod(method)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="total-cost">
                <div className="cost-row">
                  <span>Total FXF:</span>
                  <span className="amount">{totalFxfCost.toFixed(2)} FXF</span>
                </div>
                <div className="cost-row highlight">
                  <span>Payment Amount:</span>
                  <span className="amount">{formatDisplayAmount(paymentAmount, paymentMethod)}</span>
                </div>
              </div>

              <button type="submit" className="submit-btn">
                Buy Tickets
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          pointer-events: none;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 10000;
          pointer-events: auto;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 10001;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #1a1a1a;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 24px;
        }

        .raffle-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .raffle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .raffle-header h4 {
          margin: 0;
          font-size: 18px;
          color: #1a1a1a;
        }

        .prize-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
        }

        .ticket-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #666;
        }

        .price-value {
          font-weight: 500;
          color: #1a1a1a;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .quantity-input {
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .quantity-btn {
          background: #f8f9fa;
          border: none;
          padding: 8px 16px;
          font-size: 18px;
          cursor: pointer;
          color: #1976d2;
        }

        .quantity-input input {
          width: 80px;
          text-align: center;
          border: none;
          padding: 8px;
          font-size: 16px;
        }

        .payment-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .payment-method-btn {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .payment-method-btn.active {
          border-color: #1976d2;
          background: #e3f2fd;
        }

        .payment-method-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .method-name {
          font-weight: 500;
          color: #1a1a1a;
        }

        .method-balance {
          font-size: 12px;
          color: #666;
        }

        .total-cost {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          color: #666;
        }

        .cost-row.highlight {
          border-top: 1px solid #eee;
          margin-top: 8px;
          padding-top: 16px;
          color: #1a1a1a;
          font-weight: 500;
        }

        .amount {
          font-family: monospace;
        }

        .submit-btn {
          width: 100%;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover {
          background: #1565c0;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
} 