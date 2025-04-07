import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Abi } from 'viem'
import { useState, useEffect } from 'react'
import type { WriteContractParameters } from 'wagmi/actions'
import ERC20ABI from '../abi/ERC20.json'

interface TransactionState {
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash: string | null;
  status: 'idle' | 'preparing' | 'pending' | 'success' | 'error';
}

export function useTokenContractRead(address: string, functionName: string, args: any[] = []) {
  const { data, error, isLoading, refetch } = useReadContract({
    address: address as `0x${string}`,
    abi: ERC20ABI,
    functionName,
    args,
  })

  return {
    data,
    error,
    isLoading,
    refetch
  }
}

export function useTokenContractWrite(address: string, functionName: string) {
  const { writeContractAsync, isPending, isSuccess, isError, error, data } = useWriteContract()
  const [txState, setTxState] = useState<TransactionState>({
    isLoading: false,
    isSuccess: false,
    error: null,
    hash: null,
    status: 'idle'
  })

  const { data: receipt, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({
    hash: txState.hash as `0x${string}` | undefined,
    query: {
      enabled: !!txState.hash,
    }
  })

  useEffect(() => {
    if (isReceiptError) {
      setTxState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: false,
        error: receiptError,
        status: 'error'
      }))
    } else if (receipt) {
      setTxState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        status: 'success'
      }))
    }
  }, [isReceiptError, receipt, receiptError])

  const write = async (args: unknown[] = [], options?: { value?: bigint }) => {
    try {
      setTxState(prev => ({ ...prev, isLoading: true, status: 'preparing' }))

      const config: WriteContractParameters = {
        address: address as `0x${string}`,
        abi: ERC20ABI as Abi,
        functionName,
        args,
        ...options
      }

      const txHash = await writeContractAsync(config) as `0x${string}`

      setTxState(prev => ({
        ...prev,
        hash: txHash,
        status: 'pending'
      }))

      return txHash
    } catch (err: any) {
      let errorMessage = 'Transaction failed'
      
      // Handle RPC errors
      if (err.name === 'HttpRequestError') {
        errorMessage = 'Network error: Please check your internet connection and try again'
      }
      // Handle MetaMask specific errors
      else if (err.code) {
        switch (err.code) {
          case 4001:
            errorMessage = 'Transaction rejected by user'
            break
          case -32603:
            errorMessage = 'Internal JSON-RPC error'
            break
          case -32002:
            errorMessage = 'MetaMask is already processing a request'
            break
          default:
            errorMessage = err.message || 'Transaction failed'
        }
      }

      setTxState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: false,
        error: new Error(errorMessage),
        status: 'error'
      }))

      throw err
    }
  }

  const setHash = (hash: string | null) => {
    setTxState(prev => ({
      ...prev,
      hash,
      isLoading: false,
      status: hash ? 'pending' : 'idle'
    }))
  }

  return {
    write,
    setHash,
    isLoading: txState.isLoading || isPending,
    isSuccess: txState.isSuccess,
    error: txState.error,
    status: txState.status,
    hash: txState.hash
  }
} 