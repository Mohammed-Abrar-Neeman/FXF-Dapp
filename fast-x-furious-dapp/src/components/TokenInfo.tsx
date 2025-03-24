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
  const { data: userBalance } = useContractRead('balanceOf', [userAddress])

  if (!mounted) return null

  return (
    <section className="token-info">
      <h2>FxF Token Information</h2>
      <div className="info-grid">
        <div className="info-item">
          <label>Name:</label>
          <span>{name?.toString() || 'Loading...'}</span>
        </div>
        
        <div className="info-item">
          <label>Symbol:</label>
          <span>{symbol?.toString() || 'Loading...'}</span>
        </div>

        <div className="info-item">
          <label>Decimals:</label>
          <span>{decimals?.toString() || 'Loading...'}</span>
        </div>

        <div className="info-item">
          <label>Total Supply:</label>
          <span>
            {totalSupply ? `${formatEther(totalSupply as bigint)} ${symbol}` : 'Loading...'}
          </span>
        </div>

        <div className="info-item">
          <label>Your Balance:</label>
          <span>
            {userBalance ? `${formatEther(userBalance as bigint)} ${symbol}` : 'Loading...'}
          </span>
        </div>
      </div>

      <style jsx>{`
        .token-info {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .info-grid {
          display: grid;
          gap: 16px;
          margin-top: 16px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        label {
          font-weight: 600;
          color: #666;
        }

        span {
          color: #333;
          font-family: monospace;
        }
      `}</style>
    </section>
  )
} 