import React from 'react'
import BuyRaffleModal from './BuyRaffleModal'

export default function RaffleList() {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedRaffleId, setSelectedRaffleId] = React.useState(0)
  const [ticketPrice, setTicketPrice] = React.useState(BigInt(0))
  const [prize, setPrize] = React.useState('')

  return (
    <div>
      <BuyRaffleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        raffleId={selectedRaffleId}
        ticketPrice={ticketPrice}
        prize={prize}
      />
    </div>
  )
} 