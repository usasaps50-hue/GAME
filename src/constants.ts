/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Monster, Skill, Stage, Reward } from './types';

export const SKILLS: Skill[] = [
  // ── 汎用（旧スキル・敵用） ───────────────────────────────────────────
  { id: 's1', name: 'フレイムストライク',   description: '敵に15ダメージを与える強力な炎の攻撃。',           cost: 2, type: 'attack',  value: 15, icon: 'Flame'    },
  { id: 's2', name: 'アイアンガード',       description: '受けるダメージを軽減する10のシールドを展開。',     cost: 1, type: 'defense', value: 10, icon: 'Shield'   },
  { id: 's3', name: 'パワーアップ',         description: '次の攻撃の威力を5増加させる。',                    cost: 2, type: 'buff',    value: 5,  icon: 'Zap'      },
  { id: 's4', name: 'クイックバイト',       description: '素早い動きで8ダメージを与える。',                  cost: 1, type: 'attack',  value: 8,  icon: 'Sword'    },
  { id: 's5', name: 'ヒールミスト',         description: '味方のHPを12回復させる癒やしの霧。',               cost: 3, type: 'buff',    value: 12, icon: 'Heart'    },
  { id: 's6', name: 'ポイズンクラウド',     description: '次のターン、敵のHPを5減少させる毒の雲。',          cost: 2, type: 'debuff',  value: 5,  icon: 'Skull'    },
  { id: 's7', name: 'アクアブラスト',       description: '激しい水流で20ダメージを与える。',                 cost: 3, type: 'attack',  value: 20, icon: 'Droplets' },
  { id: 's8', name: 'ストーンウォール',     description: '強固な岩壁で15のシールドを展開。',                 cost: 2, type: 'defense', value: 15, icon: 'Mountain' },

  // ── ゴリョ専用 ──────────────────────────────────────────────────────
  { id: 's9',  name: '水に入れ！',          description: '次のターン敵の攻撃が当たらない。形態3ではコスト2。',              cost: 3,  type: 'defense', value: 0,  icon: 'Droplets' },
  { id: 's10', name: '食欲旺盛',            description: '30ダメージ(コスト8)。相手が水系なら60ダメージ(コスト6)。',       cost: 8,  type: 'attack',  value: 30, icon: 'Fish'     },
  { id: 's11', name: 'テールマシンガン',    description: '3ターン連続攻撃。5→10→10の合計25ダメージ。',                    cost: 6,  type: 'attack',  value: 25, icon: 'Zap'      },
  { id: 's12', name: '危機一髪',            description: '次のターン必ずHP1で生存＋シールド20獲得。',                       cost: 6,  type: 'defense', value: 20, icon: 'Shield'   },
  { id: 's13', name: '弱肉強食',            description: 'HPを16回復する。',                                               cost: 3,  type: 'buff',    value: 16, icon: 'Heart'    },
  { id: 's14', name: 'DEATHパンチ',         description: '42ダメージ。次のターン行動・エネルギー回復不可。',                cost: 10, type: 'attack',  value: 42, icon: 'Skull'    },

  // ── ポチっとな専用 ──────────────────────────────────────────────────
  { id: 's15', name: '焼きたてタックル',           description: '15ダメージ。シンプルな基本攻撃。',                                   cost: 2, type: 'attack',  value: 15, icon: 'Flame'  },
  { id: 's16', name: 'トースト連続発射',           description: '10ダメージのトーストを2枚飛ばす。合計20ダメージ。',                   cost: 4, type: 'attack',  value: 20, icon: 'Zap'    },
  { id: 's17', name: 'コンセント抜き',             description: '相手の次のターンのエナジー回復を1減らす。',                           cost: 3, type: 'debuff',  value: 1,  icon: 'Skull'  },
  { id: 's18', name: 'パンくず補給',               description: '自分のHPを20回復する。',                                             cost: 3, type: 'buff',    value: 20, icon: 'Heart'  },
  { id: 's19', name: '黒焦げオーバーヒート',       description: '45ダメージ。ただし自分も10の反動ダメージを受ける。',                  cost: 6, type: 'attack',  value: 45, icon: 'Flame'  },
  { id: 's20', name: '限界突破フルブレックファスト', description: '60ダメージ＋自分HP15回復。使用後2ターンは技が出せなくなる。',       cost: 9, type: 'attack',  value: 60, icon: 'Zap'    },

  // ── タピるん専用 ────────────────────────────────────────────────────
  { id: 's21', name: 'タピオカ生成',          description: 'タピオカをランダムで1〜3つストックする（MAX6）。',                     cost: 2,  type: 'buff',    value: 3,  icon: 'Droplets' },
  { id: 's22', name: 'プチプチ弾',            description: 'タピオカを最大3つ消費。1つにつき12ダメージ（最大36）。',                cost: 4,  type: 'attack',  value: 12, icon: 'Zap'      },
  { id: 's23', name: '甘すぎる誘惑',          description: '次のターン、受けるダメージを半分にする。',                              cost: 3,  type: 'defense', value: 0,  icon: 'Shield'   },
  { id: 's24', name: 'ストロー吸引',          description: '15ダメージを与え、与えた分だけ自分のHPを回復する。',                    cost: 4,  type: 'attack',  value: 15, icon: 'Heart'    },
  { id: 's25', name: 'もちもちバリア',        description: '次のターン、受けるダメージを1回だけ完全無効にする。',                    cost: 5,  type: 'defense', value: 0,  icon: 'Shield'   },
  { id: 's26', name: '窒息タピオカラッシュ',  description: '全タピオカ消費、1つにつき15ダメージ（最大90）。使用後エナジーが0になる。', cost: 10, type: 'attack',  value: 15, icon: 'Skull'    },

  // ── ボンザムライ専用 ────────────────────────────────────────────────
  { id: 's27', name: '居合・小枝斬り',     description: '20ダメージ。鋭い居合の一閃。',                                                                 cost: 3, type: 'attack',  value: 20, icon: 'Sword'  },
  { id: 's28', name: '光合成の構え',       description: 'このターン被ダメ-10。次ターン開始時エナジー+2。秘剣の解放条件。',                              cost: 2, type: 'defense', value: 10, icon: 'Shield' },
  { id: 's29', name: '松ぼっくり地雷',    description: '盤面に設置。2ターン後のターン終了時に相手に35ダメージ。連続設置不可。',                        cost: 5, type: 'debuff',  value: 35, icon: 'Skull'  },
  { id: 's30', name: '捨て身の剪定',      description: '自分のHPを20減らし、次に使う攻撃技の威力を2倍にする。',                                        cost: 3, type: 'buff',    value: 20, icon: 'Zap'    },
  { id: 's31', name: '根を張る',          description: '3ターンの間、毎ターンHP+10回復。その間は他の技のコストが+1される。',                           cost: 4, type: 'buff',    value: 10, icon: 'Heart'  },
  { id: 's32', name: '秘剣・大樹断ち',    description: '光合成2回スタック後に使用可。1ターン後に50ダメ（HP半分以下なら80）。使用後スタックリセット。', cost: 10, type: 'attack',  value: 50, icon: 'Sword'  },

  // ── ポテトキング専用 ────────────────────────────────────────────────
  { id: 's33', name: 'ポテト投げ',              description: 'ポテト最大5本投げる。1本5ダメ（最大25）。ポテト5本消費。',                                  cost: 6,  type: 'attack',  value: 5,  icon: 'Zap'    },
  { id: 's34', name: 'しおかけ',               description: '4ターンの間、敵のエネルギー回復を1減らす。重ねがけ不可。',                                  cost: 5,  type: 'debuff',  value: 4,  icon: 'Skull'  },
  { id: 's35', name: 'ケチャップバリア',        description: '3ターンの間、受けるダメージを10%減少。重ねがけ不可。',                                      cost: 5,  type: 'defense', value: 3,  icon: 'Shield' },
  { id: 's36', name: 'バーガーお急ぎ注文',      description: '次のターンに受けたダメージの2/3を回復。ダメージを受けなければ不発。',                       cost: 3,  type: 'buff',    value: 0,  icon: 'Heart'  },
  { id: 's37', name: 'ポテト追加注文',          description: 'ポテトを5本補充（MAX10）。',                                                               cost: 5,  type: 'buff',    value: 5,  icon: 'Heart'  },
  { id: 's38', name: 'ポテトLサイズご注文',     description: '残りポテト全部＋5本を投げる。1本4ダメ（最大60）。全ポテト消費。',                           cost: 9,  type: 'attack',  value: 4,  icon: 'Flame'  },

  // ── ギャンブラー斎藤専用 ────────────────────────────────────────────
  { id: 's39', name: '単発ガチャ投げ',       description: '10・20・30のどれかのダメージ。期待値8以上でハズレなし。',                                      cost: 2,  type: 'attack',  value: 30, icon: 'Zap'    },
  { id: 's40', name: 'ラッキー！',            description: '0コスト。1〜3エナジー獲得＋期待値1〜8アップ。限界突破の可能性あり。',                             cost: 0,  type: 'buff',    value: 0,  icon: 'Zap'    },
  { id: 's41', name: '借金',                description: 'エナジーと期待値を即座にMAX（10）にする。3ターン後に両方が強制的に0になる。',                   cost: 4,  type: 'buff',    value: 10, icon: 'Skull'  },
  { id: 's42', name: 'SSR確定演出',          description: '次の攻撃技が必ず最大ダメージになる。',                                                         cost: 4,  type: 'buff',    value: 0,  icon: 'Shield' },
  { id: 's43', name: 'やけ酒',              description: 'HP10〜40回復（期待値が高いほど回復増）。期待値を1〜2増やす。',                                   cost: 8,  type: 'buff',    value: 40, icon: 'Heart'  },
  { id: 's44', name: 'クライマックス！！！', description: '【条件】ハズレ3回以上＆期待値8以上。相手の残りHPの2/3をダメージ。発動後：期待値→4、ハズレ数リセット。限界突破中は条件不要・コスト0・3/4ダメージ。', cost: 3,  type: 'attack',  value: 0,  icon: 'Flame'  },

  // ── バグマスター専用 ────────────────────────────────────────────────
  { id: 's45', name: 'スパム送信',        description: '10ダメージ＋敵にバグ×1付与。バグが3以上でブルースクリーンが使える。',           cost: 2, type: 'attack',  value: 10, icon: 'Skull'    },
  { id: 's46', name: '重い処理',          description: '敵のエナジー回復を次ターン1にする＋バグ×1付与。',                               cost: 4, type: 'debuff',  value: 1,  icon: 'Zap'      },
  { id: 's47', name: 'パスワードクラック', description: '敵の手札1枚のコストをこのターン99にする（実質封印）。',                         cost: 5, type: 'debuff',  value: 0,  icon: 'Shield'   },
  { id: 's48', name: 'コピペ',            description: '次のターン敵から受けたダメージをそのまま敵に反射する。',                          cost: 4, type: 'buff',    value: 0,  icon: 'Sword'    },
  { id: 's49', name: 'ランサムウェア',    description: '15ダメージ＋HP15吸収。さらに敵のエナジーを2奪う。',                              cost: 5, type: 'attack',  value: 15, icon: 'Heart'    },
  { id: 's50', name: 'ブルースクリーン',  description: '【条件】敵のバグ3以上。70ダメージ。発動後バグリセット。',                        cost: 7, type: 'attack',  value: 70, icon: 'Skull'    },

  // ── トサン・フォックス専用 ──────────────────────────────────────────
  { id: 's57', name: '小銭投げ',          description: '10ダメージ。敵がギャンブラー斎藤なら期待値+2・エナジー+2も付与。',                               cost: 2,  type: 'attack',  value: 10, icon: 'Zap'      },
  { id: 's58', name: '押し貸し',          description: '敵エナジーをMAXにし、3ターン毎ターン15ダメージの取り立てデバフを付与。敵がギャンブラー斎藤なら期待値→15（限界突破）。', cost: 3,  type: 'debuff',  value: 15, icon: 'Skull'    },
  { id: 's59', name: '担保没収',          description: '次に敵が回復した量をそのままダメージに変換する。期待値-3。',                                      cost: 4,  type: 'debuff',  value: 0,  icon: 'Shield'   },
  { id: 's60', name: '口座凍結',          description: '次のターン敵はコスト4以上の技を使えなくなる。期待値-3。ギャンブラー斎藤は借金不可。',            cost: 5,  type: 'debuff',  value: 0,  icon: 'Shield'   },
  { id: 's61', name: '利子倍プッシュ',    description: '取り立てデバフのダメージを2倍にする。期待値-2。',                                               cost: 4,  type: 'buff',    value: 0,  icon: 'Sword'    },
  { id: 's62', name: '自己破産手続き',    description: '敵エナジー→0・敵HP半分。自分のエナジーも0に。期待値→0。以降期待値UPの効果が2倍になる。',        cost: 9,  type: 'attack',  value: 0,  icon: 'Flame'    },

  // ── 工事の鬼専用 ────────────────────────────────────────────────────
  { id: 's51', name: '資材ぶん投げ',      description: '15ダメージ。現場から資材を投げつける基本攻撃。',                                  cost: 2, type: 'attack',  value: 15, icon: 'Sword'    },
  { id: 's52', name: '突貫工事',          description: '階層+3、自分HP-10。無理やり3階分建てる。',                                       cost: 3, type: 'buff',    value: 3,  icon: 'Zap'      },
  { id: 's53', name: '耐震偽装',          description: '次のターン被ダメが0になる。ただし50%の確率で階層が半減する。',                    cost: 4, type: 'defense', value: 0,  icon: 'Shield'   },
  { id: 's54', name: '家賃収入',          description: '階層×5のHPを回復する。階層が高いほど回復量大。',                                  cost: 4, type: 'buff',    value: 5,  icon: 'Heart'    },
  { id: 's55', name: '屋上からの絶景',    description: '【条件】階層5以上。敵のエナジーを0にする。',                                      cost: 6, type: 'debuff',  value: 0,  icon: 'Mountain' },
  { id: 's56', name: 'ビルヂング大崩落',  description: '階層×15ダメージ（最大150）＋自分に30ダメージ。使用後階層→0。',                   cost: 9, type: 'attack',  value: 15, icon: 'Flame'    },
];

