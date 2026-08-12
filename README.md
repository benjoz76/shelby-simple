# 📦 Shelby Upload - Decentralized File Storage

A web application for uploading, downloading, and managing files on **Shelby Protocol** using **Aptos blockchain** as the coordination layer. Successfully migrated from Aptos Testnet to **Shelbynet**.

## 🚀 Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Connect Wallet (Petra)** | ✅ Working | Connect & disconnect Petra wallet on Shelbynet |
| **Upload File** | ✅ Working | Upload any file type to Shelby decentralized storage |
| **Download File** | ✅ Working | Download files directly from the network |
| **List Files** | ✅ Working | View uploaded files in gallery |
| **Image Preview** | ✅ Working | Preview images directly in the browser |
| **Delete File** | ✅ Working | Soft-delete files from the blockchain |
| **Account Explorer** | ✅ Working | Link to Shelby Explorer |

## 🌐 Network

- **Network:** Shelbynet
- **Aptos RPC:** `https://api.shelbynet.shelby.xyz/v1`
- **Shelby RPC:** `https://api.shelbynet.shelby.xyz/shelby`
- **Indexer:** `https://api.shelbynet.shelby.xyz/v1/graphql`
- **Explorer:** `https://explorer.shelby.xyz`

## 🔧 Technologies Used

- **Frontend:** React 18 + TypeScript + Vite
- **Blockchain:** Aptos (Shelbynet)
- **Storage:** Shelby Protocol
- **Wallet:** Petra Wallet
- **State Management:** TanStack Query
- **Styling:** Custom CSS

## 📦 Package Versions

```json
{
  "@aptos-labs/ts-sdk": "5.2.1",
  "@aptos-labs/wallet-adapter-react": "7.2.8",
  "@shelby-protocol/react": "latest",
  "@shelby-protocol/sdk": "0.6.0",
  "@tanstack/react-query": "5.90.21",
  "react": "18.3.1",
  "react-dom": "18.3.1"
}
```

## 🚀 How to Run

```bash
# Clone repository
git clone https://github.com/benjoz76/shelby-simple

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_SHELBY_API_KEY=your_shelbynet_api_key_from_geomi.dev
VITE_SHELBY_NETWORK=shelbynet
VITE_SHELBY_RPC=https://api.shelbynet.shelby.xyz/shelby
VITE_SHELBY_EXPLORER=https://explorer.shelby.xyz
```

```bash
# Run the application
npm run dev
```

## 📋 Prerequisites

- [Petra Wallet](https://petra.app/) browser extension configured for Shelbynet
- Shelbynet API key from [geomi.dev](https://geomi.dev)
- Aptos account funded with APT and ShelbyUSD on Shelbynet

## 🎉 Migration Notes

This app was originally built on Aptos Testnet and successfully migrated to Shelbynet. Key changes:

- Updated all RPC endpoints to Shelbynet
- Upgraded `@shelby-protocol/sdk` to support Shelbynet schema
- Fixed GraphQL indexer configuration
- Added `shelbynet-1` as location hint for uploads
- Fixed blob name handling for delete operations

## 🔗 Links

- [Shelby Protocol](https://shelby.xyz)
- [Shelby Explorer](https://explorer.shelby.xyz)
- [Shelby Docs](https://docs.shelby.xyz)
- [geomi.dev](https://geomi.dev)

## 📄 License

MIT

Built with ❤️ using Shelby Protocol + Aptos