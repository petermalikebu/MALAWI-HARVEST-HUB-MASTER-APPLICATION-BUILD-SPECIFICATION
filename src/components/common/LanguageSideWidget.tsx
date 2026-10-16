import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Globe, Check, ChevronLeft, ChevronRight, Languages } from 'lucide-react';

export const LanguageSideWidget: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      aria-label="Language Selector"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center select-none"
    >
      {/* Expanded Side Flyout Panel */}
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-l-2xl p-3 mr-0.5 space-y-2.5 w-56 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <span className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-emerald-700" />
              <span>{language === 'ch' ? 'Sankhani Chilankhulo' : 'Select Language'}</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-0.5 rounded-md hover:bg-stone-100 transition-colors"
              title="Close panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {/* English Button */}
            <button
              onClick={() => {
                setLanguage('en');
                setIsOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                language === 'en'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🇬🇧</span>
                <div className="text-left">
                  <div className="leading-tight">English</div>
                  <div className={`text-[10px] font-normal ${language === 'en' ? 'text-emerald-100' : 'text-stone-400'}`}>
                    Global English
                  </div>
                </div>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-white" />}
            </button>

            {/* Chichewa Button */}
            <button
              onClick={() => {
                setLanguage('ch');
                setIsOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                language === 'ch'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🇲🇼</span>
                <div className="text-left">
                  <div className="leading-tight">Chichewa</div>
                  <div className={`text-[10px] font-normal ${language === 'ch' ? 'text-emerald-100' : 'text-stone-400'}`}>
                    Chilankhulo cha Malawi
                  </div>
                </div>
              </div>
              {language === 'ch' && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>

          <div className="pt-1 text-[10px] text-stone-400 text-center font-medium">
            {language === 'ch'
              ? 'Zonse zikusinthidwa m\'Chichewa'
              : 'Malawi Harvest Hub Bi-lingual Mode'}
          </div>
        </div>
      )}

      {/* Docked Side Tab / Handle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-1.5 py-2.5 px-2 bg-stone-900/90 hover:bg-black text-white rounded-l-2xl shadow-xl border-y border-l border-stone-700 backdrop-blur-sm transition-all hover:pr-3 ${
          isOpen ? 'ring-2 ring-emerald-500' : ''
        }`}
        title={language === 'ch' ? 'Sinthani Chilankhulo (Chichewa / English)' : 'Switch Language (Chichewa / English)'}
      >
        <div className="flex flex-col items-center gap-1">
          <Globe className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 py-1">
            {language === 'ch' ? '🇲🇼 CHICHEWA' : '🇬🇧 ENGLISH'}
          </span>
          <ChevronLeft className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
    </aside>
  );
};
