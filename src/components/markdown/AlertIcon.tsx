import React from 'react';
import { Info, AlertCircle, AlertTriangle, Lightbulb, Ban, CheckCircle, AlertOctagon, Bug, HelpCircle } from '../ui/Icons';

interface AlertIconProps {
    type: string;
}

/**
 * AlertIcon 元件
 * 用於根據 Alert 類型返回對應的 Lucide 圖示。
 * 此元件會被 Lazy 載入，僅在 Markdown 含有 Alert 時才會被下載，從而避免 Lucide Icons 佔用 initial bundle 體積。
 */
export default function AlertIcon({ type }: AlertIconProps) {
    switch (type.toLowerCase()) {
        case 'note':
        case 'info':
            return <Info size={14} className="inline mr-1.5 shrink-0" />;
        case 'important':
            return <AlertCircle size={14} className="inline mr-1.5 shrink-0" />;
        case 'warning':
        case 'caution':
        case 'attention':
            return <AlertTriangle size={14} className="inline mr-1.5 shrink-0" />;
        case 'ban':
            return <Ban size={14} className="inline mr-1.5 shrink-0" />;
        case 'tip':
        case 'quickstart':
        case 'start':
            return <Lightbulb size={14} className="inline mr-1.5 shrink-0" />;
        case 'success':
        case 'check':
            return <CheckCircle size={14} className="inline mr-1.5 shrink-0" />;
        case 'danger':
        case 'error':
        case 'failure':
            return <AlertOctagon size={14} className="inline mr-1.5 shrink-0" />;
        case 'bug':
            return <Bug size={14} className="inline mr-1.5 shrink-0" />;
        case 'question':
        case 'help':
        case 'faq':
            return <HelpCircle size={14} className="inline mr-1.5 shrink-0" />;
        default:
            return <Info size={14} className="inline mr-1.5 shrink-0" />;
    }
}
