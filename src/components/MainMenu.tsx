/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  Users,
  Globe,
  Wifi,
  Heart,
  Coins,
  Zap,
  Sword,
  Flame,
  Shield,
  Skull,
  Droplets,
  Mountain,
  Fish
} from 'lucide-react';
import { Monster } from '../types';

const ICON_MAP: Record<string, any> = {
  Flame, Shield, Zap, Sword, Heart, Skull, Droplets, Mountain, Fish
};

interface MainMenuProps {
  onStartBattle: () => void;
  onOpenCharacters: () => void;
  onOpenShop: () => void;
  onOpenWorld: () => void;
  onOpenOnline: () => void;
  onStartRandomBattle: () => void;
  equippedMonster: Monster | null;
  hearts: number;
  winStreak: number;
}

export default function MainMenu({
  onStartBattle,
  onOpenCharacters,
  onOpenShop,
  onOpenWorld,
  onOpenOnline,
  onStartRandomBattle,
  equippedMonster,
  hearts,
  winStreak,
}: MainMenuProps) {
  const IconComponent = equippedMonster ? (ICON_MAP[equippedMonster.image] || Sword) : Sword;

  return (
    <div className="fixed inset-0 bg-game-radial text-white flex flex-col font-sans overflow-hidden select-none">
      {/* ドット背景 */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      {/* 上部バー */}
      <div className="p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white/10 bg-black/40 font-bold backdrop-blur-md">
            <Heart size={16} className="text-[#FF4D8D] fill-[#FF4D8D]" />
            <span className="text-sm">{hearts}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white/10 bg-black/40 font-bold backdrop-blur-md">
            <Coins size={16} className="text-[#FFF500]" />
            <span className="text-sm">5,000</span>
          </div>
          {winStreak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#FF00E5]/40 bg-[#FF00E5]/20 backdrop-blur-md">
              <Zap size={12} className="text-[#FFF500] fill-[#FFF500]" />
              <span className="text-[10px] font-black uppercase">{winStreak}連勝中!</span>
            </div>
          )}
        </div>
      </div>

      {/* センター：キャラクター表示 */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* 左サイドボタン */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
          <SideButton icon={<ShoppingBag size={28} />} label="ショップ" color="border-[#FF00E5] text-[#FF00E5]" onClick={onOpenShop} />
          <SideButton icon={<Users size={28} />} label="キャラ" color="border-[#00F0FF] text-[#00F0FF]" onClick={onOpenCharacters} />
          <SideButton icon={<Globe size={28} />} label="ワールド" color="border-[#FFF500] text-[#FFF500]" onClick={onOpenWorld} />
          <SideButton icon={<Wifi size={28} />} label="オンライン" color="border-[#00F0FF] text-[#00F0FF]" onClick={onOpenOnline} />
        </div>

        {/* キャラクタープレビュー */}
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [-1, 1, -1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 flex flex-col items-center"
        >
          <div
            className="w-64 h-64 rounded-full flex items-center justify-center"
            style={{
              background: equippedMonster
                ? `radial-gradient(circle, ${equippedMonster.color}30, transparent)`
                : 'radial-gradient(circle, rgba(0,240,255,0.08), transparent)',
            }}
          >
            <div className="drop-shadow-glow">
              <IconComponent
                size={160}
                style={{ color: equippedMonster?.color || '#00F0FF' }}
              />
            </div>
          </div>
          <div className="absolute -bottom-6 w-40 h-8 bg-black/40 blur-xl rounded-full" />

          <div className="mt-10 text-center z-10">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter drop-shadow-glow">
              {equippedMonster?.name || 'キャラクターなし'}
            </h2>
            <p className="text-xs font-bold text-[#00F0FF] uppercase tracking-widest mt-2 opacity-80">
              {equippedMonster ? 'READY FOR BATTLE' : 'キャラクターを追加してください'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 下部：バトルボタン */}
      <div className="p-6 flex justify-end z-10">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97, translateY: 3 }}
          onClick={onStartRandomBattle}
          className="px-16 py-6 rounded-2xl font-black text-3xl italic uppercase tracking-tighter text-[#442200] bg-gradient-to-b from-[#FFF500] to-[#FFA500] border-b-8 border-[#884400] shadow-2xl btn-pop-shadow"
        >
          バトル
        </motion.button>
      </div>
    </div>
  );
}

function SideButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, x: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-20 h-20 bg-bg-panel/80 backdrop-blur-md border-2 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xl transition-all ${color}`}
    >
      {icon}
      <span className="font-black text-[10px] tracking-tighter">{label}</span>
    </motion.button>
  );
}
