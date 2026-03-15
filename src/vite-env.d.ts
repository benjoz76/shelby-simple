/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface ImportMetaEnv {
  readonly VITE_APTOS_API_KEY: string
  readonly VITE_SHELBY_API_KEY: string
  readonly VITE_SHELBY_NETWORK: string
  readonly VITE_SHELBY_RPC: string
  readonly VITE_SHELBY_EXPLORER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
