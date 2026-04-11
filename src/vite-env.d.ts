/// <reference types="vite/client" />
/// <reference types="vitest" />

// CSS Modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
