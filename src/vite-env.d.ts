/// <reference types="vite/client" />

/* CDN globals loaded via <script> tags */
interface Window {
  XLSX: typeof import('xlsx');
  JSZip: typeof import('jszip');
}

declare const XLSX: typeof import('xlsx');
declare const JSZip: typeof import('jszip');
