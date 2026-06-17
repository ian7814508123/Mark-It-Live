import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, Suspense } from 'react';
import { flushSync } from 'react-dom';
const LazyMathJaxProvider = React.lazy(() => import('./src/components/markdown/LazyMathJaxProvider'));

import Header from './src/components/layout/Header';
import Editor from './src/components/layout/Editor';
import PreviewPanel from './src/components/layout/PreviewPanel';
import LayoutSplitter from './src/components/layout/LayoutSplitter';
import HistorySidebar from './src/components/layout/HistorySidebar';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import CreateDocModal from './src/components/modals/CreateDocModal';
import SettingsModal from './src/components/modals/SettingsModal';
import SEOContent from './src/components/markdown/SEOContent';
import IntroModal from './src/components/modals/IntroModal';
import { usePanZoom } from './src/hooks/usePanZoom';
import { useDocumentStorage } from './src/hooks/useDocumentStorage';
import { hashString, debounce, calculatePreviewScrollTop, calculateEditorScrollTop } from './src/utils';
import { detectMarkdownFeatures } from './src/utils/markdownScanner';
import { useAppSettings } from './src/hooks/useAppSettings';
import './src/styles/markdown-base.css';

// 使用 Vite 的 import.meta.glob 動態載入，Vite 會自動將這些 CSS 進行 Code Splitting 拆分成獨立檔案
const themeModules = import.meta.glob('./src/styles/themes/*.css');



// ─── Mermaid Lazy Singleton ───────────────────────────────────────────────────
// 不在頂層同步 import mermaid，改為首次進入 Mermaid 編輯器模式時才動態載入，
// 確保不使用 Mermaid 的使用者第一次開啟網頁時完全不下載此套件。
let mermaidInstance: typeof import('mermaid') | null = null;
let mermaidInitialized = false;



async function getMermaid() {
  if (!mermaidInstance) {
    mermaidInstance = await import('mermaid');
  }
  if (!mermaidInitialized) {
    mermaidInstance.default.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'Inter',
    });
    mermaidInitialized = true;
  }
  return mermaidInstance.default;
}

/**
 * 建立一個臨時 DOM 元素並動態提取當前主題的 CSS 變數值，用於 Mermaid 圖表客製化渲染。
 * 完美避開了全域單例污染以及內建 dark 配色全黑的問題。
 */
const getThemeVariables = (theme: string, isDark: boolean) => {
  const tempDiv = document.createElement('div');
  tempDiv.className = `prose theme-${theme}`;

  let wrapper: HTMLDivElement | null = null;
  if (isDark) {
    wrapper = document.createElement('div');
    wrapper.className = 'dark';
    wrapper.appendChild(tempDiv);
    document.body.appendChild(wrapper);
  } else {
    document.body.appendChild(tempDiv);
  }

  const compStyle = getComputedStyle(tempDiv);

  const nodeBg = compStyle.getPropertyValue('--mermaid-node-bg').trim();
  const nodeText = compStyle.getPropertyValue('--mermaid-node-text').trim();
  const nodeBorder = compStyle.getPropertyValue('--mermaid-node-border').trim();
  const lineColor = compStyle.getPropertyValue('--mermaid-line').trim();
  const edgeBg = compStyle.getPropertyValue('--mermaid-edge-bg').trim();

  // 提取主題特有的 Actor / Note 等變數，若主題未宣告則 fallback 到 node 通用配色
  const actorBg = compStyle.getPropertyValue('--mermaid-actor-bg').trim();
  const actorText = compStyle.getPropertyValue('--mermaid-actor-text').trim();
  const actorBorder = compStyle.getPropertyValue('--mermaid-actor-border').trim();
  const noteBg = compStyle.getPropertyValue('--mermaid-note-bg').trim();
  const noteText = compStyle.getPropertyValue('--mermaid-note-text').trim();
  const noteBorder = compStyle.getPropertyValue('--mermaid-note-border').trim();
  const fontFamily = compStyle.getPropertyValue('--theme-font-family').trim() || 'Inter, system-ui, -apple-system, sans-serif';

  if (wrapper) {
    document.body.removeChild(wrapper);
  } else {
    document.body.removeChild(tempDiv);
  }

  return {
    fontFamily,
    themeVars: {
      primaryColor: nodeBg || (isDark ? '#1e293b' : '#f8fafc'),
      primaryTextColor: nodeText || (isDark ? '#f8fafc' : '#0f172a'),
      primaryBorderColor: nodeBorder || (isDark ? '#334155' : '#cbd5e1'),
      lineColor: lineColor || (isDark ? '#94a3b8' : '#475569'),
      background: edgeBg || (isDark ? '#0f172a' : '#ffffff'),

      // 流程圖 Cluster 適配
      clusterBkg: nodeBg || (isDark ? '#1e293b' : '#f1f5f9'),
      clusterBorder: nodeBorder || (isDark ? '#334155' : '#cbd5e1'),

      // 序列圖 (Sequence Diagram) 相關適配
      actorBkg: actorBg || (isDark ? '#1e293b' : '#f1f5f9'),
      actorBorder: actorBorder || (isDark ? '#334155' : '#cbd5e1'),
      actorTextColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),
      actorLineColor: lineColor || (isDark ? '#94a3b8' : '#64748b'),
      signalColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),
      signalTextColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),

      // 註解 (Note) 適配
      noteBkgColor: noteBg || (isDark ? '#1e293b' : '#ffffff'),
      noteBorderColor: noteBorder || (isDark ? '#334155' : '#cbd5e1'),
      noteTextColor: noteText || (isDark ? '#f1f5f9' : '#1e293b'),
    }
  };
};




type EditorMode = 'mermaid' | 'markdown';

