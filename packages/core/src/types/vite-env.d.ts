/// <reference types="vite/client" />

// * Type declarations for Vite-specific imports (WASM files with ?url suffix)
declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare module "*?url" {
  const url: string;
  export default url;
}
