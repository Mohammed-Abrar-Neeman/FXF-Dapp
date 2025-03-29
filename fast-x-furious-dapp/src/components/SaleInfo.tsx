'use client'

import { useSaleContractRead } from '@/hooks/useSaleContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatUnits } from 'viem'

export default function SaleInfo() {
  const mounted = useClientMounted()

  // Get prices using the sale contract read hook
  const { data: fxfPrice } = useSaleContractRead('getFxfPrice')
  const { data: ethPrice } = useSaleContractRead('getLatestETHPrice')
  const { data: ethForOneFxf } = useSaleContractRead('calculateEthForFxf', [BigInt(1e18)]) // 1 FXF = 1e18

  if (!mounted) return null

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