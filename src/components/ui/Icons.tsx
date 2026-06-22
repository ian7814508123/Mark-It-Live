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
} from 'react-icons/lu';
export {
  FiBarChart2 as BarChart2,
  FiMoreHorizontal as MoreHorizontal,
  FiLayout as Layout,
  FiBarChart as BarChart3,
  FiHelpCircle as HelpCircle,
  FiAlertCircle as AlertCircle,
  FiAlertTriangle as AlertTriangle,
  FiHome as Home,
  FiInfo as Info,
  FiAlertOctagon as AlertOctagon,
  FiLoader as Loader2,
  FiEdit3 as Edit3,
  FiDatabase as Database,
  FiBox as Box,
  FiChevronLeft as ChevronLeft,
  FiChevronRight as ChevronRight,
  FiEye as Eye
} from 'react-icons/fi';

export {
  MdCheckCircle as CheckCircle,
  MdOutlineViewInAr as View,
  MdStars as Stars
} from 'react-icons/md';

export {
  TbSquare as Square,
  TbLinkPlus as Link,
  TbCircle as Circle,
  TbDiamonds as Diamond,
  TbTriangle as Triangle,
  TbCylinder as Cylinder,
  TbHexagon as Hexagon,
  TbCapsuleHorizontal as Capsule,
} from 'react-icons/tb';

// ─── 自訂 SVG Icons 區塊 ────────────────────────────────────────────────────────
import React from 'react';

// 1. 定義共用的 SVG 外框，這樣就不需要每次都寫一大複的 stroke 屬性
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

// 未來如果有新的，就繼續往下加...
// export const CustomXXX = (props: CustomIconProps) => ( ... );
