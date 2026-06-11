import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import license from 'rollup-plugin-license';

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...(fs.existsSync('/etc/secrets') ? loadEnv(mode, '/etc/secrets', '') : {}),
  };
  const isElectron = process.env.VITE_ELECTRON === 'true';
  // GitHub Pages 部署時，CI 會傳入 BASE_URL=/<repo-name>/
  // 本地開發時未設置，預設使用 '/'；如果是 Electron，則使用 './'
  const base = isElectron ? './' : (process.env.BASE_URL ?? '/');
  return {
    base: isElectron ? './' : '/',
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
      license({
        thirdParty: {
          output: {
            file: path.resolve(__dirname, './dist/THIRD-PARTY-NOTICES.txt'),
            template(dependencies) {
              const seenFamilies = new Set<string>();
              let outputText = '';

              dependencies.forEach((pkg) => {
                if (!pkg.license || pkg.license.toLowerCase() === 'unknown') return;

                const isScoped = pkg.name?.startsWith('@');
                const familyName = isScoped && pkg.name ? pkg.name.split('/')[0] : (pkg.name || '');

                if (!familyName || seenFamilies.has(familyName)) return;
                seenFamilies.add(familyName);

                const repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url || 'N/A');
                outputText += `#### ${pkg.name}\n`;
                outputText += `- **License:** ${pkg.license}\n`;
                outputText += `- **Repository:** ${repo}\n\n`;
                outputText += '```text\n';
                outputText += `${pkg.licenseText || 'No license text provided.'}\n`;
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
              'react-icons',
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
