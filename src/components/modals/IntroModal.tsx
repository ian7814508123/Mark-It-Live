import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Microscope, BookOpen, ChevronRight } from 'lucide-react';
import { FEATURE_CARDS, SCIENCE_SUPPORTS, MANUAL_SECTIONS, INTRO_SUMMARY } from '../../data/introData';
import RippleButton from '../ui/RippleButton';
import InteractiveLogo from '../ui/InteractiveLogo';
import GlassRailSelector from '../ui/GlassRailSelector';
import MagneticButton from '../ui/MagneticButton';


interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manual'>('overview');

  if (!isOpen) return null;

  const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
  }> = ({ icon, title, description, color }) => (
    <div className="group p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-brand-primary/30 dark:hover:border-brand-primary/40 transition-all duration-300 shadow-sm hover:shadow-md">
      <div className={`p-2.5 rounded-xl ${color} w-fit mb-4 transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>
      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">{title}</h4>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );

  const ManualSection: React.FC<{
    icon: React.ReactNode;
    title: string;
    items: { label: string; detail: string }[];
  }> = ({ icon, title, items }) => (
    <div className="space-y-4 p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-lg">
          {icon}
        </div>
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3 group">
            <div className="shrink-0 mt-1">
              <ChevronRight size={14} className="text-brand-primary/40 group-hover:text-brand-primary transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );



  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800/80 z-[101] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in duration-500">

        {/* Header Section */}
        <div className="relative shrink-0 p-5 pb-2 text-center overflow-hidden">
          <div className="flex items-center justify-center gap-4 mb-3">
            <InteractiveLogo size={40} variant="v1" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              歡迎使用 Markdown Live Previewer
            </h2>
            <InteractiveLogo size={40} variant="v2" />
          </div>

          {/* Tab 導航：玻璃滑軌，支援拖曳切換分頁 */}
          <GlassRailSelector
            options={[
              { label: '特色總覽', value: 'overview', icon: <Sparkles size={14} /> }, { label: '使用手冊', value: 'manual', icon: <BookOpen size={14} /> },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'manual' | 'overview')}
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
          {activeTab === 'overview' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Quick Start Intro */}
              <div className="mb-8 p-6 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Zap size={14} /> {INTRO_SUMMARY.title}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-loose font-medium">
                  {INTRO_SUMMARY.description}
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {FEATURE_CARDS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <FeatureCard
                      key={idx}
                      icon={<Icon size={18} className={card.iconColor} />}
                      title={card.title}
                      description={card.description}
                      color={card.color}
                    />
                  );
                })}
              </div>

              {/* Advanced Science Support */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Microscope size={18} className="text-brand-primary" />
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">科學與藝術支援</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SCIENCE_SUPPORTS.map((support, idx) => {
                    const Icon = support.icon;
                    return (
                      <div key={idx} className="p-4 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                        <Icon size={16} className="text-slate-400 mb-2" />
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{support.title}</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500">{support.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
              {MANUAL_SECTIONS.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <ManualSection
                    key={idx}
                    icon={<Icon size={16} />}
                    title={section.title}
                    items={section.items}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 p-2 pt-1 flex justify-center">
          <MagneticButton variant="filled" onClick={onClose}
            aria-label="馬上開始使用"
            className={`inline-flex items-center px-10 py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-full text-xs font-black tracking-[0.2em]`}
            magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
            <span>馬上開始</span>
          </MagneticButton>
        </div>
      </div>
    </>,
    document.body
  );
};

export default IntroModal;
