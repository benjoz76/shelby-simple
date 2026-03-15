import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import { useState, useRef } from "react"
import { 
  useAccountBlobs,
  useUploadBlobs,
  useDeleteBlob 
} from "@shelby-protocol/react"
import { shortenAddress, formatBlobSize } from "./types/shelby"
import { 
  uploadFile, 
  deleteFile, 
  downloadFile, 
  previewFile, 
  isImageFile 
} from "./utils/shelbyUpload"
import './App.css'

// Konfigurasi dari .env
const SHELBY_CONFIG = {
  network: import.meta.env.VITE_SHELBY_NETWORK || "testnet",
  apiKey: import.meta.env.VITE_SHELBY_API_KEY || "",
  nodeUrl: import.meta.env.VITE_SHELBY_RPC || "https://api.testnet.shelby.xyz/shelby",
  explorer: import.meta.env.VITE_SHELBY_EXPLORER || "https://explorer.shelby.xyz"
}

// Initialize Aptos client
const aptosConfig = new AptosConfig({
  network: Network.TESTNET,
  clientConfig: {
    API_KEY: import.meta.env.VITE_APTOS_API_KEY,
  }
})
export const aptosClient = new Aptos(aptosConfig)

function App() {
  const { connected, account, connect, disconnect, wallets, signAndSubmitTransaction } = useWallet() as any
  const [showWalletList, setShowWalletList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFileUrl, setPreviewFileUrl] = useState<{ url: string; name: string } | null>(null)

  const availableWallets = wallets || []
  
  // ========== SAFE ADDRESS HELPER ==========
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
  
  // ========== REACT QUERY HOOKS ==========
  const { 
    data: blobs = [], 
    isLoading: isLoadingBlobs,
    refetch: refetchBlobs,
    error: blobsError
  } = useAccountBlobs({
    account: accountAddress,
    pagination: { limit: 50, offset: 0 },
    enabled: connected && !!accountAddress,
  })

  // ========== UPLOAD MUTATION ==========
  const uploadMutation = useUploadBlobs({
    onSuccess: () => {
      console.log("✅ Upload complete!")
      refetchBlobs()
    },
    onError: (error: any) => {
      console.error("❌ Upload error:", error)
    }
  })

  // ========== DELETE MUTATION ==========
  const deleteMutation = useDeleteBlob({
    onSuccess: () => {
      console.log("✅ Delete successful!")
      refetchBlobs()
    },
    onError: (error: any) => {
      console.error("❌ Delete error:", error)
    }
  })

  // ========== HANDLE UPLOAD ==========
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (!connected || !account || !accountAddress || !signAndSubmitTransaction) {
      alert("Wallet not connected properly")
      return
    }

    try {
      const { signer, fileData, blobName } = await uploadFile({
        file,
        account,
        signAndSubmitTransaction
      })

      uploadMutation.mutate({
        signer,
        blobs: [{ blobName, blobData: fileData }],
        expirationMicros: (Date.now() * 1000) + 86400000000,
      }, {
        onSuccess: () => {
          alert("✅ Upload successful!")
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

  // ========== HANDLE DOWNLOAD ==========
  const handleDownload = async (fileName: string) => {
    if (!accountAddress) return
    
    await downloadFile({
      fileName,
      accountAddress,
      nodeUrl: SHELBY_CONFIG.nodeUrl,
      apiKey: SHELBY_CONFIG.apiKey,
      onError: (error) => {
        alert("Download failed: " + error.message)
      }
    })
  }

  // ========== HANDLE PREVIEW ==========
  const handlePreview = async (fileName: string) => {
    if (!accountAddress) return
    
    const url = await previewFile({
      fileName,
      accountAddress,
      nodeUrl: SHELBY_CONFIG.nodeUrl,
      apiKey: SHELBY_CONFIG.apiKey,
      onError: (error) => {
        alert("Preview failed: " + error.message)
      }
    })
    
    if (url) {
      setPreviewFileUrl({ url, name: fileName })
    }
  }

  // ========== HANDLE EXPLORER ==========
  const handleExplorer = (fileName?: string) => {
    if (!accountAddress) return
    const explorerUrl = `${SHELBY_CONFIG.explorer}/testnet/account/${accountAddress}`
    window.open(explorerUrl, '_blank')
  }

  // ========== HANDLE DELETE ==========
  const handleDelete = async (fileName: string) => {
    if (!accountAddress) return
    
    if (!window.confirm(`Delete ${fileName}?`)) return
    
    try {
      const { signer, accountAddress: addr, blobName } = await deleteFile({
        fileName,
        account,
        signAndSubmitTransaction,
        accountAddress
      })

      deleteMutation.mutate({
        account: addr,
        blobName,
        signer,
      } as any, {
        onSuccess: () => {
          alert("✅ File deleted")
        },
        onError: (error) => {
          alert("Delete failed: " + error.message)
        }
      })
      
    } catch (error) {
      alert("Delete failed: " + (error as Error).message)
    }
  }

  // ========== CUSTOM HOOKS (TIDAK DIPAKAI, LANGSUNG PAKAI MUTATION) ==========
  // const { uploadFile, isUploading } = useFileUpload()  // <-- HAPUS!
  // const { deleteFile, isDeleting } = useFileDelete()   // <-- HAPUS!

  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="title">📦 Shelby Upload</h1>
          
          {/* Connect Wallet */}
          {!connected ? (
            <button 
              onClick={() => setShowWalletList(true)}
              className="btn btn-blue"
            >
              🔌 Connect Wallet
            </button>
          ) : (
            <div className="wallet-group">
              <span className="wallet-address">
                {shortenAddress(accountAddress)}
              </span>
              <button 
                onClick={disconnect}
                className="btn btn-red"
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Upload Button */}
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
              <label 
                htmlFor="file-upload" 
                className={`btn ${isUploading ? 'btn-disabled' : 'btn-blue'}`}
              >
                {isUploading ? '⏳ Uploading...' : '📤 Upload File'}
              </label>
            </>
          )}
        </div>

        {/* Explorer Link */}
        <div className="header-right">
          <button
            onClick={() => handleExplorer()}
            className="btn btn-blue"
          >
            🔍 Account Explorer
          </button>
        </div>
      </header>

      {/* Wallet Selection Modal */}
      {showWalletList && (
        <div className="modal-overlay" onClick={() => setShowWalletList(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Select Wallet</h3>
            
            {availableWallets.length === 0 ? (
              <p style={{ color: 'red', textAlign: 'center' }}>
                No wallet detected.<br/>
                Please install Petra wallet first!
              </p>
            ) : (
              availableWallets.map((wallet: any) => (
                <button
                  key={wallet.name}
                  onClick={() => {
                    connect(wallet.name)
                    setShowWalletList(false)
                  }}
                  className="wallet-option"
                  style={{
                    background: wallet.name === 'Petra' ? '#e3f2fd' : '#f5f5f5'
                  }}
                >
                  {wallet.name} {wallet.name === 'Petra' && '🌟 (Recommended)'}
                </button>
              ))
            )}
            
            <button 
              onClick={() => setShowWalletList(false)}
              className="btn btn-red"
              style={{ marginTop: '15px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main">
        {/* Loading State */}
        {connected && isLoadingBlobs && (
          <div className="empty-state">
            <p>⏳ Loading your files...</p>
          </div>
        )}

        {/* Error State */}
        {connected && blobsError && (
          <div className="empty-state error">
            <p>❌ Error loading files</p>
            <p className="empty-state-sub">{(blobsError as any)?.message || 'Unknown error'}</p>
          </div>
        )}

        {/* Files Gallery */}
        {connected && !isLoadingBlobs && !blobsError && blobs.length > 0 && (
          <div className="gallery-section">
            <h2>📋 Your Files ({blobs.length})</h2>
            <div className="files-grid">
              {blobs.map((blob: any, index: number) => (
                <div key={index} className="file-card">
                  <div className="file-info">
                    <span className="file-name">{blob.name}</span>
                    <span className="file-size">{formatBlobSize(blob.size || 0)}</span>
                  </div>
                  <div className="file-actions">
                    {isImageFile(blob.name) && (
                      <button
                        onClick={() => handlePreview(blob.name)}
                        className="btn-icon btn-green"
                        title="Preview"
                        disabled={isDeleting}
                      >
                        👁️ Preview
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(blob.name)}
                      className="btn-icon btn-blue"
                      disabled={isDeleting}
                      title="Download"
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={() => handleExplorer(blob.name)}
                      className="btn-icon btn-purple"
                      disabled={isDeleting}
                      title="View on Explorer"
                    >
                      🔍 Explorer
                    </button>
                    <button
                      onClick={() => handleDelete(blob.name)}
                      className="btn-icon btn-red"
                      disabled={isDeleting}
                      title="Delete"
                    >
                      {isDeleting ? '⏳' : '🗑️'} Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
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

      {/* Preview Modal */}
      {previewFileUrl && (
        <div className="modal-overlay" onClick={() => setPreviewFileUrl(null)}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFileUrl.name}</h3>
              <button onClick={() => setPreviewFileUrl(null)} className="close-btn">✖</button>
            </div>
            <div className="preview-content">
              <img 
                src={previewFileUrl.url} 
                alt={previewFileUrl.name}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </div>
            <div className="preview-footer">
              <button 
                onClick={() => {
                  handleDownload(previewFileUrl.name)
                  setPreviewFileUrl(null)
                }}
                className="btn btn-blue"
              >
                ⬇️ Download
              </button>
              <button 
                onClick={() => {
                  window.open(previewFileUrl.url, '_blank')
                  setPreviewFileUrl(null)
                }}
                className="btn btn-green"
              >
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