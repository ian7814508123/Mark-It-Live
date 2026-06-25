import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import license from 'rollup-plugin-license';

export default defineConfig(({ mode }) => {
  // 本地開發：從專案根目錄的 .env 讀取
  // Render Docker：Secret Files 掛載於 /etc/secrets，額外合併進來
  const renderSecretsDir = '/etc/secrets';
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...(fs.existsSync(renderSecretsDir) ? loadEnv(mode, renderSecretsDir, '') : {}),
  };
  // GitHub Pages 部署時，CI 會傳入 BASE_URL=/<repo-name>/
  // 本地開發時未設置，預設使用 '/'
  const base = process.env.BASE_URL ?? '/';
  return {
    base,
    server: {
      port: 3000,
      //host: "0.0.0.0"
    },
    plugins: [
      react(),
      tailwindcss(),
      viteCommonjs({
        include: ['mathjax-full']
      }),
      license({
        thirdParty: {
          output: {
            file: path.resolve(__dirname, './dist/THIRD-PARTY-NOTICES.txt'),
            template(dependencies) {
              const seenFamilies = new Set<string>();
              let outputText = '';

              dependencies.forEach((pkg) => {
                // 1. 未知跳過：如果沒有指定 license 或者是 UNKNOWN，直接跳過不列出
                if (!pkg.license || pkg.license.toLowerCase() === 'unknown') {
                  return;
                }

                // 2. 同一個套件出現一次
                const isScoped = pkg.name?.startsWith('@');
                const familyName = isScoped && pkg.name ? pkg.name.split('/')[0] : (pkg.name || '');

                if (!familyName) return;

                if (seenFamilies.has(familyName)) {
                  return;
                }
                seenFamilies.add(familyName);

                // 3. 組合 Markdown 格式
                const repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url || 'N/A');
                outputText += `#### ${pkg.name}\n`;
                outputText += `- **License:** ${pkg.license}\n`;
                outputText += `- **Repository:** ${repo}\n\n`;
                outputText += '```text\n';
                if (pkg.licenseText) {
                  outputText += `${pkg.licenseText.trim()}\n`;
                } else {
                  outputText += `This package is licensed under the ${pkg.license} License.\n`;
                  outputText += `(The author did not include the full license text in the published npm package.\n`;
                  outputText += ` Please refer to the repository link above for more details.)\n`;
                }
                outputText += '```\n\n';
              });

              return outputText;
            }
          }
        },
      }),
      {
        name: 'serve-licenses-in-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.endsWith('THIRD-PARTY-NOTICES.txt')) {
              const file = path.resolve(__dirname, './dist/THIRD-PARTY-NOTICES.txt');
              if (fs.existsSync(file)) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end(fs.readFileSync(file));
                return;
              }
            }
            next();
          });
        }
      },
      {
        name: 'generate-google-verify',
        closeBundle() {
          // loadEnv 讀取本地 .env 檔；process.env 對應 CI 注入的環境變數
          // 兩者都支援，確保本地開發與 GitHub Actions 皆可正常生成驗證檔
          const fromLoadEnv = env.VITE_GOOGLE_VERIFY_ID;
          const fromProcessEnv = process.env.VITE_GOOGLE_VERIFY_ID;
          const verifyId = fromLoadEnv || fromProcessEnv;

          // Debug：確認環境變數注入狀況
          console.log('[google-verify] env.VITE_GOOGLE_VERIFY_ID     =', fromLoadEnv ? `"${fromLoadEnv}"` : '(empty)');
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
      }
    ],
    define: {
      'global': 'window',
      'process.env': {},
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
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
      target: 'es2020',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-icons')) {
                return 'vendor-icons';
              }
              if (id.includes('codemirror') || id.includes('@codemirror') || id.includes('@uiw')) {
                return 'vendor-codemirror';
              }
              if (id.includes('mathjax-full') || id.includes('better-react-mathjax')) {
                return 'vendor-mathjax';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
            }
          }
        }
      }
    }
  };
});
