import React from 'react';
import { EyeOff, ShieldAlert, Globe, Lock } from '../ui/Icons';
import RippleButton from '../ui/RippleButton';

interface ExternalMediaShieldProps {
    /** 外部媒體 URL */
    url: string;
    /** 單次載入的回呼 */
    onLoadOnce: () => void;
    /** 信任此網域的回呼 */
    onTrustDomain: (domain: string) => void;
}

/**
 * 提取 URL 的主網域名稱 (e.g. https://www.youtube.com/embed/... -> youtube.com)
 */
export const extractDomain = (urlStr: string): string => {
    try {
        const url = new URL(urlStr);
        const host = url.hostname.toLowerCase();
        // 移除常見的 www. 前綴以保持簡潔
        return host.startsWith('www.') ? host.slice(4) : host;
    } catch (e) {
        return 'unknown';
    }
};

/**
 * ExternalMediaShield — 針對外部 HTTPS 媒體 (iframe, video, audio) 的隱私攔截遮罩。
 * 採用 Glassmorphism 極致毛玻璃美學，深度適配暗色模式。
 */
export const ExternalMediaShield: React.FC<ExternalMediaShieldProps> = ({
    url,
    onLoadOnce,
    onTrustDomain
}) => {
    const domain = extractDomain(url);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] select-none transition-all duration-300 min-h-[220px]">
            {/* 頂部盾牌防禦視覺 */}
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-brand-secondary/60 dark:bg-brand-primary/10 border border-brand-primary/20 text-brand-primary mb-4 animate-pulse">
                <ShieldAlert size={22} className="relative z-10" />
                <EyeOff size={12} className="absolute bottom-0 right-0 bg-white dark:bg-slate-900 rounded-full p-0.5 border border-slate-200 dark:border-slate-800 text-slate-500" />
            </div>

            {/* 說明文字 */}
            <div className="max-w-md space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                    <Lock size={12} className="text-slate-400" />
                    隱私保護攔截
                </h4>
                <p className="text-[11px] font-bold text-brand-primary tracking-wide bg-brand-secondary/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded-md inline-block max-w-full truncate font-mono">
                    來源網域：{domain}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    為保護您的客戶端安全與離線隱私，系統已攔截此外部媒體請求。載入此媒體可能會向第三方披露您的 IP 與瀏覽器指紋。
                </p>
            </div>

            {/* 互動按鈕群 */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <RippleButton
                    variant="outlined"
                    onClick={onLoadOnce}
                    className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 hover:border-brand-primary/50 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-850/50 transition-all hover:scale-102"
                >
                    本次載入
                </RippleButton>
                <RippleButton
                    variant="filled"
                    onClick={() => onTrustDomain(domain)}
                    className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md shadow-brand-primary/10 transition-all hover:scale-102 flex items-center gap-1"
                >
                    <Globe size={11} />
                    信任此網域
                </RippleButton>
            </div>
        </div>
    );
};

export default ExternalMediaShield;
