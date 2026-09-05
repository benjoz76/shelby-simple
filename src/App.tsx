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
import './toast.css'

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

const cleanBlobName = (name: string): string => {
  if (!name) return name
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
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ type, title, message })
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }

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
      showToast('error', 'Wallet not connected', 'Connect your wallet before uploading a file.')
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
          showToast('success', 'Upload successful!', `${blobName} is now stored on Shelby.`)
          refetchBlobs()
        },
        onError: (error) => {
          showToast('error', 'Upload failed', error.message)
        }
      })
    } catch (error) {
      showToast('error', 'Upload failed', (error as Error).message)
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
        showToast('error', 'Download failed', error.message)
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
        showToast('error', 'Preview failed', error.message)
      }
    })
    if (url) setPreviewFileUrl({ url, name: cleanBlobName(fileName) })
  }

  const handleExplorer = () => {
    if (!accountAddress) return
    const explorerUrl = `${SHELBY_CONFIG.explorer}/shelbynet/account/${accountAddress}`
    window.open(explorerUrl, '_blank')
  }

  const handleDelete = async (fileName: string) => {
    const cleanName = cleanBlobName(fileName)
    if (!accountAddress) return
    if (!window.confirm(`Delete ${cleanName}?`)) return

    try {
      const { signer, blobName } = await deleteFile({
        fileName: cleanName,
        account,
        signAndSubmitTransaction,
        accountAddress
      })

      deleteMutation.mutate({ signer, blobName }, {
        onSuccess: () => {
          showToast('success', 'File deleted', `${cleanName} was removed from your Shelby storage.`)
          refetchBlobs()
        },
        onError: (error) => {
          showToast('error', 'Delete failed', error.message)
        }
      })
    } catch (error) {
      showToast('error', 'Delete failed', (error as Error).message)
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending
  const totalSize = blobs.reduce((sum: number, blob: any) => sum + Number(blob.size || 0), 0)

  return (
    <div className="app" id="home">
      <div className="decor decor-left">◆</div>
      <div className="decor decor-right">✦</div>

      <header className="topbar shell">
        <button className="brand" onClick={() => scrollTo('home')} aria-label="Go to home">
          <span className="brand-mark" aria-hidden="true">⬢</span>
          <span>
            <strong>Shelby-Simple</strong>
            <small>Powered by Shelby</small>
          </span>
        </button>

        <nav className="nav-links" aria-label="Primary navigation">
          <button onClick={() => scrollTo('home')}>Home</button>
          <button onClick={() => scrollTo('files')}>My Files</button>
          <button onClick={() => scrollTo('about')}>About</button>
        </nav>

        <div className="topbar-actions">
          <span className="network-pill"><span className="status-dot" /> Shelbynet</span>
          {!connected ? (
            <button onClick={() => setShowWalletList(true)} className="brutal-btn purple">Connect Wallet</button>
          ) : (
            <div className="wallet-pill">
              <span>◼ {shortenAddress(accountAddress)}</span>
              <button onClick={disconnect}>Disconnect</button>
            </div>
          )}
        </div>
      </header>

      <main className="shell page-content">
        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">DECENTRALIZED. SECURE. YOURS.</span>
            <h1>Store Files<br />with <span>Shelby-Simple</span></h1>
            <p>
              A simple interface for uploading, storing, previewing, downloading, and managing files through Shelby Protocol on Shelbynet.
            </p>

            <div className="hero-actions">
              <button
                className="brutal-btn yellow large"
                onClick={() => connected ? fileInputRef.current?.click() : setShowWalletList(true)}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading…' : '↑ Upload File'}
              </button>
              <button className="brutal-btn white large" onClick={() => scrollTo('about')}>Learn More ↗</button>
            </div>

            <div className="feature-row">
              <span>⬡ Decentralized</span>
              <span>◈ Secure</span>
              <span>ϟ Fast</span>
              <span>&lt;/&gt; Open Source</span>
            </div>
          </div>

          <div className="upload-card">
            <span className="sticker">UPLOAD ANYTHING</span>
            <div className="upload-dropzone">
              <div className="upload-icon">☁</div>
              <h2>{connected ? 'Choose a file to upload' : 'Connect wallet to start'}</h2>
              <p>{connected ? 'Your file will be stored through Shelby Protocol' : 'Petra wallet recommended'}</p>
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                disabled={isUploading || !connected}
                hidden
              />
              <button
                className="brutal-btn yellow large"
                onClick={() => connected ? fileInputRef.current?.click() : setShowWalletList(true)}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading…' : connected ? '▣ Choose File' : 'Connect Wallet'}
              </button>
              <small>Powered by Shelby • Stored on Shelbynet</small>
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Storage overview">
          <article className="stat-card purple-card"><span>▱</span><div><small>Total Files</small><strong>{connected ? blobs.length : '—'}</strong><p>files uploaded</p></div></article>
          <article className="stat-card green-card"><span>◉</span><div><small>Storage Used</small><strong>{connected ? formatBlobSize(totalSize) : '—'}</strong><p>on Shelby Protocol</p></div></article>
          <article className="stat-card yellow-card"><span>△</span><div><small>Network</small><strong>Shelbynet</strong><p>Aptos ecosystem</p></div></article>
          <article className="stat-card pink-card"><span>◇</span><div><small>Your Storage</small><strong>Fully Yours</strong><p>decentralized & secure</p></div></article>
        </section>

        <section id="files" className="files-panel">
          <div className="section-heading">
            <div>
              <span className="section-tag">YOUR FILES</span>
              <p>Manage, preview, download, or delete files stored through Shelby.</p>
            </div>
            {connected && <button className="brutal-btn white" onClick={handleExplorer}>Open Explorer ↗</button>}
          </div>

          {connected && isLoadingBlobs && <div className="empty-state">⏳ Loading your files…</div>}

          {connected && blobsError && (
            <div className="empty-state error">
              <strong>Could not load files</strong>
              <p>{(blobsError as any)?.message || 'Unknown error'}</p>
            </div>
          )}

          {connected && !isLoadingBlobs && !blobsError && blobs.length > 0 && (
            <div className="files-grid">
              {blobs.map((blob: any, index: number) => {
                const rawName = blob.object_name || blob.name
                const displayName = cleanBlobName(rawName)
                return (
                  <article className="file-card" key={`${rawName}-${index}`}>
                    <div className="file-type-box">{isImageFile(displayName) ? 'IMG' : 'FILE'}</div>
                    <div className="file-meta">
                      <strong title={displayName}>{displayName}</strong>
                      <span>{formatBlobSize(blob.size || 0)}</span>
                    </div>
                    <div className="file-actions">
                      {isImageFile(displayName) && (
                        <button onClick={() => handlePreview(rawName)} className="mini-btn lavender" disabled={isDeleting}>Preview</button>
                      )}
                      <button onClick={() => handleDownload(rawName)} className="mini-btn mint" disabled={isDeleting}>Download</button>
                      <button onClick={() => handleExplorer()} className="mini-btn blue" disabled={isDeleting}>Explorer</button>
                      <button onClick={() => handleDelete(rawName)} className="mini-btn red" disabled={isDeleting}>{isDeleting ? 'Wait…' : 'Delete'}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {connected && !isLoadingBlobs && !blobsError && blobs.length === 0 && (
            <div className="empty-state">
              <strong>No files uploaded yet</strong>
              <p>Use the upload box above to store your first file with Shelby-Simple.</p>
            </div>
          )}

          {!connected && (
            <div className="empty-state">
              <strong>Connect your wallet to view files</strong>
              <p>Your Shelby files will appear here after connecting.</p>
              <button className="brutal-btn yellow" onClick={() => setShowWalletList(true)}>Connect Wallet</button>
            </div>
          )}
        </section>

        <section id="about" className="about-panel">
          <div>
            <span className="section-tag pink-tag">ABOUT</span>
            <h2>Shelby-Simple, powered by Shelby.</h2>
          </div>
          <p>
            Shelby-Simple is a community-built interface for decentralized file storage powered by Shelby Protocol with Aptos as the coordination layer. It runs on Shelbynet and keeps the experience simple: connect, upload, manage, and retrieve your files.
          </p>
          <div className="about-badges">
            <span>Built on Aptos</span>
            <span>Powered by Shelby</span>
            <span>Open Source</span>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-inner">
          <div className="footer-brand"><strong>Shelby-Simple</strong><span>Powered by Shelby</span></div>
          <div className="footer-links">
            <a href="https://docs.shelby.xyz" target="_blank" rel="noreferrer">Docs</a>
            <a href="https://github.com/benjoz76/shelby-simple" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://aptos.dev" target="_blank" rel="noreferrer">Aptos</a>
            <a href="https://shelby.xyz" target="_blank" rel="noreferrer">Shelby Protocol</a>
          </div>
          <span className="footer-note">Built for a more open internet. ♥</span>
        </div>
      </footer>

      {toast && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className={`brutal-toast ${toast.type}`}>
            <div className="toast-icon" aria-hidden="true">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}
            </div>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
          </div>
        </div>
      )}

      {showWalletList && (
        <div className="modal-overlay" onClick={() => setShowWalletList(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="section-tag">SELECT WALLET</span>
            <h3>Connect to Shelby-Simple</h3>
            {availableWallets.length === 0 ? (
              <p className="modal-message">No wallet detected. Please install Petra Wallet first.</p>
            ) : (
              availableWallets.map((wallet: any) => (
                <button
                  key={wallet.name}
                  onClick={() => { connect(wallet.name); setShowWalletList(false) }}
                  className="wallet-option"
                >
                  <span>{wallet.name}</span>
                  <strong>{wallet.name === 'Petra' ? 'Recommended →' : 'Connect →'}</strong>
                </button>
              ))
            )}
            <button onClick={() => setShowWalletList(false)} className="brutal-btn white modal-cancel">Cancel</button>
          </div>
        </div>
      )}

      {previewFileUrl && (
        <div className="modal-overlay" onClick={() => setPreviewFileUrl(null)}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFileUrl.name}</h3>
              <button onClick={() => setPreviewFileUrl(null)} className="close-btn">×</button>
            </div>
            <div className="preview-content">
              <img src={previewFileUrl.url} alt={previewFileUrl.name} />
            </div>
            <div className="preview-footer">
              <button onClick={() => { handleDownload(previewFileUrl.name); setPreviewFileUrl(null) }} className="brutal-btn yellow">Download</button>
              <button onClick={() => { window.open(previewFileUrl.url, '_blank'); setPreviewFileUrl(null) }} className="brutal-btn white">Open New Tab ↗</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
