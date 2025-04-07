import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import FXFSaleABI from '../abi/FXFSale.json'
import type { Abi } from 'viem'
import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import type { PublicClient } from 'viem'
import type { WriteContractParameters } from 'wagmi/actions'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

interface ReadContractConfig {
  enabled?: boolean
  select?: (data: unknown) => unknown
}

interface TransactionState {
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash: string | null;
  status: 'idle' | 'preparing' | 'pending' | 'success' | 'error';
}

export function useSaleContractRead(
  functionName: string,
  args: readonly unknown[] = [],
  config?: ReadContractConfig
) {
  const { data, isError, isLoading, error } = useReadContract({
    address: SALE_CONTRACT_ADDRESS as `0x${string}`,
    abi: FXFSaleABI as Abi,
    functionName,
    args,
    query: {
      enabled: config?.enabled,
      select: config?.select,
      retry: 2,
    }
  })

  if (isError && error) {
    console.error(`Error reading ${functionName}:`, {
      message: error.message,
      details: error,
      args
    })
  }

  return { data, isError, isLoading, error }
}

export function useSaleContractWrite(functionName: string) {
  const { writeContractAsync, isPending, isSuccess, isError, error, data } = useWriteContract()
  const publicClient = usePublicClient() as PublicClient
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
        address: SALE_CONTRACT_ADDRESS as `0x${string}`,
        abi: FXFSaleABI as Abi,
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
      
      // Handle MetaMask specific errors
      if (err.code) {
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

  return {
    write,
    ...txState
  }
} 