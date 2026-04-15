/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';

// ─── アニメーション CSS インジェクション ─────────────────────────────────────
const CSS = `
@keyframes cs-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}
@keyframes cs-attack-player {
  0%   { transform: translateY(0) translateX(0) scale(1); }
  30%  { transform: translateY(-18px) translateX(22px) scale(1.12); }
  55%  { transform: translateY(-8px) translateX(50px) scale(1.08); }
  70%  { transform: translateY(0) translateX(18px) scale(1); }
  100% { transform: translateY(0) translateX(0) scale(1); }
}
@keyframes cs-attack-enemy {
  0%   { transform: scaleX(-1) translateY(0) translateX(0) scale(1); }
  30%  { transform: scaleX(-1) translateY(18px) translateX(22px) scale(1.12); }
  55%  { transform: scaleX(-1) translateY(8px) translateX(50px) scale(1.08); }
  70%  { transform: scaleX(-1) translateY(0) translateX(18px) scale(1); }
  100% { transform: scaleX(-1) translateY(0) translateX(0) scale(1); }
}
@keyframes cs-damage {
  0%,100% { transform: translateX(0); filter: brightness(1); }
  15%     { transform: translateX(-8px); filter: brightness(2) sepia(1) saturate(5) hue-rotate(-10deg); }
  30%     { transform: translateX(8px);  filter: brightness(2) sepia(1) saturate(5) hue-rotate(-10deg); }
  45%     { transform: translateX(-6px); filter: brightness(1.5) sepia(1) saturate(4) hue-rotate(-10deg); }
  60%     { transform: translateX(6px);  filter: brightness(1.3); }
  80%     { transform: translateX(-3px); filter: brightness(1.1); }
}
@keyframes cs-damage-enemy {
  0%,100% { transform: scaleX(-1) translateX(0); filter: brightness(1); }
  15%     { transform: scaleX(-1) translateX(-8px); filter: brightness(2) sepia(1) saturate(5) hue-rotate(-10deg); }
  30%     { transform: scaleX(-1) translateX(8px);  filter: brightness(2) sepia(1) saturate(5) hue-rotate(-10deg); }
  45%     { transform: scaleX(-1) translateX(-6px); filter: brightness(1.5) sepia(1) saturate(4) hue-rotate(-10deg); }
  60%     { transform: scaleX(-1) translateX(6px);  filter: brightness(1.3); }
  80%     { transform: scaleX(-1) translateX(-3px); filter: brightness(1.1); }
}
@keyframes cs-skill {
  0%   { transform: scale(1);    filter: brightness(1); }
  25%  { transform: scale(1.18); filter: brightness(1.6) saturate(1.8); }
  50%  { transform: scale(1.1);  filter: brightness(1.9) saturate(2.2); }
  75%  { transform: scale(1.14); filter: brightness(1.5) saturate(1.6); }
  100% { transform: scale(1);    filter: brightness(1); }
}
@keyframes cs-skill-enemy {
  0%   { transform: scaleX(-1) scale(1);    filter: brightness(1); }
  25%  { transform: scaleX(-1) scale(1.18); filter: brightness(1.6) saturate(1.8); }
  50%  { transform: scaleX(-1) scale(1.1);  filter: brightness(1.9) saturate(2.2); }
  75%  { transform: scaleX(-1) scale(1.14); filter: brightness(1.5) saturate(1.6); }
  100% { transform: scaleX(-1) scale(1);    filter: brightness(1); }
}

/* ── キャラ固有アイドルアニメ ───────────────────────────────────────────── */
/* m1 (ポチっとな) tail wag: tail shape group (unused in SVG directly, target g) */
@keyframes cs-m1-ear {
  0%,100% { transform: rotate(0deg); transform-origin: 50% 100%; }
  30%     { transform: rotate(-8deg); transform-origin: 50% 100%; }
  60%     { transform: rotate(5deg);  transform-origin: 50% 100%; }
}
/* m2 (タピるん) gentle pulse/wobble */
@keyframes cs-m2-blob {
  0%,100% { transform: scaleX(1) scaleY(1); }
  40%     { transform: scaleX(1.05) scaleY(0.96); }
  70%     { transform: scaleX(0.97) scaleY(1.04); }
}
/* m3 (ボンザムライ) sway */
@keyframes cs-m3-sway {
  0%,100% { transform: rotate(0deg); transform-origin: 50% 90%; }
  35%     { transform: rotate(-3deg); transform-origin: 50% 90%; }
  65%     { transform: rotate(2.5deg); transform-origin: 50% 90%; }
}
/* m5 (ポテトキング) crown bob */
@keyframes cs-m5-crown {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-3px); }
}
/* m6 (ギャンブラー斎藤) card fan rotate */
@keyframes cs-m6-card {
  0%,100% { transform: rotate(0deg); }
  40%     { transform: rotate(8deg); }
  70%     { transform: rotate(-4deg); }
}
/* m7 (バグマスター) screen flicker */
@keyframes cs-m7-screen {
  0%,90%,100% { opacity: 1; }
  92%          { opacity: 0.4; }
  94%          { opacity: 1; }
  96%          { opacity: 0.2; }
  98%          { opacity: 0.9; }
}
/* m8 (工事の鬼) wrench swing */
@keyframes cs-m8-wrench {
  0%,100% { transform: rotate(0deg); transform-origin: 82px 62px; }
  40%     { transform: rotate(-25deg); transform-origin: 82px 62px; }
  70%     { transform: rotate(10deg); transform-origin: 82px 62px; }
}
/* m9 (トサン・フォックス) tail wag */
@keyframes cs-m9-tail {
  0%,100% { transform: rotate(0deg); transform-origin: 72px 70px; }
  35%     { transform: rotate(-12deg); transform-origin: 72px 70px; }
  65%     { transform: rotate(8deg);  transform-origin: 72px 70px; }
}
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────
export type CharacterAnimationType = 'IDLE' | 'ATTACK' | 'DAMAGE' | 'SKILL';

export interface CharacterSpriteRef {
  playAnimation: (anim: CharacterAnimationType) => void;
}

interface CharacterSpriteProps {
  monsterId: string;
  size?: number;
  flipped?: boolean;
  form?: number;
  className?: string;
}

// ─── m1: ポチっとな (Orange corgi toaster robot) ──────────────────────────────
function SpriteM1({ idle }: { idle: boolean }) {
  return (
    <g style={idle ? { animation: 'cs-m2-blob 2.8s ease-in-out infinite' } : undefined}>
      {/* Toaster body */}
      <rect x="20" y="38" width="60" height="42" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
      {/* Toast slots */}
      <rect x="28" y="22" width="14" height="22" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      <rect x="46" y="18" width="14" height="26" rx="3" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      <rect x="64" y="24" width="12" height="20" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      {/* Toast crust tops */}
      <rect x="28" y="20" width="14" height="5" rx="2" fill="#d97706" />
      <rect x="46" y="16" width="14" height="5" rx="2" fill="#d97706" />
      <rect x="64" y="22" width="12" height="5" rx="2" fill="#d97706" />
      {/* Corgi head */}
      <ellipse cx="50" cy="36" rx="22" ry="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
      {/* Ears with wag animation */}
      <g style={idle ? { animation: 'cs-m1-ear 1.8s ease-in-out infinite' } : undefined}>
        <polygon points="30,22 22,8 38,14" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        <polygon points="70,22 78,8 62,14" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        <polygon points="30,20 25,12 36,16" fill="#fcd5a0" />
        <polygon points="70,20 75,12 64,16" fill="#fcd5a0" />
      </g>
      {/* Face */}
      <circle cx="41" cy="33" r="6" fill="white" />
      <circle cx="59" cy="33" r="6" fill="white" />
      <circle cx="42" cy="34" r="3.5" fill="#1a1a1a" />
      <circle cx="60" cy="34" r="3.5" fill="#1a1a1a" />
      <circle cx="43.5" cy="32.5" r="1.2" fill="white" />
      <circle cx="61.5" cy="32.5" r="1.2" fill="white" />
      {/* Nose */}
      <ellipse cx="50" cy="42" rx="4" ry="2.5" fill="#7c3a00" />
      {/* Mouth */}
      <path d="M46 45 Q50 49 54 45" stroke="#7c3a00" strokeWidth="1.5" fill="none" />
      {/* Cheek blush */}
      <ellipse cx="35" cy="40" rx="5" ry="3" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="65" cy="40" rx="5" ry="3" fill="#fca5a5" opacity="0.5" />
      {/* Stubby legs */}
      <rect x="24" y="78" width="14" height="14" rx="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      <rect x="62" y="78" width="14" height="14" rx="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      {/* Toaster slots on body */}
      <rect x="28" y="48" width="18" height="5" rx="2" fill="#d97706" opacity="0.5" />
      <rect x="54" y="48" width="18" height="5" rx="2" fill="#d97706" opacity="0.5" />
      {/* Power button */}
      <circle cx="50" cy="64" r="4" fill="#d97706" />
      <circle cx="50" cy="64" r="2.5" fill="#fbbf24" />
    </g>
  );
}

// ─── m2: タピるん (Bubble tea slime) ──────────────────────────────────────────
function SpriteM2({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Cup body */}
      <path d="M18 40 L25 88 L75 88 L82 40 Z" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="2" opacity="0.85" />
      <rect x="16" y="36" width="68" height="8" rx="4" fill="#ddd6fe" stroke="#7c3aed" strokeWidth="2" />
      {/* Slime blob body with wobble */}
      <g style={idle ? { animation: 'cs-m2-blob 2.2s ease-in-out infinite' } : undefined}>
        <ellipse cx="50" cy="35" rx="26" ry="20" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" />
        <ellipse cx="26" cy="44" rx="5" ry="7" fill="#a78bfa" />
        <ellipse cx="74" cy="44" rx="5" ry="7" fill="#a78bfa" />
        {/* Big cute eyes */}
        <circle cx="41" cy="31" r="8" fill="white" />
        <circle cx="59" cy="31" r="8" fill="white" />
        <circle cx="42" cy="32" r="4.5" fill="#1a1a1a" />
        <circle cx="60" cy="32" r="4.5" fill="#1a1a1a" />
        <circle cx="44" cy="30" r="1.8" fill="white" />
        <circle cx="62" cy="30" r="1.8" fill="white" />
        {/* Rosy cheeks */}
        <ellipse cx="33" cy="38" rx="5" ry="3" fill="#f9a8d4" opacity="0.6" />
        <ellipse cx="67" cy="38" rx="5" ry="3" fill="#f9a8d4" opacity="0.6" />
        {/* Happy mouth */}
        <path d="M44 40 Q50 46 56 40" stroke="#7c3aed" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* Tapioca pearls */}
      <circle cx="33" cy="74" r="6" fill="#1a0a2e" />
      <circle cx="47" cy="70" r="6" fill="#1a0a2e" />
      <circle cx="62" cy="74" r="6" fill="#1a0a2e" />
      <circle cx="40" cy="82" r="5" fill="#1a0a2e" />
      <circle cx="57" cy="81" r="5" fill="#1a0a2e" />
      <circle cx="35" cy="72" r="1.5" fill="#6d28d9" opacity="0.5" />
      <circle cx="49" cy="68" r="1.5" fill="#6d28d9" opacity="0.5" />
      <circle cx="64" cy="72" r="1.5" fill="#6d28d9" opacity="0.5" />
      {/* Straw */}
      <rect x="68" y="10" width="5" height="60" rx="2.5" fill="#16a34a" />
      <ellipse cx="70.5" cy="10" rx="2.5" ry="3" fill="#22c55e" />
      {/* Cup shine */}
      <rect x="22" y="48" width="6" height="30" rx="3" fill="white" opacity="0.18" />
    </g>
  );
}

// ─── m3: ボンザムライ (Bonsai samurai) ───────────────────────────────────────
function SpriteM3({ idle }: { idle: boolean }) {
  return (
    <g style={idle ? { animation: 'cs-m3-sway 3s ease-in-out infinite' } : undefined}>
      {/* Pot */}
      <ellipse cx="50" cy="72" rx="26" ry="20" fill="#92400e" stroke="#78350f" strokeWidth="2" />
      <rect x="24" y="56" width="52" height="20" rx="4" fill="#92400e" stroke="#78350f" strokeWidth="2" />
      <rect x="20" y="53" width="60" height="8" rx="4" fill="#78350f" stroke="#57250a" strokeWidth="1.5" />
      <path d="M35 58 L38 70 L33 80" stroke="#57250a" strokeWidth="1.5" fill="none" />
      <path d="M60 56 L63 68" stroke="#57250a" strokeWidth="1.5" fill="none" />
      {/* Head */}
      <circle cx="50" cy="43" r="20" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      {/* Kabuto */}
      <path d="M28 43 Q30 20 50 18 Q70 20 72 43" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <rect x="36" y="30" width="28" height="16" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M44 30 L46 22 L50 20 L54 22 L56 30" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      {/* Bonsai */}
      <rect x="47" y="8" width="6" height="14" rx="2" fill="#78350f" />
      <polygon points="50,2 38,14 62,14" fill="#15803d" stroke="#166534" strokeWidth="1" />
      <polygon points="50,7 40,17 60,17" fill="#16a34a" stroke="#166534" strokeWidth="1" />
      <polygon points="50,12 43,20 57,20" fill="#22c55e" stroke="#166534" strokeWidth="1" />
      <circle cx="28" cy="35" r="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
      <circle cx="72" cy="35" r="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
      {/* Face */}
      <circle cx="42" cy="46" r="4.5" fill="white" />
      <circle cx="58" cy="46" r="4.5" fill="white" />
      <circle cx="43" cy="47" r="2.5" fill="#1a1a1a" />
      <circle cx="59" cy="47" r="2.5" fill="#1a1a1a" />
      <path d="M44 55 L56 55" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      {/* Sword */}
      <rect x="74" y="50" width="3" height="38" rx="1.5" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
      <rect x="72" y="47" width="7" height="5" rx="1" fill="#78350f" />
      <rect x="73.5" y="52" width="4" height="14" rx="1" fill="#78350f" />
    </g>
  );
}

// ─── m5: ポテトキング (French fry king) ──────────────────────────────────────
function SpriteM5({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Fry container body */}
      <path d="M22 44 L20 88 L80 88 L78 44 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="2" />
      <path d="M22 44 L30 36 L70 36 L78 44 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
      <path d="M30 44 L28 88" stroke="#fca5a5" strokeWidth="2" opacity="0.4" />
      <path d="M70 44 L72 88" stroke="#fca5a5" strokeWidth="2" opacity="0.4" />
      {/* Fries */}
      <rect x="28" y="12" width="7" height="30" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
      <rect x="38" y="6" width="7" height="36" rx="3" fill="#fbbf24" stroke="#ca8a04" strokeWidth="1.5" />
      <rect x="48" y="4" width="7" height="38" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
      <rect x="58" y="8" width="7" height="34" rx="3" fill="#fbbf24" stroke="#ca8a04" strokeWidth="1.5" />
      <rect x="67" y="14" width="7" height="28" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
      {/* Crown with bob */}
      <g style={idle ? { animation: 'cs-m5-crown 2s ease-in-out infinite' } : undefined}>
        <path d="M28 16 L28 8 L35 13 L42 5 L49 10 L56 4 L63 10 L70 5 L74 10 L74 16 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        <circle cx="42" cy="9" r="3" fill="#ef4444" />
        <circle cx="56" cy="7" r="3" fill="#3b82f6" />
        <circle cx="70" cy="10" r="2.5" fill="#ef4444" />
      </g>
      {/* Face */}
      <circle cx="39" cy="62" r="6" fill="white" />
      <circle cx="61" cy="62" r="6" fill="white" />
      <circle cx="40" cy="63" r="3.5" fill="#1a1a1a" />
      <circle cx="62" cy="63" r="3.5" fill="#1a1a1a" />
      <circle cx="41" cy="61" r="1.2" fill="white" />
      <circle cx="63" cy="61" r="1.2" fill="white" />
      <path d="M34 74 Q50 84 66 74" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="31" cy="68" rx="5" ry="3" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="69" cy="68" rx="5" ry="3" fill="#fca5a5" opacity="0.5" />
      <rect x="26" y="48" width="48" height="4" rx="2" fill="#b91c1c" />
    </g>
  );
}

// ─── m6: ギャンブラー斎藤 (Gambler) ──────────────────────────────────────────
function SpriteM6({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Body - dark suit */}
      <rect x="22" y="54" width="56" height="40" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <polygon points="50,56 38,56 44,70" fill="white" />
      <polygon points="50,56 62,56 56,70" fill="white" />
      <polygon points="50,58 46,64 50,78 54,64" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
      <path d="M28 54 L36 46 L50 54 L64 46 L72 54" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
      {/* Head */}
      <circle cx="50" cy="36" r="20" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5" />
      {/* Fedora */}
      <ellipse cx="50" cy="24" rx="24" ry="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      <rect x="30" y="10" width="40" height="16" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      <rect x="30" y="22" width="40" height="4" fill="#f59e0b" />
      {/* Eyes */}
      <ellipse cx="41" cy="36" rx="5.5" ry="4" fill="white" />
      <ellipse cx="59" cy="36" rx="5.5" ry="4" fill="white" />
      <ellipse cx="42" cy="36.5" rx="3" ry="3" fill="#1a1a1a" />
      <ellipse cx="60" cy="36.5" rx="3" ry="3" fill="#1a1a1a" />
      <circle cx="43.5" cy="35" r="1.2" fill="white" />
      <circle cx="61.5" cy="35" r="1.2" fill="white" />
      <path d="M35.5 33 Q41 31 46.5 33" stroke="#d97706" strokeWidth="1.5" fill="none" />
      <path d="M53.5 33 Q59 31 64.5 33" stroke="#d97706" strokeWidth="1.5" fill="none" />
      <path d="M44 43 Q50 48 58 44" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Cards with fan animation */}
      <g style={idle ? { animation: 'cs-m6-card 2.5s ease-in-out infinite' } : undefined}
         transform="translate(68, 64) rotate(-15)">
        <rect x="0" y="-18" width="11" height="16" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
        <rect x="4" y="-18" width="11" height="16" rx="2" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1" />
        <rect x="8" y="-18" width="11" height="16" rx="2" fill="#166534" stroke="#14532d" strokeWidth="1" />
        <rect x="12" y="-18" width="11" height="16" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
        <text x="2" y="-6" fontSize="7" fill="white">♠</text>
        <text x="6" y="-6" fontSize="7" fill="white">♥</text>
        <text x="10" y="-6" fontSize="7" fill="white">♦</text>
      </g>
      {/* Left arm */}
      <rect x="14" y="58" width="10" height="28" rx="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      <polygon points="62,56 66,56 64,60 62,58" fill="#f59e0b" />
    </g>
  );
}

// ─── m7: バグマスター (Hacker) ────────────────────────────────────────────────
function SpriteM7({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Dark hooded cloak */}
      <path d="M15 50 Q10 90 20 96 L80 96 Q90 90 85 50 Q70 40 50 38 Q30 40 15 50 Z" fill="#1e1b4b" stroke="#312e81" strokeWidth="2" />
      <path d="M20 50 Q22 20 50 16 Q78 20 80 50 Q65 42 50 40 Q35 42 20 50 Z" fill="#312e81" stroke="#3730a3" strokeWidth="2" />
      <path d="M26 50 Q28 28 50 24 Q72 28 74 50 Q62 44 50 43 Q38 44 26 50 Z" fill="#1e1b4b" />
      {/* Monitor face with flicker */}
      <g style={idle ? { animation: 'cs-m7-screen 3.5s ease-in-out infinite' } : undefined}>
        <rect x="28" y="36" width="44" height="32" rx="5" fill="#0f0f1a" stroke="#6366f1" strokeWidth="2" />
        <rect x="28" y="36" width="44" height="32" rx="5" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.5" />
        <text x="33" y="51" fontSize="7.5" fill="#ef4444" fontFamily="monospace" fontWeight="bold">[ERROR]</text>
        <text x="34" y="61" fontSize="6" fill="#6366f1" fontFamily="monospace">0xDEAD</text>
        <circle cx="40" cy="44" r="4" fill="#7c3aed" opacity="0.8" />
        <circle cx="60" cy="44" r="4" fill="#7c3aed" opacity="0.8" />
        <circle cx="40" cy="44" r="2" fill="#c4b5fd" />
        <circle cx="60" cy="44" r="2" fill="#c4b5fd" />
        <line x1="28" y1="42" x2="72" y2="42" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
        <line x1="28" y1="48" x2="72" y2="48" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
        <line x1="28" y1="54" x2="72" y2="54" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
        <line x1="28" y1="60" x2="72" y2="60" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
      </g>
      {/* Keyboard */}
      <rect x="30" y="74" width="40" height="16" rx="3" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
      <rect x="33" y="77" width="5" height="4" rx="1" fill="#312e81" />
      <rect x="40" y="77" width="5" height="4" rx="1" fill="#312e81" />
      <rect x="47" y="77" width="5" height="4" rx="1" fill="#312e81" />
      <rect x="54" y="77" width="5" height="4" rx="1" fill="#312e81" />
      <rect x="61" y="77" width="5" height="4" rx="1" fill="#312e81" />
      <rect x="36" y="83" width="28" height="4" rx="1" fill="#312e81" />
      <ellipse cx="20" cy="76" rx="7" ry="5" fill="#1e1b4b" stroke="#312e81" strokeWidth="1.5" />
      <ellipse cx="80" cy="76" rx="7" ry="5" fill="#1e1b4b" stroke="#312e81" strokeWidth="1.5" />
    </g>
  );
}

// ─── m8: 工事の鬼 (Construction demon) ───────────────────────────────────────
function SpriteM8({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Body */}
      <rect x="16" y="52" width="68" height="42" rx="8" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
      <rect x="16" y="64" width="68" height="5" fill="#fbbf24" opacity="0.8" />
      <rect x="16" y="76" width="68" height="5" fill="#fbbf24" opacity="0.8" />
      <polygon points="50,54 40,54 44,68" fill="#374151" />
      <polygon points="50,54 60,54 56,68" fill="#374151" />
      {/* Arms */}
      <rect x="4" y="54" width="14" height="32" rx="6" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
      <rect x="82" y="54" width="14" height="32" rx="6" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
      {/* Head */}
      <circle cx="50" cy="38" r="22" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
      {/* Hard hat */}
      <ellipse cx="50" cy="22" rx="24" ry="6" fill="#fbbf24" stroke="#ca8a04" strokeWidth="2" />
      <path d="M26 22 Q28 8 50 6 Q72 8 74 22" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
      {/* Horns */}
      <polygon points="62,16 58,2 70,10" fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.5" />
      <polygon points="38,18 34,6 44,12" fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.5" />
      {/* Eyes */}
      <ellipse cx="41" cy="39" rx="6" ry="5" fill="#fef08a" />
      <ellipse cx="59" cy="39" rx="6" ry="5" fill="#fef08a" />
      <ellipse cx="41" cy="39" rx="2" ry="4.5" fill="#7f1d1d" />
      <ellipse cx="59" cy="39" rx="2" ry="4.5" fill="#7f1d1d" />
      {/* Angry eyebrows */}
      <path d="M34 34 L48 37" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 37 L66 34" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
      {/* Mouth */}
      <path d="M38 50 Q50 58 62 50" stroke="#7f1d1d" strokeWidth="2" fill="#ef4444" />
      <polygon points="44,50 46,58 48,50" fill="white" />
      <polygon points="52,50 54,58 56,50" fill="white" />
      {/* Wrench with swing */}
      <g style={idle ? { animation: 'cs-m8-wrench 1.6s ease-in-out infinite' } : undefined}>
        <rect x="82" y="60" width="14" height="5" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
        <rect x="90" y="55" width="4" height="8" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
        <rect x="90" y="60" width="4" height="8" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
      </g>
      {/* Legs */}
      <rect x="24" y="90" width="18" height="10" rx="4" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
      <rect x="58" y="90" width="18" height="10" rx="4" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
    </g>
  );
}

// ─── m9: トサン・フォックス (Evil fox loan shark) ─────────────────────────────
function SpriteM9({ idle }: { idle: boolean }) {
  return (
    <g>
      {/* Body */}
      <rect x="22" y="55" width="56" height="40" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <polygon points="50,57 38,57 44,72" fill="white" />
      <polygon points="50,57 62,57 56,72" fill="white" />
      <polygon points="50,59 46,65 50,80 54,65" fill="#ec4899" stroke="#be185d" strokeWidth="1" />
      {/* Tail with wag */}
      <g style={idle ? { animation: 'cs-m9-tail 2s ease-in-out infinite' } : undefined}>
        <path d="M72 70 Q92 60 90 80 Q88 96 70 90 Q78 82 76 72 Z" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" />
        <ellipse cx="88" cy="80" rx="8" ry="10" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M74 72 Q82 68 84 76 Q86 84 76 88" stroke="#fcd34d" strokeWidth="2" fill="none" opacity="0.5" />
      </g>
      {/* Fox head */}
      <ellipse cx="50" cy="36" rx="20" ry="18" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
      <polygon points="34,24 28,8 44,20" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" />
      <polygon points="66,24 72,8 56,20" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" />
      <polygon points="34,22 30,12 42,20" fill="#fca5a5" />
      <polygon points="66,22 70,12 58,20" fill="#fca5a5" />
      {/* Snout */}
      <path d="M36 42 Q50 56 64 42 Q58 38 50 40 Q42 38 36 42 Z" fill="#fde68a" stroke="#ea580c" strokeWidth="1" />
      <ellipse cx="50" cy="42" rx="4" ry="2.5" fill="#be185d" />
      {/* Eyes */}
      <ellipse cx="41" cy="34" rx="5" ry="4" fill="white" />
      <ellipse cx="59" cy="34" rx="5" ry="4" fill="white" />
      <ellipse cx="42" cy="34.5" rx="3" ry="3.5" fill="#1a1a1a" />
      <ellipse cx="60" cy="34.5" rx="3" ry="3.5" fill="#1a1a1a" />
      <circle cx="43" cy="33" r="1.2" fill="white" />
      <circle cx="61" cy="33" r="1.2" fill="white" />
      <path d="M43 48 Q50 54 57 48" stroke="#be185d" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="20" y1="44" x2="36" y2="43" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="20" y1="48" x2="36" y2="46" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="64" y1="43" x2="80" y2="44" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="64" y1="46" x2="80" y2="48" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Money bag */}
      <circle cx="14" cy="74" r="11" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <path d="M10 70 Q14 66 18 70" stroke="#d97706" strokeWidth="1.5" fill="none" />
      <text x="9" y="78" fontSize="9" fill="#92400e" fontWeight="bold">¥</text>
      <ellipse cx="14" cy="63" rx="4" ry="3" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      <rect x="6" y="58" width="14" height="22" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
    </g>
  );
}

// ─── Default fallback ─────────────────────────────────────────────────────────
function SpriteDefault({ monsterId }: { monsterId: string }) {
  return (
    <g>
      <circle cx="50" cy="50" r="40" fill="#374151" stroke="#6b7280" strokeWidth="2" />
      <text x="50" y="56" textAnchor="middle" fontSize="22" fill="#9ca3af">{monsterId}</text>
    </g>
  );
}

type SpriteFC = React.FC<{ idle: boolean }>;
const SPRITE_MAP: Record<string, SpriteFC> = {
  m1: SpriteM1,
  m2: SpriteM2,
  m3: SpriteM3,
  m5: SpriteM5,
  m6: SpriteM6,
  m7: SpriteM7,
  m8: SpriteM8,
  m9: SpriteM9,
};

// ─── アニメーション状態のスタイル計算 ────────────────────────────────────────
function getAnimStyle(
  anim: CharacterAnimationType,
  flipped: boolean,
): React.CSSProperties {
  const base = flipped ? 'scaleX(-1)' : '';

  if (anim === 'IDLE') {
    return {
      animation: `cs-float 3s ease-in-out infinite`,
      transform: base || undefined,
      display: 'block',
      overflow: 'visible',
    };
  }
  if (anim === 'ATTACK') {
    const kf = flipped ? 'cs-attack-enemy' : 'cs-attack-player';
    return {
      animation: `${kf} 0.55s ease-in-out forwards`,
      display: 'block',
      overflow: 'visible',
    };
  }
  if (anim === 'DAMAGE') {
    const kf = flipped ? 'cs-damage-enemy' : 'cs-damage';
    return {
      animation: `${kf} 0.5s ease-out forwards`,
      display: 'block',
      overflow: 'visible',
    };
  }
  if (anim === 'SKILL') {
    const kf = flipped ? 'cs-skill-enemy' : 'cs-skill';
    return {
      animation: `${kf} 0.6s ease-in-out forwards`,
      display: 'block',
      overflow: 'visible',
    };
  }
  return { transform: base || undefined, display: 'block', overflow: 'visible' };
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────
const CharacterSprite = forwardRef<CharacterSpriteRef, CharacterSpriteProps>(
  function CharacterSprite(
    { monsterId, size = 100, flipped = false, className = '' },
    ref,
  ) {
    injectCSS();

    const [animState, setAnimState] = useState<CharacterAnimationType>('IDLE');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      playAnimation(anim: CharacterAnimationType) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setAnimState(anim);
        if (anim !== 'IDLE') {
          const dur = anim === 'ATTACK' ? 600 : anim === 'DAMAGE' ? 550 : 650;
          timerRef.current = setTimeout(() => setAnimState('IDLE'), dur);
        }
      },
    }));

    // Cleanup on unmount
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const SpriteComponent = SPRITE_MAP[monsterId] as SpriteFC | undefined;
    const style = getAnimStyle(animState, flipped);

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
      >
        {SpriteComponent
          ? <SpriteComponent idle={animState === 'IDLE'} />
          : <SpriteDefault monsterId={monsterId} />
        }
      </svg>
    );
  },
);

export default CharacterSprite;
