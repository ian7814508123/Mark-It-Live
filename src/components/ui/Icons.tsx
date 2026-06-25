// src/components/ui/Icons.tsx
// 統一 Icon 載入點，將 react-icons/lu 重新命名為與原本 lucide-react 相同的元件名稱並導出
// 方便專案其他元件無縫引用，保持 ESM Tree-shaking。

export {
  // 變更日誌相關
  LuPackagePlus as PackagePlus,
  LuPalette as Palette,
  LuMessageSquareDiff as MessageSquare,
  LuCheck as Check,
  LuX as X,
  LuStar as Star,

  // 引導與手冊相關
  LuKeyboard as Keyboard,
  LuMousePointer2 as MousePointer2,
  LuPrinter as Printer,
  LuMusic as Music,
  LuFiles as Files,
  LuWrench as Wrench,
  LuShare2 as Share2,

  // 程式碼區塊相關
  LuWrapText as WrapText,

  // 數據與媒體中心相關
  LuUpload as Upload,
  LuImage as Image,
  LuTrash2 as Trash2,
  LuCopy as Copy,
  LuClock as Clock,
  LuFileUp as FileUp,
  LuFileText as FileText,
  LuArrowLeft as ArrowLeft,
  LuFilm as Film,

  // 側邊欄與選單相關
  LuPencil as Pencil,
  LuFolderInput as FolderInput,
  LuFolderOpen as FolderOpen,
  LuChevronDown as ChevronDown,
  LuRefreshCw as RefreshCw,

  // 介紹彈窗相關
  LuSparkles as Sparkles,
  LuZap as Zap,
  LuMicroscope as Microscope,
  LuBookOpen as BookOpen,

  // 警示框相關
  LuLightbulb as Lightbulb,
  LuBan as Ban,
  LuBug as Bug,

  // PDF 合併相關
  LuFilePlus2 as FilePlus2,
  LuDownload as Download,
  LuGripVertical as GripVertical,


  // 建立文件相關
  LuPlus as Plus,
  LuFlaskConical as FlaskConical,
  LuFile as File,
  LuRuler as Ruler,
  LuGitBranch as GitBranch,
  LuSearch as Search,

  // 外部媒體防護與設定相關
  LuEyeOff as EyeOff,
  LuShieldAlert as ShieldAlert,
  LuGlobe as Globe,
  LuLock as Lock,
  LuSave as Save,
  LuRotateCcw as RotateCcw,
  LuFeather as Feather,
  LuCode as Code,
  LuClipboardList as ClipboardList,
  LuCircleX as CircleX,
  LuGraduationCap as GraduationCap,
  LuScroll as Scroll,
  LuNewspaper as Newspaper,
  LuLeaf as Leaf,
  LuOrbit as Orbit,
  LuSunset as Sunset,
  LuCloudRain as CloudRain,
  LuSnowflake as Snowflake,

  // 文件列表項目相關
  LuFileCode2 as FileCode2,

  // 表格產生器相關
  LuTable as Table,
  LuAlignLeft as AlignLeft,
  LuAlignCenter as AlignCenter,
  LuAlignRight as AlignRight,
  LuMinus as Minus,
  LuFileInput as FileInput,
  LuClipboardPaste as ClipboardPaste,
  LuArrowRight as ArrowRight,

  // 行內留言、工具與字數統計相關
  LuChevronUp as ChevronUp,

  // 編輯器與頁首/頁尾相關
  LuFileCode as FileCode,
  LuFileSearch2 as FileSearch,
  LuMenu as Menu,
  LuExternalLink as ExternalLink,
  LuFileImage as FileImage,
  LuFileJson as FileJson,
  LuSun as Sun,
  LuMoon as Moon,
  LuSettings as Settings,
  LuFolderPlus as FolderPlus,

  // 預覽面板相關
  LuZoomIn as ZoomIn,
  LuZoomOut as ZoomOut,
  LuMaximize as Maximize,
  LuHand as Hand,
  LuActivity as Activity,
  LuUndo2 as Undo2,
  LuRedo2 as Redo2,
  LuNetwork as Network,
  LuMousePointerClick as MousePointerClick,
  LuRectangleHorizontal as RectangleHorizontal,
  LuMoveRight as MoveRight,
  LuMoveDown as MoveDown,
  LuMoveLeft as MoveLeft,
  LuMoveUp as MoveUp,
  LuDatabase as DatabaseIcon,
  LuChevronRight as ChevronRight2,
  LuAlignJustify as AlignJustify,
  LuBoxes as BoxSelect,
  LuUserPlus as UserPlus,
  LuHash as Hash,
  LuToggleLeft as ToggleLeft,
  LuArrowLeftRight as ArrowRightLeft,
  LuGripHorizontal as GripHorizontal,
  LuPen as Pen,

  // 從 Feather (fi) 遷移過來的圖標
  LuChartColumnIncreasing as BarChart2,
  LuEllipsis as MoreHorizontal,
  LuLayoutDashboard as Layout,
  LuChartColumn as BarChart3,
  LuCircleHelp as HelpCircle,
  LuCircleAlert as AlertCircle,
  LuTriangleAlert as AlertTriangle,
  LuHouse as Home,
  LuInfo as Info,
  LuOctagonAlert as AlertOctagon,
  LuLoaderCircle as Loader2,
  LuPenLine as Edit3,
  LuDatabase as Database,
  LuBox as Box,
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuEye as Eye
} from 'react-icons/lu';
// 移除了 react-icons/fi, react-icons/md, react-icons/tb，改用 SVG 或 Lucide 替代

