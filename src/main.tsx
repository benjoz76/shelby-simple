import React from 'react'  // <-- PASTIKAN INI ADA!
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { ShelbyClientProvider } from "@shelby-protocol/react"
import { ShelbyClient } from "@shelby-protocol/sdk/browser"
import App from './App'
import './App.css'

const queryClient = new QueryClient()

const shelbyClient = new ShelbyClient({ 
  network: "testnet" as any,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find the root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={false}
        dappConfig={{
          network: "testnet" as any,
        }}
        optInWallets={["Petra"]}
        onError={(error) => {
          console.error("💰 Wallet error:", error)
        }}
      >
        <ShelbyClientProvider client={shelbyClient}>
          <App />
        </ShelbyClientProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)