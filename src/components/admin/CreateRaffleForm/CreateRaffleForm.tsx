'use client'

import { useState } from 'react';
import { useSaleContractWrite } from '@/hooks/useSaleContract';
import { parseUnits } from 'viem';
import { toast } from 'react-hot-toast';
import styles from './CreateRaffleForm.module.css';

export default function CreateRaffleForm() {
  const [ticketPrice, setTicketPrice] = useState('');
  const [minimumTickets, setMinimumTickets] = useState('');
  const [startTime, setStartTime] = useState('');
  const [prize, setPrize] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { write: createRaffle } = useSaleContractWrite('createRaffle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketPrice || !minimumTickets || !startTime || !prize || !imageUrl) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate start time is in the future
    const selectedTime = new Date(startTime).getTime();
    const currentTime = Date.now();
    
    if (selectedTime <= currentTime) {
      toast.error('Start time must be in the future');
      return;
    }

    try {
      setIsLoading(true);
      const ticketPriceWei = parseUnits(ticketPrice, 18);
      const minimumTicketsNum = BigInt(minimumTickets);
      const startTimeNum = BigInt(Math.floor(selectedTime / 1000));

      // Log all values being passed to the contract
      console.log('Creating raffle with values:', {
        ticketPrice: {
          input: ticketPrice,
          wei: ticketPriceWei.toString(),
          formatted: `${ticketPrice} FXF`
        },
        minimumTickets: {
          input: minimumTickets,
          bigInt: minimumTicketsNum.toString(),
          formatted: `${minimumTickets} tickets`
        },
        startTime: {
          input: startTime,
          timestamp: startTimeNum.toString(),
          formatted: new Date(startTime).toLocaleString(),
          currentTime: new Date(currentTime).toLocaleString()
        },
        prize: {
          input: prize,
          formatted: prize
        },
        imageUrl: {
          input: imageUrl,
          formatted: imageUrl
        }
      });

      await createRaffle([
        ticketPriceWei,
        minimumTicketsNum,
        startTimeNum,
        prize,
        imageUrl
      ]);

      toast.success('Raffle created successfully!');
      setTicketPrice('');
      setMinimumTickets('');
      setStartTime('');
      setPrize('');
      setImageUrl('');
    } catch (error) {
      console.error('Error creating raffle:', error);
      toast.error('Failed to create raffle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="ticketPrice">Ticket Price (FXF)</label>
        <input
          type="number"
          id="ticketPrice"
          value={ticketPrice}
          onChange={(e) => setTicketPrice(e.target.value)}
          placeholder="Enter ticket price"
          min="0"
          step="0.000001"
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="minimumTickets">Minimum Tickets</label>
        <input
          type="number"
          id="minimumTickets"
          value={minimumTickets}
          onChange={(e) => setMinimumTickets(e.target.value)}
          placeholder="Enter minimum tickets required"
          min="1"
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="startTime">Start Time</label>
        <input
          type="datetime-local"
          id="startTime"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="prize">Prize Description</label>
        <input
          type="text"
          id="prize"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="Enter prize description"
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="imageUrl">Image URL</label>
        <input
          type="url"
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter image URL"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Raffle'}
      </button>
    </form>
  );
} 