// ─── 自訂 SVG Icons 區塊 ────────────────────────────────────────────────────────
import React from 'react';

interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const SvgBase: React.FC<CustomIconProps & { children: React.ReactNode }> = ({
  size = 24,
  className = '',
  children,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // 讓它跟隨外層文字顏色
    strokeWidth="2"       // 統一線條粗細
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

// 2. 在這裡個別命名與匯出你的自訂 Icons！
// 只要把 SVG 裡面的 <path> 或 <rect> 放進 SvgBase 裡面就好

export const Parallelogram = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M4.5 6L7.5 18H19.5L16.5 6H4.5Z" />
  </SvgBase>
);

export const RParallelogram = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M19.5 6L16.5 18H4.5L7.5 6H19.5Z" />
  </SvgBase>
);

export const Flag = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M4 4v16M4 4h14l-4 6 4 6H4" />
  </SvgBase>
);

export const Trapezoid = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M7.5 6L4.5 18H19.5L16.5 6H7.5Z" />
  </SvgBase>
);

export const RTrapezoid = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M4.5 6L7.5 18H16.5L19.5 6H4.5Z" />
  </SvgBase>
);

// ─── 自從 md 與 tb 移植過來的 SVG Icons ────────────────────────────────────────────────────────
// MdCheckCircle
export const CheckCircle = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </SvgBase>
);

// MdOutlineViewInAr (Cube/3D View)
export const View = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05" />
    <path d="M12 22.08V12" />
  </SvgBase>
);

// MdStars (Sparkles/Stars)
export const Stars = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M12 3l1.91 5.8a2 2 0 0 0 1.9 1.38H22l-5 3.64a2 2 0 0 0-.73 2.24L18.18 21 12 17.27a2 2 0 0 0-2.36 0L5.82 21l1.9-4.94a2 2 0 0 0-.72-2.24L2 10.18h6.19a2 2 0 0 0 1.9-1.38L12 3z" />
  </SvgBase>
);

// TbSquare
export const Square = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </SvgBase>
);

// TbLinkPlus (Link)
export const Link = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    <line x1="12" y1="2" x2="12" y2="8" />
    <line x1="9" y1="5" x2="15" y2="5" />
  </SvgBase>
);

// TbCircle
export const Circle = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="10" />
  </SvgBase>
);

// TbDiamonds
export const Diamond = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M12 3l9 9-9 9-9-9 9-9z" />
  </SvgBase>
);

// TbTriangle
export const Triangle = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M12 2L2 20h20L12 2z" />
  </SvgBase>
);

// TbCylinder
export const Cylinder = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
  </SvgBase>
);

// TbHexagon
export const Hexagon = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </SvgBase>
);

// TbCapsuleHorizontal
export const Capsule = (props: CustomIconProps) => (
  <SvgBase {...props}>
    <rect x="2" y="6" width="20" height="12" rx="6" />
  </SvgBase>
);

// 未來如果有新的，就繼續往下加...
// export const CustomXXX = (props: CustomIconProps) => ( ... );