export const MONSTERS: Monster[] = [
  // ── 初期キャラ1：ポチっとな ─────────────────────────────────────────
  {
    id: 'm1',
    name: 'ポチっとな',
    maxHp: 120,
    hp: 120,
    energy: 3,
    skills: [SKILLS[14], SKILLS[15], SKILLS[16], SKILLS[17], SKILLS[18], SKILLS[19]],
    image: 'Flame',
    color: '#f59e0b',
    description: '背中にトーストスロットを持つコーギー型家電ロボット。自己犠牲と高火力のオーバーヒートアタッカー。',
    isEquipped: true,
    equipOrder: 0,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Flame', color: '#f59e0b' }],
  },

  // ── 初期キャラ2：タピるん ───────────────────────────────────────────
  {
    id: 'm2',
    name: 'タピるん',
    maxHp: 105,
    hp: 105,
    energy: 3,
    skills: [SKILLS[20], SKILLS[21], SKILLS[22], SKILLS[23], SKILLS[24], SKILLS[25]],
    image: 'Droplets',
    color: '#a78bfa',
    description: '巨大プラカップに入った透明スライム。極太ストローが刺さっている。タピオカ管理と妨害のエキスパート。',
    isEquipped: true,
    equipOrder: 1,
    activeSkinId: 'default',
    isWaterType: true,
    skins: [{ id: 'default', name: 'デフォルト', image: 'Droplets', color: '#a78bfa' }],
  },

  // ── 初期キャラ3：ボンザムライ ───────────────────────────────────────
  {
    id: 'm3',
    name: 'ボンザムライ',
    maxHp: 135,
    hp: 135,
    energy: 3,
    skills: [SKILLS[26], SKILLS[27], SKILLS[28], SKILLS[29], SKILLS[30], SKILLS[31]],
    image: 'Mountain',
    color: '#22c55e',
    description: 'ひび割れた植木鉢を鎧のように着た小さな侍。頭から立派な松が生えている。仕込みとカウンターのテクニカルディフェンダー。',
    isEquipped: true,
    equipOrder: 2,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Mountain', color: '#22c55e' }],
  },

  // ── アンロックキャラ：ポテトキング ─────────────────────────────────
  {
    id: 'm5',
    name: 'ポテトキング',
    maxHp: 115,
    hp: 115,
    energy: 3,
    skills: [SKILLS[32], SKILLS[33], SKILLS[34], SKILLS[35], SKILLS[36], SKILLS[37]],
    image: 'Flame',
    color: '#eab308',
    description: 'フライドポテトの見た目の王様。ポテト残量を管理しながら戦う戦略家。ポテトが尽きると窮地に陥る。',
    isEquipped: false,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Flame', color: '#eab308' }],
  },

  // ── アンロックキャラ：ギャンブラー斎藤 ─────────────────────────────
  {
    id: 'm6',
    name: 'ギャンブラー斎藤',
    maxHp: 100,
    hp: 100,
    energy: 3,
    skills: [SKILLS[38], SKILLS[39], SKILLS[40], SKILLS[41], SKILLS[42], SKILLS[43]],
    image: 'Zap',
    color: '#f59e0b',
    description: '期待値を操るギャンブラー。ハズレを重ねてクライマックスを狙え。借金でリスクを取る高火力キャラ。',
    isEquipped: false,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Zap', color: '#f59e0b' }],
  },

  // ── アンロックキャラ：ゴリョ ────────────────────────────────────────
  {
    id: 'm4',
    name: 'ゴリョ',
    maxHp: 130,
    hp: 130,
    energy: 3,
    skills: [SKILLS[8], SKILLS[9], SKILLS[10], SKILLS[11], SKILLS[12], SKILLS[13]],
    image: 'Fish',
    color: '#f97316',
    description: '金魚の頭とゴリラの体を持つ謎の生物。3段階に進化し、最終形態ではサメの頭に変貌する。',
    isEquipped: false,
    activeSkinId: 'default',
    isWaterType: false,
    form: 1,
    attacksGiven: 0,
    attacksReceived: 0,
    skins: [{ id: 'default', name: 'デフォルト', image: 'Fish', color: '#f97316' }],
  },

  // ── アンロックキャラ：バグマスター ─────────────────────────────────
  {
    id: 'm7',
    name: 'バグマスター',
    maxHp: 110,
    hp: 110,
    energy: 3,
    skills: [SKILLS[44], SKILLS[45], SKILLS[46], SKILLS[47], SKILLS[48], SKILLS[49]],
    image: 'Skull',
    color: '#6366f1',
    description: 'ネットの闇から現れた謎のハッカー。敵にバグを蓄積させブルースクリーンで一気に叩き落とす妨害のスペシャリスト。',
    isEquipped: false,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Skull', color: '#6366f1' }],
  },

  // ── アンロックキャラ：トサン・フォックス ───────────────────────────
  {
    id: 'm9',
    name: 'トサン・フォックス',
    maxHp: 105,
    hp: 105,
    energy: 3,
    skills: [SKILLS[50], SKILLS[51], SKILLS[52], SKILLS[53], SKILLS[54], SKILLS[55]],
    image: 'Skull',
    color: '#ec4899',
    description: '悪徳闇金業者のキツネ。押し貸しで相手を借金地獄に追い込む取り立てのスペシャリスト。ギャンブラー斎藤の天敵。',
    isEquipped: false,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Skull', color: '#ec4899' }],
  },

  // ── アンロックキャラ：工事の鬼 ─────────────────────────────────────
  {
    id: 'm8',
    name: '工事の鬼',
    maxHp: 140,
    hp: 140,
    energy: 3,
    skills: [SKILLS[56], SKILLS[57], SKILLS[58], SKILLS[59], SKILLS[60], SKILLS[61]],
    image: 'Mountain',
    color: '#f97316',
    description: '現場叩き上げの鬼監督。階層を積み上げてビルを建て、大崩落で相手を巻き込む大器晩成型アタッカー。',
    isEquipped: false,
    activeSkinId: 'default',
    skins: [{ id: 'default', name: 'デフォルト', image: 'Mountain', color: '#f97316' }],
  },
];

export const INITIAL_REWARDS: Reward[] = [
  { id: 'r1', heartThreshold: 50,  name: 'スターターパック', description: '500ゴールド獲得',         isClaimed: false },
  { id: 'r2', heartThreshold: 100, name: 'レアスキン',       description: 'ポチっとなの限定スキン', isClaimed: false },
  { id: 'r3', heartThreshold: 200, name: 'メガボックス',     description: 'ゴリョをアンロック',      isClaimed: false },
];

export const STAGES: Stage[] = Array.from({ length: 50 }, (_, i) => ({
  id: `st${i + 1}`,
  name: `砂漠のコース ${i + 1}`,
  difficulty: Math.floor(i / 10) + 1,
  enemyId: MONSTERS[i % MONSTERS.length].id,
  reward: i === 2 ? 'ゴリョをアンロック' : `${(i + 1) * 100} ゴールド`,
  completions: 0,
}));
