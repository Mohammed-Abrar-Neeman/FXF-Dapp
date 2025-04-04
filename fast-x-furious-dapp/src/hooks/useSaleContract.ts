import { useReadContract, useWriteContract } from 'wagmi'
import FXFSaleABI from '../abi/FXFSale.json'
import type { Abi } from 'viem'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

interface ReadContractConfig {
  enabled?: boolean
  select?: (data: unknown) => unknown
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
  const { writeContract, isPending } = useWriteContract()

  const write = (args: unknown[] = [], options?: { value?: bigint }) => {
    writeContract({
      address: SALE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FXFSaleABI as Abi,
      functionName,
      args,
      ...options
    })
  }

  return { write, isLoading: isPending }
} 