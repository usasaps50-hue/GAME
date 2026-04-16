/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Sword,
  Flame,
  Shield,
  Zap,
  Heart,
  Skull,
  Droplets,
  Mountain,
  Fish,
  CheckCircle2
} from 'lucide-react';
import { Monster } from '../types';

const ICON_MAP: Record<string, any> = {
  Flame, Shield, Zap, Sword, Heart, Skull, Droplets, Mountain, Fish
};

interface CharacterListProps {
  monsters: Monster[];
  onBack: () => void;
  onSelect: (monster: Monster) => void;
}

export default function CharacterList({ monsters, onBack, onSelect }: CharacterListProps) {
  return (
    <div className="fixed inset-0 bg-game-radial text-white flex flex-col font-sans z-50">
      {/* ドット背景 */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      {/* 戻るボタン */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-50 p-3 bg-bg-panel/80 backdrop-blur-md rounded-2xl border border-[#00F0FF]/30 hover:bg-bg-panel transition-colors text-[#00F0FF]"
      >
        <ChevronLeft size={32} />
      </button>

      {/* タイトル */}
      <div className="pt-6 pb-4 flex items-center justify-center z-10">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter drop-shadow-glow text-[#00F0FF]">
          キャラクター選択
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 z-10">
        {monsters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Sword size={64} className="text-[#00F0FF]" />
            <p className="font-black text-lg uppercase tracking-widest">キャラクターなし</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {monsters.map((monster, i) => {
              const IconComponent = ICON_MAP[monster.image] || Sword;
              return (
                <motion.div
                  key={monster.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelect(monster)}
                  className={`
                    relative bg-bg-panel/60 hover:bg-bg-panel cursor-pointer rounded-2xl border-2 p-4
                    flex flex-col items-center gap-3 transition-all group shadow-lg
                    ${monster.isEquipped
                      ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-transparent hover:border-[#00F0FF]/40'}
                  `}
                >
                  {monster.isEquipped && (
                    <div className="absolute top-2 right-2 text-[#00F0FF]">
                      <CheckCircle2 size={18} fill="currentColor" />
                    </div>
                  )}

                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform drop-shadow-glow"
                    style={{ backgroundColor: `${monster.color}20` }}
                  >
                    <IconComponent size={44} style={{ color: monster.color }} />
                  </div>

                  <div className="w-full text-center">
                    <h3 className="font-black text-sm text-white">{monster.name}</h3>
                    <div className="mt-2 w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full"
                        style={{
                          width: `${(monster.hp / monster.maxHp) * 100}%`,
                          backgroundColor: monster.color
                        }}
                      />
                    </div>
                    <div className="text-[10px] font-bold text-right mt-1 opacity-60">
                      HP {monster.hp}
                    </div>
                  </div>

                  {monster.isEquipped && (
                    <div className="w-full py-1 bg-[#00F0FF]/20 border border-[#00F0FF]/30 rounded-xl text-[#00F0FF] text-[10px] font-black text-center uppercase tracking-widest">
                      装備中
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
