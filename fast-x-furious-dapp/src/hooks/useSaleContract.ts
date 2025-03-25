import { useReadContract, useWriteContract } from 'wagmi'
import FXFSaleABI from '../abi/FXFSale.json'

const SALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS || ''

export function useSaleContractRead(functionName: string, args: any[] = []) {
  return useReadContract({
    address: SALE_CONTRACT_ADDRESS as `0x${string}`,
    abi: FXFSaleABI,
    functionName,
    args,
  })
}

export function useSaleContractWrite(functionName: string) {
  const { writeContract, isPending } = useWriteContract()

  const write = (args: any[] = [], options?: { value?: bigint }) => {
    writeContract({
      address: SALE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FXFSaleABI,
      functionName,
      args,
      ...options
    })
  }

  return { write, isLoading: isPending }
} 