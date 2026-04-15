/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export type GoryoAnimationType =
  | 'IDLE'
  | 'CHEST_BEAT'
  | 'GORILLA_PUNCH'
  | 'GOLDFISH_SPLASH'
  | 'AQUA_FIST'
  | 'TOUGH_GUARD'
  | 'HEAL_MIST'
  | 'POWER_UP'
  | 'DAMAGE';

export interface GoryoCanvasRef {
  playAnimation: (type: GoryoAnimationType) => void;
}

interface GoryoCanvasProps {
  size?: number;
  flipped?: boolean; // 敵として表示する場合は左右反転
  form?: number;     // 1=金魚, 2=金魚(同じ), 3=サメ
}

class GoryoCharacter {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentAnimation: string;
  animationQueue: string[];
  animationStartTime: number;
  animationDuration: number;
  bodyPos: { x: number; y: number; rotation: number; scale: number };
  headPos: { x: number; y: number; rotation: number; scale: number };
  leftArm: { x: number; y: number; rotation: number; scale: number };
  rightArm: { x: number; y: number; rotation: number; scale: number };
  leftLeg: { x: number; y: number; rotation: number };
  rightLeg: { x: number; y: number; rotation: number };
  finRotation: number;
  eyeScale: number;
  mouthOpen: number;
  particles: any[];
  screenShake: { x: number; y: number };
  flashColor: string | null;
  auraAlpha: number;
  shieldAlpha: number;
  nextScratchTime: number;
  nextChestBeatTime: number;
  form: number; // 1=金魚, 2=金魚, 3=サメ

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.currentAnimation = 'IDLE';
    this.animationQueue = [];
    this.animationStartTime = Date.now();
    this.animationDuration = 0;
    this.bodyPos = { x: 0, y: 0, rotation: 0, scale: 1 };
    this.headPos = { x: 0, y: 0, rotation: 0, scale: 1 };
    this.leftArm = { x: -60, y: 20, rotation: 0, scale: 1 };
    this.rightArm = { x: 60, y: 20, rotation: 0, scale: 1 };
    this.leftLeg = { x: -40, y: 100, rotation: 0 };
    this.rightLeg = { x: 40, y: 100, rotation: 0 };
    this.finRotation = 0;
    this.eyeScale = 1;
    this.mouthOpen = 0;
    this.particles = [];
    this.screenShake = { x: 0, y: 0 };
    this.flashColor = null;
    this.auraAlpha = 0;
    this.shieldAlpha = 0;
    this.nextScratchTime = Date.now() + 10000 + Math.random() * 5000;
    this.nextChestBeatTime = Date.now() + 20000 + Math.random() * 10000;
    this.form = 1;
    this.playAnimation('CHEST_BEAT');
  }

  playAnimation(type: string) {
    if (this.currentAnimation === 'IDLE') this.startAnimation(type);
    else this.animationQueue.push(type);
  }

  startAnimation(type: string) {
    this.currentAnimation = type;
    this.animationStartTime = Date.now();
    const durations: Record<string, number> = {
      CHEST_BEAT: 1200, GORILLA_PUNCH: 800, GOLDFISH_SPLASH: 1000,
      AQUA_FIST: 800, TOUGH_GUARD: 1500, HEAL_MIST: 2000, POWER_UP: 1000, DAMAGE: 600,
    };
    this.animationDuration = durations[type] || 0;
  }

  update() {
    const now = Date.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);

    this.screenShake = { x: 0, y: 0 };
    this.flashColor = null;
    this.auraAlpha = Math.max(0, this.auraAlpha - 0.02);
    this.shieldAlpha = Math.max(0, this.shieldAlpha - 0.05);

    // idle default
    this.bodyPos.rotation = Math.sin(now / 1000) * 0.05;
    this.bodyPos.y = Math.sin(now / 500) * 5;
    this.bodyPos.scale = 1;
    this.bodyPos.x = 0;
    this.headPos.rotation = 0;
    this.finRotation = Math.sin(now / 300) * 0.2;
    this.eyeScale = 1;
    this.mouthOpen = 0.1 + Math.sin(now / 800) * 0.1;
    this.leftArm.rotation = 0.2 + Math.sin(now / 1000) * 0.1;
    this.rightArm.rotation = -0.2 - Math.sin(now / 1000) * 0.1;
    this.leftArm.x = -60; this.leftArm.y = 20;
    this.rightArm.x = 60; this.rightArm.y = 20;
    this.leftArm.scale = 1; this.rightArm.scale = 1;

    if (this.currentAnimation === 'IDLE') {
      if (now > this.nextScratchTime) {
        const scratchElapsed = now - (this.nextScratchTime - 2000);
        if (scratchElapsed > 0 && scratchElapsed < 2000) {
          const p = scratchElapsed / 2000;
          if (p < 0.2) { this.rightArm.rotation = -2.5 * (p / 0.2); this.rightArm.y = 20 - 40 * (p / 0.2); }
          else if (p < 0.8) { this.rightArm.rotation = -2.5 + Math.sin(now / 100) * 0.2; this.rightArm.y = -20; }
          else { this.rightArm.rotation = -2.5 * (1 - (p - 0.8) / 0.2); this.rightArm.y = -20 + 40 * ((p - 0.8) / 0.2); }
        } else if (scratchElapsed >= 2000) {
          this.nextScratchTime = now + 10000 + Math.random() * 5000;
        }
      }
      if (now > this.nextChestBeatTime) {
        this.playAnimation('CHEST_BEAT');
        this.nextChestBeatTime = now + 20000 + Math.random() * 10000;
      }
    } else {
      this.handleAnimation(this.currentAnimation, progress);
      if (progress >= 1) {
        if (this.animationQueue.length > 0) this.startAnimation(this.animationQueue.shift()!);
        else this.currentAnimation = 'IDLE';
      }
    }

    this.particles = this.particles.filter((p: any) => { p.x += p.vx; p.y += p.vy; p.life--; return p.life > 0; });
  }

  handleAnimation(type: string, p: number) {
    switch (type) {
      case 'CHEST_BEAT': {
        const beat = Math.floor(p * 8);
        const arm = beat % 2 === 0 ? this.leftArm : this.rightArm;
        const phase = (p * 8) % 1;
        arm.rotation = beat % 2 === 0 ? 1.5 : -1.5;
        if (phase > 0.5) {
          arm.rotation = beat % 2 === 0 ? 0.5 : -0.5;
          this.screenShake = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };
        }
        break;
      }
      case 'GORILLA_PUNCH':
        if (p < 0.3) { this.bodyPos.y += p * 50; this.rightArm.rotation = -0.5; }
        else if (p < 0.6) { const pp = (p - 0.3) / 0.3; this.rightArm.x = 60 + pp * 100; this.rightArm.scale = 1 + pp * 0.5; this.rightArm.rotation = -1.5; }
        else { const rp = (p - 0.6) / 0.4; this.rightArm.x = 160 - rp * 100; this.rightArm.scale = 1.5 - rp * 0.5; }
        break;
      case 'GOLDFISH_SPLASH':
        this.headPos.rotation = Math.sin(p * Math.PI * 2) * 0.5;
        if (p > 0.3 && p < 0.7 && Math.random() > 0.5) this.spawnParticles(this.width / 2, this.height / 2 - 100, 'cyan', 5);
        break;
      case 'AQUA_FIST':
        this.auraAlpha = 0.5;
        if (p < 0.3) this.leftArm.rotation = 0.5;
        else if (p < 0.6) {
          const pp = (p - 0.3) / 0.3;
          this.leftArm.x = -60 - pp * 100; this.leftArm.scale = 1 + pp * 0.5;
          if (pp > 0.5) this.spawnParticles(this.width / 2 - 150, this.height / 2, 'blue', 3);
        }
        break;
      case 'TOUGH_GUARD':
        this.shieldAlpha = Math.sin(p * Math.PI) * 0.6;
        this.leftArm.rotation = -1.2; this.rightArm.rotation = 1.2;
        this.leftArm.x = -30; this.rightArm.x = 30;
        break;
      case 'HEAL_MIST':
        if (Math.random() > 0.7) this.spawnParticles(this.width / 2 + (Math.random() - 0.5) * 200, this.height / 2 + 100, '#4ade80', 2, -2);
        this.mouthOpen = 0.3;
        break;
      case 'POWER_UP':
        this.auraAlpha = Math.sin(p * Math.PI) * 0.8;
        this.leftArm.scale = 1.2; this.rightArm.scale = 1.2; this.bodyPos.scale = 1.05;
        break;
      case 'DAMAGE':
        this.flashColor = 'rgba(255, 0, 0, 0.3)';
        this.bodyPos.x = -Math.sin(p * Math.PI) * 50;
        this.eyeScale = 0.1; this.headPos.rotation = 0.3;
        break;
    }
  }

  spawnParticles(x: number, y: number, color: string, count: number, vyBase = 0) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: vyBase + (Math.random() - 0.5) * 10, life: 30 + Math.random() * 20, maxLife: 50, color, size: 2 + Math.random() * 5 });
    }
  }

  draw() {
    this.update();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.width / 2 + this.screenShake.x, this.height / 2 + this.screenShake.y);

    if (this.auraAlpha > 0) {
      ctx.save(); ctx.globalAlpha = this.auraAlpha; ctx.shadowBlur = 30;
      ctx.shadowColor = this.currentAnimation === 'POWER_UP' ? 'orange' : 'cyan';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath(); ctx.ellipse(0, 0, 150, 200, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    ctx.save();
    ctx.translate(this.bodyPos.x, this.bodyPos.y);
    ctx.rotate(this.bodyPos.rotation);
    ctx.scale(this.bodyPos.scale, this.bodyPos.scale);

    this.drawLeg(this.leftLeg.x, this.leftLeg.y, this.leftLeg.rotation);
    this.drawLeg(this.rightLeg.x, this.rightLeg.y, this.rightLeg.rotation);

    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(-80, -60, 160, 180, 40); ctx.fill();
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.ellipse(0, 20, 50, 60, 0, 0, Math.PI * 2); ctx.fill();

    this.drawArm(this.leftArm.x, this.leftArm.y, this.leftArm.rotation, this.leftArm.scale, true);
    this.drawArm(this.rightArm.x, this.rightArm.y, this.rightArm.rotation, this.rightArm.scale, false);

    ctx.save(); ctx.translate(0, -80); ctx.rotate(this.headPos.rotation);
    if (this.form >= 3) {
      // 🦈 サメ頭（形態3）
      // 背びれ
      ctx.fillStyle = '#1e3a5f'; ctx.save(); ctx.translate(0, -55); ctx.rotate(this.finRotation * 0.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, -40); ctx.lineTo(15, -20); ctx.closePath(); ctx.fill(); ctx.restore();
      // 頭（横長の鋭い形）
      ctx.fillStyle = '#2563eb';
      ctx.beginPath(); ctx.ellipse(0, 0, 70, 50, 0, 0, Math.PI * 2); ctx.fill();
      // 腹面（薄い色）
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath(); ctx.ellipse(0, 15, 50, 30, 0, 0, Math.PI * 2); ctx.fill();
      // 目（鋭い）
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.ellipse(-28, -8, 14, 12 * this.eyeScale, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(28, -8, 14, 12 * this.eyeScale, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath(); ctx.arc(-28, -8, 6 * this.eyeScale, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(28, -8, 6 * this.eyeScale, 0, Math.PI * 2); ctx.fill();
      // 口（歯が見える）
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath(); ctx.ellipse(0, 25, 30, 12 * this.mouthOpen, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      for (let t = -3; t <= 3; t++) {
        ctx.beginPath(); ctx.moveTo(t * 9, 18); ctx.lineTo(t * 9 - 4, 28); ctx.lineTo(t * 9 + 4, 28); ctx.closePath(); ctx.fill();
      }
    } else {
      // 🐟 金魚頭（形態1・2）
      ctx.fillStyle = '#ff6b00'; ctx.save(); ctx.translate(0, -60); ctx.rotate(this.finRotation);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -30); ctx.lineTo(20, -30); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ff4500'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.ellipse(-25, -10, 15, 15 * this.eyeScale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(25, -10, 15, 15 * this.eyeScale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath(); ctx.arc(-25, -10, 7 * this.eyeScale, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(25, -10, 7 * this.eyeScale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#800'; ctx.beginPath(); ctx.ellipse(0, 25, 10, 10 * this.mouthOpen, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.restore();

    if (this.shieldAlpha > 0) {
      ctx.save(); ctx.globalAlpha = this.shieldAlpha; ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    if (this.currentAnimation === 'GORILLA_PUNCH' || this.currentAnimation === 'AQUA_FIST') {
      const p = (Date.now() - this.animationStartTime) / this.animationDuration;
      if (p > 0.4 && p < 0.7) {
        const swP = (p - 0.4) / 0.3;
        ctx.save(); ctx.strokeStyle = this.currentAnimation === 'AQUA_FIST' ? 'cyan' : 'white';
        ctx.globalAlpha = 1 - swP; ctx.lineWidth = 2;
        ctx.beginPath();
        const x = this.currentAnimation === 'AQUA_FIST' ? -160 : 160;
        ctx.arc(x, 0, swP * 60, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }

    this.particles.forEach((p: any) => {
      ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - this.width / 2, p.y - this.height / 2, p.size, 0, Math.PI * 2); ctx.fill();
    });

    ctx.restore();
    if (this.flashColor) { ctx.globalAlpha = 1; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, this.width, this.height); }
  }

  drawArm(x: number, y: number, rotation: number, scale: number, isLeft: boolean) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale); ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.roundRect(isLeft ? -40 : 0, -15, 40, 30, 10); ctx.fill();
    ctx.translate(isLeft ? -30 : 30, 0); ctx.beginPath(); ctx.roundRect(isLeft ? -40 : 0, -20, 40, 40, 15); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(isLeft ? -35 : 35, 0, 25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawLeg(x: number, y: number, rotation: number) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.roundRect(-20, 0, 40, 60, 15); ctx.fill(); ctx.restore();
  }
}

// スキルIDからアニメーション種別へのマッピング
export const SKILL_TO_ANIMATION: Record<string, GoryoAnimationType> = {
  s9: 'GORILLA_PUNCH',
  s10: 'GOLDFISH_SPLASH',
  s11: 'AQUA_FIST',
  s12: 'TOUGH_GUARD',
  s5: 'HEAL_MIST',
  s3: 'POWER_UP',
};

export const GoryoCanvas = forwardRef<GoryoCanvasRef, GoryoCanvasProps>(
  ({ size = 200, flipped = false, form = 1 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const characterRef = useRef<GoryoCharacter | null>(null);
    const animFrameRef = useRef<number>(0);

    useImperativeHandle(ref, () => ({
      playAnimation: (type: GoryoAnimationType) => {
        characterRef.current?.playAnimation(type);
      },
    }));

    // 形態変化を反映
    useEffect(() => {
      if (characterRef.current) {
        characterRef.current.form = form;
      }
    }, [form]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      characterRef.current = new GoryoCharacter(canvas);
      characterRef.current.form = form;

      const animate = () => {
        characterRef.current?.draw();
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        cancelAnimationFrame(animFrameRef.current);
        characterRef.current = null;
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{
          width: size,
          height: size,
          transform: flipped ? 'scaleX(-1)' : 'none',
        }}
      />
    );
  }
);

GoryoCanvas.displayName = 'GoryoCanvas';
