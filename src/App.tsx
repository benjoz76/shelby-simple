import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import { useState, useRef } from "react"
import { 
  useAccountBlobs,
  useUploadBlobs,
  useDeleteObject
} from "@shelby-protocol/react"
import { ShelbyClient } from "@shelby-protocol/sdk/browser"
import { shortenAddress, formatBlobSize } from "./types/shelby"
import { 
  deleteFile, 
  downloadFile, 
  previewFile, 
  isImageFile 
} from "./utils/shelbyUpload"
import './App.css'

const SHELBY_CONFIG = {
  network: "shelbynet",
  apiKey: import.meta.env.VITE_SHELBY_API_KEY || "",
  nodeUrl: import.meta.env.VITE_SHELBY_RPC || "https://api.shelbynet.shelby.xyz/shelby",
  explorer: import.meta.env.VITE_SHELBY_EXPLORER || "https://explorer.shelby.xyz"
}

const SHELBY_LOCATION_HINT = "shelbynet-1"

export const shelbyClient = new ShelbyClient({ 
  network: "shelbynet" as any,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  indexer: {
    apiKey: import.meta.env.VITE_SHELBY_API_KEY,
    baseUrl: 'https://api.shelbynet.shelby.xyz/v1/graphql',
  }
})

const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: 'https://api.shelbynet.shelby.xyz/v1',
  indexer: 'https://api.shelbynet.shelby.xyz/v1/graphql',
  clientConfig: {
    HEADERS: {
      'Authorization': `Bearer ${import.meta.env.VITE_SHELBY_API_KEY}`
    }
  }
})
export const aptosClient = new Aptos(aptosConfig)

// Helper buat clean nama blob
const cleanBlobName = (name: string): string => {
  if (!name) return name
  // Hapus prefix @address/ kalau ada
  if (name.startsWith('@')) {
    const parts = name.split('/')
    return parts.slice(1).join('/')
  }
  return name
}

