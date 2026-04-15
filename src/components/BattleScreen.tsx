/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Shield, Zap, Sword, Heart, Skull, Droplets, Mountain, Fish, ChevronLeft, Info
} from 'lucide-react';
import { Monster, Skill, GameState } from '../types';
import { GoryoCanvas, GoryoCanvasRef } from './GoryoCanvas';
import CharacterSprite, { CharacterSpriteRef } from './CharacterSprite';

const ICON_MAP: Record<string, any> = {
  Flame, Shield, Zap, Sword, Heart, Skull, Droplets, Mountain, Fish
};

const GORYO_ID = 'm4';

interface BattleScreenProps {
  onBack: (result?: { win: boolean }) => void;
  playerTeam: Monster[];
  enemyTeam: Monster[];
}

// ─────────────────────────────────────────────
// ゴリョ 進化チェック
// ─────────────────────────────────────────────
function checkGoryoEvolution(monster: Monster, logs: string[]): { monster: Monster; evolved: boolean; logs: string[] } {
  if (monster.id !== GORYO_ID) return { monster, evolved: false, logs };
  const form = monster.form ?? 1;
  if (form >= 3) return { monster, evolved: false, logs };
  if ((monster.attacksGiven ?? 0) >= 2 && (monster.attacksReceived ?? 0) >= 2) {
    const newForm = form + 1;
    const newMaxHp = monster.maxHp + 20;
    const newHp = Math.min(monster.hp + 20, newMaxHp);
    return {
      monster: { ...monster, form: newForm, maxHp: newMaxHp, hp: newHp, attacksGiven: 0, attacksReceived: 0 },
      evolved: true,
      logs: [`✨ ゴリョが形態${newForm}に進化！HP+20！`, ...logs],
    };
  }
  return { monster, evolved: false, logs };
}

// ─────────────────────────────────────────────
// 実効コスト計算
// ─────────────────────────────────────────────
function getEffectiveCost(skill: Skill, activePlayer: Monster, activeEnemy: Monster, state: GameState): number {
  let cost = skill.cost;
  // ゴリョ: 水に入れ！は形態3でコスト2
  if (skill.id === 's9') return (activePlayer.form ?? 1) >= 3 ? 2 : 3;
  // ゴリョ: 食欲旺盛は水系なら6
  if (skill.id === 's10') return activeEnemy.isWaterType ? 6 : 8;
  // ボンザムライ: 根を張る中は秘剣以外+1
  if (state.bonsaiRootActive && skill.id !== 's31') cost += 1;
  // ギャンブラー斎藤: 限界突破中クライマックスはコスト0
  if (skill.id === 's44' && state.saitoLimitBreakActive) return 0;
  // 口座凍結: コスト4以上の技を封印
  if (state.tosaFreezeActive && cost >= 4) return 99;
  return cost;
}

// ─────────────────────────────────────────────
// スキル使用可否チェック（コスト以外の条件）
// ─────────────────────────────────────────────
function isSkillLocked(skill: Skill, state: GameState): { locked: boolean; reason: string } {
  // タピるん
  if (skill.id === 's22' && state.tapiocaStock === 0) return { locked: true, reason: 'タピオカなし' };
  if (skill.id === 's26' && state.tapiocaStock === 0) return { locked: true, reason: 'タピオカなし' };
  // ボンザムライ
  if (skill.id === 's29' && state.bonsaiMineActive)   return { locked: true, reason: '設置済み' };
  if (skill.id === 's32' && state.bonsaiPhotoCount < 2) return { locked: true, reason: `光合成${state.bonsaiPhotoCount}/2` };
  if (skill.id === 's32' && state.bonsaiSekkenCharging) return { locked: true, reason: 'チャージ中' };
  // ポテトキング
  if (skill.id === 's33' && state.potatoStock === 0)  return { locked: true, reason: 'ポテトなし' };
  if (skill.id === 's34' && state.saltDebuffActive)   return { locked: true, reason: '発動中' };
  if (skill.id === 's35' && state.ketchupBarrierActive) return { locked: true, reason: '発動中' };
  if (skill.id === 's38' && state.potatoStock === 0)  return { locked: true, reason: 'ポテトなし' };
  // バグマスター
  if (skill.id === 's50' && state.enemyBugCount < 3)
    return { locked: true, reason: `バグ${state.enemyBugCount}/3` };
  // 建設系
  if (skill.id === 's55' && state.buildingFloor < 5)
    return { locked: true, reason: `階層${state.buildingFloor}/5` };
  if (skill.id === 's56' && state.buildingFloor === 0)
    return { locked: true, reason: '階層0' };
  // ギャンブラー斎藤 クライマックス（限界突破中は常に使用可）
  if (skill.id === 's44' && !state.saitoLimitBreakActive &&
      (state.saitoHazureCount < 3 || state.saitoKitaiChi < 8))
    return { locked: true, reason: `ハズレ${state.saitoHazureCount}/3・期待値${state.saitoKitaiChi}/8` };
  // トサン・フォックス
  if (skill.id === 's61' && !state.tosaAttackKaritateActive)
    return { locked: true, reason: '取り立て未発動' };
  return { locked: false, reason: '' };
}

const INITIAL_STATE_EXTRA: Omit<GameState,
  'playerTeam'|'enemyTeam'|'activePlayerIndex'|'activeEnemyIndex'|'turn'|'energy'|'hand'|'logs'|'hearts'|'winStreak'
> = {
  playerDodgeActive: false,
  playerShield: 0,
  criticalMomentActive: false,
  playerStunTurns: 0,
  playerNoEnergyNextTurn: false,
  enemyDamageDebuff: 0,
  tailGatlingActive: false,
  tailGatlingTurn: 0,
  tapiocaStock: 0,
  playerDamageHalf: false,
  playerDamageNullify: false,
  bonsaiMineActive: false,
  bonsaiMineTurnsLeft: 0,
  bonsaiNextAttackDouble: false,
  bonsaiRootActive: false,
  bonsaiRootTurnsLeft: 0,
  bonsaiPhotoCount: 0,
  bonsaiGuardThisTurn: false,
  bonsaiBonusEnergyNextTurn: false,
  bonsaiSekkenCharging: false,
  // ポテトキング
  potatoStock: 10,
  saltDebuffActive: false,
  saltDebuffTurnsLeft: 0,
  ketchupBarrierActive: false,
  ketchupBarrierTurnsLeft: 0,
  burgerOrderActive: false,
  // ギャンブラー斎藤
  saitoKitaiChi: 0,
  saitoHazureCount: 0,
  saitoBorrowActive: false,
  saitoBorrowTurnsLeft: 0,
  saitoSSRActive: false,
  // ハッカー系
  enemyBugCount: 0,
  copyPasteActive: false,
  // 建設系
  buildingFloor: 0,
  earthquakeProofActive: false,
  // CPU
  enemyEnergy: 3,
  enemyHand: [],
  cpuTapiocaStock: 0,
  cpuPotatoStock: 10,
  cpuKitaiChi: 0,
  cpuHazureCount: 0,
  cpuBugCount: 0,
  cpuBuildingFloor: 0,
  // ギャンブラー斎藤 限界突破
  saitoLimitBreakActive: false,
  // トサン・フォックス 取り立てシステム
  tosaAttackKaritateActive: false,
  tosaAttackKaritateTurnsLeft: 0,
  tosaAttackKaritateDouble: false,
  tosaFreezeActive: false,
  tosaDantanActive: false,
  tosaSanpanActive: false,
  tosaPlayerKaritateActive: false,
  tosaPlayerKaritateTurnsLeft: 0,
};

