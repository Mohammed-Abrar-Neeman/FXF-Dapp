'use client'

import { useState } from 'react'
import { formatUnits } from 'viem'
import { useAccount, useBalance, useToken } from 'wagmi'
import { useSaleContractRead } from '@/hooks/useSaleContract'

const USDC_ADDRESS = '0x6DCb60F143Ba8F34e87BC3EceaE49960D490D905' // Replace with actual address
const USDT_ADDRESS = '0x4754EF95d4bcBDfF762f2D75CbaD0429967ced46' // Replace with actual address

type PaymentMethod = 'ETH' | 'USDT' | 'USDC'

interface BuyRaffleModalProps {
  isOpen: boolean
  onClose: () => void
  raffleId: number
  ticketPrice: bigint
  prize: string
}

export default function BuyRaffleModal({ isOpen, onClose, raffleId, ticketPrice, prize }: BuyRaffleModalProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ETH')
  const { address } = useAccount()

  // Get balances
  const { data: ethBalance } = useBalance({
    address,
  })

  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
  })

  const { data: usdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
  })

  // Get latest prices
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')

  if (!isOpen) return null

  const formatFxfAmount = (amount: bigint) => {
    try {
      return formatUnits(amount, 18)
    } catch (error) {
      return '0'
    }
  }

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

  const calculatePaymentAmount = (fxfAmount: number, method: PaymentMethod) => {
    if (!fxfPrice) return '0'
    
    try {
      switch (method) {
        case 'ETH':
          if (!ethPrice) return '0 ETH'
          // Convert FXF amount to USD, then to ETH
          const usdAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          const ethAmount = usdAmount / Number(formatUnits(ethPrice, 8))
          return `${ethAmount.toFixed(6)} ETH`
        case 'USDC':
        case 'USDT':
          // For stable coins, just convert FXF to USD
          const stableAmount = fxfAmount * Number(formatUnits(fxfPrice, 18))
          return `${stableAmount.toFixed(6)} ${method}`
        default:
          return '0'
      }
    } catch (error) {
      console.error('Error calculating payment amount:', error)
      return '0'
    }
  }

  const totalFxfCost = Number(formatFxfAmount(ticketPrice)) * quantity
  const paymentAmount = calculatePaymentAmount(totalFxfCost, paymentMethod)

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setQuantity(value)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Purchasing tickets:', {
      raffleId,
      quantity,
      totalFxfCost,
      paymentMethod
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Buy Raffle Tickets</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="raffle-info">
            <p><strong>Raffle #{raffleId}</strong></p>
            <p>Prize: {prize}</p>
            <p>Ticket Price: {formatFxfAmount(ticketPrice)} FXF</p>
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
                <span>{totalFxfCost.toFixed(6)} FXF</span>
              </div>
              <div className="cost-row">
                <span>Payment Amount:</span>
                <span>{paymentAmount}</span>
              </div>
            </div>

            <div className="submit-container">
              <button type="submit" className="submit-btn">
                Purchase with {paymentMethod}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          color: #666;
        }

        .close-button:hover {
          color: #1a1a1a;
        }

        .modal-body {
          padding: 16px;
        }

        .raffle-info {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .raffle-info p {
          margin: 0 0 8px 0;
        }

        .raffle-info p:last-child {
          margin: 0;
        }

        .buy-form {
          margin-top: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .quantity-input {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 auto;
          width: fit-content;
        }

        .quantity-input input {
          width: 80px;
          text-align: center;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          margin: 0 8px;
        }

        .quantity-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 6px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          color: #666;
          transition: all 0.2s ease;
        }

        .quantity-btn:hover {
          background: #e9ecef;
          border-color: #1976d2;
          color: #1976d2;
        }

        .payment-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .payment-method-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .method-name {
          font-weight: 500;
        }

        .method-balance {
          font-size: 12px;
          opacity: 0.8;
        }

        .payment-method-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s ease;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .payment-method-btn:hover {
          border-color: #1976d2;
          color: #1976d2;
        }

        .payment-method-btn.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }

        .payment-method-btn.active .method-balance {
          color: rgba(255, 255, 255, 0.9);
        }

        .total-cost {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .cost-row:last-child {
          padding-top: 8px;
          border-top: 1px solid #eee;
          font-weight: 500;
        }

        .submit-container {
          display: flex;
          justify-content: center;
          width: 100%;
          padding: 0 16px;
        }

        .submit-btn {
          width: 100%;
          max-width: 200px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          background: #1565c0;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .submit-btn:active {
          transform: translateY(0);
          box-shadow: none;
        }

        /* Hide number input arrows */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
} 