const App: React.FC = () => {
  const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('electron');
  // State for loading default contents from external .md files
  const [defaultContents, setDefaultContents] = useState<{
    markdown: Record<string, string>;
    mermaid: Record<string, string>;
  } | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

  // Load default contents on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const rawBaseUrl = import.meta.env.BASE_URL || '/';
        // Ensure baseUrl ends with a slash for consistent joining
        const normalizedBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

        // Define templates to load
        const mdTemplates = [
          { id: 'markdown-standard', path: 'defaults/default-markdown.md' },
          { id: 'markdown-beta', path: 'defaults/markdown-beta.md' },
          { id: 'basic', path: 'defaults/markdown-basic.md' },
          { id: 'math', path: 'defaults/markdown-math.md' },
          { id: 'charts', path: 'defaults/markdown-charts.md' },
          { id: 'mermaid', path: 'defaults/markdown-mermaid.md' },
          { id: 'markdown-abc', path: 'defaults/markdown-abc.md' },
        ];

        const mermaidTemplates = [
          { id: 'mermaid-standard', path: 'defaults/default-mermaid.md' },
          { id: 'mermaid-beta', path: 'defaults/mermaid-beta.md' },
          { id: 'flowchart', path: 'defaults/mermaid-flowchart.md' },
          { id: 'sequence', path: 'defaults/mermaid-sequence.md' },
          { id: 'gantt', path: 'defaults/mermaid-gantt.md' },
          { id: 'class', path: 'defaults/mermaid-class.md' },
          { id: 'state', path: 'defaults/mermaid-state.md' },
        ];

        // Fetch everything
        const [mdResponses, mmdResponses] = await Promise.all([
          Promise.all(mdTemplates.map(t => fetch(`${normalizedBaseUrl}${t.path}`))),
          Promise.all(mermaidTemplates.map(t => fetch(`${normalizedBaseUrl}${t.path}`)))
        ]);

        const markdownMap: Record<string, string> = {};
        const mermaidMap: Record<string, string> = {};

        for (let i = 0; i < mdTemplates.length; i++) {
          const res = mdResponses[i];
          markdownMap[mdTemplates[i].id] = res.ok ? await res.text() : `# ${mdTemplates[i].id}\n\n無法載入內容。`;
        }

        for (let i = 0; i < mermaidTemplates.length; i++) {
          const res = mmdResponses[i];
          mermaidMap[mermaidTemplates[i].id] = res.ok ? await res.text() : `graph TD\n  A[${mermaidTemplates[i].id}] --> B[Fail]`;
        }

        setDefaultContents({ markdown: markdownMap, mermaid: mermaidMap });
      } catch (error) {
        console.error('Failed to load default contents:', error);
        setDefaultContents({
          markdown: { 'markdown-standard': '# Markdown Editor' },
          mermaid: { 'mermaid-standard': 'graph TD\n  A[開始] --> B[結束]' }
        });
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    loadDefaults();
  }, []);

  // 文檔管理
  const {
    documents,
    currentDocId,
    currentDocument,
    createDocument,
    updateCurrentDocument,
    switchDocument,
    deleteDocument,
    renameDocument,
    storageUsage,
    getBacklinks,
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    moveDocument,
    reorderDocuments,
    updateLineComment,
    isLoading,
  } = useDocumentStorage();
  // isLoading = true 表示 IndexedDB 初始化（或自動遷移）尚未完成，避免 FOUC

  // UI 狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncScroll, setIsSyncScroll] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const [initialDocName, setInitialDocName] = useState('');
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [openDocIds, setOpenDocIds] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSessionId, setPrintSessionId] = useState(0);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [editorRatio, setEditorRatio] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [hasSticky, setHasSticky] = useState<boolean>(false);
  const hasStickyRef = useRef<boolean>(false);
  const handleStickyChange = useCallback((val: boolean) => {
    setHasSticky(val);
    hasStickyRef.current = val;
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const printTimeoutRef = useRef<any>(null);

  const { settings, updateMacros, updatePrintSettings, toggleFavoriteTheme, restoreDefaults } = useAppSettings();

  // 監聽當前預覽主題並動態/懶載入樣式表
  useEffect(() => {
    const theme = settings.printSettings.previewTheme;
    if (!theme || theme === 'default') return;

    const themePath = `./src/styles/themes/${theme}.css`;
    const loadTheme = themeModules[themePath];

    if (loadTheme) {
      loadTheme().catch((err) => {
        console.error(`Failed to dynamic load theme style: ${theme}`, err);
      });
    }
  }, [settings.printSettings.previewTheme]);


  // 從當前文檔取得 mode 和 code
  const mode = currentDocument?.mode || 'markdown';
  const code = currentDocument?.content || '';

  // 將預覽面板的渲染與編輯器打字解耦：
  // code 即時反映打字（用於 ScrollSync、Mermaid 模式），
  // deferredCode 在瀏覽器空閒時才更新（用於 MarkdownPreview 的 AST 重解析），
  // 確保打字時主執行緒的 CPU 不被 Remark/Rehype 的 AST 編譯霸佔。
  const deferredCode = useDeferredValue(code);

  // ─── Markdown 特徵偵測：在 deferredCode 穩定後（瀏覽器空閒時）才掃描 ────────────
  // 使用 useMemo 快取掃描結果，只在 deferredCode 變化時重新執行正則掃描（O(n) 一次過）
  // 目的：根據偵測到的特殊語法，提前非阻塞地預載對應的大型套件，縮短首次渲染延遲。
  const markdownFeatures = useMemo(
    () => detectMarkdownFeatures(deferredCode),
    [deferredCode]
  );

  // ─── 特徵驅動的非阻塞預載（Prefetch）────────────────────────────────────────────
  // 當偵測到特定語法後，在瀏覽器空閒排程中靜默預載套件 chunk。
  // 使用 requestIdleCallback（降級為 setTimeout）確保不佔用主執行緒。
  // 這裡只做 import() 預載，不賦值 — 實際使用仍在各 Block 組件的 render callback 中。
  useEffect(() => {
    if (mode !== 'markdown') return;

    const schedule = (fn: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 200);
      }
    };

    // Mermaid：預載後 MermaidBlock 的動態 import 會直接命中 chunk 快取
    if (markdownFeatures.hasMermaid) {
      schedule(() => import('mermaid'));
    }
    // Vega-Embed：同上
    if (markdownFeatures.hasVega) {
      schedule(() => import('vega-embed'));
    }
    // AbcJS：透過 AbcBlock 的 lazy 邊界觸發，這裡提前暖機
    if (markdownFeatures.hasAbc) {
      schedule(() => import('./src/components/markdown/AbcBlock'));
    }
  }, [markdownFeatures, mode]);

  // Toggle Dark Mode with View Transitions
  const handleToggleDarkMode = (event?: React.MouseEvent) => {
    const isSupported = typeof document !== 'undefined' && 'startViewTransition' in document;

    if (!isSupported) {
      setIsDarkMode(!isDarkMode);
      return;
    }

    // 獲取點擊位置，以便動畫從按鈕處擴散
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? 0;

    // 將座標傳給 CSS 變數
    document.documentElement.style.setProperty('--reveal-center-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-center-y', `${y}px`);

    // 開始過渡
    const transition = (document as any).startViewTransition(() => {
      // 必須使用 flushSync 確保 React 狀態更新同步反映到 DOM
      flushSync(() => {
        setIsDarkMode(!isDarkMode);
      });
    });

    transition.ready.then(() => {
      // 在動畫開始前標記 class
      document.documentElement.classList.add('dark-transition-active');
    });

    transition.finished.then(() => {
      document.documentElement.classList.remove('dark-transition-active');
    });
  };

  // Toggle Dark Mode Update to DOM (Legacy fallback and state sync)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 列印深色模式回退：列印前暫時移除 dark class (回到淺色模式)，列印後自動復原
  // 此方案不需修改任何主題 CSS，自動支援全部現有與未來新增的主題
  useEffect(() => {
    let wasDark = false;

    const handleBeforePrint = () => {
      wasDark = document.documentElement.classList.contains('dark');
      if (wasDark) {
        document.documentElement.classList.remove('dark');
      }
    };

    const handleAfterPrint = () => {
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);


  // 同步 openDocIds：當 currentDocId 改變且不在 openDocIds 中時，加入它
  useEffect(() => {
    if (currentDocId && !openDocIds.includes(currentDocId)) {
      setOpenDocIds(prev => {
        if (!prev.includes(currentDocId)) {
          return [...prev, currentDocId];
        }
        return prev;
      });
    }
  }, [currentDocId]); // 移除 openDocIds 依賴，防止關閉分頁後又被加回

  // 當 documents 改變時，確保 openDocIds 中只包含還存在的文檔
  useEffect(() => {
    const docIdSet = new Set(documents.map(d => d.id));
    setOpenDocIds(prev => prev.filter(id => docIdSet.has(id)));
  }, [documents]);

  // 初始化：如果沒有文檔，建立預設文檔
  // 需同時等待 isLoading（IndexedDB 尚在讀取）與 isLoadingDefaults（預設檔案尚在載入）兩者都完成
  useEffect(() => {
    if (documents.length === 0 && defaultContents && !isLoadingDefaults && !isLoading) {
      // 第一個建立的文檔會預設成為啟用的文檔（因為 IndexedDB 寫入順序或 createDocument 實作）
      // 使用 basic 與 flowchart 取代原本的標準版，大幅降低首屏的元件複雜度（不含 MathJax/進階 Mermaid 等），以提升 Lighthouse 首屏分數
      createDocument('markdown', defaultContents.markdown['basic'], '標記掉落 入門指南', null, 'basic', undefined, false);
      createDocument('mermaid', defaultContents.mermaid['flowchart'], '美人魚 入門指南', null, 'flowchart', undefined, false);
    }
  }, [documents.length, createDocument, defaultContents, isLoadingDefaults, isLoading]);

  const originalTitle = useRef(document.title);

  // 同步分頁標題
  useEffect(() => {
    if (currentDocument?.name) {
      document.title = currentDocument.name;
    } else {
      document.title = originalTitle.current;
    }
  }, [currentDocument?.name]);

  // Custom Hook for Navigation
  const {
    zoom,
    setZoom,
    position,
    isDragging,
    handleZoom,
    resetNavigation,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    handleWheel,
    fitToView
  } = usePanZoom();

  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Scroll State
  const targetScrollTop = useRef(0);
  const currentScrollTop = useRef(0);
  const scrollSource = useRef<'editor' | 'preview' | null>(null);
  const isHoveringEditor = useRef(false);
  const isHoveringPreview = useRef(false);
  const printSessionRef = useRef(0);
  const rafId = useRef<number | null>(null);
  const lineMap = useRef<Map<number, number>>(new Map());
  const lastContentRef = useRef<string>("");

  // ─── 核心：建立 Line-to-Pixel 映射表 ──────────────────────────────────────
  const rebuildLineMap = useCallback(() => {
    if (!previewRef.current || mode !== 'markdown') return;

    // 取得預覽容器及其矩陣
    const container = previewRef.current;

    // 獲取目前啟動中的頁面容器
    const papers = container.getElementsByClassName('print-paper');
    let activePaper: Element | null = null;
    for (let i = 0; i < papers.length; i++) {
      if (papers[i].getAttribute('data-doc-id') === currentDocId) {
        activePaper = papers[i];
        break;
      }
    }
    const searchContext = activePaper ? activePaper : container;

    const elements = searchContext.querySelectorAll('[data-line]');
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const newMap = new Map<number, number>();
    elements.forEach((el) => {
      const line = parseInt(el.getAttribute('data-line') || '0');
      const rect = el.getBoundingClientRect();
      const offset = rect.top - containerRect.top + scrollTop;
      newMap.set(line, offset);
    });

    lineMap.current = newMap;
    // console.log(`[ScrollSync] Map rebuilt: ${newMap.size} markers found`);
  }, [mode, currentDocId]);

  const debouncedRebuildMap = useMemo(() => debounce(rebuildLineMap, 200), [rebuildLineMap]);

  // 監聽內容與佈局變化以重新校準
  useEffect(() => {
    const handleLayoutChange = () => {
      debouncedRebuildMap();
    };

    // 使用 ResizeObserver 監聽預覽容器高度變化 (針對 MathJax 等異步渲染)
    let resizeObserver: ResizeObserver | null = null;
    if (previewRef.current) {
      resizeObserver = new ResizeObserver(() => {
        debouncedRebuildMap();
      });
      resizeObserver.observe(previewRef.current);
    }

    // 「3-A 主體」：監聽 MarkdownPreview 渲染完成事件，取代 setTimeout(rebuildLineMap, 500)
    // markdown-render-complete 在 ReactMarkdown commit 後的 rAF 中派發，DOM 量測更精準
    window.addEventListener('markdown-render-complete', handleLayoutChange);
    window.addEventListener('content-layout-ready', handleLayoutChange);
    window.addEventListener('preview-content-height-change', handleLayoutChange);
    window.addEventListener('resize', handleLayoutChange);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('markdown-render-complete', handleLayoutChange);
      window.removeEventListener('content-layout-ready', handleLayoutChange);
      window.removeEventListener('preview-content-height-change', handleLayoutChange);
      window.removeEventListener('resize', handleLayoutChange);
    };
  }, [rebuildLineMap]);

  // 「3-A 主體」：保留此 useEffect 但將 setTimeout 移除。
  // lineMap 重建現在由 markdown-render-complete 事件統一驅動（已加入上方的 event listener）。
  // 此 useEffect 只負責同步 lastContentRef，確保切換文件時不無直接跳過首次校準。
  useEffect(() => {
    if (deferredCode !== lastContentRef.current) {
      lastContentRef.current = deferredCode;
      // 切換文件時，增加一次備用校準（情境：迷你車總截 / 文件首次開啟時事件可能尚未觸發）
      requestAnimationFrame(rebuildLineMap);
    }
  }, [deferredCode, rebuildLineMap]);


  const syncLoop = useCallback(() => {
    if (!previewRef.current || !editorRef.current?.view) {
      scrollSource.current = null;
      rafId.current = null;
      return;
    }

    const editorView = editorRef.current.view;
    const diff = targetScrollTop.current - currentScrollTop.current;

    if (Math.abs(diff) < 0.8) { // 稍微放寬判定範圍
      currentScrollTop.current = targetScrollTop.current;
      rafId.current = null;
      scrollSource.current = null;
      // console.log("Sync completed and source released");
      return; // 確保中斷
    } else {
      currentScrollTop.current += diff * 0.15;
      rafId.current = requestAnimationFrame(syncLoop);
    }

    if (scrollSource.current === 'editor') {
      previewRef.current.scrollTop = currentScrollTop.current;
    } else if (scrollSource.current === 'preview') {
      editorView.scrollDOM.scrollTop = currentScrollTop.current;
    }
  }, []);

  const handleEditorScroll = () => {
    if (!isSyncScroll || mode !== 'markdown') return;
    if (!editorRef.current?.view) return;
    if (scrollSource.current === 'preview' && !isHoveringEditor.current) return;

    scrollSource.current = 'editor';

    const editorView = editorRef.current.view;
    const scrollDOM = editorView.scrollDOM;

    // 1. 取得編輯器當前高度對應的行區塊（先以 scrollTop 判定該行上方是否有標題，以推導是否顯示 sticky）
    const tempLineBlock = editorView.lineBlockAtHeight(scrollDOM.scrollTop);
    const tempLine = editorView.state.doc.lineAt(tempLineBlock.from);
    const tempLineNumber = tempLine.number;

    let hasHeaderAbove = false;
    try {
      for (let i = tempLineNumber; i >= 1; i--) {
        if (/^(#{1,6})\s+(.+)$/.test(editorView.state.doc.line(i).text)) {
          hasHeaderAbove = true;
          break;
        }
      }
    } catch (e) { }

    const hasStickyActive = hasHeaderAbove && scrollDOM.scrollTop > 4;
    const lineBlock = editorView.lineBlockAtHeight(scrollDOM.scrollTop + (hasStickyActive ? 22 : 0));
    const line = editorView.state.doc.lineAt(lineBlock.from);
    const lineNumber = line.number;

    if (previewRef.current) {
      const getEditorLineTop = (l: number) => {
        try {
          const top = editorView.lineBlockAt(editorView.state.doc.line(l).from).top;
          let hasHeader = false;
          for (let i = l; i >= 1; i--) {
            if (/^(#{1,6})\s+(.+)$/.test(editorView.state.doc.line(i).text)) {
              hasHeader = true;
              break;
            }
          }
          return (hasHeader && top > 4) ? Math.max(0, top - 22) : top;
        } catch (e) {
          return 0;
        }
      };

      targetScrollTop.current = calculatePreviewScrollTop({
        editorScrollTop: scrollDOM.scrollTop,
        editorMaxScroll: scrollDOM.scrollHeight - scrollDOM.clientHeight,
        previewMaxScroll: previewRef.current.scrollHeight - previewRef.current.clientHeight,
        lineNumber,
        lineMap: lineMap.current,
        getEditorLineTop,
      });

      if (!rafId.current) {
        currentScrollTop.current = previewRef.current.scrollTop;
        rafId.current = requestAnimationFrame(syncLoop);
      }
    }
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isSyncScroll || mode !== 'markdown') return;

    const target = e.currentTarget;
    if (!target) return;
    if (scrollSource.current === 'editor' && !isHoveringPreview.current) return;

    scrollSource.current = 'preview';

    if (editorRef.current?.view) {
      const editorView = editorRef.current.view;

      const getEditorLineTop = (l: number) => {
        try {
          const top = editorView.lineBlockAt(editorView.state.doc.line(l).from).top;
          let hasHeader = false;
          for (let i = l; i >= 1; i--) {
            if (/^(#{1,6})\s+(.+)$/.test(editorView.state.doc.line(i).text)) {
              hasHeader = true;
              break;
            }
          }
          return (hasHeader && top > 4) ? Math.max(0, top - 22) : top;
        } catch (e) {
          return 0;
        }
      };

      targetScrollTop.current = calculateEditorScrollTop({
        previewScrollTop: target.scrollTop,
        previewMaxScroll: target.scrollHeight - target.clientHeight,
        editorMaxScroll: editorView.scrollDOM.scrollHeight - editorView.scrollDOM.clientHeight,
        lineMap: lineMap.current,
        getEditorLineTop,
      });

      if (!rafId.current) {
        currentScrollTop.current = editorView.scrollDOM.scrollTop || 0;
        rafId.current = requestAnimationFrame(syncLoop);
      }
    }
  };


  // Switch default code when mode changes
  useEffect(() => {
    setError(null);
    setSvgContent('');
    // 清空自訂 Mermaid 模式樣式
    const styleEl = document.getElementById('mermaid-custom-style-block');
    if (styleEl) styleEl.textContent = '';
  }, [mode]);

  // 更新編輯器內容
  const handleCodeChange = (newCode: string) => {
    if (currentDocument) {
      // 直接更新當前文檔（debounce 在上面的 useEffect 中處理）
      updateCurrentDocument(newCode);
    }
  };

  // 處理文檔切換
  const handleDocumentSwitch = (docId: string | null) => {
    if (!docId) {
      switchDocument(""); // 或者調整 useDocumentStorage 支援 null
      return;
    }
    switchDocument(docId);

    // 清空自訂 Mermaid 模式樣式
    const styleEl = document.getElementById('mermaid-custom-style-block');
    if (styleEl) styleEl.textContent = '';

    // 只在手機版（小螢幕）自動關閉側邊欄，桌面版保持開啟以便雙擊重命名
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    resetNavigation();
  };

  const handleCloseTab = (docId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();

    const nextOpenIds = openDocIds.filter(id => id !== docId);
    setOpenDocIds(nextOpenIds);

    // 如果關閉的是當前分頁
    if (currentDocId === docId) {
      if (nextOpenIds.length > 0) {
        // 切換到最右邊的分頁 (模仿 VS Code)
        handleDocumentSwitch(nextOpenIds[nextOpenIds.length - 1]);
      } else {
        // 如果沒有分頁了，設定為 null
        handleDocumentSwitch(null);
      }
    }
  };

  // ─── 拖曳調整編輯器與預覽面板比例 ──────────────────────────────────────────
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth <= 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;

      const minEditorRatio = (300 / containerWidth) * 100;
      const maxEditorRatio = ((containerWidth - 300) / containerWidth) * 100;

      let newRatio = (clientX / containerWidth) * 100;
      newRatio = Math.max(minEditorRatio, Math.min(maxEditorRatio, newRatio));

      requestAnimationFrame(() => {
        setEditorRatio(newRatio);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      requestAnimationFrame(() => {
        rebuildLineMap();
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rebuildLineMap]);

  // 處理新增文檔
  const handleCreateDocument = (newMode: 'markdown' | 'mermaid', name: string, templateId: string = '', icon?: string) => {
    if (!defaultContents) return;

    const modeToUse = newMode || (currentDocument?.mode || 'markdown');
    let defaultContent = '';

    if (modeToUse === 'mermaid') {
      const tid = templateId || 'mermaid-standard';
      defaultContent = defaultContents.mermaid[tid] || defaultContents.mermaid['mermaid-standard'];
    } else {
      const tid = templateId || 'markdown-standard';
      defaultContent = defaultContents.markdown[tid] || defaultContents.markdown['markdown-standard'];
    }

    // 使用傳入的資料夾 ID (來自側邊欄偵測或是 Wikilink 偵測)
    const folderId = pendingFolderId;

    createDocument(modeToUse, defaultContent, name, folderId, modeToUse === 'mermaid' ? (templateId || 'mermaid-standard') : (templateId || 'markdown-standard'), icon);
    setInitialDocName(''); // Reset
    setPendingFolderId(null); // Reset
  };

  const handleOpenCreateModal = (name: string = '', folderId: string | null = null) => {
    setInitialDocName(name);
    setPendingFolderId(folderId);
    setIsCreateModalOpen(true);
  };

  // Render Mermaid code to SVG（使用動態載入 Mermaid，避免首屏同步載入大套件）
  const renderDiagram = useCallback(async (mermaidCode: string, currentTheme: string) => {
    if (mode !== 'mermaid') return;

    if (!mermaidCode.trim()) {
      setSvgContent('');
      setError(null);
      // 清空自訂樣式
      const styleEl = document.getElementById('mermaid-custom-style-block');
      if (styleEl) styleEl.textContent = '';
      return;
    }

    // ─── 預處理：動態提取並剔除內嵌 <style> 標籤 ───
    let cleanedCode = mermaidCode;
    let extractedStyle = '';

    const styleRegex = /<style>([\s\S]*?)<\/style>/gi;
    let match;
    // 提取所有 <style> 內容
    while ((match = styleRegex.exec(mermaidCode)) !== null) {
      extractedStyle += match[1] + '\n';
    }
    // 剔除所有 <style> 標籤以防 Mermaid 語法錯誤
    cleanedCode = mermaidCode.replace(styleRegex, '');

    // 將提取出的樣式動態注入到 document.head 中
    let styleEl = document.getElementById('mermaid-custom-style-block') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'mermaid-custom-style-block';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = extractedStyle;

    try {
      // 動態提取當前主題的 CSS 配色與字型變數
      // （此時 getThemeVariables 內部的 tempDiv 會自動包含剛被注入的 extractedStyle 生效值）
      const { fontFamily, themeVars } = getThemeVariables(currentTheme, isDarkMode);

      // 動態載入 Mermaid Singleton（統一使用 base 主題配合自訂變數）
      const mermaid = await getMermaid();

      // 切換主題或更新時重新初始化。統一使用 'base' 主題，注入自主提取的 themeVariables 配色
      mermaid.initialize({
        theme: 'base' as any,
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: fontFamily,
        themeVariables: themeVars
      });

      // 產生動態 id：將 currentTheme、isDarkMode、以及 extractedStyle 的 hash 一併納入運算！
      // 確保使用者只修改了 <style> 中的變數而沒修改圖表代碼時，仍會強迫 Mermaid 重新渲染以套用新變數！
      const renderId = `mermaid-mode-${hashString(cleanedCode + currentTheme + (isDarkMode ? 'dark' : 'light') + extractedStyle)}`;

      // 清除可能殘留在 document 中的舊快取節點，避免 Mermaid 積累隱藏的過期元素
      const staleNode = document.getElementById(renderId);
      if (staleNode) staleNode.remove();

      const { svg } = await mermaid.render(renderId, cleanedCode);
      setSvgContent(svg);
      setError(null);
    } catch (err: any) {
      console.error("Mermaid Render Error:", err);
      let msg = err.message || 'Syntax error in Mermaid code';

      // 1. Line Number Mapping Logic
      // Mermaid often ignores blank lines and comments in its internal representation,
      // leading to line number mismatch in errors.
      const lineMatch = msg.match(/line (\d+)/i);
      if (lineMatch) {
        const compilerLine = parseInt(lineMatch[1]);
        const lines = mermaidCode.split('\n');

        let actualLine = 0;
        let compilerCounter = 0;

        // Mermaid typically ignores:
        // - Empty lines (trimmed)
        // - Comment lines starting with %% (trimmed)
        // - Leading/trailing whitespace
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          const isIgnored = trimmed === '' || trimmed.startsWith('%%');

          if (!isIgnored) {
            compilerCounter++;
          }

          if (compilerCounter === compilerLine) {
            actualLine = i + 1;
            break;
          }
        }

        if (actualLine > 0) {
          msg = msg.replace(/line \d+/i, `line ${actualLine} `);
        }
      }

      if (msg.includes('Expecting')) {
        msg = msg.split('Expecting')[0].trim();
      }

      // Ensure newline before the pointer line (dashes followed by caret)
      msg = msg.replace(/([^\n])(\-{3,}\^)/g, '$1\n$2');

      setError(msg);
      setSvgContent('');
    }
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram(code, settings.printSettings.previewTheme);
    }, 150); // 縮短 Mermaid 模式延遲 (300ms -> 150ms)
    return () => clearTimeout(timer);
  }, [code, settings.printSettings.previewTheme, renderDiagram]);


  // 清理檔案名稱中的非法字元
  const sanitizeFileName = (name: string): string => {
    // Windows 和多數系統禁止的字元：< > : " / \ | ? *
    return name.replace(/[<>:"/\\|?*]/g, '-').trim();
  };

  /** 統一下載 / 列印：注入 @page CSS 後呼叫 window.print() */
  const handlePrint = useCallback((printMode: EditorMode) => {
    const { paperSize, orientation, scale, margin, mergeVaultOnPdfExport } = settings.printSettings;
    const marginMap: Record<string, string> = { normal: '1.5cm', narrow: '0.5cm', none: '0' };

    // 計算列印時的檔案名稱
    let printFileName = currentDocument?.name || 'document';
    const isMergedPrint = mergeVaultOnPdfExport && currentDocument?.folderId;

    if (isMergedPrint) {
      const vaultDocs = documents.filter(d => d.folderId === currentDocument.folderId && (d.mode === 'markdown' || d.mode === 'mermaid'));
      if (vaultDocs.length > 1) {
        const folder = folders.find(f => f.id === currentDocument.folderId);
        printFileName = folder ? `${folder.name}` : `${printFileName}`;
      }
    }

    // 決定有效的列印模式：如果是合併列印，則強制使用 markdown 佈局
    const effectivePrintMode = isMergedPrint ? 'markdown' : printMode;

    // 縮放與佈局樣式
    let additionalCSS = '';
    if (effectivePrintMode === 'mermaid') {
      // 重置 transform scale（螢幕縮放），移除畫布裝飾，讓 SVG 直接以頁面寬度輸出
      const svgWidthCSS = scale === 'fit'
        ? 'svg { max-width: 100% !important; width: 100% !important; height: auto !important; }'
        : scale === 'actual' ? ''
          : `svg { max-width: 100% !important; width: ${scale}% !important; height: auto !important; }`;
      additionalCSS = `
        /* 重置螢幕縮放（zoom/transform），讓內容回到自然寬度 */
        .preview-panel > div > div {
          transform: none !important;
          position: static !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          padding: 2rem 0 !important;
          background: transparent !important;
        }
        /* 移除畫布外框裝飾：圓角、陰影、padding、深色背景 */
        .preview-panel > div > div > div {
          transform: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
        }
        ${svgWidthCSS}
      `;
    } else {
      // Markdown 模式：當開啟列印預覽時，我們需要確保列印時捨棄所有 UI，只留紙張
      additionalCSS = `
        /* 強制所有背景為白色，文字為黑色 */
        /* 強制所有背景為白色 */
        html, body, .preview-panel, .print-paper {
            background-color: white !important;
            color-scheme: light !important;
            box-shadow: none !important;
            --tw-ring-shadow: none !important;
            --tw-ring-offset-shadow: none !important;
        }


        .print-preview-container { 
            transform: none !important; 
            width: 100% !important; 
            gap: 0 !important; 
            display: block !important;
            height: auto !important;
            overflow: visible !important;
        }

        .print-paper { 
            box-shadow: none !important; 
            --tw-ring-shadow: none !important;
            --tw-ring-offset-shadow: none !important;
            margin: 0 !important; 
            width: 100% !important; 
            height: auto !important;
            min-height: auto !important; 
            position: static !important;
            display: block !important;
            overflow: visible !important;
            border: none !important;
            background-color: white !important;
        }

        .prose-container {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
        }

        .prose {
            max-width: none !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            background-color: white !important;
        }

        /* 修正程式碼區塊：確保內容換行顯示，背景色交由 theme 決定 */
        .prose pre {
            white-space: pre-wrap !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            max-width: 100% !important;
            display: block !important;
            filter: invert(0) !important;
            text-shadow: none !important;
        }


        /* 確保圖表在列印時不被濾鏡反轉 (針對深色模式) */
        svg, img, canvas, .mermaid, .vega-embed, .smiles-drawer {
            max-width: 100% !important;
            width: auto !important; /* 優先保留原始寬度，配合 ResizableWrapper 的 W:% 限制 */
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            margin-left: auto !important;
            margin-right: auto !important;
            page-break-inside: avoid !important; /* 媒體元件盡量不跨頁 */
            background-color: transparent !important;
            filter: none !important;
        }

        /* 針對各類圖表容器的 SVG/IMG 強制縮放 (圖表這類元件通常需要填滿容器) */
        .diagram-block-container svg, 
        .diagram-block-container canvas,
        .abcjs-wrapper svg {
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
        }

        /* 內容圖片保持原始比例，僅受 max-width 約束 */
        .prose img {
            width: auto !important;
            max-width: 100% !important;
            height: auto !important;
        }

        /* Mermaid 圖表顏色由 theme 決定，不強制覆蓋為黑白 */

        /* 針對 Vega/Canvas 的文字顏色 (如果有的話) */
        .vega-embed canvas {
            background-color: white !important;
        }

        /* 內容區塊間隔優化：段落與標題允許在中間分頁，但盡量保持標題與內容在一起 */
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
            page-break-after: avoid !important;
        }

        .prose p, .prose li, .prose pre, .prose blockquote {
            page-break-inside: auto !important;
        }

        /* 隱藏捲軸與不必要元素 */
        * { scrollbar-width: none !important; }
        ::-webkit-scrollbar { display: none !important; }

        /* 針對 react-syntax-highlighter 產生的 div 容器進行修正 */
        .diagram-block-container {
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
        }
      `;
    }

    const style = document.createElement('style');
    style.id = 'app-print-override';
    style.textContent = `
      @media print {
        @page { size: ${paperSize} ${orientation}; margin: ${marginMap[margin] ?? '1.5cm'}; }


        header, footer, aside, .tab-bar, .status-bar, .floating-controls { display: none !important; }
        /* 靜默遮罩不應被列印 */
        #app-print-mask { display: none !important; }

        .preview-panel { 
          display: block !important;
          overflow: visible !important; 
          width: 100% !important; 
          height: auto !important; 
          position: static !important;
          min-width: 0 !important;
          flex: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .preview-panel > div {
          display: block !important;
          overflow: visible !important;
          height: auto !important;
          position: static !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        ${additionalCSS}
      }
    `;
    document.head.appendChild(style);

    // 1. 強制進入列印模式（這會觸發 MarkdownPreview 重新渲染為淺色）
    const currentPrintSessionId = printSessionRef.current + 1;
    printSessionRef.current = currentPrintSessionId;

    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
    }

    // ── 靜默遮罩：在移除 .dark 之前，先以不透明遮罩蓋住整個畫面，
    //    讓底下的「深色→淺色」重繪過程對使用者完全不可見。
    const mask = document.createElement('div');
    mask.id = 'app-print-mask';
    // 使用 background-color 而非 backdrop-filter，確保完全遮蔽且不影響列印
    Object.assign(mask.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2047483647',           // 最大 z-index，壓過所有 UI
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', // 匹配當前背景色，視覺無縫
      opacity: '1',
      pointerEvents: 'none',          // 不阻擋後續 window.print() 的焦點事件
      transition: 'none',             // 遮罩出現必須是瞬間的，不能有動畫
    });
    // 告知列印器忽略此遮罩元素
    mask.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mask);

    // 列印時防禦性地臨時移除 .dark，防止深色模式的主題變數在列印時被匹配並渲染
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    }

    flushSync(() => {
      setPrintSessionId(currentPrintSessionId);
      setIsPrinting(true);
    });

    const finalizePrint = () => {
      // 暫時更換標題以確保 PDF 檔名正確
      const prevTitle = document.title;
      document.title = sanitizeFileName(printFileName);

      if (window.electron && window.electron.print) {
        window.electron.print();
      } else {
        window.print();
      }

      // 恢復原本的標題
      document.title = prevTitle;
      setIsPrinting(false);

      // 列印結束後恢復深色模式（此時遮罩仍在，使用者看不到切換過程）
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      }

      document.getElementById('app-print-override')?.remove();
      printTimeoutRef.current = null;

      // 深色模式已恢復後，以短淡出移除遮罩（視覺更柔和）
      const removeMask = document.getElementById('app-print-mask');
      if (removeMask) {
        removeMask.style.transition = 'opacity 2000ms ease';
        removeMask.style.opacity = '0';
        setTimeout(() => removeMask.remove(), 2000);
      }
    };

    // 使用安全延遲 (1000~1200ms) 以讓 DOM 重組並完成淺色主題與圖表非同步渲染，百分百防死鎖
    printTimeoutRef.current = setTimeout(finalizePrint, 1000);
  }, [mode, settings.printSettings, isDarkMode, documents, folders, currentDocument]);

  // 取消列印的受控回呼
  const handleCancelPrint = useCallback(() => {
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = null;
    }
    setIsPrinting(false);

    // 取消列印時同樣恢復深色模式
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }

    document.getElementById('app-print-override')?.remove();

    // 取消時同步移除靜默遮罩
    const mask = document.getElementById('app-print-mask');
    if (mask) {
      mask.style.transition = 'opacity 150ms ease';
      mask.style.opacity = '0';
      setTimeout(() => mask.remove(), 160);
    }
  }, [isDarkMode]);

  // 攔截 Ctrl + P (原生列印捷徑)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault(); // 攔截瀏覽器預設列印
        handlePrint(mode); // 改執行我們受控的列印邏輯
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint, mode]);

  const downloadMarkdown = () => {
    let contentToDownload = code;
    let fileName = currentDocument?.name ? sanitizeFileName(currentDocument.name) : `document-${Date.now()}`;

    // 如果開啟了「合併資料夾 (Markdown)」且文件在資料夾中
    if (settings.printSettings.mergeVaultOnMdExport && currentDocument?.folderId) {
      const vaultDocs = documents.filter(d => d.folderId === currentDocument.folderId && (d.mode === 'markdown' || d.mode === 'mermaid'));
      if (vaultDocs.length > 1) {
        contentToDownload = vaultDocs
          .map(d => {
            let docContent = d.content;
            if (d.mode === 'mermaid') {
              docContent = `\`\`\`mermaid\n${docContent}\n\`\`\``;
            } else {
              // 替換所有WikiLink為錨點連結
              docContent = docContent.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
                return `[${p1}](#wikilink-${encodeURIComponent(p1)})`;
              });
            }
            return `--- \n# ${d.name}\n<a id="wikilink-${encodeURIComponent(d.name)}"></a>\n\n${docContent}`;
          })
          .join('\n\n');

        const folder = folders.find(f => f.id === currentDocument.folderId);
        fileName = folder ? `${sanitizeFileName(folder.name)}-full` : `${fileName}-merged`;
      } else {
        // 單檔匯出：原本的 WikiLink 失去作用，直接剝離 [] 轉作純文字
        contentToDownload = code.replace(/\[\[(.*?)\]\]/g, '$1');
      }
    } else {
      // 單檔匯出：原本的 WikiLink 失去作用，直接剝離 [] 轉作純文字
      contentToDownload = code.replace(/\[\[(.*?)\]\]/g, '$1');
    }

    const blob = new Blob([contentToDownload], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsImage = (format: 'png' | 'svg' | 'jpg') => {
    if (!svgContent) {
      console.error("Export failed: No SVG content");
      return;
    }

    // 1. Parse raw SVG string
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.documentElement;

    // REMOVED: Manual xmlns injection to avoid "redefined" errors.
    // XMLSerializer usually handles this correctly.

    // 2. Precise ViewBox parsing
    const viewBoxAttr = svgEl.getAttribute('viewBox');
    let x = 0, y = 0, width = 0, height = 0;

    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(/\s+|,/).filter(Boolean).map(Number);
      if (parts.length === 4) {
        [x, y, width, height] = parts;
      }
    }

    // Fallback logic
    if (width === 0 || height === 0) {
      const wAttr = parseFloat(svgEl.getAttribute('width') || '0');
      const hAttr = parseFloat(svgEl.getAttribute('height') || '0');
      if (wAttr > 0 && hAttr > 0) {
        width = wAttr;
        height = hAttr;
      } else {
        if (previewRef.current) {
          const domSvg = previewRef.current.querySelector('svg');
          if (domSvg) {
            try {
              const bbox = domSvg.getBBox();
              width = bbox.width;
              height = bbox.height;
              x = bbox.x;
              y = bbox.y;
            } catch (e) {
              console.warn("Export BBox missing", e);
            }
          }
        }
      }
    }

    // Safety check
    if (width === 0 || height === 0) {
      width = 800; height = 600;
    }

    const padding = 40;
    // Smart scaling: Use 2x for quality, but drop to 1x if massive to avoid canvas limits
    let scale = 2;
    if ((width * scale) > 4000 || (height * scale) > 4000) {
      scale = 1;
      console.warn("Large diagram detected, reducing export scale to 1x");
    }

    svgEl.setAttribute('width', width.toString());
    svgEl.setAttribute('height', height.toString());
    svgEl.style.maxWidth = 'none';

    const serializer = new XMLSerializer();

    if (format === 'svg') {
      svgEl.setAttribute('viewBox', `${x - padding} ${y - padding} ${width + padding * 2} ${height + padding * 2} `);
      const svgData = serializer.serializeToString(svgEl);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // 使用文檔自訂名稱，若無則使用時間戳記
      const fileName = currentDocument?.name ? sanitizeFileName(currentDocument.name) : `mermaid-diagram-${Date.now()}`;
      link.download = `${fileName}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const cleanSvgData = serializer.serializeToString(svgEl);

      // Use Blob URL as requested for large file support and performance
      const svgBlob = new Blob([cleanSvgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = (width + padding * 2) * scale;
        canvas.height = (height + padding * 2) * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(scale, scale);
        ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

        // Draw image
        ctx.drawImage(img, padding, padding, width, height);

        try {
          const link = document.createElement('a');
          // 使用文檔自訂名稱，若無則使用時間戳記
          const fileName = currentDocument?.name ? sanitizeFileName(currentDocument.name) : `mermaid-diagram-${Date.now()}`;
          link.download = `${fileName}.${format}`;
          link.href = canvas.toDataURL(`image / ${format} `, 0.9);
          link.click();
        } catch (e) {
          console.error("Export canvas error:", e);
          alert("Export failed: Image resolution might be too high for this browser. Please try SVG format.");
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = (e) => {
        console.error("Export image loading failed:", e);
        alert("Failed to render diagram. If using external images/fonts, this may be a security restriction. Please use SVG format.");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (confirm("重置當前的工作到預設?")) {
      let defaultCode = '';
      const tid = currentDocument?.templateId;

      if (mode === 'mermaid') {
        const effectiveTid = tid || 'mermaid-standard';
        defaultCode = defaultContents?.mermaid[effectiveTid] || defaultContents?.mermaid['mermaid-standard'] || '';
      } else {
        const effectiveTid = tid || 'markdown-standard';
        defaultCode = defaultContents?.markdown[effectiveTid] || defaultContents?.markdown['markdown-standard'] || '';
      }

      handleCodeChange(defaultCode);
      resetNavigation();
    }
  };

  const handleClear = () => {
    handleCodeChange('');
  };

  /**
   * 將文字插入編輯器游標位置。
   * 若無游標位置資訊（例如 Modal 開啟後 focus 已移走），則附加至文件末尾。
   */
  const handleInsertIntoDoc = (text: string) => {
    if (!editorRef.current?.view) return;
    const view = editorRef.current.view;
    const pos = view.state.selection.main.anchor;

    // 取得插入前的內容
    const before = view.state.doc.sliceString(0, pos);
    const after = view.state.doc.sliceString(pos);

    // 確保插入的內容前後有適當的換行
    const prefix = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '\n';

    const insertText = prefix + text + suffix;

    view.dispatch({
      changes: { from: pos, insert: insertText },
      selection: { anchor: pos + insertText.length }
    });
  };

  // 處理全檔案匯入
  const handleImportFullFile = (file: File, content: string) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let importMode: EditorMode = 'markdown';

    if (extension === 'mmd') {
      importMode = 'mermaid';
    }

    const newDocId = createDocument(importMode, content, file.name.replace(/\.[^/.]+$/, ""));
    if (newDocId) {
      handleDocumentSwitch(newDocId);
    }
  };

  // 新增：處理文字檔案導入為新文檔
  const handleImportAsNewDoc = useCallback((name: string, content: string, importMode: 'markdown' | 'mermaid') => {
    const newDocId = createDocument(importMode, content, name);
    if (newDocId) {
      handleDocumentSwitch(newDocId);
    }
  }, [createDocument, handleDocumentSwitch]);

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        // 這裡需要導入 parseExcelToMarkdown
        const { parseExcelToMarkdown } = await import('./src/services/excelParser');
        const md = await parseExcelToMarkdown(file);
        if (md) handleInsertIntoDoc(md);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content !== undefined) handleImportFullFile(file, content);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Failed to parse file", error);
      alert("匯入失敗，請檢查檔案格式是否正確");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleProcessFiles(e.target.files);
    }
    e.target.value = '';
  };

  const mathJaxConfig = {
    loader: { load: ["[tex]/ams", "[tex]/html", "[tex]/mhchem", "ui/menu"] },
    options: {
      enableVersionWarnings: false
    },
    tex: {
      packages: { "[+]": ["ams", "html", "mhchem"] },
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"]
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"]
      ],
      macros: {
        ...settings.customMacros
      }
    },
    chtml: {
      scale: 1,
      minScale: 0.5,
      mtextInheritFont: false,
      merrorInheritFont: true,
      mathmlSpacing: false,
      skipAttributes: {},
      exFactor: 0.5,
      displayAlign: 'center',
      displayIndent: '0'
    },
    svg: {
      scale: 1,
      minScale: 0.5,
      mtextInheritFont: false,
      merrorInheritFont: true,
      mathmlSpacing: false,
      skipAttributes: {},
      exFactor: 0.5,
      displayAlign: 'center',
      displayIndent: '0'
    },
    typesettingOptions: {
      fn: 'tex2chtml'
    }
  };

  return (
    // Suspense fallback 直接渲染空白元素（MathJax 在背景静默載入，UI 不會閃爍）
    // 首次 render 後 LazyMathJaxProvider 即被証實，前後大約 ~100ms 的差異對使用者完全無感
    <Suspense fallback={<div className="flex flex-col h-screen max-h-screen bg-slate-50 dark:bg-slate-900" />}>
      <LazyMathJaxProvider config={mathJaxConfig}>
        <div className={`flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-200 ${isPrinting ? 'min-h-screen h-auto block' : 'h-screen max-h-screen'}`}>

          {/* ── premium 列印 Loading Overlay ──────────────────────────────── */}
          {isPrinting && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300 print:hidden"
              aria-live="polite"
            >
              {/* <div className="flex flex-col items-center gap-4 px-10 py-8 bg-white/90 dark:bg-slate-900/90 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/10 max-w-sm text-center">
              <InteractiveLogo size={48} loading={true} showBg={false} variant="v1" className="mb-2" />
              <div className="flex flex-col gap-1.5 mt-2">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">正在最佳化 PDF 文件與圖表配置...</p>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-normal">這會暫時切換為適合閱讀與省墨水的淺色排版。完成後將自動為您開啟列印對話方塊。</p>
              </div>
              <button
                onClick={handleCancelPrint}
                className="mt-2 px-5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all border border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-full active:scale-95"
              >
                取消列印
              </button>
            </div> */}
            </div>
          )}
          <Header
            mode={mode}
            isDarkMode={isDarkMode}
            toggleDarkMode={handleToggleDarkMode}
            onDownloadMarkdown={downloadMarkdown}
            onExportImage={exportAsImage}
            isSyncScroll={isSyncScroll}
            setIsSyncScroll={setIsSyncScroll}
            onInsertCode={(newCode) => handleCodeChange(code + '\n\n' + newCode)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onPrint={() => handlePrint(mode)}
            isInFolder={!!currentDocument?.folderId}
            printSettings={settings.printSettings}
            onUpdatePrintSettings={updatePrintSettings}
            isCommentMode={isCommentMode}
            setIsCommentMode={setIsCommentMode}
            hasOpenDocuments={openDocIds.length > 0}
          />

          <main className={`app-main flex-1 min-h-0 flex justify-center print:block print:overflow-visible bg-slate-200/40 dark:bg-black/20 ${isPrinting ? 'h-auto' : 'overflow-hidden'}`}>
            {/* 歷史側邊欄 */}
            <HistorySidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              documents={documents}
              currentDocId={currentDocId}
              currentDocContent={code}
              currentDocMode={mode}
              onInsertIntoDoc={handleInsertIntoDoc}
              onSelectDocument={handleDocumentSwitch}
              onCreateDocument={(fId) => handleOpenCreateModal('', fId)}
              onDeleteDocument={deleteDocument}
              onRenameDocument={renameDocument}
              storageUsage={storageUsage}
              getBacklinks={getBacklinks}
              folders={folders}
              onCreateFolder={createFolder}
              onDeleteFolder={deleteFolder}
              onRenameFolder={renameFolder}
              onMoveDocument={moveDocument}
              onReorderDocuments={reorderDocuments}
              onImportFiles={handleProcessFiles}
              onImportAsNewDoc={handleImportAsNewDoc}
            />

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv,.md,.txt,.mmd"
              onChange={handleFileChange}
            />

            {/* Create Document Modal */}
            <CreateDocModal
              isOpen={isCreateModalOpen}
              onClose={() => {
                setIsCreateModalOpen(false);
                setPendingFolderId(null);
              }}
              onCreate={handleCreateDocument}
              initialName={initialDocName}
            />
            {/* 移除 key={docFadeKey} 以防止全組件樹重掛造成的渲染跳動 */}
            {/* 移除 key={docFadeKey} 以防止全組件樹重掛造成的渲染跳動 */}
            <div
              ref={containerRef}
              className={`layout-main-content print:block print:static print:h-auto print:overflow-visible ${isResizing ? 'layout-resizing' : ''}`}
              style={isPrinting ? { display: 'block', height: 'auto', overflow: 'visible', position: 'static' } : undefined}
            >
              <div
                className="print:hidden h-full flex flex-col overflow-hidden min-h-0 min-w-0"
                style={{ width: isPrinting ? '0' : `${editorRatio}%`, minWidth: isPrinting ? '0' : '300px', display: isPrinting ? 'none' : undefined }}
              >
                <Editor
                  ref={editorRef}
                  mode={mode}
                  code={code}
                  setCode={handleCodeChange}
                  onCopy={handleCopy}
                  onReset={handleReset}
                  onClear={handleClear}
                  copied={copied}
                  onScroll={handleEditorScroll}
                  isDarkMode={isDarkMode}
                  onMouseEnter={() => {
                    isHoveringEditor.current = true;
                    if (!rafId.current) scrollSource.current = null;
                  }}
                  onMouseLeave={() => {
                    isHoveringEditor.current = false;
                  }}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  openDocIds={openDocIds}
                  currentDocId={currentDocId}
                  documents={documents}
                  onSwitchTab={handleDocumentSwitch}
                  onCloseTab={handleCloseTab}
                  hasOpenDocuments={openDocIds.length > 0}
                  onStickyChange={handleStickyChange}
                />
              </div>

              {!isPrinting && (
                <LayoutSplitter
                  onMouseDown={handleSplitterMouseDown}
                  isResizing={isResizing}
                  isDarkMode={isDarkMode}
                />
              )}

              <div
                className={`print:w-full print:h-auto print:overflow-visible print:block min-w-0 min-h-0 print:static ${isPrinting ? 'block h-auto overflow-visible w-full static' : 'flex-1 h-full flex flex-col overflow-hidden'}`}
                style={{ minWidth: isPrinting ? '0' : '300px' }}
              >
                <PreviewPanel
                  ref={previewRef}
                  mode={mode}
                  error={error}
                  setError={setError}
                  svgContent={svgContent}
                  zoom={zoom}
                  position={position}
                  isDragging={isDragging}
                  onZoom={handleZoom}
                  onSetZoom={setZoom}
                  onResetNav={resetNavigation}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onWheel={handleWheel}
                  onScroll={handlePreviewScroll}
                  code={deferredCode}
                  isDarkMode={isDarkMode}
                  onMouseEnter={() => {
                    isHoveringPreview.current = true;
                    if (!rafId.current) scrollSource.current = null;
                  }}
                  onMouseLeave={() => {
                    isHoveringPreview.current = false;
                  }}
                  documents={documents}
                  onSelectDocument={handleDocumentSwitch}
                  onCreateMissing={handleOpenCreateModal}
                  currentDocId={currentDocId}
                  openDocIds={openDocIds}
                  printSettings={settings.printSettings}
                  previewTheme={settings.printSettings.previewTheme}
                  isPrinting={isPrinting}
                  printSessionId={printSessionId}
                  isCommentMode={isCommentMode}
                  setIsCommentMode={setIsCommentMode}
                  onUpdateLineComment={updateLineComment}
                />
              </div>
            </div>
          </main>

          <IntroModal isOpen={isIntroModalOpen} onClose={() => setIsIntroModalOpen(false)} />

          {/* SEO Content - Hidden from visual display but visible to search engines */}
          <SEOContent />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            mode={mode}
            currentMacros={settings.customMacros}
            onSaveMacros={updateMacros}
            onRestoreDefaults={restoreDefaults}
            currentPrintSettings={settings.printSettings}
            onSavePrintSettings={updatePrintSettings}
            isStandalone={!documents.find(d => d.id === currentDocId)?.folderId}
            onOpenIntro={() => setIsIntroModalOpen(true)}
            favoriteThemes={settings.favoriteThemes || []}
            onToggleFavoriteTheme={toggleFavoriteTheme}
          />
        </div>
      </LazyMathJaxProvider>
    </Suspense>
  );
};

export default App;
