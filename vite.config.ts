import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
// Side-effect only: registers vite-react-ssg's `ssgOptions` augmentation of
// Vite's UserConfig type. Without importing something from this package
// here, TypeScript never loads that augmentation and rejects `ssgOptions`
// below as an unknown property.
import type {} from 'vite-react-ssg'
import { generateSeoFiles } from './scripts/generateSeoFiles.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/bank-statement/',
  // Every route (homepage, blog posts, /convert/<bank> pages, static
  // pages) is pre-rendered to a real .html file by vite-react-ssg — see
  // src/main.tsx and src/routes.tsx — instead of the old approach of one
  // hand-maintained HTML entry per page. `npm run build` runs
  // `vite-react-ssg build` (see package.json), which does its own two-pass
  // client+server build against this same config.
  ssgOptions: {
    // GitHub Pages resolves `/foo/` to `/foo/index.html`, matching every
    // existing canonical URL on this site (e.g. `.../about/`) — 'flat'
    // would instead emit `/foo.html`, which doesn't match.
    dirStyle: 'nested',
    onFinished(dir) {
      generateSeoFiles(dir, resolve(__dirname, 'content'))
    },
  },
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
