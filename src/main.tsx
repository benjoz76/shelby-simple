import { Buffer } from 'buffer'
globalThis.Buffer = Buffer
;(window as any).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { ShelbyClientProvider } from "@shelby-protocol/react"
import { ShelbyClient } from "@shelby-protocol/sdk/browser"
import App from './App'
import './App.css'

const queryClient = new QueryClient()

const shelbyClient = new ShelbyClient({ 
  network: "shelbynet" as any,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  indexer: {
    apiKey: import.meta.env.VITE_SHELBY_API_KEY,
    baseUrl: 'https://api.shelbynet.shelby.xyz/v1/graphql',
  }
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
          network: "shelbynet" as any,
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