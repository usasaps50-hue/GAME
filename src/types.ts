/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SkillType = 'attack' | 'defense' | 'buff' | 'debuff';

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: SkillType;
  value: number;
  icon: string;
}

export interface Skin {
  id: string;
  name: string;
  image: string;
  color: string;
}

export interface Monster {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  energy: number;
  skills: Skill[];
  image: string;
  color: string;
  description: string;
  isEquipped?: boolean;
  equipOrder?: number;
  skins: Skin[];
  activeSkinId: string;
  isWaterType?: boolean;
  // ゴリョ 形態システム
  form?: number;
  attacksGiven?: number;
  attacksReceived?: number;
}

export interface Reward {
  id: string;
  heartThreshold: number;
  name: string;
  description: string;
  isClaimed: boolean;
}

export interface GameState {
  playerTeam: Monster[];
  enemyTeam: Monster[];
  activePlayerIndex: number;
  activeEnemyIndex: number;
  turn: 'player' | 'enemy';
  energy: number;
  hand: Skill[];
  logs: string[];
  hearts: number;
  winStreak: number;

  // ── 汎用 ──────────────────────────────
  playerDodgeActive: boolean;        // 水に入れ！ 次ターン回避
  playerShield: number;              // シールド残量
  criticalMomentActive: boolean;     // 危機一髪 発動中
  playerStunTurns: number;           // スキル使用不可ターン数（フルブレックファスト等）
  playerNoEnergyNextTurn: boolean;   // DEATHパンチ後エナジー回復なし
  enemyDamageDebuff: number;         // 敵の次攻撃ダメージ軽減値（コンセント抜き）

  // ── ゴリョ ────────────────────────────
  tailGatlingActive: boolean;
  tailGatlingTurn: number;

  // ── タピるん ──────────────────────────
  tapiocaStock: number;              // タピオカストック（0〜6）
  playerDamageHalf: boolean;         // 甘すぎる誘惑 次ターンダメージ半減
  playerDamageNullify: boolean;      // もちもちバリア 次ターン1回無効

  // ── ボンザムライ ──────────────────────
  bonsaiMineActive: boolean;         // 松ぼっくり地雷設置中
  bonsaiMineTurnsLeft: number;       // 爆発まで残りターン（プレイヤーターン基準）
  bonsaiNextAttackDouble: boolean;   // 捨て身の剪定 次の攻撃2倍
  bonsaiRootActive: boolean;         // 根を張る 発動中
  bonsaiRootTurnsLeft: number;       // 根を張る 残りターン
  bonsaiPhotoCount: number;          // 光合成スタック数（秘剣解放条件）
  bonsaiGuardThisTurn: boolean;      // 光合成の構え このターン被ダメ-10
  bonsaiBonusEnergyNextTurn: boolean;// 光合成の構え 次ターンエナジー+2
  bonsaiSekkenCharging: boolean;     // 秘剣・大樹断ち チャージ中

  // ── ポテトキング ──────────────────────────
  potatoStock: number;               // ポテト残量（0〜10）初期10
  saltDebuffActive: boolean;         // しおかけ 発動中
  saltDebuffTurnsLeft: number;       // しおかけ 残りターン
  ketchupBarrierActive: boolean;     // ケチャップバリア 発動中（被ダメ10%減）
  ketchupBarrierTurnsLeft: number;   // ケチャップバリア 残りターン
  burgerOrderActive: boolean;        // バーガーお急ぎ注文（次ターン被ダメの2/3を回復）

  // ── ギャンブラー斎藤 ──────────────────────
  saitoKitaiChi: number;             // 期待値（0〜10）
  saitoHazureCount: number;          // ハズレを引いた回数
  saitoBorrowActive: boolean;        // 借金 発動中
  saitoBorrowTurnsLeft: number;      // 借金 残りターン（0でエナジー&期待値→0）
  saitoSSRActive: boolean;           // SSR確定演出（次の攻撃が最大ダメージ）

  // ── ハッカー系 ────────────────────────────
  enemyBugCount: number;             // プレイヤーのハッカーが敵に付与したバグ数
  copyPasteActive: boolean;          // コピペ発動中（次ターン受けたダメージを反射）

  // ── 建設系 ────────────────────────────────
  buildingFloor: number;             // 階層（0〜）
  earthquakeProofActive: boolean;    // 耐震偽装 発動中（次ターン被ダメ0、50%で階層半減）

  // ── CPU / 敵ターン制御 ────────────────────
  enemyEnergy: number;               // 敵のエナジー
  enemyHand: Skill[];                // 敵の手札（4枚）
  cpuTapiocaStock: number;           // CPU タピるん用タピオカ
  cpuPotatoStock: number;            // CPU ポテトキング用ポテト（初期10）
  cpuKitaiChi: number;               // CPU ギャンブラー斎藤 期待値
  cpuHazureCount: number;            // CPU ギャンブラー斎藤 ハズレ数
  cpuBugCount: number;               // CPU ハッカーがプレイヤーに付与したバグ数
  cpuBuildingFloor: number;          // CPU 建設系の階層

  // ── ギャンブラー斎藤 限界突破 ────────────────
  saitoLimitBreakActive: boolean;    // 限界突破モード（押し貸しで期待値15）

  // ── トサン・フォックス 取り立てシステム ─────
  tosaAttackKaritateActive: boolean;    // 敵への取り立てデバフ発動中
  tosaAttackKaritateTurnsLeft: number;  // 取り立て残りターン（敵側）
  tosaAttackKaritateDouble: boolean;    // 利子倍プッシュ（取り立てダメ2倍）
  tosaFreezeActive: boolean;            // 口座凍結（次ターン高コスト封印）
  tosaDantanActive: boolean;            // 担保没収（次の敵回復を反転→ダメージ）
  tosaSanpanActive: boolean;            // 自己破産バフ（期待値UP効果2倍）
  tosaPlayerKaritateActive: boolean;    // プレイヤーが取り立てデバフ中（CPU付与）
  tosaPlayerKaritateTurnsLeft: number;  // 取り立て残りターン（プレイヤー側）
}

export interface Stage {
  id: string;
  name: string;
  difficulty: number;
  enemyId: string;
  reward: string;
  completions: number;
}
