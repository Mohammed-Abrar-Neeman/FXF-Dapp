'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'
import UserVestingInfo from './UserVestingInfo'

export default function SaleInfo() {
  const mounted = useClientMounted()

  // Price data
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: ethForOneFxf } = useSaleContractRead('calculateEthForFxf', [BigInt(1e18)])

  // Sale statistics
  const { data: fxfBalance } = useSaleContractRead('getFxfBalance')
  const { data: availableBalance } = useSaleContractRead('getAvailableBalance')
  const { data: tokensSold } = useSaleContractRead('tokensSold')
  const { data: totalVestedAmount } = useSaleContractRead('totalVestedAmount')

  if (!mounted) return null

  // Add debug logging
  console.log('Sale Statistics:', {
    fxfBalance: fxfBalance?.toString(),
    availableBalance: availableBalance?.toString(),
    tokensSold: tokensSold?.toString(),
    totalVestedAmount: totalVestedAmount?.toString()
  })

  const formatFxfPrice = (price: bigint | undefined) => {
    if (!price) return 'Loading...'
    try {
      const formattedPrice = formatUnits(price, 18)
      return `$${Number(formattedPrice).toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      })}`
    } catch (error) {
      console.error('FXF Price formatting error:', error)
      return 'Error'
    }
  }

  const formatEthPrice = (price: bigint | undefined) => {
    if (!price) return 'Loading...'
    try {
      // Chainlink returns price with 8 decimals
      const formattedPrice = formatUnits(price, 8)
      return `$${Number(formattedPrice).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    } catch (error) {
      console.error('ETH Price formatting error:', error)
      return 'Error'
    }
  }

  const formatEthAmount = (amount: bigint | undefined) => {
    if (!amount) return 'Loading...'
    try {
      console.log('ETH amount raw:', amount.toString())
      
      const formattedAmount = formatUnits(amount, 18) // Changed back to 18 decimals
      return `${Number(formattedAmount).toLocaleString(undefined, {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
      })} ETH`
    } catch (error) {
      console.error('ETH Amount formatting error:', error)
      return 'Error'
    }
  }

  const formatFxfAmount = (amount: bigint | undefined) => {
    if (amount === undefined) return 'Loading...'
    try {
      const formattedAmount = formatUnits(amount, 18)
      return `${Number(formattedAmount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} FXF`
    } catch (error) {
      console.error('FXF Amount formatting error:', error)
      return 'Error'
    }
  }

  console.log('Raw prices:', {
    fxfPrice: fxfPrice?.toString(),
    ethPrice: ethPrice?.toString(),
    ethForOneFxf: ethForOneFxf?.toString()
  })

  return (
    <div className="sale-info">
      <h2 className="title">Price Information</h2>
      
      <div className="info-grid">
        <div className="info-card">
          <h3>FXF Price</h3>
          <p>{formatFxfPrice(fxfPrice as bigint)}</p>
        </div>

        <div className="info-card">
          <h3>ETH Price</h3>
          <p>{formatEthPrice(ethPrice as bigint)}</p>
        </div>

        <div className="info-card highlight">
          <h3>ETH for 1 FXF</h3>
          <p>{formatEthAmount(ethForOneFxf as bigint)}</p>
        </div>
      </div>

      <h2 className="title" style={{ marginTop: '40px' }}>Sale Statistics</h2>
      <div className="info-grid">
        <div className="info-card">
          <h3>Available Balance</h3>
          <p>{formatFxfAmount(availableBalance as bigint)}</p>
          <span className="subtitle">Remaining tokens for sale</span>
        </div>

        <div className="info-card">
          <h3>Tokens Sold</h3>
          <p>{formatFxfAmount(tokensSold as bigint)}</p>
          <span className="subtitle">Total FXF tokens sold</span>
        </div>

        <div className="info-card">
          <h3>Total Vested Amount</h3>
          <p>{formatFxfAmount(totalVestedAmount as bigint)}</p>
          <span className="subtitle">Tokens in vesting</span>
        </div>
      </div>

      <UserVestingInfo />

      <style jsx>{`
        .sale-info {
          width: 100%;
          margin-top: 40px;
        }

        .title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          transition: all 0.3s ease;
          min-width: 0;
          position: relative;
        }

        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .info-card h3 {
          font-size: 14px;
          color: #666;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card p {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .subtitle {
          display: block;
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .sale-info {
            margin-top: 32px;
          }

          .info-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
} 