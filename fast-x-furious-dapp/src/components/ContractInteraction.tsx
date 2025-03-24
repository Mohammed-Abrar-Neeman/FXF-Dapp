'use client'

import { useContractRead, useContractWrite } from '../hooks/useContract'
import { useClientMounted } from "@/hooks/useClientMount"

export default function ContractInteraction() {
  const mounted = useClientMounted()
  
  // Example read operation
  const { data: readData, isError, isLoading } = useContractRead('decimals')

  // Example write operation
  const { write, isLoading: isWriteLoading } = useContractWrite('transfer', ['0xE0Ff0b33914b395A326ac5d6C2c8a17Ef722891B', '1000000000000000000'])

  if (!mounted) return null

  return (
    <section>
      <h2>Contract Interaction</h2>
      
      {/* Read data example */}
      <div>
        {isLoading ? (
          <p>Loading...</p>
        ) : isError ? (
          <p>Error reading contract</p>
        ) : (
          <p>Decimals: {readData?.toString()}</p>
        )}
      </div>

      {/* Write function example */}
      <button 
        onClick={() => write?.()}
        disabled={isWriteLoading}
      >
        {isWriteLoading ? 'Processing...' : 'Transfer Tokens'}
      </button>
    </section>
  )
} 