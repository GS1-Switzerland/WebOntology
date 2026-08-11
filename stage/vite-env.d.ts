/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFINITIONS_BASE_URL?: string;
  readonly VITE_MANIFEST_PATH?: string;
  readonly VITE_SECTORS_PATH?: string;
  readonly VITE_DOMAINS_PATH?: string;
  readonly VITE_RESOLVER_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
