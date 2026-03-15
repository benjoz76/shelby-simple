// src/config/networks.ts
export interface NetworkConfig {
  name: string;
  aptosRpc: string;
  aptosIndexer: string;
  shelbyRpc: string;
  shelbyExplorer: string;
  isShelbyNetwork: boolean; // Pembeda: true untuk Shelbynet, false untuk Aptos Testnet
}

export const NETWORKS = {
  shelbynet: {
    name: 'Shelbynet',
    aptosRpc: 'https://api.shelbynet.shelby.xyz/v1',
    aptosIndexer: 'https://api.shelbynet.shelby.xyz/v1/graphql',
    shelbyRpc: 'https://api.shelbynet.shelby.xyz/shelby',
    shelbyExplorer: 'https://explorer.shelby.xyz',
    isShelbyNetwork: true
  },
  aptosTestnet: {
    name: 'Aptos Testnet',
    aptosRpc: 'https://api.testnet.aptoslabs.com/v1',
    aptosIndexer: 'https://api.testnet.aptoslabs.com/v1/graphql',
    shelbyRpc: 'https://api.testnet.shelby.xyz/shelby', // Tetap pakai Shelby RPC
    shelbyExplorer: 'https://explorer.shelby.xyz',
    isShelbyNetwork: false
  }
} as const;

export type NetworkType = keyof typeof NETWORKS;