function App() {
  const { connected, account, connect, disconnect, wallets, signAndSubmitTransaction } = useWallet() as any
  const [showWalletList, setShowWalletList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFileUrl, setPreviewFileUrl] = useState<{ url: string; name: string } | null>(null)

  const availableWallets = wallets || []
  
  const getAccountAddress = (): string => {
    if (!account) return ''
    try {
      if (account.address) {
        if (typeof account.address === 'string') return account.address
        if (account.address.toString) return account.address.toString()
      }
    } catch (error) {
      console.error("Error getting address:", error)
    }
    return ''
  }

  const accountAddress = getAccountAddress()
  
  const { 
    data: blobs = [], 
    isLoading: isLoadingBlobs,
    refetch: refetchBlobs,
    error: blobsError
  } = useAccountBlobs({
    client: shelbyClient,
    account: accountAddress,
    pagination: { limit: 50, offset: 0 },
    enabled: connected && !!accountAddress,
  })

  const uploadMutation = useUploadBlobs({
    client: shelbyClient,
    onSuccess: () => {
      console.log("✅ Upload complete!")
      refetchBlobs()
    },
    onError: (error: any) => {
      console.error("❌ Upload error:", error)
    }
  })

  const deleteMutation = useDeleteObject({
    client: shelbyClient,
    onSuccess: () => {
      console.log("✅ Delete successful!")
      refetchBlobs()
    },
    onError: (error: any) => {
      console.error("❌ Delete error:", error)
    }
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (!connected || !account || !accountAddress || !signAndSubmitTransaction) {
      alert("Wallet not connected properly")
      return
    }

    try {
      const fileData = new Uint8Array(await file.arrayBuffer())
      const blobName = file.name
      const signer = { signAndSubmitTransaction, account } as any

      try {
        if (shelbyClient && 'initializeAccount' in shelbyClient) {
          await (shelbyClient as any).initializeAccount({ signer })
        }
      } catch (e) {
        console.log("Init account skipped:", e)
      }

      uploadMutation.mutate({
        signer,
        blobs: [{ blobName, blobData: fileData }],
        expirationMicros: (Date.now() * 1000) + 86400000000,
        options: {
          selectedLocation: SHELBY_LOCATION_HINT,
          locationHint: SHELBY_LOCATION_HINT,
        }
      }, {
        onSuccess: () => {
          alert("✅ Upload successful!")
          refetchBlobs()
        },
        onError: (error) => {
          alert("Upload failed: " + error.message)
        }
      })
      
    } catch (error) {
      alert("Upload failed: " + (error as Error).message)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (fileName: string) => {
    if (!accountAddress) return
    await downloadFile({
      fileName: cleanBlobName(fileName),
      accountAddress,
      nodeUrl: SHELBY_CONFIG.nodeUrl,
      apiKey: SHELBY_CONFIG.apiKey,
      onError: (error) => {
        alert("Download failed: " + error.message)
      }
    })
  }

  const handlePreview = async (fileName: string) => {
    if (!accountAddress) return
    const url = await previewFile({
      fileName: cleanBlobName(fileName),
      accountAddress,
      nodeUrl: SHELBY_CONFIG.nodeUrl,
      apiKey: SHELBY_CONFIG.apiKey,
      onError: (error) => {
        alert("Preview failed: " + error.message)
      }
    })
    if (url) {
      setPreviewFileUrl({ url, name: cleanBlobName(fileName) })
    }
  }

  const handleExplorer = (fileName?: string) => {
    if (!accountAddress) return
    const explorerUrl = `${SHELBY_CONFIG.explorer}/shelbynet/account/${accountAddress}`
    window.open(explorerUrl, '_blank')
  }

  const handleDelete = async (fileName: string) => {
    const cleanName = cleanBlobName(fileName)
    console.log("🗑️ Deleting:", cleanName)
    if (!accountAddress) return
    if (!window.confirm(`Delete ${cleanName}?`)) return
    
    try {
      const { signer, blobName } = await deleteFile({
        fileName: cleanName,
        account,
        signAndSubmitTransaction,
        accountAddress
      })

      deleteMutation.mutate({
        signer,
        blobName,
      }, {
        onSuccess: () => {
          alert("✅ File deleted")
          refetchBlobs()
        },
        onError: (error) => {
          alert("Delete failed: " + error.message)
        }
      })
      
    } catch (error) {
      alert("Delete failed: " + (error as Error).message)
    }
  }

  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">📦 Shelby Upload</h1>
          
          {!connected ? (
            <button onClick={() => setShowWalletList(true)} className="btn btn-blue">
              🔌 Connect Wallet
            </button>
          ) : (
            <div className="wallet-group">
              <span className="wallet-address">{shortenAddress(accountAddress)}</span>
              <button onClick={disconnect} className="btn btn-red">Disconnect</button>
            </div>
          )}

          {connected && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className={`btn ${isUploading ? 'btn-disabled' : 'btn-blue'}`}>
                {isUploading ? '⏳ Uploading...' : '📤 Upload File'}
              </label>
            </>
          )}
        </div>

        <div className="header-right">
          <button onClick={() => handleExplorer()} className="btn btn-blue">
            🔍 Account Explorer
          </button>
        </div>
      </header>

      {showWalletList && (
        <div className="modal-overlay" onClick={() => setShowWalletList(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Select Wallet</h3>
            {availableWallets.length === 0 ? (
              <p style={{ color: 'red', textAlign: 'center' }}>
                No wallet detected.<br/>Please install Petra wallet first!
              </p>
            ) : (
              availableWallets.map((wallet: any) => (
                <button
                  key={wallet.name}
                  onClick={() => { connect(wallet.name); setShowWalletList(false) }}
                  className="wallet-option"
                  style={{ background: wallet.name === 'Petra' ? '#e3f2fd' : '#f5f5f5' }}
                >
                  {wallet.name} {wallet.name === 'Petra' && '🌟 (Recommended)'}
                </button>
              ))
            )}
            <button onClick={() => setShowWalletList(false)} className="btn btn-red" style={{ marginTop: '15px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="main">
        {connected && isLoadingBlobs && (
          <div className="empty-state"><p>⏳ Loading your files...</p></div>
        )}

        {connected && blobsError && (
          <div className="empty-state error">
            <p>❌ Error loading files</p>
            <p className="empty-state-sub">{(blobsError as any)?.message || 'Unknown error'}</p>
          </div>
        )}

        {connected && !isLoadingBlobs && !blobsError && blobs.length > 0 && (
          <div className="gallery-section">
            <h2>📋 Your Files ({blobs.length})</h2>
            <div className="files-grid">
              {blobs.map((blob: any, index: number) => {
                const displayName = cleanBlobName(blob.object_name || blob.name)
                return (
                  <div key={index} className="file-card">
                    <div className="file-info">
                      <span className="file-name">{displayName}</span>
                      <span className="file-size">{formatBlobSize(blob.size || 0)}</span>
                    </div>
                    <div className="file-actions">
                      {isImageFile(displayName) && (
                        <button onClick={() => handlePreview(blob.object_name || blob.name)} className="btn-icon btn-green" disabled={isDeleting}>
                          👁️ Preview
                        </button>
                      )}
                      <button onClick={() => handleDownload(blob.object_name || blob.name)} className="btn-icon btn-blue" disabled={isDeleting}>
                        ⬇️ Download
                      </button>
                      <button onClick={() => handleExplorer(blob.object_name || blob.name)} className="btn-icon btn-purple" disabled={isDeleting}>
                        🔍 Explorer
                      </button>
                      <button onClick={() => handleDelete(blob.object_name || blob.name)} className="btn-icon btn-red" disabled={isDeleting}>
                        {isDeleting ? '⏳' : '🗑️'} Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {connected && !isLoadingBlobs && !blobsError && blobs.length === 0 && (
          <div className="empty-state">
            <p>No files uploaded yet</p>
            <p className="empty-state-sub">Click "Upload File" to get started</p>
          </div>
        )}

        {!connected && (
          <div className="empty-state">
            <p>🔌 Connect your wallet to start uploading</p>
            <p className="empty-state-sub">Click "Connect Wallet" button above</p>
          </div>
        )}
      </main>

      {previewFileUrl && (
        <div className="modal-overlay" onClick={() => setPreviewFileUrl(null)}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFileUrl.name}</h3>
              <button onClick={() => setPreviewFileUrl(null)} className="close-btn">✖</button>
            </div>
            <div className="preview-content">
              <img src={previewFileUrl.url} alt={previewFileUrl.name} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
            </div>
            <div className="preview-footer">
              <button onClick={() => { handleDownload(previewFileUrl.name); setPreviewFileUrl(null) }} className="btn btn-blue">
                ⬇️ Download
              </button>
              <button onClick={() => { window.open(previewFileUrl.url, '_blank'); setPreviewFileUrl(null) }} className="btn btn-green">
                🔍 Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App