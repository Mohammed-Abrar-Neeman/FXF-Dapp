import { useReadContract, useWriteContract } from 'wagmi'
import FxFABI from '../abi/FxF.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''

export function useContractRead(functionName: string, args: any[] = []) {
  return useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: FxFABI,
    functionName,
    args,
  })
}

export function useContractWrite(functionName: string, args: any[] = []) {
  const { writeContract, isPending } = useWriteContract()

  const write = () => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: FxFABI,
      functionName,
      args,
    })
  }

  return { write, isLoading: isPending }
} 