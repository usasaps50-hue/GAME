/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  ChevronLeft, 
  Lock, 
  User, 
  Plus,
  Star,
  Tag
} from 'lucide-react';
import { MONSTERS } from '../constants';

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
      isClaimed: false
    });
    setNewRewardName('');
    setNewRewardThreshold('');
    setShowAddReward(false);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col font-sans z-50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-neutral-800/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-black italic uppercase tracking-tighter">ショップ</h2>
        </div>
        
        {!isAdmin ? (
          <button 
            onClick={() => setShowLogin(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Lock size={20} className="opacity-50" />
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
            <User size={14} />
            <span className="text-[10px] font-black uppercase">Admin: system</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isAdmin && (
          <div className="mb-8 p-6 bg-green-500/10 border-2 border-dashed border-green-500/30 rounded-3xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-green-500 text-black rounded-full flex items-center justify-center">
              <Plus size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-black uppercase tracking-widest text-sm">新商品を販売する</h3>
              <p className="text-[10px] opacity-50 mt-1">管理者権限でキャラクターやスキンを追加できます</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-500 text-black rounded-xl font-black text-xs uppercase">商品登録</button>
              <button 
                onClick={() => setShowAddReward(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-black text-xs uppercase"
              >
                報酬登録
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Featured Character */}
          <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 flex items-center justify-between shadow-xl">
            <div>
              <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block mb-2">期間限定</div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">パイロン: 蒼炎</h3>
              <p className="text-xs opacity-80 mt-1">限定スキン付きパック</p>
              <button className="mt-4 px-6 py-2 bg-white text-black rounded-xl font-black text-xs uppercase">¥1,200</button>
            </div>
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
              <Star size={48} className="text-white" />
            </div>
          </div>

          {/* Regular Items */}
          {MONSTERS.map(monster => (
            <div key={monster.id} className="bg-neutral-800 rounded-3xl p-4 border border-white/5 flex flex-col gap-3">
              <div className="aspect-square bg-neutral-700 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg">
                  <Tag size={12} className="text-yellow-400" />
                </div>
                <div style={{ color: monster.color }}>
                  <Star size={48} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold">{monster.name}</p>
                <p className="text-[10px] opacity-50">レアリティ: スーパーレア</p>
              </div>
              <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[10px] uppercase transition-all">
                500 エメラルド
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-800 w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 text-center">管理者ログイン</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">ユーザー名</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="system"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">パスワード</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs uppercase"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/20"
                >
                  ログイン
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Add Reward Modal */}
      {showAddReward && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-800 w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 text-center">報酬登録</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">報酬名</label>
                <input 
                  type="text" 
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="例: 1000ゴールド"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">必要ハート数</label>
                <input 
                  type="number" 
                  value={newRewardThreshold}
                  onChange={(e) => setNewRewardThreshold(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="例: 500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowAddReward(false)}
                  className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs uppercase"
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleAddReward}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/20"
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
