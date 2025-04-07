import { useState } from 'react'
import { useContractWrite } from '../hooks/useContract'
import { toast } from 'react-hot-toast'

export function TokenApproval() {
  const [amount, setAmount] = useState<string>('')
  const { write, isLoading, isSuccess, error, status, hash } = useContractWrite('approve')

  const handleApprove = async () => {
    try {
      if (!amount) {
        toast.error('Please enter an amount')
        return
      }

      // Convert amount to wei (assuming 18 decimals)
      const amountInWei = BigInt(amount) * BigInt(10 ** 18)

      // The approve function typically takes two parameters:
      // 1. The spender address (the contract that will spend the tokens)
      // 2. The amount to approve
      const spenderAddress = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS as `0x${string}`
      await write([spenderAddress, amountInWei])

      // Show transaction status based on the current state
      switch (status) {
        case 'preparing':
          toast.loading('Preparing transaction...')
          break
        case 'pending':
          toast.loading(`Transaction pending... Hash: ${hash}`)
          break
        case 'success':
          toast.success('Token approval successful!')
          break
        case 'error':
          toast.error(error?.message || 'Transaction failed')
          break
      }
    } catch (err: any) {
      // Extract just the error message before the first newline or "Request Arguments"
      const errorMessage = err.message.split('\n')[0].split('Request Arguments')[0].trim()
      toast.error(errorMessage)
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Token Approval</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount to Approve
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter amount"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleApprove}
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Approving...' : 'Approve Tokens'}
        </button>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error.message.split('\n')[0].split('Request Arguments')[0].trim()}
          </div>
        )}

        {isSuccess && (
          <div className="text-green-500 text-sm mt-2">
            Approval successful! Transaction hash: {hash}
          </div>
        )}
      </div>
    </div>
  )
} 