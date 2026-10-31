import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize } from '../ui/Icons';

export type SlideAspectRatio = '16:9' | '16:10' | '4:3';

interface SlideHUDProps {
    currentSlide: number;
    totalSlides: number;
    slideRatio?: SlideAspectRatio;
    onChangeSlideRatio?: (ratio: SlideAspectRatio) => void;
    onPrev: () => void;
    onNext: () => void;
}

/**
 * SlideHUD — 簡報模式底部浮動控制列
 *
 * 功能：
 * - 上一頁 / 下一頁按鈕
 * - 頁碼指示器（2 / 8）
 * - 長寬比切換器（16:9 / 16:10 / 4:3 自適應投影）
 * - 底部進度條
 * - 結束簡報按鈕
 * - 自動隱藏：滑鼠靜止 1.8 秒後淡出，移動時重新出現
 */
const SlideHUD: React.FC<SlideHUDProps> = ({
    currentSlide,
    totalSlides,
    slideRatio = '16:9',
    onChangeSlideRatio,
    onPrev,
    onNext,
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── 自動隱藏邏輯 ─────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setIsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 2000);
    }, []);

    useEffect(() => {
        const handleMouseMove = () => resetHideTimer();
        window.addEventListener('mousemove', handleMouseMove);
        resetHideTimer(); // 初始化計時器
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [resetHideTimer]);

    // ─── 結束簡報 ──────────────────────────────────────────────────
    const handleExit = useCallback(() => {
        // 優先透過 Fullscreen API 退出（觸發 App.tsx 的 fullscreenchange 監聽器）
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        } else {
            // 退路：派送 ESC 事件觸發 App.tsx 的 keydown 監聽器
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
    }, []);

    // ─── 進度百分比 ────────────────────────────────────────────────
    const progress = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0;

    const handleCycleRatio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onChangeSlideRatio) return;
        const next: SlideAspectRatio =
            slideRatio === '16:9' ? '16:10' :
            slideRatio === '16:10' ? '4:3' : '16:9';
        onChangeSlideRatio(next);
        resetHideTimer();
    };

    return (
        <>
            {/* HUD 控制列 */}
            <div className={`slide-hud ${!isVisible ? 'hud-hidden' : ''}`}>
                {/* 上一頁 */}
                <button
                    className="slide-hud-btn"
                    onClick={(e) => { e.stopPropagation(); onPrev(); resetHideTimer(); }}
                    disabled={currentSlide <= 0}
                    title="上一頁 (←)"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="slide-hud-divider" />

                {/* 頁碼指示器 */}
                <span className="slide-hud-indicator font-mono">
                    {totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : '—'}
                </span>

                <div className="slide-hud-divider" />

                {/* 下一頁 */}
                <button
                    className="slide-hud-btn"
                    onClick={(e) => { e.stopPropagation(); onNext(); resetHideTimer(); }}
                    disabled={currentSlide >= totalSlides - 1}
                    title="下一頁 (→)"
                >
                    <ChevronRight size={20} />
                </button>

                {/* 長寬比切換 (16:9 / 16:10 / 4:3 自適應) */}
                {onChangeSlideRatio && (
                    <>
                        <div className="slide-hud-divider" />
                        <button
                            className="slide-hud-btn px-2 gap-1 w-auto min-w-[54px] rounded-full hover:bg-white/10"
                            onClick={handleCycleRatio}
                            title={`切換簡報畫布比例 (目前: ${slideRatio}，點擊切換為 16:10 或 4:3)`}
                        >
                            <Maximize size={13} className="opacity-70" />
                            <span className="text-[11px] font-mono font-bold text-slate-200">
                                {slideRatio}
                            </span>
                        </button>
                    </>
                )}

                <div className="slide-hud-divider" />

                {/* 結束簡報 */}
                <button
                    className="slide-hud-btn"
                    onClick={(e) => { e.stopPropagation(); handleExit(); }}
                    title="結束簡報 (ESC)"
                >
                    <X size={18} />
                </button>
            </div>

            {/* 底部進度條 */}
            <div className="slide-progress-bar" style={{ width: `${progress}%` }} />
        </>
    );
};

export default SlideHUD;
