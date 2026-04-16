/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ChevronLeft, Lock, User, Plus } from 'lucide-react';

interface ShopProps {
  onBack: () => void;
  onAddReward: (reward: any) => void;
}

export default function Shop({ onBack, onAddReward }: ShopProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardThreshold, setNewRewardThreshold] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'system' && password === 'Usasaburosuta_saiky0') {
      setIsAdmin(true);
      setShowLogin(false);
    } else {
      alert('ログイン失敗');
    }
  };

  const handleAddReward = () => {
    if (!newRewardName || !newRewardThreshold) return;
    onAddReward({
      id: `r-${Date.now()}`,
      name: newRewardName,
      heartThreshold: parseInt(newRewardThreshold),
      description: '管理者によって追加された報酬',
      isClaimed: false,
    });
    setNewRewardName('');
    setNewRewardThreshold('');
    setShowAddReward(false);
  };

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

      {/* 管理者ボタン */}
      <div className="absolute top-6 right-6 z-50">
        {!isAdmin ? (
          <button
            onClick={() => setShowLogin(true)}
            className="p-3 bg-bg-panel/80 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-bg-panel transition-colors opacity-40 hover:opacity-100"
          >
            <Lock size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-[#00F0FF]/20 text-[#00F0FF] px-4 py-2 rounded-full border border-[#00F0FF]/30 backdrop-blur-md">
            <User size={14} />
            <span className="text-[10px] font-black uppercase">管理者: system</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 p-8">
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm p-6 bg-[#00F0FF]/10 border-2 border-dashed border-[#00F0FF]/30 rounded-3xl flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#00F0FF] text-bg-deep rounded-full flex items-center justify-center">
              <Plus size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-black uppercase tracking-widest text-sm text-[#00F0FF]">新商品を販売する</h3>
              <p className="text-[10px] opacity-50 mt-1">管理者権限でキャラクターやスキンを追加できます</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#FF00E5] text-white rounded-xl font-black text-xs uppercase shadow-lg">
                商品登録
              </button>
              <button
                onClick={() => setShowAddReward(true)}
                className="px-4 py-2 bg-[#00F0FF] text-bg-deep rounded-xl font-black text-xs uppercase shadow-lg"
              >
                報酬登録
              </button>
            </div>
          </motion.div>
        )}

        {/* 準備中 */}
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 bg-[#FF00E5]/10 border-2 border-[#FF00E5]/30 rounded-full flex items-center justify-center"
          >
            <ShoppingBag size={44} className="text-[#FF00E5] opacity-60" />
          </motion.div>
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#FF00E5] drop-shadow-glow">
              準備中
            </h3>
            <p className="text-xs opacity-40 mt-2 uppercase tracking-widest">もうすぐアイテムが追加されます</p>
          </div>
        </div>
      </div>

      {/* ログインモーダル */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-bg-panel w-full max-w-sm rounded-3xl p-8 border border-[#00F0FF]/20 shadow-2xl"
          >
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 text-center text-[#00F0FF]">
              管理者ログイン
            </h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00F0FF] transition-all"
                  placeholder="system"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00F0FF] transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs uppercase border border-white/10"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00F0FF] text-bg-deep rounded-xl font-black text-xs uppercase shadow-lg"
                >
                  ログイン
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 報酬登録モーダル */}
      {showAddReward && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-bg-panel w-full max-w-sm rounded-3xl p-8 border border-[#00F0FF]/20 shadow-2xl"
          >
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 text-center text-[#00F0FF]">
              報酬登録
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">
                  報酬名
                </label>
                <input
                  type="text"
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00F0FF] transition-all"
                  placeholder="例: 1000ゴールド"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">
                  必要ハート数
                </label>
                <input
                  type="number"
                  value={newRewardThreshold}
                  onChange={(e) => setNewRewardThreshold(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00F0FF] transition-all"
                  placeholder="例: 500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddReward(false)}
                  className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs uppercase border border-white/10"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddReward}
                  className="flex-1 py-3 bg-[#00F0FF] text-bg-deep rounded-xl font-black text-xs uppercase shadow-lg"
                >
                  登録
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
