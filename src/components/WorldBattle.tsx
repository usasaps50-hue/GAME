/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Lock, 
  Star, 
  MapPin,
  Trophy,
  Mountain,
  Home,
  Circle
} from 'lucide-react';
import { STAGES } from '../constants';
import { Stage } from '../types';

interface WorldBattleProps {
  onBack: () => void;
  onStartStage: (id: string) => void;
  stages: Stage[];
}

export default function WorldBattle({ onBack, onStartStage, stages }: WorldBattleProps) {
  return (
    <div className="fixed inset-0 bg-[#D2B48C] text-neutral-900 flex flex-col font-sans z-50 overflow-hidden">
      {/* Desert Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-20 left-[10%]"><Cactus /></div>
        <div className="absolute top-60 right-[15%]"><Cactus /></div>
        <div className="absolute bottom-40 left-[20%]"><Rock /></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
          <Mountain size={400} />
        </div>
        <div className="absolute bottom-20 right-[10%]"><Hut /></div>
      </div>

      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white/20 backdrop-blur-md border-b border-black/5 z-10">
        <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black italic uppercase tracking-tighter">ワールドバトル</h2>
          <p className="text-[10px] font-bold opacity-60">砂漠ワールド - 50コース</p>
        </div>
        <div className="flex items-center gap-2 bg-black/5 px-3 py-1 rounded-full">
          <Trophy size={14} className="text-yellow-600" />
          <span className="text-xs font-black">12/50</span>
        </div>
      </div>

      {/* Course List (Nyanko Daisensou Style) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
        {stages.map((stage, i) => {
          const isLocked = i > 0 && stages[i-1].completions < 1;
          const isCompletedMax = stage.completions >= 3;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`
                relative p-5 rounded-3xl border-2 flex items-center gap-4 transition-all
                ${isLocked 
                  ? 'bg-neutral-200/50 border-neutral-300 opacity-50' 
                  : 'bg-white border-black/10 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer'}
              `}
              onClick={() => !isLocked && onStartStage(stage.id)}
            >
              {/* Course Number */}
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border-2
                ${isLocked ? 'bg-neutral-300 border-neutral-400' : 'bg-neutral-900 text-white border-neutral-900'}
              `}>
                {i + 1}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase">{stage.name}</h3>
                  {isCompletedMax && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                </div>
                <div className="flex items-center gap-3 mt-1">
                   <div className="flex gap-1">
                     {[1, 2, 3].map(step => (
                       <div 
                        key={step} 
                        className={`w-2 h-2 rounded-full ${step <= stage.completions ? 'bg-green-500' : 'bg-neutral-200'}`} 
                       />
                     ))}
                   </div>
                   <p className="text-[10px] font-bold opacity-50">
                     {stage.completions}/3 クリア
                   </p>
                </div>
              </div>

              {/* Reward/Status */}
              <div className="text-right">
                {isLocked ? (
                  <Lock size={20} className="opacity-30" />
                ) : (
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black opacity-40 uppercase">報酬</p>
                    <p className="text-xs font-bold text-blue-600">{stage.reward}</p>
                  </div>
                )}
              </div>

              {/* Desert Decor on Card */}
              {!isLocked && i % 3 === 0 && (
                <div className="absolute -top-2 -right-2 opacity-20">
                   <Cactus size={24} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Cactus({ size = 48 }: { size?: number }) {
  return (
    <div className="text-green-700 flex flex-col items-center">
      <div className="flex gap-1">
        <div className="w-2 h-6 bg-current rounded-full" />
        <div className="w-3 h-10 bg-current rounded-full" />
        <div className="w-2 h-6 bg-current rounded-full" />
      </div>
      <div className="w-4 h-4 bg-current rounded-t-full -mt-2" />
    </div>
  );
}

function Rock() {
  return <div className="w-12 h-8 bg-neutral-600 rounded-tl-3xl rounded-tr-xl rounded-br-2xl opacity-50" />;
}

function Hut() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-bottom-[20px] border-bottom-amber-800" />
      <div className="w-10 h-8 bg-amber-700 border-x-2 border-amber-900 flex items-end justify-center">
        <div className="w-3 h-4 bg-amber-900 rounded-t-sm" />
      </div>
    </div>
  );
}
