// src/env.d.ts
interface ImportMetaEnv {
    readonly VITE_DEV_SERVER_URL: string;
    // Add other env variables here
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }