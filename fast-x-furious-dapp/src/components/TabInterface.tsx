'use client'

import TokenInfo from './TokenInfo'

export default function TabInterface() {
  return (
    <div className="main-container">
      <div className="content-section">
        <TokenInfo />
      </div>

      <style jsx>{`
        .main-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .content-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 32px;
        }

        @media (max-width: 768px) {
          .main-container {
            padding: 20px;
          }

          .content-section {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
} 