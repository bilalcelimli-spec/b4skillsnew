import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code2, Construction } from 'lucide-react';

interface PendingFeatureModalProps {
  isOpen: boolean;
  featureName: string;
  onClose: () => void;
}

export const PendingFeatureModal: React.FC<PendingFeatureModalProps> = ({ isOpen, featureName, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="relative w-full max-w-lg bg-white rounded-3xl p-8 md:p-10 shadow-[0_0_50px_rgba(155,39,108,0.2)] border border-slate-100 overflow-hidden"
          >
            {/* Top right decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9b276c]/10 rounded-full blur-3xl pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 bg-[#9b276c] text-white rounded-2xl flex items-center justify-center mb-8 shadow-[0_10px_20px_rgba(155,39,108,0.3)]">
              <Construction size={28} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
              Coming Soon
            </h3>
            
            <p className="text-slate-600 font-medium text-[15px] leading-relaxed mb-8">
              We're currently forging the <span className="font-black text-[#9b276c]">"{featureName}"</span> module. Our engineering team is integrating advanced psychometrics and AI analysis for this section.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-slate-300 flex items-center justify-center shrink-0">
                <Code2 size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-1">Status</h4>
                <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1.5, delay: 0.2 }}
                    className="h-full bg-[#9b276c] rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">In active development</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
            >
              Return to Preview
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
