'use client'

import { useAccount } from 'wagmi'
import { useSaleContractRead } from '../hooks/useSaleContract'

export default function AdminPanel() {
  const { address: userAddress } = useAccount()
  const { data: owner } = useSaleContractRead('owner')

  // Check if current user is admin
  const isAdmin = userAddress && owner && userAddress.toLowerCase() === owner.toLowerCase()

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <h2>Admin Panel</h2>
        <p>You don't have access to this section.</p>

        <style jsx>{`
          .admin-panel {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      {/* We'll add admin functions in the next step */}

      <style jsx>{`
        .admin-panel {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
        }
      `}</style>
    </div>
  )
} 