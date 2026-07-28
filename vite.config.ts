import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  base: '/bank-statement/',
  plugins: [
    react(),
    tailwindcss(),
    // pdf.js needs these on disk to render non-embedded base-14 fonts
    // (Helvetica/Times/Courier — extremely common in real bank statements)
    // and CJK text; without them getDocument() throws for any PDF that
    // relies on them. Served in dev, copied into dist/ on build, in both
    // cases at a path relative to the app's `base`.
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/standard_fonts/*',
          dest: 'standard_fonts',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/pdfjs-dist/cmaps/*',
          dest: 'cmaps',
          rename: { stripBase: true },
        },
      ],
    }),
  ],
})
