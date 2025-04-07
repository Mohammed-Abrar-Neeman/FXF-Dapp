import type { Metadata } from "next";
import { headers } from 'next/headers'
import ContextProvider from '@/context'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: "Fast X Furious",
  description: "Fast X Furious",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ContextProvider cookies={cookies}>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#22c55e',
                },
              },
              error: {
                duration: 3000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </ContextProvider>
      </body>
    </html>
  );
}
