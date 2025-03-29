'use client'

import { useContractRead } from '../hooks/useContract'
import { useClientMounted } from "@/hooks/useClientMount"
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'

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
    <div className="token-info">
      <h2 className="title">Token Information</h2>
      
      <div className="info-grid">
        <div className="info-card">
          <h3>Token Name</h3>
          <p>{(name as string) ?? 'Loading...'}</p>
        </div>

        <div className="info-card">
          <h3>Symbol</h3>
          <p>{(symbol as string) ?? 'Loading...'}</p>
        </div>

        <div className="info-card">
          <h3>Decimals</h3>
          <p>{(decimals as number)?.toString() ?? 'Loading...'}</p>
        </div>

        <div className="info-card">
          <h3>Total Supply</h3>
          <p>{formatBalance(totalSupply as bigint)}</p>
        </div>

        <div className="info-card highlight">
          <h3>Your Balance</h3>
          <p>{formatBalance(userBalance as bigint)}</p>
        </div>
      </div>

      <style jsx>{`
        .token-info {
          width: 100%;
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
          min-width: 0; /* Prevent overflow in grid items */
        }

        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .info-card.highlight {
          background: #e3f2fd;
          border: 1px solid #90caf9;
          grid-column: 1 / -1; /* Make highlight card full width */
        }

        .info-card h3 {
          font-size: 14px;
          color: #666;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card p {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }

          .info-card {
            padding: 20px;
          }

          .info-card p {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  )
} 