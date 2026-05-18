import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { MathJaxContext } from 'better-react-mathjax';
import mermaid from 'mermaid';

import Header from './src/components/layout/Header';
import Editor from './src/components/layout/Editor';
import PreviewPanel from './src/components/layout/PreviewPanel';
import HistorySidebar from './src/components/layout/HistorySidebar';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import CreateDocModal from './src/components/modals/CreateDocModal';
import SettingsModal from './src/components/modals/SettingsModal';
import SEOContent from './src/components/markdown/SEOContent';
import Footer from './src/components/layout/Footer';
import IntroModal from './src/components/modals/IntroModal';
import InteractiveLogo from './src/components/ui/InteractiveLogo';
import { usePanZoom } from './src/hooks/usePanZoom';
import { useDocumentStorage } from './src/hooks/useDocumentStorage';
import { hashString, debounce } from './src/utils';
import { useAppSettings } from './src/hooks/useAppSettings';
import './src/styles/themes/academic.css';
import './src/styles/themes/minimal.css';
import './src/styles/themes/developer.css';
import './src/styles/themes/implementation-plan.css';
import './src/styles/themes/classical.css';

type Theme = 'default' | 'neutral' | 'dark' | 'forest';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});




type EditorMode = 'mermaid' | 'markdown';

const App: React.FC = () => {
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
          { id: 'basic', path: 'defaults/markdown-basic.md' },
          { id: 'math', path: 'defaults/markdown-math.md' },
          { id: 'charts', path: 'defaults/markdown-charts.md' },
          { id: 'mermaid', path: 'defaults/markdown-mermaid.md' },
          { id: 'markdown-abc', path: 'defaults/markdown-abc.md' },
        ];

        const mermaidTemplates = [
          { id: 'mermaid-standard', path: 'defaults/default-mermaid.md' },
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
          markdown: { 'markdown-standard': '# Markdown Editor\n\n無法載入預設內容。' },
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
  } = useDocumentStorage();

  // UI 狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<Theme>('neutral');
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
  const printTimeoutRef = useRef<any>(null);

  const { settings, updateMacros, updatePrintSettings, restoreDefaults } = useAppSettings();


  // 從當前文檔取得 mode 和 code
  const mode = currentDocument?.mode || 'markdown';
  const code = currentDocument?.content || '';

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
  useEffect(() => {
    if (documents.length === 0 && defaultContents && !isLoadingDefaults) {
      createDocument('markdown', defaultContents.markdown['markdown-standard'], '預設 標記掉落 文檔', null, 'markdown-standard');
      createDocument('mermaid', defaultContents.mermaid['mermaid-standard'], '預設 美人魚 文檔', null, 'mermaid-standard');
    }
  }, [documents.length, createDocument, defaultContents, isLoadingDefaults]);

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
    const activePapers = container.querySelectorAll(`.print-paper[data-doc-id="${currentDocId}"]`);
    const searchContext = activePapers.length > 0 ? activePapers[0] : container;

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

    window.addEventListener('content-layout-ready', handleLayoutChange);
    window.addEventListener('preview-content-height-change', handleLayoutChange);
    window.addEventListener('resize', handleLayoutChange);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('content-layout-ready', handleLayoutChange);
      window.removeEventListener('preview-content-height-change', handleLayoutChange);
      window.removeEventListener('resize', handleLayoutChange);
    };
  }, [rebuildLineMap]);

  // 當內容大幅度改變或切換文本時重新校準
  useEffect(() => {
    if (code !== lastContentRef.current) {
      lastContentRef.current = code;
      setTimeout(rebuildLineMap, 500); // 等待 ReactMarkdown 渲染
    }
  }, [code, rebuildLineMap]);


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

    // 1. 取得編輯器當前高度對應的行區塊
    const lineBlock = editorView.lineBlockAtHeight(scrollDOM.scrollTop);
    const line = editorView.state.doc.lineAt(lineBlock.from);
    const lineNumber = line.number;

    if (previewRef.current) {
      const map = lineMap.current;
      const sortedLines = Array.from(map.keys()).sort((a, b) => a - b);

      if (sortedLines.length === 0) {
        // 退回百分比模式
        const percentage = scrollDOM.scrollTop / (scrollDOM.scrollHeight - scrollDOM.clientHeight || 1);
        targetScrollTop.current = percentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
      } else {
        // 尋找包圍當前行號的兩個標記點
        let l1 = -1, l2 = -1;
        for (let i = 0; i < sortedLines.length; i++) {
          if (sortedLines[i] <= lineNumber) {
            l1 = sortedLines[i];
          } else {
            l2 = sortedLines[i];
            break;
          }
        }

        if (l1 !== -1 && l2 !== -1) {
          // 執行線性插值 (Linear Interpolation)
          const p1 = map.get(l1)!;
          const p2 = map.get(l2)!;

          // 取得這兩行在編輯器中的 Y 座標
          const h1 = editorView.lineBlockAt(editorView.state.doc.line(l1).from).top;
          const h2 = editorView.lineBlockAt(editorView.state.doc.line(l2).from).top;

          const ratio = (scrollDOM.scrollTop - h1) / (h2 - h1 || 1);
          targetScrollTop.current = p1 + ratio * (p2 - p1);
        } else if (l1 !== -1) {
          // 只找到前面的標記點（接近末尾）
          const p1 = map.get(l1)!;
          // 額外加上與標記點的偏差
          const h1 = editorView.lineBlockAt(editorView.state.doc.line(l1).from).top;
          targetScrollTop.current = p1 + (scrollDOM.scrollTop - h1);
        } else {
          // 在第一個標記點之前
          const p2 = map.get(sortedLines[0])!;
          const h2 = editorView.lineBlockAt(editorView.state.doc.line(sortedLines[0]).from).top;
          targetScrollTop.current = Math.max(0, p2 - (h2 - scrollDOM.scrollTop));
        }
      }

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
      const map = lineMap.current;
      const scrollTop = target.scrollTop;

      // 1. 尋找目前預覽區頂部包圍的映射點
      const sortedLines = Array.from(map.keys()).sort((a, b) => a - b);
      const offsets = sortedLines.map(line => ({ line, offset: map.get(line)! }));

      if (offsets.length === 0) {
        const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);
        targetScrollTop.current = percentage * (editorView.scrollDOM.scrollHeight - editorView.scrollDOM.clientHeight);
      } else {
        let l1 = -1, l2 = -1;
        for (let i = 0; i < offsets.length; i++) {
          if (offsets[i].offset <= scrollTop) {
            l1 = offsets[i].line;
          } else {
            l2 = offsets[i].line;
            break;
          }
        }

        if (l1 !== -1) {
          if (l2 !== -1) {
            // 插值計算編輯器位置
            const p1 = map.get(l1)!;
            const p2 = map.get(l2)!;
            const h1 = editorView.lineBlockAt(editorView.state.doc.line(l1).from).top;
            const h2 = editorView.lineBlockAt(editorView.state.doc.line(l2).from).top;

            const ratio = (scrollTop - p1) / (p2 - p1 || 1);
            targetScrollTop.current = h1 + ratio * (h2 - h1);
          } else {
            // 末尾部分
            const h1 = editorView.lineBlockAt(editorView.state.doc.line(l1).from).top;
            targetScrollTop.current = h1 + (scrollTop - map.get(l1)!);
          }
        }
      }

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

  // Render Mermaid code to SVG
  const renderDiagram = useCallback(async (mermaidCode: string, currentTheme: string) => {
    if (mode !== 'mermaid') return;

    if (!mermaidCode.trim()) {
      setSvgContent('');
      setError(null);
      return;
    }

    try {
      mermaid.initialize({ theme: currentTheme as any });
      const { svg } = await mermaid.render('mermaid-render-target', mermaidCode);
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
      renderDiagram(code, theme);
    }, 150); // 縮短 Mermaid 模式延遲 (300ms -> 150ms)
    return () => clearTimeout(timer);
  }, [code, theme, renderDiagram]);


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
        html, body, .preview-panel, .print-paper {
            background-color: white !important;
            color: black !important;
            color-scheme: light !important;
            box-shadow: none !important;
            --tw-ring-shadow: none !important;
            --tw-ring-offset-shadow: none !important;
        }

        /* 內容容器展開 */
        .print-outer-wrapper { 
            width: 100% !important; 
            height: auto !important; 
            min-height: auto !important; 
            transform: none !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            position: static !important;
            display: block !important;
            overflow: visible !important;
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

        /* 修正程式碼區塊：強制淺色底色，無視深色模式設定 */
        .prose pre {
            background-color: #f8f9fa !important;
            border: 1px solid #ddd !important;
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

        .prose :not(pre) > code {
            background-color: #f1f5f9 !important;
            color: #333 !important;
            border: 1px solid #cbd5e1 !important;
        }

        /* 語法高亮插件內部的 pre 可能有自己的樣式 */
        .prose pre {
            overflow-x: hidden !important;
            overflow-y: visible !important;
            white-space: pre-wrap !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            filter: invert(0) !important;
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

        /* 讓 Mermaid 文字在列印時變為純黑 */
        .mermaid .label text, .mermaid .edgeLabel, .mermaid .node text {
            fill: black !important;
            color: black !important;
        }

        .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon, .mermaid .node path {
            fill: #fff !important;
            stroke: #000 !important;
        }
        .mermaid .edgePath path {
            stroke: #000 !important;
        }

        /* 針對 Vega/Canvas 的文字顏色 (如果有的話) */
        .vega-embed canvas {
            background-color: white !important;
        }

        /* 內容區塊間隔優化：段落與標題允許在中間分頁，但盡量保持標題與內容在一起 */
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
            page-break-after: avoid !important;
            color: black !important;
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
        header, footer, aside, .tab-bar, section:not(.preview-panel), .status-bar, .floating-controls { display: none !important; }
        .preview-panel { 
          overflow: visible !important; 
          width: 100% !important; 
          height: auto !important; 
          position: static !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
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

    flushSync(() => {
      setPrintSessionId(currentPrintSessionId);
      setIsPrinting(true);
    });

    const finalizePrint = () => {
      // 暫時更換標題以確保 PDF 檔名正確
      const prevTitle = document.title;
      document.title = sanitizeFileName(printFileName);

      window.print();

      // 恢復原本的標題
      document.title = prevTitle;
      setIsPrinting(false);
      document.getElementById('app-print-override')?.remove();
      printTimeoutRef.current = null;
    };

    // 使用安全延遲 (1200ms) 以讓 DOM 重組並完成淺色主題與圖表非同步渲染，百分百防死鎖
    printTimeoutRef.current = setTimeout(finalizePrint, 1200);
  }, [mode, settings.printSettings, isDarkMode, documents, folders, currentDocument]);

  // 取消列印的受控回呼
  const handleCancelPrint = useCallback(() => {
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = null;
    }
    setIsPrinting(false);
    document.getElementById('app-print-override')?.remove();
  }, []);

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
        ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
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
    <MathJaxContext config={mathJaxConfig}>
      <div className="flex flex-col h-screen max-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">

        {/* ── premium 列印 Loading Overlay ──────────────────────────────── */}
        {isPrinting && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300 print:hidden"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-4 px-10 py-8 bg-white/90 dark:bg-slate-900/90 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/10 max-w-sm text-center">
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
            </div>
          </div>
        )}
        <Header
          mode={mode}
          // setMode={handleModeSwitch} // Removed from UI
          theme={theme}
          setTheme={(t) => setTheme(t as Theme)}
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

        <main className="flex-1 flex justify-center overflow-hidden print:block print:overflow-visible bg-slate-200/40 dark:bg-black/20">
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
          <div className="layout-main-content print:block">
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
            />

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
              code={code}
              theme={theme}
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
              isPrinting={isPrinting}
              printSessionId={printSessionId}
              isCommentMode={isCommentMode}
              setIsCommentMode={setIsCommentMode}
              onUpdateLineComment={updateLineComment}
            />
          </div>
        </main>

        {/* 可見的頁腳 - 增加 AdSense 文字密度與連結 */}
        <Footer showIntroTrigger={openDocIds.length > 0} onOpenIntro={() => setIsIntroModalOpen(true)} />

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
        />
      </div>
    </MathJaxContext>
  );
};

export default App;
