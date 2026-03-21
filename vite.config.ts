import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig(({ mode }) => {
  // 本地開發：從專案根目錄的 .env 讀取
  // Render Docker：Secret Files 掛載於 /etc/secrets，額外合併進來
  const renderSecretsDir = '/etc/secrets';
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...(fs.existsSync(renderSecretsDir) ? loadEnv(mode, renderSecretsDir, '') : {}),
  };
  const isElectron = process.env.VITE_ELECTRON === 'true';
  // GitHub Pages 部署時，CI 會傳入 BASE_URL=/<repo-name>/
  // 本地開發時未設置，預設使用 '/'；如果是 Electron，則使用 './'
  const base = isElectron ? './' : (process.env.BASE_URL ?? '/');
  return {
    base,
    server: {
      port: 5173,
      host: "0.0.0.0"
    },
    plugins: [
      react(),
      tailwindcss(),
      viteCommonjs({
        include: ['mathjax-full']
      }),
      // 動態生成 Google 驗證檔案
      {
        name: 'generate-google-verify',
        closeBundle() {
          // loadEnv 讀取本地 .env 檔；process.env 對應 CI 注入的環境變數
          // 兩者都支援，確保本地開發與 GitHub Actions 皆可正常生成驗證檔
          const fromLoadEnv = env.VITE_GOOGLE_VERIFY_ID;
          const fromProcessEnv = process.env.VITE_GOOGLE_VERIFY_ID;
          const verifyId = fromLoadEnv || fromProcessEnv;

          // Debug：確認環境變數注入狀況
          console.log('[google-verify] env.VITE_GOOGLE_VERIFY_ID     =', fromLoadEnv  ? `"${fromLoadEnv}"` : '(empty)');
          console.log('[google-verify] process.env.VITE_GOOGLE_VERIFY_ID =', fromProcessEnv ? `"${fromProcessEnv}"` : '(empty)');

          if (verifyId) {
            const outDir = path.resolve(__dirname, 'dist');
            const filePath = path.resolve(outDir, `${verifyId}.html`);
            if (fs.existsSync(outDir)) {
              fs.writeFileSync(filePath, `google-site-verification: ${verifyId}.html`);
              console.log(`\nGenerated Google verification file: ${verifyId}.html`);
            } else {
              console.warn('[google-verify] dist/ 目錄不存在，跳過生成');
            }
          } else {
            console.warn('[google-verify] VITE_GOOGLE_VERIFY_ID 未設置，跳過生成驗證檔');
          }
        }
      },
      // 動態生成 ads.txt（僅在根路徑部署時有效，GitHub Pages 子路徑不適用）
      {
        name: 'generate-ads-txt',

        // ── Dev Server：以 middleware 代理 /ads.txt 請求 ──────────────────
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url !== '/ads.txt') return next();
            // ca-pub-xxx → pub-xxx（ads.txt 規範不含 ca- 前綴）
            const adsenseId = (env.VITE_GOOGLE_ADSENSE_ID || process.env.VITE_GOOGLE_ADSENSE_ID)?.replace(/^ca-/, '');
            if (!adsenseId) {
              res.writeHead(404);
              res.end('ads.txt: VITE_GOOGLE_ADSENSE_ID not set');
              return;
            }
            const content = `google.com, ${adsenseId}, DIRECT, f08c47fec0942fa0`;
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(content);
          });
        },

        // ── Build：生成實體檔案到 dist/ 根目錄 ───────────────────────────
        closeBundle() {
          // GitHub Pages 子路徑部署（base 不是 '/'）不需要生成，Google 抓不到子路徑的 ads.txt
          if (base !== '/') {
            console.log('[ads-txt] 非根路徑部署，跳過 ads.txt 生成（GitHub Pages 子路徑不支援）');
            return;
          }
          // ca-pub-xxx → pub-xxx（ads.txt 規範不含 ca- 前綴）
          const adsenseId = (env.VITE_GOOGLE_ADSENSE_ID || process.env.VITE_GOOGLE_ADSENSE_ID)?.replace(/^ca-/, '');
          if (!adsenseId) {
            console.warn('[ads-txt] VITE_GOOGLE_ADSENSE_ID 未設置，跳過生成');
            return;
          }
          const outDir = path.resolve(__dirname, 'dist');
          if (fs.existsSync(outDir)) {
            const content = `google.com, ${adsenseId}, DIRECT, f08c47fec0942fa0`;
            fs.writeFileSync(path.resolve(outDir, 'ads.txt'), content);
            console.log(`\nGenerated ads.txt for ${adsenseId}`);
          }
        }
      }
    ],
    define: {
      'global': 'window',
      'process.env': {},
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    optimizeDeps: {
      include: [
        'mathjax-full',
        'mathjax-full/js/components/version.js',
        'rehype-mathjax'
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    },
    build: {
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-mermaid': ['mermaid'],
            'vendor-vega': ['vega', 'vega-lite', 'vega-embed'],
            'vendor-mathjax': ['better-react-mathjax', 'rehype-mathjax', 'mathjax-full'],
            'vendor-utils': ['xlsx', 'pdf-lib'],
            'vendor-ui': [
              'react',
              'react-dom',
              'lucide-react',
              '@uiw/react-codemirror',
              '@codemirror/view',
              '@codemirror/state'
            ],
          }
        }
      }
    }
  };
});
