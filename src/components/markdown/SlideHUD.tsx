import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from '../ui/Icons';

interface SlideHUDProps {
    currentSlide: number;
    totalSlides: number;
    onPrev: () => void;
    onNext: () => void;
}

/**
 * SlideHUD — 簡報模式底部浮動控制列
 *
 * 功能：
 * - 上一頁 / 下一頁按鈕
 * - 頁碼指示器（2 / 8）
 * - 底部進度條
 * - 結束簡報按鈕
 * - 自動隱藏：滑鼠靜止 3 秒後隱藏，移動時重新出現
 */
const SlideHUD: React.FC<SlideHUDProps> = ({ currentSlide, totalSlides, onPrev, onNext }) => {
    const [isVisible, setIsVisible] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── 自動隱藏邏輯 ─────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setIsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 1000);
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

    /* 換頁時短暫顯示 HUD
    useEffect(() => {
        resetHideTimer();
    }, [currentSlide, resetHideTimer]);
    */

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

    return (
        <>
            {/* HUD 控制列 */}
            <div className={`slide-hud ${!isVisible ? 'hud-hidden' : ''}`}>
                {/* 上一頁 */}
                <button
                    className="slide-hud-btn"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    disabled={currentSlide <= 0}
                    title="上一頁 (←)"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="slide-hud-divider" />

                {/* 頁碼指示器 */}
                <span className="slide-hud-indicator">
                    {totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : '—'}
                </span>

                <div className="slide-hud-divider" />

                {/* 下一頁 */}
                <button
                    className="slide-hud-btn"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    disabled={currentSlide >= totalSlides - 1}
                    title="下一頁 (→)"
                >
                    <ChevronRight size={20} />
                </button>

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