export default function BattleScreen({ onBack, playerTeam, enemyTeam }: BattleScreenProps) {
  const [gameState, setGameState] = useState<GameState>({
    playerTeam: playerTeam.map(m => ({ ...m, hp: m.maxHp, form: m.form ?? 1, attacksGiven: 0, attacksReceived: 0 })),
    enemyTeam: enemyTeam.map(m => ({ ...m, hp: m.maxHp })),
    activePlayerIndex: 0,
    activeEnemyIndex: 0,
    turn: 'player',
    energy: 3,
    hand: [],
    logs: ['バトル開始！'],
    hearts: 0,
    winStreak: 0,
    ...INITIAL_STATE_EXTRA,
  });

  const [isShaking, setIsShaking] = useState({ player: false, enemy: false });
  const [energyGain, setEnergyGain] = useState(0);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [evolutionFlash, setEvolutionFlash] = useState(false);
  const turnStartProcessed = useRef(false);

  const playerGoryoRef  = useRef<GoryoCanvasRef>(null);
  const enemyGoryoRef   = useRef<GoryoCanvasRef>(null);
  const playerSpriteRef = useRef<CharacterSpriteRef>(null);
  const enemySpriteRef  = useRef<CharacterSpriteRef>(null);
  const cpuActionRef = useRef<{ usedSkill: boolean; skillType: string | null }>({ usedSkill: false, skillType: null });

  const activePlayer = gameState.playerTeam[gameState.activePlayerIndex];
  const activeEnemy  = gameState.enemyTeam[gameState.activeEnemyIndex];

  // ── 手札初期化（プレイヤー） ───────────────────────────────────────
  useEffect(() => {
    const pool = activePlayer.skills;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setGameState(prev => ({ ...prev, hand: shuffled.slice(0, 4) }));
  }, [gameState.activePlayerIndex]);

  // ── 敵手札初期化 ───────────────────────────────────────────────────
  useEffect(() => {
    const pool = activeEnemy.skills;
    if (!pool || pool.length === 0) return;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const cpuPotatoInit = activeEnemy.id === 'm5' ? 10 : 0;
    setGameState(prev => ({
      ...prev,
      enemyHand: shuffled.slice(0, 4),
      enemyEnergy: 3,
      cpuTapiocaStock: 0,
      cpuPotatoStock: cpuPotatoInit,
      cpuKitaiChi: 0,
      cpuHazureCount: 0,
      cpuBugCount: 0,
      cpuBuildingFloor: 0,
    }));
  }, [gameState.activeEnemyIndex]);

  // ── ターン開始時エフェクト ──────────────────────────────────────────
  useEffect(() => {
    if (gameState.turn !== 'player') { turnStartProcessed.current = false; return; }
    if (turnStartProcessed.current) return;
    turnStartProcessed.current = true;

    setGameState(prev => {
      let next = { ...prev };
      const logs: string[] = [];

      // テールマシンガン
      if (prev.tailGatlingActive && prev.tailGatlingTurn > 0) {
        const dmgMap: Record<number, number> = { 1: 5, 2: 10, 3: 10 };
        const dmg = dmgMap[prev.tailGatlingTurn] ?? 0;
        const newEnemyTeam = [...prev.enemyTeam];
        const newEnemyHp = Math.max(0, newEnemyTeam[prev.activeEnemyIndex].hp - dmg);
        newEnemyTeam[prev.activeEnemyIndex] = { ...newEnemyTeam[prev.activeEnemyIndex], hp: newEnemyHp };
        next.enemyTeam = newEnemyTeam;
        const nextGatlingTurn = prev.tailGatlingTurn + 1;
        next.tailGatlingActive = nextGatlingTurn <= 3;
        next.tailGatlingTurn = next.tailGatlingActive ? nextGatlingTurn : 0;
        logs.push(`テールマシンガン ${prev.tailGatlingTurn}撃目！${dmg}ダメージ！`);
        if (newEnemyHp <= 0 && prev.activeEnemyIndex >= prev.enemyTeam.length - 1) {
          setTimeout(() => setShowResult('win'), 100);
        }
      }

      // 光合成ボーナスエナジー
      if (prev.bonsaiBonusEnergyNextTurn) {
        next.energy = Math.min(10, prev.energy + 2);
        next.bonsaiBonusEnergyNextTurn = false;
        logs.push('光合成の恵み！エナジー+2！');
      }

      // 根を張る
      if (prev.bonsaiRootActive && prev.bonsaiRootTurnsLeft > 0) {
        const newPlayerTeam = [...prev.playerTeam];
        const p = newPlayerTeam[prev.activePlayerIndex];
        newPlayerTeam[prev.activePlayerIndex] = { ...p, hp: Math.min(p.maxHp, p.hp + 10) };
        next.playerTeam = newPlayerTeam;
        const newRootTurns = prev.bonsaiRootTurnsLeft - 1;
        next.bonsaiRootActive = newRootTurns > 0;
        next.bonsaiRootTurnsLeft = newRootTurns;
        logs.push(`根を張る！HP+10！（残り${newRootTurns}ターン）`);
      }

      // 秘剣・大樹断ち 自動発動
      if (prev.bonsaiSekkenCharging) {
        const p = prev.playerTeam[prev.activePlayerIndex];
        const isLowHp = p.hp <= p.maxHp / 2;
        const dmg = isLowHp ? 80 : 50;
        const newEnemyTeam = [...prev.enemyTeam];
        const newEnemyHp = Math.max(0, newEnemyTeam[prev.activeEnemyIndex].hp - dmg);
        newEnemyTeam[prev.activeEnemyIndex] = { ...newEnemyTeam[prev.activeEnemyIndex], hp: newEnemyHp };
        next.enemyTeam = newEnemyTeam;
        next.bonsaiSekkenCharging = false;
        next.bonsaiPhotoCount = 0;
        logs.push(`⚔️ 秘剣・大樹断ち発動！${isLowHp ? '低HP強化で' : ''}${dmg}ダメージ！光合成リセット。`);
        if (newEnemyHp <= 0 && prev.activeEnemyIndex >= prev.enemyTeam.length - 1) {
          setTimeout(() => setShowResult('win'), 100);
        }
      }

      // 取り立てデバフ（敵へ毎ターンダメージ）
      if (prev.tosaAttackKaritateActive && prev.tosaAttackKaritateTurnsLeft > 0) {
        const karitateDmg = prev.tosaAttackKaritateDouble ? 30 : 15;
        const newEnemyTeam = [...(next.enemyTeam ?? prev.enemyTeam)];
        const newEnemyHp = Math.max(0, newEnemyTeam[prev.activeEnemyIndex].hp - karitateDmg);
        newEnemyTeam[prev.activeEnemyIndex] = { ...newEnemyTeam[prev.activeEnemyIndex], hp: newEnemyHp };
        next.enemyTeam = newEnemyTeam;
        const newKaritateTurns = prev.tosaAttackKaritateTurnsLeft - 1;
        next.tosaAttackKaritateActive = newKaritateTurns > 0;
        next.tosaAttackKaritateTurnsLeft = newKaritateTurns;
        if (newKaritateTurns === 0) next.tosaAttackKaritateDouble = false;
        logs.push(`🦊 取り立て！敵に${karitateDmg}ダメージ！（残り${newKaritateTurns}ターン）`);
        if (newEnemyHp <= 0 && prev.activeEnemyIndex >= prev.enemyTeam.length - 1) {
          setTimeout(() => setShowResult('win'), 100);
        }
      }

      // プレイヤーへの取り立てデバフ（CPU トサン付与）
      if (prev.tosaPlayerKaritateActive && prev.tosaPlayerKaritateTurnsLeft > 0) {
        const newPlayerTeam = [...(next.playerTeam ?? prev.playerTeam)];
        const p2 = newPlayerTeam[prev.activePlayerIndex];
        newPlayerTeam[prev.activePlayerIndex] = { ...p2, hp: Math.max(1, p2.hp - 15) };
        next.playerTeam = newPlayerTeam;
        const newPlayerKTurns = prev.tosaPlayerKaritateTurnsLeft - 1;
        next.tosaPlayerKaritateActive = newPlayerKTurns > 0;
        next.tosaPlayerKaritateTurnsLeft = newPlayerKTurns;
        logs.push(`💸 取り立て！自分に15ダメージ！（残り${newPlayerKTurns}ターン）`);
      }

      if (logs.length > 0) next.logs = [...logs, ...prev.logs].slice(0, 5);
      return next;
    });
  }, [gameState.turn]);

  // ── ユーティリティ ──────────────────────────────────────────────────
  const addLog = (msg: string) =>
    setGameState(prev => ({ ...prev, logs: [msg, ...prev.logs].slice(0, 5) }));

  const shake = (target: 'player' | 'enemy') => {
    setIsShaking(prev => ({ ...prev, [target]: true }));
    setTimeout(() => setIsShaking(prev => ({ ...prev, [target]: false })), 500);
  };

  const drawSkill = () => {
    const pool = activePlayer.skills;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // 進化フラッシュ: activePlayer.form が上がったときに発火（updater 外で setState）
  const prevFormRef = useRef(activePlayer?.form ?? 1);
  useEffect(() => {
    const newForm = activePlayer?.form ?? 1;
    if (newForm > prevFormRef.current) {
      setEvolutionFlash(true);
      setTimeout(() => setEvolutionFlash(false), 1000);
    }
    prevFormRef.current = newForm;
  }, [activePlayer?.form]);

  const triggerEvolution = (monster: Monster) => {
    const { monster: evolved, logs } = checkGoryoEvolution(monster, []);
    return { evolved, logs };
  };

  // ── スキル使用 ──────────────────────────────────────────────────────
  const handleSkill = (skill: Skill) => {
    const effectiveCost = getEffectiveCost(skill, activePlayer, activeEnemy, gameState);
    const { locked } = isSkillLocked(skill, gameState);
    if (gameState.turn !== 'player' || gameState.energy < effectiveCost || showResult || locked) return;
    if (gameState.playerStunTurns > 0) return;

    // shake は updater 外で呼ぶ（updater 内で setState はクラッシュの原因）
    const BS_DMG = new Set(['s10','s14','s15','s16','s19','s20','s22','s24','s26','s27','s33','s38','s39','s44','s45','s49','s50','s51','s56','s57','s62']);
    if (skill.type === 'attack' || BS_DMG.has(skill.id)) shake('enemy');

    setGameState(prev => {
      let next = { ...prev };
      let newPlayerMonster = { ...activePlayer };
      let newEnemyHp = activeEnemy.hp;
      const logs: string[] = [];

      next.energy = prev.energy - effectiveCost;

      // ── ゴリョ スキル ─────────────────────────────
      if (skill.id === 's9') {
        next.playerDodgeActive = true;
        logs.push(`${activePlayer.name}が水の中へ！次のターン回避！`);
      }
      else if (skill.id === 's10') {
        const dmg = activeEnemy.isWaterType ? 60 : 30;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        newPlayerMonster.attacksGiven = (newPlayerMonster.attacksGiven ?? 0) + 1;
        logs.push(`食欲旺盛！${activeEnemy.isWaterType ? '水系2倍！' : ''}${dmg}ダメージ！`);
      }
      else if (skill.id === 's11') {
        next.tailGatlingActive = true;
        next.tailGatlingTurn = 1;
        logs.push(`テールマシンガン発動！3ターン連続攻撃！`);
      }
      else if (skill.id === 's12') {
        next.criticalMomentActive = true;
        logs.push(`危機一髪！次のターン絶対に生き残る！`);
      }
      else if (skill.id === 's13') {
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + 16);
        logs.push(`弱肉強食！HP+16回復！`);
      }
      else if (skill.id === 's14') {
        newEnemyHp = Math.max(0, newEnemyHp - 42);
        next.playerStunTurns = 1;
        next.playerNoEnergyNextTurn = true;
        newPlayerMonster.attacksGiven = (newPlayerMonster.attacksGiven ?? 0) + 1;
        logs.push(`DEATHパンチ！42ダメージ！次のターン行動不能…`);
      }

      // ── ポチっとな スキル ────────────────────────
      else if (skill.id === 's15') {
        let dmg = 15;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logs.push(`焼きたてタックル！${dmg}ダメージ！`);
      }
      else if (skill.id === 's16') {
        let dmg = 20;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logs.push(`トースト連続発射！${dmg}ダメージ！`);
      }
      else if (skill.id === 's17') {
        next.enemyDamageDebuff = (prev.enemyDamageDebuff ?? 0) + 1;
        logs.push(`コンセント抜き！相手の次ターンエナジー回復-1！`);
      }
      else if (skill.id === 's18') {
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + 20);
        logs.push(`パンくず補給！HP+20回復！`);
      }
      else if (skill.id === 's19') {
        let dmg = 45;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        newPlayerMonster.hp = Math.max(1, newPlayerMonster.hp - 10);
        logs.push(`黒焦げオーバーヒート！${dmg}ダメージ！自分に10反動ダメージ…`);
      }
      else if (skill.id === 's20') {
        let dmg = 60;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + 15);
        next.playerStunTurns = 2;
        logs.push(`限界突破フルブレックファスト！${dmg}ダメージ＋HP+15！2ターン行動不能…`);
      }

      // ── タピるん スキル ──────────────────────────
      else if (skill.id === 's21') {
        const gain = Math.floor(Math.random() * 3) + 1; // 1〜3
        next.tapiocaStock = Math.min(6, prev.tapiocaStock + gain);
        logs.push(`タピオカ生成！🧋×${gain}ストック！（合計${next.tapiocaStock}）`);
      }
      else if (skill.id === 's22') {
        const use = Math.min(3, prev.tapiocaStock);
        const dmg = use * 12;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        next.tapiocaStock = prev.tapiocaStock - use;
        logs.push(`プチプチ弾！🧋×${use}消費、${dmg}ダメージ！`);
      }
      else if (skill.id === 's23') {
        next.playerDamageHalf = true;
        logs.push(`甘すぎる誘惑！次のターン受けるダメージ半減！`);
      }
      else if (skill.id === 's24') {
        let drainDmg = 15;
        newEnemyHp = Math.max(0, newEnemyHp - drainDmg);
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + drainDmg);
        logs.push(`ストロー吸引！15ダメージ＋HP15回復！`);
      }
      else if (skill.id === 's25') {
        next.playerDamageNullify = true;
        logs.push(`もちもちバリア！次の攻撃を1回完全無効！`);
      }
      else if (skill.id === 's26') {
        const use = prev.tapiocaStock;
        const dmg = use * 15;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        next.tapiocaStock = 0;
        next.energy = 0;
        logs.push(`窒息タピオカラッシュ！🧋×${use}全消費、${dmg}ダメージ！エナジー0！`);
      }

      // ── ボンザムライ スキル ──────────────────────
      else if (skill.id === 's27') {
        let dmg = 20;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logs.push(`居合・小枝斬り！${dmg}ダメージ！`);
      }
      else if (skill.id === 's28') {
        next.bonsaiGuardThisTurn = true;
        next.bonsaiBonusEnergyNextTurn = true;
        next.bonsaiPhotoCount = (prev.bonsaiPhotoCount ?? 0) + 1;
        logs.push(`光合成の構え！このターン被ダメ-10、次ターンエナジー+2。光合成×${next.bonsaiPhotoCount}`);
      }
      else if (skill.id === 's29') {
        next.bonsaiMineActive = true;
        next.bonsaiMineTurnsLeft = 2;
        logs.push(`松ぼっくり地雷設置！2ターン後に35ダメージ爆発！`);
      }
      else if (skill.id === 's30') {
        newPlayerMonster.hp = Math.max(1, newPlayerMonster.hp - 20);
        next.bonsaiNextAttackDouble = true;
        logs.push(`捨て身の剪定！HP-20。次の攻撃が2倍になる！`);
      }
      else if (skill.id === 's31') {
        next.bonsaiRootActive = true;
        next.bonsaiRootTurnsLeft = 3;
        logs.push(`根を張る！3ターンの間毎ターンHP+10。他技コスト+1。`);
      }
      else if (skill.id === 's32') {
        next.bonsaiSekkenCharging = true;
        logs.push(`秘剣・大樹断ち、チャージ開始…次のターン発動！`);
      }

      // ── ポテトキング スキル ──────────────────────
      else if (skill.id === 's33') {
        const used = Math.min(5, prev.potatoStock);
        const dmg = used * 5;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        next.potatoStock = prev.potatoStock - used;
        logs.push(`ポテト投げ！🍟×${used}本投げて${dmg}ダメージ！残り${next.potatoStock}本`);
      }
      else if (skill.id === 's34') {
        next.saltDebuffActive = true;
        next.saltDebuffTurnsLeft = 4;
        logs.push(`しおかけ！4ターン敵のエナジー回復-1！🧂`);
      }
      else if (skill.id === 's35') {
        next.ketchupBarrierActive = true;
        next.ketchupBarrierTurnsLeft = 3;
        logs.push(`ケチャップバリア！3ターン被ダメ10%減！🍅`);
      }
      else if (skill.id === 's36') {
        next.burgerOrderActive = true;
        logs.push(`バーガーお急ぎ注文！次に受けたダメージの2/3を回復！🍔`);
      }
      else if (skill.id === 's37') {
        next.potatoStock = Math.min(10, prev.potatoStock + 5);
        logs.push(`ポテト追加注文！🍟+5本（計${next.potatoStock}本）`);
      }
      else if (skill.id === 's38') {
        const used = prev.potatoStock + 5;
        const dmg = used * 4;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        next.potatoStock = 0;
        logs.push(`ポテトLサイズご注文！🍟×${used}本で${dmg}ダメージ！ポテト全消費！`);
      }

      // ── ギャンブラー斎藤 スキル ──────────────────
      else if (skill.id === 's39') {
        // 単発ガチャ投げ
        let dmg: number;
        let isHazure = false;
        if (prev.saitoLimitBreakActive) {
          // 限界突破中: 常に30ダメージ
          dmg = 30;
          logs.push(`🌟 限界突破ガチャ！確定30ダメージ！`);
        } else if (prev.saitoSSRActive) {
          dmg = 30;
          next.saitoSSRActive = false;
          logs.push(`🎰 SSR確定！30ダメージ！`);
        } else if (prev.saitoKitaiChi >= 8) {
          dmg = Math.random() < 0.5 ? 20 : 30;
          logs.push(`🎰 期待値高し！${dmg}ダメージ！（ハズレなし）`);
        } else {
          const roll = Math.random();
          dmg = roll < 0.33 ? 10 : roll < 0.66 ? 20 : 30;
          isHazure = dmg === 10;
        }
        if (isHazure) {
          next.saitoHazureCount = prev.saitoHazureCount + 1;
          logs.push(`🎰 ハズレ…10ダメージ（ハズレ${next.saitoHazureCount}回目）`);
        } else if (!prev.saitoLimitBreakActive && (dmg !== 30 || !prev.saitoSSRActive)) {
          logs.push(`🎰 ${dmg === 30 ? 'SSR！' : 'あたり！'}${dmg}ダメージ！`);
        }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
      }
      else if (skill.id === 's40') {
        // ラッキー！: 0コスト、1-3エナジー獲得、期待値1-8アップ
        const luckyEnergy = Math.floor(Math.random() * 3) + 1;
        const luckyKitai = Math.floor(Math.random() * 8) + 1;
        const multiplier = prev.tosaSanpanActive ? 2 : 1; // 自己破産バフで2倍
        const actualLuckyEnergy = luckyEnergy * multiplier;
        const actualLuckyKitai = luckyKitai * multiplier;
        next.energy = Math.min(10, prev.energy + actualLuckyEnergy);
        next.saitoKitaiChi = Math.min(15, prev.saitoKitaiChi + actualLuckyKitai);
        if (next.saitoKitaiChi >= 11 && !prev.saitoLimitBreakActive) {
          next.saitoLimitBreakActive = true;
          logs.push(`🎰 ラッキー！エナジー+${actualLuckyEnergy}、期待値+${actualLuckyKitai}！🌟 限界突破！`);
        } else {
          logs.push(`🎰 ラッキー！エナジー+${actualLuckyEnergy}、期待値+${actualLuckyKitai}（→${next.saitoKitaiChi}）`);
        }
      }
      else if (skill.id === 's41') {
        next.energy = 10;
        next.saitoKitaiChi = 10;
        next.saitoBorrowActive = true;
        next.saitoBorrowTurnsLeft = 3;
        logs.push(`借金！エナジー&期待値MAX！3ターン後に0になる…💸`);
      }
      else if (skill.id === 's42') {
        next.saitoSSRActive = true;
        logs.push(`SSR確定演出！次の攻撃は必ず最大ダメージ！✨`);
      }
      else if (skill.id === 's43') {
        const heal = prev.saitoLimitBreakActive ? 60 : 10 + Math.floor(prev.saitoKitaiChi * 3);
        const kitaiGain = Math.floor(Math.random() * 2) + 1;
        const multiplier = prev.tosaSanpanActive ? 2 : 1;
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + heal);
        const newKitai = prev.saitoLimitBreakActive
          ? prev.saitoKitaiChi  // 限界突破中は変化なし
          : Math.min(15, prev.saitoKitaiChi + kitaiGain * multiplier);
        next.saitoKitaiChi = newKitai;
        logs.push(`やけ酒！HP+${heal}回復${prev.saitoLimitBreakActive ? '（限界突破！）' : `、期待値+${kitaiGain * multiplier}（→${newKitai}）`}🍶`);
      }
      else if (skill.id === 's44') {
        if (prev.saitoLimitBreakActive) {
          // 限界突破クライマックス: 3/4 HP damage、コスト0（getEffectiveCostで制御）、期待値→0
          const dmg = Math.floor(activeEnemy.hp * 3 / 4);
          newEnemyHp = Math.max(0, activeEnemy.hp - dmg);
          next.energy = prev.energy; // エナジー消費なし（コスト0は getEffectiveCost で処理）
          next.saitoKitaiChi = 0;
          next.saitoHazureCount = 0;
          next.saitoLimitBreakActive = false;
          logs.push(`🌟 限界突破クライマックス！！！${dmg}ダメージ！期待値→0、限界突破終了`);
        } else {
          // 通常クライマックス: 2/3 HP damage
          const dmg = Math.floor(activeEnemy.hp * 2 / 3);
          newEnemyHp = Math.max(0, activeEnemy.hp - dmg);
          next.saitoKitaiChi = 4;
          next.saitoHazureCount = 0;
          logs.push(`🎆 クライマックス！！！${dmg}ダメージ（残HP2/3）！期待値→4、ハズレリセット`);
        }
      }

      // ── バグマスター スキル ──────────────────────
      else if (skill.id === 's45') {
        newEnemyHp = Math.max(0, newEnemyHp - 10);
        next.enemyBugCount = prev.enemyBugCount + 1;
        logs.push(`スパム送信！10ダメージ＋バグ付与🐛（バグ${next.enemyBugCount}）`);
      }
      else if (skill.id === 's46') {
        next.enemyDamageDebuff = (prev.enemyDamageDebuff ?? 0) + 2; // エナジー回復1相当の強さで表現
        next.enemyBugCount = prev.enemyBugCount + 1;
        logs.push(`重い処理！敵のエナジー回復を1に＋バグ付与🐛（バグ${next.enemyBugCount}）`);
      }
      else if (skill.id === 's47') {
        // 敵の手札から1枚を封印（コスト99に）はCPU側で実装、プレイヤーが撃つ場合はエナジーデバフとして機能
        next.enemyDamageDebuff = (prev.enemyDamageDebuff ?? 0) + 3;
        logs.push(`パスワードクラック！敵の手札1枚を封印！💻`);
      }
      else if (skill.id === 's48') {
        next.copyPasteActive = true;
        logs.push(`コピペ！次のターン受けたダメージを反射！🔄`);
      }
      else if (skill.id === 's49') {
        newEnemyHp = Math.max(0, newEnemyHp - 15);
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + 15);
        // エナジー奪取は次ターンのエナジー回復を0にする（enemyDamageDebuffで近似）
        next.enemyDamageDebuff = (prev.enemyDamageDebuff ?? 0) + 2;
        logs.push(`ランサムウェア！15ダメージ＋HP15吸収＋敵エナジー奪取！💻`);
      }
      else if (skill.id === 's50') {
        newEnemyHp = Math.max(0, newEnemyHp - 70);
        next.enemyBugCount = 0;
        logs.push(`💥 ブルースクリーン！70ダメージ！バグリセット！`);
      }

      // ── トサン・フォックス スキル ────────────────
      else if (skill.id === 's57') {
        // 小銭投げ: 10dmg, vs ギャンブラー斎藤なら期待値+2エナジー+2
        newEnemyHp = Math.max(0, newEnemyHp - 10);
        if (activeEnemy.id === 'm6') {
          // 敵ギャンブラー斎藤の期待値とエナジーをCPU側で追加
          next.cpuKitaiChi = Math.min(15, prev.cpuKitaiChi + 2);
          next.enemyEnergy = Math.min(10, prev.enemyEnergy + 2);
          logs.push(`小銭投げ！10ダメージ。ギャンブラー斎藤に期待値+2・エナジー+2プレゼント🦊`);
        } else {
          logs.push(`小銭投げ！10ダメージ🦊`);
        }
      }
      else if (skill.id === 's58') {
        // 押し貸し: 敵エナジーMAX + 取り立てデバフ3ターン
        next.enemyEnergy = 10;
        next.tosaAttackKaritateActive = true;
        next.tosaAttackKaritateTurnsLeft = 3;
        if (activeEnemy.id === 'm6') {
          next.cpuKitaiChi = 15; // 限界突破
          logs.push(`押し貸し！敵エナジーMAX＋取り立てデバフ！ギャンブラー斎藤が期待値15限界突破！🦊`);
        } else {
          logs.push(`押し貸し！敵エナジーMAX＋3ターン毎ターン15ダメージ取り立て開始！🦊`);
        }
      }
      else if (skill.id === 's59') {
        // 担保没収: 次の敵回復を反転
        next.tosaDantanActive = true;
        const kitaiLoss = Math.min(prev.saitoKitaiChi, 3);
        next.saitoKitaiChi = prev.saitoKitaiChi - kitaiLoss;
        logs.push(`担保没収！次に敵が回復したらそれをダメージに変換！期待値-3🦊`);
      }
      else if (skill.id === 's60') {
        // 口座凍結: 次ターン高コスト封印
        next.tosaFreezeActive = true;
        const kitaiLoss2 = Math.min(prev.saitoKitaiChi, 3);
        next.saitoKitaiChi = prev.saitoKitaiChi - kitaiLoss2;
        logs.push(`口座凍結！次ターン敵はコスト4以上の技が使えない！期待値-3🦊`);
      }
      else if (skill.id === 's61') {
        // 利子倍プッシュ: 取り立てダメ2倍
        next.tosaAttackKaritateDouble = true;
        const kitaiLoss3 = Math.min(prev.saitoKitaiChi, 2);
        next.saitoKitaiChi = prev.saitoKitaiChi - kitaiLoss3;
        logs.push(`利子倍プッシュ！取り立てのダメージが2倍に！期待値-2🦊`);
      }
      else if (skill.id === 's62') {
        // 自己破産手続き: 敵エナジー→0、敵HP半分、自エナジー→0
        next.enemyEnergy = 0;
        newEnemyHp = Math.floor(activeEnemy.hp / 2);
        next.energy = 0;
        next.saitoKitaiChi = 0;
        next.saitoLimitBreakActive = false;
        next.tosaSanpanActive = true;
        logs.push(`自己破産手続き！敵エナジー0・敵HP半分！自分エナジー0。期待値UP効果が2倍に！🦊`);
      }

      // ── 工事の鬼 スキル ──────────────────────────
      else if (skill.id === 's51') {
        let dmg = 15;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logs.push(`資材ぶん投げ！${dmg}ダメージ！🏗️`);
      }
      else if (skill.id === 's52') {
        next.buildingFloor = prev.buildingFloor + 3;
        newPlayerMonster.hp = Math.max(1, newPlayerMonster.hp - 10);
        logs.push(`突貫工事！階層+3（→${next.buildingFloor}階）自分HP-10！🏗️`);
      }
      else if (skill.id === 's53') {
        next.earthquakeProofActive = true;
        logs.push(`耐震偽装！次のターン被ダメ0！（50%で階層半減の罠つき）🏗️`);
      }
      else if (skill.id === 's54') {
        const heal = prev.buildingFloor * 5;
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + heal);
        logs.push(`家賃収入！${prev.buildingFloor}階×5で${heal}HP回復！🏢`);
      }
      else if (skill.id === 's55') {
        next.enemyDamageDebuff = 99; // エナジー0相当（次ターン回復させない）
        logs.push(`屋上からの絶景！敵のエナジーを0に！🏙️`);
      }
      else if (skill.id === 's56') {
        const floorDmg = Math.min(150, prev.buildingFloor * 15);
        newEnemyHp = Math.max(0, newEnemyHp - floorDmg);
        newPlayerMonster.hp = Math.max(1, newPlayerMonster.hp - 30);
        next.buildingFloor = 0;
        logs.push(`🏗️💥 ビルヂング大崩落！${floorDmg}ダメージ！自分30ダメ！階層リセット！`);
      }

      // ── 汎用スキル ────────────────────────────────
      else if (skill.type === 'attack') {
        let dmg = skill.value;
        if (prev.bonsaiNextAttackDouble) { dmg *= 2; next.bonsaiNextAttackDouble = false; logs.push('捨て身の剪定で威力2倍！'); }
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logs.push(`${activePlayer.name}の${skill.name}！${dmg}ダメージ。`);
      }
      else if (skill.type === 'buff') {
        newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp + skill.value);
        logs.push(`${activePlayer.name}の${skill.name}！HP+${skill.value}回復。`);
      }

      // ── 攻撃カウント（ゴリョ進化用） ──────────────
      if (skill.type === 'attack' && activePlayer.id === GORYO_ID &&
          !['s9','s11','s12','s13','s32'].includes(skill.id)) {
        newPlayerMonster.attacksGiven = (newPlayerMonster.attacksGiven ?? 0) + 1;
      }

      // 進化チェック
      newPlayerMonster.hp = Math.min(newPlayerMonster.maxHp, newPlayerMonster.hp); // clamp
      const { evolved: evolvedMonster, logs: evolLogs } = triggerEvolution(newPlayerMonster);

      // 敵HP更新
      const newEnemyTeam = [...prev.enemyTeam];
      newEnemyTeam[prev.activeEnemyIndex] = { ...activeEnemy, hp: newEnemyHp };
      const newPlayerTeam = [...prev.playerTeam];
      newPlayerTeam[prev.activePlayerIndex] = evolvedMonster;

      // 手札更新
      const newHand = prev.hand.map(s => s.id === skill.id ? drawSkill() : s);

      next.enemyTeam = newEnemyTeam;
      next.playerTeam = newPlayerTeam;
      next.hand = newHand;
      next.logs = [...evolLogs, ...logs, ...prev.logs].slice(0, 5);

      // 敵撃破チェック
      if (newEnemyHp <= 0) {
        if (prev.activeEnemyIndex < prev.enemyTeam.length - 1) {
          setTimeout(() => setGameState(p => ({ ...p, activeEnemyIndex: p.activeEnemyIndex + 1 })), 300);
          next.logs = [`${activeEnemy.name}を倒した！`, ...next.logs].slice(0, 5);
        } else {
          setTimeout(() => setShowResult('win'), 300);
        }
      }

      return next;
    });
  };

  // ── ターン終了 ──────────────────────────────────────────────────────
  const endTurn = useCallback(() => {
    if (gameState.turn !== 'player' || showResult) return;

    // スタン中でも敵のターンは進む
    setGameState(prev => {
      let next = { ...prev, turn: 'enemy' as const };
      const logs: string[] = ['敵のターン…'];

      // 松ぼっくり地雷 カウントダウン
      if (prev.bonsaiMineActive) {
        const newTurns = prev.bonsaiMineTurnsLeft - 1;
        if (newTurns <= 0) {
          const newEnemyTeam = [...prev.enemyTeam];
          const newHp = Math.max(0, newEnemyTeam[prev.activeEnemyIndex].hp - 35);
          newEnemyTeam[prev.activeEnemyIndex] = { ...newEnemyTeam[prev.activeEnemyIndex], hp: newHp };
          next.enemyTeam = newEnemyTeam;
          next.bonsaiMineActive = false;
          next.bonsaiMineTurnsLeft = 0;
          logs.push(`💥 松ぼっくり地雷爆発！35ダメージ！`);
          if (newHp <= 0 && prev.activeEnemyIndex >= prev.enemyTeam.length - 1) {
            setTimeout(() => setShowResult('win'), 100);
          }
        } else {
          next.bonsaiMineTurnsLeft = newTurns;
        }
      }

      next.logs = [...logs, ...prev.logs].slice(0, 5);
      return next;
    });

    // 敵の行動（1.5秒後）
    setTimeout(() => {
      setGameState(prev => {
        if (showResult) return prev;
        let next = { ...prev };
        const logs: string[] = [];

        // ─── CPU スキル選択 ───────────────────────────────────────────
        // 敵エナジー回復（しおかけで減少、コンセント抜きデバフも）
        const energyDebuff = prev.enemyDamageDebuff > 0 ? Math.min(prev.enemyDamageDebuff, 2) : 0;
        const baseEnemyEnergyRecovery = prev.saltDebuffActive ? 1 : 3;
        const cpuEnergyGained = Math.max(0, baseEnemyEnergyRecovery - energyDebuff);
        const newEnemyEnergy = Math.min(10, prev.enemyEnergy + cpuEnergyGained);
        next.enemyEnergy = newEnemyEnergy;

        // CPU スキル選択ロジック
        const cpuSkillPool = prev.enemyHand.length > 0 ? prev.enemyHand : activeEnemy.skills;

        // 使用可能なスキルをフィルタ（コスト・条件チェック）
        const isCpuSkillUsable = (s: typeof cpuSkillPool[0]) => {
          if (s.cost > next.enemyEnergy) return false;
          const eid = activeEnemy.id;
          // タピるん
          if (s.id === 's22' && prev.cpuTapiocaStock === 0) return false;
          if (s.id === 's26' && prev.cpuTapiocaStock === 0) return false;
          // ポテトキング
          if (s.id === 's33' && prev.cpuPotatoStock === 0) return false;
          if (s.id === 's38' && prev.cpuPotatoStock === 0) return false;
          // ハッカー
          if (s.id === 's50' && prev.cpuBugCount < 3) return false;
          // 建設
          if (s.id === 's55' && prev.cpuBuildingFloor < 5) return false;
          if (s.id === 's56' && prev.cpuBuildingFloor === 0) return false;
          // ギャンブラー
          if (s.id === 's44' && (prev.cpuHazureCount < 3 || prev.cpuKitaiChi < 8)) return false;
          return true;
        };

        const usable = cpuSkillPool.filter(isCpuSkillUsable);
        // 攻撃スキルを優先、なければバフ/デバフ、それもなければ何でも
        const attackSkills = usable.filter(s => s.type === 'attack');
        const chosenSkill = attackSkills.length > 0
          ? attackSkills[Math.floor(Math.random() * attackSkills.length)]
          : usable.length > 0
            ? usable[Math.floor(Math.random() * usable.length)]
            : null;

        // 回避中
        if (prev.playerDodgeActive) {
          logs.push(`${activePlayer.name}は水の中！攻撃を回避！`);
          next.playerDodgeActive = false;
          const energyRecovered = prev.playerNoEnergyNextTurn ? 0 : Math.max(0, 3 - prev.enemyDamageDebuff);
          next.energy = Math.min(10, prev.energy + energyRecovered);
          next.playerNoEnergyNextTurn = false;
          next.enemyDamageDebuff = 0;
          next.playerStunTurns = Math.max(0, prev.playerStunTurns - 1);
          next.bonsaiGuardThisTurn = false;
          // CPU 手札補充
          if (chosenSkill && prev.enemyHand.length > 0) {
            const newEnemyHand = prev.enemyHand.map(s => s.id === chosenSkill.id ? activeEnemy.skills[Math.floor(Math.random() * activeEnemy.skills.length)] : s);
            next.enemyHand = newEnemyHand;
          }
          next.turn = 'player';
          next.logs = [...logs, ...prev.logs].slice(0, 5);
          setEnergyGain(energyRecovered);
          setTimeout(() => setEnergyGain(0), 1000);
          return next;
        }

        // ─── CPU スキル効果適用 ──────────────────────────────────────
        let rawDamage = 0;
        let cpuUsedSkill = false;

        if (chosenSkill) {
          cpuUsedSkill = true;
          next.enemyEnergy -= chosenSkill.cost;

          // 攻撃スキル
          if (chosenSkill.type === 'attack') {
            // キャラ固有
            if (chosenSkill.id === 's22') { // プチプチ弾
              const use = Math.min(3, prev.cpuTapiocaStock);
              rawDamage = use * 12;
              next.cpuTapiocaStock = prev.cpuTapiocaStock - use;
              logs.push(`${activeEnemy.name}のプチプチ弾！🧋×${use}で${rawDamage}ダメージ！`);
            } else if (chosenSkill.id === 's26') { // 窒息タピオカラッシュ
              rawDamage = prev.cpuTapiocaStock * 15;
              next.cpuTapiocaStock = 0;
              next.enemyEnergy = 0;
              logs.push(`${activeEnemy.name}の窒息タピオカラッシュ！${rawDamage}ダメージ！`);
            } else if (chosenSkill.id === 's33') { // ポテト投げ
              const use = Math.min(5, prev.cpuPotatoStock);
              rawDamage = use * 5;
              next.cpuPotatoStock = prev.cpuPotatoStock - use;
              logs.push(`${activeEnemy.name}のポテト投げ！🍟×${use}で${rawDamage}ダメージ！`);
            } else if (chosenSkill.id === 's38') { // ポテトLサイズ
              const use = prev.cpuPotatoStock + 5;
              rawDamage = use * 4;
              next.cpuPotatoStock = 0;
              logs.push(`${activeEnemy.name}のポテトLサイズ！🍟×${use}で${rawDamage}ダメージ！`);
            } else if (chosenSkill.id === 's39') { // 単発ガチャ
              const roll = Math.random();
              rawDamage = prev.cpuKitaiChi >= 8 ? (Math.random() < 0.5 ? 20 : 30) : roll < 0.33 ? 10 : roll < 0.66 ? 20 : 30;
              if (rawDamage === 10) { next.cpuHazureCount = prev.cpuHazureCount + 1; logs.push(`🎰 ${activeEnemy.name}のガチャ！ハズレ…${rawDamage}ダメ`); }
              else logs.push(`🎰 ${activeEnemy.name}のガチャ！${rawDamage}ダメージ！`);
            } else if (chosenSkill.id === 's44') { // クライマックス
              rawDamage = Math.floor(activePlayer.hp * 2 / 3);
              next.cpuKitaiChi = 4;
              next.cpuHazureCount = 0;
              logs.push(`🎆 ${activeEnemy.name}のクライマックス！！！${rawDamage}ダメージ（残HP2/3）！`);
            } else if (chosenSkill.id === 's45') { // スパム送信
              rawDamage = 10;
              next.cpuBugCount = prev.cpuBugCount + 1;
              logs.push(`${activeEnemy.name}のスパム送信！10ダメージ＋バグ🐛付与（${next.cpuBugCount}）`);
            } else if (chosenSkill.id === 's49') { // ランサムウェア
              rawDamage = 15;
              next.energy = Math.max(0, prev.energy - 2);
              logs.push(`${activeEnemy.name}のランサムウェア！15ダメージ＋エナジー-2！`);
            } else if (chosenSkill.id === 's50') { // ブルースクリーン
              rawDamage = 70;
              next.cpuBugCount = 0;
              logs.push(`💥 ${activeEnemy.name}のブルースクリーン！70ダメージ！`);
            } else if (chosenSkill.id === 's51') { // 資材ぶん投げ
              rawDamage = 15;
              logs.push(`${activeEnemy.name}の資材ぶん投げ！15ダメージ！🏗️`);
            } else if (chosenSkill.id === 's56') { // ビルヂング大崩落
              rawDamage = Math.min(150, prev.cpuBuildingFloor * 15);
              const newEnemyHp2 = Math.max(0, activeEnemy.hp - 30);
              const newEnemyTeam2 = [...prev.enemyTeam];
              newEnemyTeam2[prev.activeEnemyIndex] = { ...activeEnemy, hp: newEnemyHp2 };
              next.enemyTeam = newEnemyTeam2;
              next.cpuBuildingFloor = 0;
              logs.push(`💥 ${activeEnemy.name}のビルヂング大崩落！${rawDamage}ダメージ！（自爆30）`);
            } else if (chosenSkill.id === 's57') { // 小銭投げ
              rawDamage = 10;
              if (prev.playerTeam[prev.activePlayerIndex]?.id === 'm6') {
                // 敵がプレイヤーのギャンブラー斎藤
                next.saitoKitaiChi = Math.min(15, prev.saitoKitaiChi + 2);
                next.energy = Math.min(10, prev.energy + 2);
                logs.push(`🦊 ${activeEnemy.name}の小銭投げ！10ダメージ。期待値+2・エナジー+2プレゼント？`);
              } else {
                logs.push(`🦊 ${activeEnemy.name}の小銭投げ！10ダメージ！`);
              }
            } else if (chosenSkill.id === 's62') { // 自己破産手続き
              rawDamage = Math.floor(activePlayer.hp / 2);
              next.energy = 0;
              next.enemyEnergy = 0;
              logs.push(`🦊 ${activeEnemy.name}の自己破産手続き！プレイヤーHP半分＋エナジー0！`);
            } else {
              // 汎用攻撃（value使用）
              rawDamage = chosenSkill.value;
              logs.push(`${activeEnemy.name}の${chosenSkill.name}！${rawDamage}ダメージ。`);
            }
          }
          // バフ/デバフスキル
          else {
            if (chosenSkill.id === 's21') { // タピオカ生成
              const gain = Math.floor(Math.random() * 3) + 1;
              next.cpuTapiocaStock = Math.min(6, prev.cpuTapiocaStock + gain);
              logs.push(`${activeEnemy.name}がタピオカ生成！🧋×${gain}（計${next.cpuTapiocaStock}）`);
            } else if (chosenSkill.id === 's23') { // 甘すぎる誘惑（敵が回避的に使う）
              logs.push(`${activeEnemy.name}が防御態勢！`);
            } else if (chosenSkill.id === 's25') { // もちもちバリア
              logs.push(`${activeEnemy.name}がバリアを張った！`);
            } else if (chosenSkill.id === 's34') { // しおかけ（逆：プレイヤーへ）
              logs.push(`${activeEnemy.name}がしおかけ！しかしプレイヤーには直接効果なし…`);
            } else if (chosenSkill.id === 's37') { // ポテト追加注文
              next.cpuPotatoStock = Math.min(10, prev.cpuPotatoStock + 5);
              logs.push(`${activeEnemy.name}がポテト補充！🍟+5（計${next.cpuPotatoStock}）`);
            } else if (chosenSkill.id === 's40') { // ラッキー！
              const cpuLuckyE = Math.floor(Math.random() * 3) + 1;
              const cpuLuckyK = Math.floor(Math.random() * 8) + 1;
              next.enemyEnergy = Math.min(10, next.enemyEnergy + cpuLuckyE);
              next.cpuKitaiChi = Math.min(15, prev.cpuKitaiChi + cpuLuckyK);
              logs.push(`🎰 ${activeEnemy.name}のラッキー！エナジー+${cpuLuckyE}、期待値+${cpuLuckyK}！`);
            } else if (chosenSkill.id === 's41') { // 借金
              next.enemyEnergy = 10;
              next.cpuKitaiChi = 10;
              logs.push(`💸 ${activeEnemy.name}が借金！エナジー&期待値MAX！`);
            } else if (chosenSkill.id === 's46') { // 重い処理
              next.energy = Math.max(0, prev.energy - 1);
              next.cpuBugCount = prev.cpuBugCount + 1;
              logs.push(`${activeEnemy.name}の重い処理！エナジー-1＋バグ付与🐛`);
            } else if (chosenSkill.id === 's47') { // パスワードクラック
              next.energy = Math.max(0, prev.energy - 2);
              logs.push(`${activeEnemy.name}のパスワードクラック！エナジー-2！`);
            } else if (chosenSkill.id === 's52') { // 突貫工事
              next.cpuBuildingFloor = prev.cpuBuildingFloor + 3;
              const newEnemyTeam3 = [...prev.enemyTeam];
              const selfDmgHp = Math.max(1, activeEnemy.hp - 10);
              newEnemyTeam3[prev.activeEnemyIndex] = { ...activeEnemy, hp: selfDmgHp };
              next.enemyTeam = newEnemyTeam3;
              logs.push(`${activeEnemy.name}が突貫工事！階層→${next.cpuBuildingFloor}階🏗️`);
            } else if (chosenSkill.id === 's54') { // 家賃収入
              const heal = prev.cpuBuildingFloor * 5;
              if (prev.tosaDantanActive && heal > 0) {
                // 担保没収：回復をダメージに変換
                rawDamage += heal;
                next.tosaDantanActive = false;
                logs.push(`${activeEnemy.name}が家賃収入！しかし担保没収でプレイヤーに${heal}ダメージに変換！🦊`);
              } else {
                const newEnemyTeam4 = [...prev.enemyTeam];
                const healedHp = Math.min(activeEnemy.maxHp, activeEnemy.hp + heal);
                newEnemyTeam4[prev.activeEnemyIndex] = { ...activeEnemy, hp: healedHp };
                next.enemyTeam = newEnemyTeam4;
                logs.push(`${activeEnemy.name}が家賃収入！HP+${heal}！🏢`);
              }
            } else if (chosenSkill.id === 's55') { // 屋上からの絶景
              next.energy = 0;
              logs.push(`${activeEnemy.name}の屋上からの絶景！エナジーが0に！🏙️`);
            } else if (chosenSkill.id === 's28') { // 光合成
              logs.push(`${activeEnemy.name}が光合成の構え！`);
            } else if (chosenSkill.id === 's31') { // 根を張る
              logs.push(`${activeEnemy.name}が根を張った！`);
            } else if (chosenSkill.id === 's48') { // コピペ
              logs.push(`${activeEnemy.name}がコピペ！次の攻撃を反射！🔄`);
            } else if (chosenSkill.id === 's58') { // 押し貸し（CPU → プレイヤー）
              // プレイヤーに取り立てデバフ付与
              next.tosaPlayerKaritateActive = true;
              next.tosaPlayerKaritateTurnsLeft = 3;
              // プレイヤーのエナジーもMAXに（見かけ上の恩恵）
              next.energy = Math.min(10, prev.energy + 5);
              if (prev.playerTeam[prev.activePlayerIndex]?.id === 'm6') {
                // ギャンブラー斎藤なら限界突破
                next.saitoKitaiChi = 15;
                next.saitoLimitBreakActive = true;
                logs.push(`🦊 ${activeEnemy.name}の押し貸し！ギャンブラー斎藤が限界突破！でも取り立て3ターン開始！💸`);
              } else {
                logs.push(`🦊 ${activeEnemy.name}の押し貸し！エナジー+5もらったが取り立て3ターン開始！💸`);
              }
            } else if (chosenSkill.id === 's59') { // 担保没収
              next.tosaDantanActive = true;
              logs.push(`🦊 ${activeEnemy.name}の担保没収！次の回復をダメージに変換！`);
            } else if (chosenSkill.id === 's60') { // 口座凍結
              next.tosaFreezeActive = true;
              logs.push(`🦊 ${activeEnemy.name}の口座凍結！次ターンコスト4以上使用不可！`);
            } else if (chosenSkill.id === 's61') { // 利子倍プッシュ
              next.tosaAttackKaritateDouble = true;
              logs.push(`🦊 ${activeEnemy.name}の利子倍プッシュ！取り立てが2倍に！`);
            } else {
              // 汎用バフ
              logs.push(`${activeEnemy.name}の${chosenSkill.name}！`);
            }
          }

          // 手札補充
          if (prev.enemyHand.length > 0) {
            const newEnemyHand = prev.enemyHand.map(s =>
              s.id === chosenSkill.id ? activeEnemy.skills[Math.floor(Math.random() * activeEnemy.skills.length)] : s
            );
            next.enemyHand = newEnemyHand;
          }
        } else {
          // 使えるスキルなし → 小ダメ攻撃
          rawDamage = 5;
          logs.push(`${activeEnemy.name}がうずくまった…5ダメージ。`);
        }

        // コピペ反射チェック
        if (prev.copyPasteActive && rawDamage > 0) {
          const newEnemyHpCopy = Math.max(0, activeEnemy.hp - rawDamage);
          const newEnemyTeamCopy = [...next.enemyTeam];
          newEnemyTeamCopy[prev.activeEnemyIndex] = { ...newEnemyTeamCopy[prev.activeEnemyIndex], hp: newEnemyHpCopy };
          next.enemyTeam = newEnemyTeamCopy;
          next.copyPasteActive = false;
          logs.push(`🔄 コピペ発動！${rawDamage}ダメージを反射！`);
          if (newEnemyHpCopy <= 0) {
            if (prev.activeEnemyIndex >= prev.enemyTeam.length - 1) setTimeout(() => setShowResult('win'), 200);
          }
          rawDamage = 0; // 反射したのでプレイヤーへのダメージなし
        }

        // 耐震偽装チェック
        if (prev.earthquakeProofActive && rawDamage > 0) {
          logs.push(`耐震偽装で被ダメ無効！`);
          if (Math.random() < 0.5) {
            next.buildingFloor = Math.floor(prev.buildingFloor / 2);
            logs.push(`しかし階層が${next.buildingFloor}階に半減！`);
          }
          next.earthquakeProofActive = false;
          rawDamage = 0;
        }

        // アニメーション意図を ref に記録（setGameState の外でアニメを呼ぶため）
        cpuActionRef.current = { usedSkill: cpuUsedSkill, skillType: chosenSkill?.type ?? null };

        // 光合成の構え
        if (prev.bonsaiGuardThisTurn) rawDamage = Math.max(0, rawDamage - 10);

        // もちもちバリア（完全無効）
        let actualDamage = rawDamage;
        if (rawDamage > 0 && prev.playerDamageNullify) {
          actualDamage = 0;
          next.playerDamageNullify = false;
          logs.push(`もちもちバリアが攻撃を無効化！`);
        }
        // 甘すぎる誘惑（半減）
        else if (rawDamage > 0 && prev.playerDamageHalf) {
          actualDamage = Math.floor(actualDamage / 2);
          next.playerDamageHalf = false;
          logs.push(`甘すぎる誘惑でダメージ半減！`);
        }

        // ケチャップバリア（被ダメ10%減）
        if (prev.ketchupBarrierActive) actualDamage = Math.floor(actualDamage * 0.9);

        // シールド
        let remainingDmg = actualDamage;
        if (prev.playerShield > 0) {
          const absorbed = Math.min(prev.playerShield, remainingDmg);
          remainingDmg -= absorbed;
          next.playerShield = prev.playerShield - absorbed;
        }

        let newHp = activePlayer.hp - remainingDmg;

        // 危機一髪
        if (prev.criticalMomentActive && newHp <= 0) {
          newHp = 1;
          next.playerShield = 20;
          next.criticalMomentActive = false;
          logs.push(`危機一髪！HP1で生存！シールド20獲得！`);
        }
        newHp = Math.max(0, newHp);

        // ゴリョ 被ダメカウント
        let newPlayerMonster = { ...activePlayer, hp: newHp };
        if (activePlayer.id === GORYO_ID && actualDamage > 0) {
          newPlayerMonster.attacksReceived = (newPlayerMonster.attacksReceived ?? 0) + 1;
        }

        const { evolved: evolvedMonster, logs: evolLogs } = triggerEvolution(newPlayerMonster);
        const newPlayerTeam = [...prev.playerTeam];
        newPlayerTeam[prev.activePlayerIndex] = evolvedMonster;
        next.playerTeam = newPlayerTeam;

        // バーガーお急ぎ注文（被ダメの2/3回復）
        if (prev.burgerOrderActive && actualDamage > 0) {
          const burger = Math.floor(actualDamage * 2 / 3);
          const p = next.playerTeam[prev.activePlayerIndex];
          next.playerTeam[prev.activePlayerIndex] = { ...p, hp: Math.min(p.maxHp, p.hp + burger) };
          logs.push(`バーガーお急ぎ注文！${burger}HP回復！🍔`);
        }
        next.burgerOrderActive = false;

        // デバフ・バフのカウントダウン
        if (prev.saltDebuffActive) {
          const t = prev.saltDebuffTurnsLeft - 1;
          next.saltDebuffActive = t > 0;
          next.saltDebuffTurnsLeft = Math.max(0, t);
        }
        if (prev.ketchupBarrierActive) {
          const t = prev.ketchupBarrierTurnsLeft - 1;
          next.ketchupBarrierActive = t > 0;
          next.ketchupBarrierTurnsLeft = Math.max(0, t);
        }
        // 借金カウントダウン
        if (prev.saitoBorrowActive) {
          const t = prev.saitoBorrowTurnsLeft - 1;
          if (t <= 0) {
            next.energy = 0;
            next.saitoKitaiChi = 0;
            next.saitoBorrowActive = false;
            next.saitoBorrowTurnsLeft = 0;
            logs.push(`💸 借金返済！エナジー&期待値が0になった…`);
          } else {
            next.saitoBorrowTurnsLeft = t;
          }
        }

        // 口座凍結はターン終了時にリセット（1ターン効果）
        next.tosaFreezeActive = false;

        // エナジー回復
        const energyRecovered = prev.playerNoEnergyNextTurn ? 0 : 3;
        next.energy = (prev.saitoBorrowActive && next.saitoBorrowTurnsLeft <= 0)
          ? 0
          : (prev.playerNoEnergyNextTurn ? prev.energy : Math.min(10, prev.energy + 3));
        next.playerNoEnergyNextTurn = false;
        next.enemyDamageDebuff = 0;
        next.bonsaiGuardThisTurn = false;
        next.playerStunTurns = Math.max(0, prev.playerStunTurns - 1);
        next.turn = 'player';
        next.logs = [...evolLogs, ...logs, ...prev.logs].slice(0, 5);

        setEnergyGain(energyRecovered);
        setTimeout(() => setEnergyGain(0), 1000);

        // プレイヤー撃破チェック
        if (newHp <= 0) {
          if (prev.activePlayerIndex < prev.playerTeam.length - 1) {
            next.activePlayerIndex = prev.activePlayerIndex + 1;
            next.logs = [`${activePlayer.name}がやられた！次のキャラ出撃！`, ...next.logs].slice(0, 5);
          } else {
            setTimeout(() => setShowResult('lose'), 200);
          }
        }

        return next;
      });
      shake('player');
    }, 1500);
  }, [gameState, activePlayer, activeEnemy, showResult]);

  // ── UI ─────────────────────────────────────────────────────────────
  const isGoryo = (m: Monster) => m.id === GORYO_ID;
  const playerForm = activePlayer?.form ?? 1;

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col overflow-hidden font-sans">

      {/* 進化フラッシュ */}
      <AnimatePresence>
        {evolutionFlash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)' }} />
        )}
      </AnimatePresence>

      {/* ヘッダー */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-neutral-800/50 backdrop-blur-md">
        <button onClick={() => onBack()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-widest opacity-50 font-bold">3v3 チームバトル</h2>
          <p className="text-sm font-mono">
            {gameState.playerStunTurns > 0 ? `⚡ スタン中（残${gameState.playerStunTurns}T）` :
             gameState.turn === 'player' ? 'あなたのターン' : '敵のターン'}
          </p>
        </div>
        <div className="flex gap-1">
          {gameState.playerTeam.map((m, i) => (
            <div key={i} className={`w-2 h-2 rounded-full
              ${i < gameState.activePlayerIndex ? 'bg-red-500' :
                i === gameState.activePlayerIndex ? 'bg-green-500' : 'bg-neutral-600'}`} />
          ))}
        </div>
      </div>

      {/* バトルフィールド */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 gap-6">

        {/* 敵 */}
        <motion.div animate={isShaking.enemy ? { x: [-10,10,-10,10,0] } : {}} className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-neutral-800 border-4 flex items-center justify-center shadow-2xl overflow-hidden"
              style={{
                borderColor: (activeEnemy.color ?? '#ef4444') + '55',
                boxShadow: `0 0 18px 4px ${(activeEnemy.color ?? '#ef4444')}33`,
              }}>
              {isGoryo(activeEnemy)
                ? <GoryoCanvas ref={enemyGoryoRef} size={112} flipped form={activeEnemy.form ?? 1} />
                : <CharacterSprite ref={enemySpriteRef} monsterId={activeEnemy.id} size={112} flipped />
              }
            </div>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-neutral-800 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
              <p className="text-xs font-bold">{activeEnemy.name}</p>
            </div>
          </div>
          <div className="w-44 h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-white/10">
            <motion.div animate={{ width: `${(activeEnemy.hp / activeEnemy.maxHp) * 100}%` }}
              className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          </div>
          <p className="text-[10px] opacity-40">{activeEnemy.hp} / {activeEnemy.maxHp}</p>
        </motion.div>

        {/* プレイヤー */}
        <motion.div animate={isShaking.player ? { x: [-10,10,-10,10,0] } : {}} className="flex flex-col items-center gap-2">
          <div className="w-44 h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-white/10">
            <motion.div animate={{ width: `${(activePlayer.hp / activePlayer.maxHp) * 100}%` }}
              className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
          <p className="text-[10px] opacity-40">{activePlayer.hp} / {activePlayer.maxHp}</p>

          <div className="relative">
            {/* ゴリョ形態バッジ */}
            {isGoryo(activePlayer) && (
              <div className={`absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-neutral-900
                ${playerForm === 3 ? 'bg-purple-500' : 'bg-orange-500'}`}>
                {playerForm === 3 ? '🦈' : `F${playerForm}`}
              </div>
            )}

            {/* ステータスアイコン群 */}
            <div className="absolute -top-2 -left-2 z-10 flex flex-col gap-1">
              {gameState.playerDodgeActive    && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[9px]">💧</div>}
              {gameState.criticalMomentActive && <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-[9px]">⚡</div>}
              {gameState.playerShield > 0     && <div className="w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-[9px] font-bold">{gameState.playerShield}</div>}
              {gameState.tailGatlingActive    && <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-[9px]">{gameState.tailGatlingTurn}/3</div>}
              {gameState.playerDamageHalf     && <div className="w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center text-[9px]">½</div>}
              {gameState.playerDamageNullify  && <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center text-[9px]">無</div>}
              {gameState.bonsaiMineActive     && <div className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-[9px]">💣{gameState.bonsaiMineTurnsLeft}</div>}
              {gameState.bonsaiSekkenCharging && <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[9px]">⚔</div>}
              {gameState.bonsaiRootActive     && <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-[9px]">🌿{gameState.bonsaiRootTurnsLeft}</div>}
              {gameState.bonsaiNextAttackDouble&&<div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-[9px]">×2</div>}
              {gameState.playerStunTurns > 0    && <div className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center text-[9px]">💀{gameState.playerStunTurns}</div>}
              {gameState.ketchupBarrierActive  && <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[9px]">🍅{gameState.ketchupBarrierTurnsLeft}</div>}
              {gameState.saltDebuffActive      && <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-[9px]">🧂{gameState.saltDebuffTurnsLeft}</div>}
              {gameState.burgerOrderActive     && <div className="w-6 h-6 bg-yellow-700 rounded-full flex items-center justify-center text-[9px]">🍔</div>}
              {gameState.saitoSSRActive        && <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[9px]">✨</div>}
              {gameState.saitoBorrowActive     && <div className="w-6 h-6 bg-red-900 rounded-full flex items-center justify-center text-[9px]">💸{gameState.saitoBorrowTurnsLeft}</div>}
              {gameState.copyPasteActive           && <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[9px]">🔄</div>}
              {gameState.earthquakeProofActive     && <div className="w-6 h-6 bg-orange-700 rounded-full flex items-center justify-center text-[9px]">🏗</div>}
              {gameState.enemyBugCount > 0         && <div className="w-6 h-6 bg-indigo-800 rounded-full flex items-center justify-center text-[9px]">🐛{gameState.enemyBugCount}</div>}
              {gameState.buildingFloor > 0         && <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-[9px]">🏢{gameState.buildingFloor}</div>}
              {gameState.tosaAttackKaritateActive  && <div className="w-6 h-6 bg-pink-700 rounded-full flex items-center justify-center text-[9px]">🦊{gameState.tosaAttackKaritateTurnsLeft}</div>}
              {gameState.tosaFreezeActive          && <div className="w-6 h-6 bg-cyan-700 rounded-full flex items-center justify-center text-[9px]">🔒</div>}
              {gameState.tosaDantanActive          && <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-[9px]">📋</div>}
              {gameState.tosaSanpanActive          && <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-[9px]">📈×2</div>}
              {gameState.tosaPlayerKaritateActive  && <div className="w-6 h-6 bg-red-700 rounded-full flex items-center justify-center text-[9px]">💸{gameState.tosaPlayerKaritateTurnsLeft}</div>}
              {gameState.saitoLimitBreakActive     && <div className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center text-[9px]">🌟15</div>}
            </div>

            <div className="w-36 h-36 rounded-full bg-neutral-800 border-4 flex items-center justify-center shadow-2xl overflow-hidden"
              style={{
                borderColor: (activePlayer.color ?? '#22c55e') + '55',
                boxShadow: `0 0 22px 6px ${(activePlayer.color ?? '#22c55e')}33`,
              }}>
              {isGoryo(activePlayer)
                ? <GoryoCanvas ref={playerGoryoRef} size={144} form={playerForm} />
                : <CharacterSprite ref={playerSpriteRef} monsterId={activePlayer.id} size={144} />
              }
            </div>

            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-neutral-800 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
              <p className="text-xs font-bold">{activePlayer.name}</p>
            </div>

            <AnimatePresence>
              {energyGain > 0 && (
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -50 }} exit={{ opacity: 0 }}
                  className="absolute top-0 right-0 text-yellow-400 font-black text-2xl drop-shadow-lg">
                  +{energyGain}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* キャラ固有情報 */}
          <div className="flex gap-3 mt-6 text-[10px] opacity-60">
            {/* タピるん: タピオカストック */}
            {activePlayer.id === 'm2' && (
              <span className="text-purple-400">🧋 タピオカ：{gameState.tapiocaStock}/6</span>
            )}
            {/* ボンザムライ: 光合成スタック */}
            {activePlayer.id === 'm3' && (
              <span className="text-green-400">☀️ 光合成：{gameState.bonsaiPhotoCount}/2</span>
            )}
            {/* ポテトキング: ポテト残量 */}
            {activePlayer.id === 'm5' && (
              <span className="text-yellow-400">🍟 ポテト：{gameState.potatoStock}/10</span>
            )}
            {/* ギャンブラー斎藤: 期待値・ハズレ数 */}
            {activePlayer.id === 'm6' && (
              <>
                <span className="text-amber-400">📊 期待値：{gameState.saitoKitaiChi}/10</span>
                <span className="text-red-400">💔 ハズレ：{gameState.saitoHazureCount}/3</span>
              </>
            )}
            {/* バグマスター: バグ数 */}
            {activePlayer.id === 'm7' && (
              <span className="text-indigo-400">🐛 敵バグ：{gameState.enemyBugCount}/3</span>
            )}
            {/* 工事の鬼: 階層 */}
            {activePlayer.id === 'm8' && (
              <span className="text-orange-400">🏗️ 階層：{gameState.buildingFloor}階</span>
            )}
            {/* トサン・フォックス: 取り立て状況 */}
            {activePlayer.id === 'm9' && (
              <>
                {gameState.tosaAttackKaritateActive && <span className="text-pink-400">🦊 取り立て：{gameState.tosaAttackKaritateTurnsLeft}T</span>}
                {!gameState.tosaAttackKaritateActive && <span className="text-pink-400">🦊 取り立て未発動</span>}
              </>
            )}
            {/* ギャンブラー斎藤: 限界突破表示 */}
            {activePlayer.id === 'm6' && gameState.saitoLimitBreakActive && (
              <span className="text-yellow-300 font-bold">🌟 限界突破！期待値{gameState.saitoKitaiChi}</span>
            )}
            {/* ゴリョ: 進化ゲージ */}
            {isGoryo(activePlayer) && playerForm < 3 && (
              <>
                <span>攻撃 {activePlayer.attacksGiven ?? 0}/2</span>
                <span>被ダメ {activePlayer.attacksReceived ?? 0}/2</span>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* コントロール */}
      <div className="p-3 bg-neutral-800/80 backdrop-blur-xl border-t border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 bg-neutral-900/50 px-3 py-1.5 rounded-full border border-yellow-500/30">
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-base font-black text-yellow-400">{gameState.energy}</span>
          </div>
          <div className="flex-1 ml-3 h-9 overflow-hidden">
            {gameState.logs.map((log, i) => (
              <p key={i} className={`text-[10px] font-medium ${i === 0 ? 'text-white' : 'text-white/25'}`}>{log}</p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {gameState.hand.map((skill, i) => {
            const effectiveCost = getEffectiveCost(skill, activePlayer, activeEnemy, gameState);
            const { locked, reason } = isSkillLocked(skill, gameState);
            const canAfford = gameState.energy >= effectiveCost;
            const isStunned = gameState.playerStunTurns > 0;
            const disabled = !canAfford || locked || isStunned || gameState.turn !== 'player' || !!showResult;
            const costChanged = effectiveCost !== skill.cost;

            return (
              <motion.button key={`${skill.id}-${i}`}
                whileTap={!disabled ? { scale: 0.92 } : {}}
                onClick={() => handleSkill(skill)}
                disabled={disabled}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all
                  ${disabled ? 'bg-neutral-800 border-white/5 opacity-40 grayscale' : 'bg-neutral-700 border-white/10 active:bg-neutral-600'}`}
              >
                {React.createElement(ICON_MAP[skill.icon] || Info, { size: 18 })}
                <span className="text-[9px] font-bold leading-tight px-1 text-center">{skill.name}</span>
                {locked && <span className="text-[8px] text-red-400">{reason}</span>}
                <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-800
                  ${costChanged ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  <span className="text-[9px] font-black text-neutral-900">{effectiveCost}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <button onClick={endTurn}
          disabled={gameState.turn !== 'player' || !!showResult}
          className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-sm disabled:opacity-50">
          {gameState.playerStunTurns > 0 ? `⚡ パスのみ（スタン中）` : 'ターン終了'}
        </button>
      </div>

      {/* 結果オーバーレイ */}
      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5, y: 20 }} animate={{ scale: 1, y: 0 }} className="space-y-6">
              <h2 className={`text-6xl font-black italic uppercase tracking-tighter
                ${showResult === 'win' ? 'text-yellow-400' : 'text-red-500'}`}>
                {showResult === 'win' ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              {showResult === 'win' && (
                <div className="bg-white/10 p-6 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-center gap-3">
                    <Heart size={32} className="text-red-500 fill-red-500" />
                    <span className="text-4xl font-black">+10</span>
                  </div>
                </div>
              )}
              <button onClick={() => onBack({ win: showResult === 'win' })}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest">
                メニューに戻る
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
