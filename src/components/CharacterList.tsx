/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Users, 
  ChevronLeft, 
  Sword,
  Star,
  CheckCircle2
} from 'lucide-react';
import { Monster } from '../types';

interface CharacterListProps {
  monsters: Monster[];
  onBack: () => void;
  onSelect: (monster: Monster) => void;
}

export default function CharacterList({ monsters, onBack, onSelect }: CharacterListProps) {
  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col font-sans z-50">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-neutral-800/50 backdrop-blur-md">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic uppercase tracking-tighter">キャラクター選択</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4">
          {monsters.map(monster => (
            <div 
              key={monster.id}
              onClick={() => onSelect(monster)}
              className={`
                relative bg-neutral-800 rounded-3xl p-5 flex items-center gap-5 border-2 transition-all cursor-pointer active:scale-[0.98]
                ${monster.isEquipped ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-white/5 hover:border-white/20'}
              `}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ backgroundColor: `${monster.color}20` }}
              >
                <Sword size={40} style={{ color: monster.color }} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">{monster.name}</h3>
                  {monster.isEquipped && <CheckCircle2 size={16} className="text-blue-400" />}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">パワー 11</span>
                  </div>
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">ランク 20</span>
                </div>
                
                <div className="mt-3 h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[80%]" />
                </div>
              </div>

              {monster.isEquipped && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  装備中
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
