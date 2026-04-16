/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame,
  Shield,
  Zap,
  Sword,
  Heart,
  Skull,
  Droplets,
  Mountain,
  Fish,
  ChevronLeft,
  Info,
  Palette
} from 'lucide-react';
import { Monster, Skill } from '../types';

const ICON_MAP: Record<string, any> = {
  Flame, Shield, Zap, Sword, Heart, Skull, Droplets, Mountain, Fish
};

interface CharacterDetailProps {
  monster: Monster;
  onBack: () => void;
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
  onChangeSkin: (id: string) => void;
}

export default function CharacterDetail({ monster, onBack, onEquip, onUnequip, onChangeSkin }: CharacterDetailProps) {
  const activeSkin = monster.skins.find(s => s.id === monster.activeSkinId) || monster.skins[0];

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col font-sans z-50">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-neutral-800/50 backdrop-blur-md">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic uppercase tracking-tighter">キャラクター詳細</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side (2): Character Visual */}
        <div className="flex-[2] relative bg-neutral-950 flex flex-col items-center justify-center p-8 border-r border-white/5">
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 animate-pulse" />
          </div>

          <motion.div
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative z-10"
          >
            <div 
              className="w-64 h-64 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              style={{ 
                backgroundColor: `${activeSkin.color}20`,
                border: `4px solid ${activeSkin.color}40`
              }}
            >
              {React.createElement(ICON_MAP[activeSkin.image] || Info, { 
                size: 160, 
                style: { color: activeSkin.color },
                className: "drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              })}
            </div>
          </motion.div>

          <div className="mt-12 text-center z-10">
            <h3 className="text-4xl font-black italic uppercase tracking-tighter">{monster.name}</h3>
            <p className="text-sm opacity-50 font-mono mt-1">ID: {monster.id}</p>
          </div>

          {/* Skin Change Button (Bottom Left) */}
          <button 
            onClick={() => onChangeSkin(monster.id)}
            className="absolute bottom-8 left-8 flex items-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl border border-white/10 transition-all active:scale-95"
          >
            <Palette size={20} className="text-pink-400" />
            <span className="font-black text-sm uppercase tracking-widest">スキン変更</span>
          </button>
        </div>

        {/* Right Side (1): Details & Equipment */}
        <div className="flex-1 bg-neutral-900 flex flex-col p-6 overflow-y-auto">
          <div className="space-y-8">
            {/* Stats */}
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">ステータス</h4>
              <div className="space-y-2">
                <StatBar label="HP" value={monster.hp} max={monster.maxHp} color="bg-green-500" />
                <StatBar label="エナジー" value={monster.energy} max={10} color="bg-yellow-500" />
              </div>
            </section>

            {/* Description */}
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">説明</h4>
              <p className="text-sm leading-relaxed opacity-80">{monster.description}</p>
            </section>

            {/* Skills */}
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">スキル</h4>
              <div className="space-y-3">
                {monster.skills.map(skill => (
                  <div key={skill.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      {React.createElement(ICON_MAP[skill.icon] || Info, { size: 16 })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold">{skill.name}</p>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded font-black">コスト {skill.cost}</span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-1">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Equipment Buttons (Bottom Right) */}
          <div className="mt-auto pt-8 flex flex-col gap-2">
            {!monster.isEquipped ? (
              <button 
                onClick={() => onEquip(monster.id)}
                className="w-full py-4 bg-green-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              >
                装備する
              </button>
            ) : (
              <button 
                onClick={() => onUnequip(monster.id)}
                className="w-full py-4 bg-red-500/20 text-red-500 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                装備解除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black w-12 opacity-50">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          className={`h-full ${color}`}
        />
      </div>
      <span className="text-[10px] font-mono w-8 text-right">{value}</span>
    </div>
  );
}
