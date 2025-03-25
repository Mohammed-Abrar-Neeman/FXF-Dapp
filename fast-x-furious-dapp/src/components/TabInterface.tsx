'use client'

import { useState } from 'react'
import TokenInfo from './TokenInfo'
import SaleInfo from './SaleInfo'
import AdminPanel from './AdminPanel'

export default function TabInterface() {
  const [activeTab, setActiveTab] = useState('token')

  return (
    <div className="tab-interface">
      <div className="tab-buttons">
        <button 
          className={`tab-button ${activeTab === 'token' ? 'active' : ''}`}
          onClick={() => setActiveTab('token')}
        >
          FXF Token
        </button>
        <button 
          className={`tab-button ${activeTab === 'sale' ? 'active' : ''}`}
          onClick={() => setActiveTab('sale')}
        >
          FXF Sale
        </button>
        <button 
          className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'token' && <TokenInfo />}
        {activeTab === 'sale' && <SaleInfo />}
        {activeTab === 'admin' && <AdminPanel />}
      </div>

      <style jsx>{`
        .tab-interface {
          width: 100%;
          margin: 20px 0;
        }

        .tab-buttons {
          display: flex;
          gap: 2px;
          margin-bottom: 20px;
          border-bottom: 2px solid #eee;
        }

        .tab-button {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          transition: all 0.3s ease;
        }

        .tab-button:hover {
          color: #333;
        }

        .tab-button.active {
          color: #000;
          border-bottom: 2px solid #000;
          margin-bottom: -2px;
        }

        .tab-content {
          padding: 20px 0;
        }
      `}</style>
    </div>
  )
} 