/**
 * BattleScreen — 4 characters + Box Battle mode
 * Controls: left half = joystick | right half = attack | top-right = ultimate
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface BattleScreenProps {
  charId: string;
  level: number;
  mode?: 'normal' | 'box';
  onFinish: (won: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_R = 26, ENEMY_R = 30;
const PLAYER_SPEED = 190, BASE_ENEMY_SPEED = 75, ENEMY_DPS = 120;

// ポチっとな
const RUSH_SPEED = 960, RUSH_DIST = 230;
const POCHI_AMMO = 3, POCHI_RELOAD = 4;
const TOASTER_MAX = 12, BURN_DPS = 400, BURN_DUR = 3, BONUS = 1.5;

// ギャンブラー斎藤
const SHOT_SPEED = 480, SHOT_RANGE = 380;
const SAITO_ULT_MAX = 10000, SAITO_ULT_DUR = 5, SAITO_HEAL_PS = 3000;

// ジャミー
const JAMIE_AMMO = 2, JAMIE_RELOAD = 1.8;
const JAMIE_BSPD = 300, JAMIE_BR = 16;
const JAMIE_SLOW = 0.1, JAMIE_SLOW_DUR = 1.0;
const JAMIE_FIELD_R = 270, JAMIE_FIELD_DUR = 5, JAMIE_FIELD_SLOW = 0.15;
const JAMIE_ULT_MAX = 5000;

// フォーク親父
const FORK_AMMO = 1, FORK_RELOAD = 1.1;
const FORK_RANGE = 200, FORK_CLOSE = 80;
const FORK_CHARGE_SPD = 1000, FORK_CHARGE_DIST = 450;
const FORK_WINDUP = 0.35, FORK_STUCK = 2.0;
const FORK_ULT_MAX = 7000, FORK_ULT_DMG_MAX = 10000;
const FORK_ULT_DPS = FORK_ULT_DMG_MAX / 0.38;

// ─── Level scaling ────────────────────────────────────────────────────────────
function lv(level: number) { return Math.max(0, Math.min(1, (level - 1) / 4)); }
function pochiStats(l: number) { const t=lv(l); return { hp:Math.round(6000+t*6000), atk:Math.round(1000+t*1300) }; }
function saitoStats(l: number) { const t=lv(l); return { hp:Math.round(4300+t*4300), miss:Math.round(500+t*500), hit:Math.round(1000+t*1000), mid:Math.round(1500+t*1500) }; }
function jamieStats(l: number) { const t=lv(l); return { hp:Math.round(4000+t*4900), atk:Math.round(1500+t*1500) }; }
function forkStats(l: number)  { const t=lv(l); return { hp:Math.round(5500+t*6500), close:Math.round(4000+t*4000), far:Math.round(1000+t*1000) }; }

function saitoCfg(ratio: number) {
  if (ratio >= 0.90) return { max:2, reload:1 };
  if (ratio >= 0.75) return { max:4, reload:2 };
  if (ratio >  0.30) return { max:6, reload:3 };
  return                    { max:8, reload:4 };
}
function enemyHpFor(id: string) {
  if (id==='char_jamie') return 3600;
  if (id==='char_fork')  return 6000;
  return 4500;
}

// ─── Arena / Wall types ───────────────────────────────────────────────────────
interface Arena { x:number; y:number; w:number; h:number }
interface Wall  { x:number; y:number; w:number; h:number }

// Circle vs rectangle collision
function circleRect(cx:number,cy:number,r:number,rx:number,ry:number,rw:number,rh:number):boolean {
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy < r*r;
}

// Is a circle blocked (outside arena or inside wall)?
function blocked(cx:number,cy:number,r:number,walls:Wall[],arena:Arena):boolean {
  if(cx-r<arena.x||cx+r>arena.x+arena.w||cy-r<arena.y||cy+r>arena.y+arena.h) return true;
  for(const w of walls) if(circleRect(cx,cy,r,w.x,w.y,w.w,w.h)) return true;
  return false;
}

// Slide movement: try full → try X only → try Y only → stay
function slideMove(px:number,py:number,dx:number,dy:number,r:number,walls:Wall[],arena:Arena):{x:number;y:number} {
  const nx=px+dx, ny=py+dy;
  if(!blocked(nx,ny,r,walls,arena)) return {x:nx,y:ny};
  if(!blocked(nx,py,r,walls,arena)) return {x:nx,y:py};
  if(!blocked(px,ny,r,walls,arena)) return {x:px,y:ny};
  return {x:px,y:py};
}

// Generate box arena + random wall layout
function genBox(W:number,H:number):{arena:Arena;walls:Wall[]} {
  const aw=W*(0.58+Math.random()*0.14);
  const ah=H*(0.58+Math.random()*0.14);
  const ax=(W-aw)/2, ay=(H-ah)/2;
  const a:Arena={x:ax,y:ay,w:aw,h:ah};
  const cx=ax+aw/2, cy=ay+ah/2, tw=28;
  const layout=Math.floor(Math.random()*3);

  let walls:Wall[]=[];
  if(layout===0){       // ── Pillars ──
    const pw=44,ph=44;
    walls=[
      {x:ax+aw*0.18,y:ay+ah*0.20,w:pw,h:ph},
      {x:ax+aw*0.73,y:ay+ah*0.20,w:pw,h:ph},
      {x:ax+aw*0.18,y:ay+ah*0.63,w:pw,h:ph},
      {x:ax+aw*0.73,y:ay+ah*0.63,w:pw,h:ph},
    ];
  } else if(layout===1){ // ── Cross ──
    walls=[
      {x:cx-tw/2,y:ay+ah*0.08,w:tw,h:ah*0.34},
      {x:cx-tw/2,y:ay+ah*0.58,w:tw,h:ah*0.34},
    ];
  } else {               // ── Labyrinth ──
    const hw=aw*0.30;
    walls=[
      {x:ax+aw*0.04,y:cy-ah*0.18-tw/2,w:hw,h:tw},
      {x:cx-hw/2,   y:cy-tw/2,         w:hw,h:tw},
      {x:ax+aw*0.66,y:cy+ah*0.18-tw/2, w:hw,h:tw},
    ];
  }
  return {arena:a,walls};
}

// ─── Game-state types ─────────────────────────────────────────────────────────
interface Par { x:number;y:number;vx:number;vy:number;life:number;ml:number;col:string;r:number }
interface Blt { x:number;y:number;vx:number;vy:number;dmg:number;d:number;homing:boolean;br:number;col:string;slow?:number;slowDur?:number }
type ShotT = 'miss'|'hit'|'mid';
interface QShot { delay:number; fired:boolean; dx:number; dy:number; dmg:number }

interface GS {
  px:number;py:number;pdx:number;pdy:number;
  pHp:number;pMax:number;aimX:number;aimY:number;walk:number;hitFlash:number;
  ex:number;ey:number;eHp:number;eMax:number;eFlash:number;
  burnT:number;eSlowT:number;eSlowAmt:number;
  pars:Par[];bullets:Blt[];over:boolean;won:boolean;
  // arena/walls (null = normal mode)
  arena:Arena|null;walls:Wall[];
  // ポチっとな
  ammo:number;relT:number;gaugeT:number;gaugeMax:boolean;atk:number;
  rushing:boolean;rsx:number;rsy:number;rdx:number;rdy:number;rtrav:number;
  // ギャンブラー斎藤
  sAmmo:number;sRelT:number;sCool:number;
  qshots:QShot[];qTimer:number;qFiring:boolean;
  ultCharge:number;ultReady:boolean;ultActive:boolean;ultTimer:number;
  lastShot:ShotT|null;missAtk:number;hitAtk:number;midAtk:number;
  // ジャミー
  jAmmo:number;jRelT:number;jUltCharge:number;jUltReady:boolean;
  jFieldActive:boolean;jFieldTimer:number;jFieldX:number;jFieldY:number;jAtk:number;
  // フォーク親父
  fAmmo:number;fRelT:number;fUltCharge:number;fUltReady:boolean;
  fChargeState:'idle'|'windup'|'charging'|'stuck';
  fChargeTimer:number;fChargeDX:number;fChargeDY:number;fChargeDist:number;fChargeDmg:number;
  fAttFlash:number;fAtkClose:number;fAtkFar:number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BattleScreen({ charId, level, mode='normal', onFinish }: BattleScreenProps) {
  const cvs  = useRef<HTMLCanvasElement>(null);
  const gsR  = useRef<GS | null>(null);
  const left = useRef({ on:false,sx:0,sy:0,dx:0,dy:0 });
  const atk  = useRef(false);
  const ult  = useRef(false);
  const raf  = useRef(0);
  const prev = useRef(0);
  const isBox = mode === 'box';

  const [ui, setUi] = useState({
    pHp:1,pMax:1,eHp:1,eMax:1,
    gaugeT:0,gaugeMax:false,
    shotT:null as ShotT|null,ultCharge:0,ultReady:false,ultActive:false,qFiring:false,
    jAmmo:0,jUltCharge:0,jUltReady:false,jFieldActive:false,jFieldTimer:0,
    fAmmo:0,fUltCharge:0,fUltReady:false,fChargeState:'idle' as string,
    eSlowed:false,sAmmo:0,sMaxAmmo:2,
  });

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const c=cvs.current!;
    c.width=window.innerWidth; c.height=window.innerHeight;
    const W=c.width, H=c.height;
    const eHp=enemyHpFor(charId);
    const ps = charId==='char_pochi'? pochiStats(level)
             : charId==='char_saito'? saitoStats(level)
             : charId==='char_jamie'? jamieStats(level)
             : forkStats(level);

    let arena:Arena|null=null, walls:Wall[]=[];
    let px=W*0.28, py=H*0.5, ex=W*0.72, ey=H*0.5;

    if(isBox){
      const box=genBox(W,H);
      arena=box.arena; walls=box.walls;
      px=arena.x+60;    py=arena.y+arena.h/2;
      ex=arena.x+arena.w-60; ey=arena.y+arena.h/2;
    }

    gsR.current={
      px,py,pdx:0,pdy:0,
      pHp:ps.hp,pMax:ps.hp,aimX:1,aimY:0,walk:0,hitFlash:0,
      ex,ey,eHp,eMax:eHp,eFlash:0,burnT:0,eSlowT:0,eSlowAmt:0,
      pars:[],bullets:[],over:false,won:false,
      arena,walls,
      ammo:POCHI_AMMO,relT:0,gaugeT:0,gaugeMax:false,
      atk:(ps as any).atk??0,
      rushing:false,rsx:0,rsy:0,rdx:1,rdy:0,rtrav:0,
      sAmmo:saitoCfg(1).max,sRelT:0,sCool:0,
      qshots:[],qTimer:0,qFiring:false,
      ultCharge:0,ultReady:false,ultActive:false,ultTimer:0,
      lastShot:null,missAtk:(ps as any).miss??0,hitAtk:(ps as any).hit??0,midAtk:(ps as any).mid??0,
      jAmmo:JAMIE_AMMO,jRelT:0,jUltCharge:0,jUltReady:false,
      jFieldActive:false,jFieldTimer:0,jFieldX:px,jFieldY:py,jAtk:(ps as any).atk??0,
      fAmmo:FORK_AMMO,fRelT:0,fUltCharge:0,fUltReady:false,
      fChargeState:'idle',fChargeTimer:0,fChargeDX:1,fChargeDY:0,fChargeDist:0,fChargeDmg:0,
      fAttFlash:0,fAtkClose:(ps as any).close??0,fAtkFar:(ps as any).far??0,
    };

    const onR=()=>{c.width=window.innerWidth;c.height=window.innerHeight;};
    window.addEventListener('resize',onR);
    return ()=>window.removeEventListener('resize',onR);
  },[charId,level,isBox]);

  // ── loop ────────────────────────────────────────────────────────────────────
  const loop=useCallback((ts:number)=>{
    const g=gsR.current, c=cvs.current;
    if(!g||!c) return;
    const dt=Math.min((ts-prev.current)/1000,0.05);
    prev.current=ts;
    const W=c.width, H=c.height;

    if(!g.over){
      // ── player movement ──
      const lr=left.current;
      if(lr.on){
        g.pdx=lr.dx; g.pdy=lr.dy;
        const l=Math.sqrt(lr.dx*lr.dx+lr.dy*lr.dy)||1;
        if(l>0.05){g.aimX=lr.dx/l;g.aimY=lr.dy/l;}
      } else {g.pdx*=0.7;g.pdy*=0.7;}
      if(Math.abs(g.pdx)>0.05||Math.abs(g.pdy)>0.05) g.walk+=dt*8;

      // Move player (only when not fork-charging)
      if(g.fChargeState!=='charging'){
        if(g.arena){
          const m=slideMove(g.px,g.py,g.pdx*PLAYER_SPEED*dt,g.pdy*PLAYER_SPEED*dt,PLAYER_R,g.walls,g.arena);
          g.px=m.x; g.py=m.y;
        } else {
          g.px=clamp(g.px+g.pdx*PLAYER_SPEED*dt,PLAYER_R,W-PLAYER_R);
          g.py=clamp(g.py+g.pdy*PLAYER_SPEED*dt,PLAYER_R,H-PLAYER_R);
        }
      }

      // character-specific update
      if     (charId==='char_pochi') updatePochi(g,dt,W,H,atk);
      else if(charId==='char_saito') updateSaito(g,dt,W,H,atk,ult);
      else if(charId==='char_jamie') updateJamie(g,dt,W,H,atk,ult);
      else if(charId==='char_fork')  updateFork (g,dt,W,H,atk,ult);

      // ── enemy AI ──
      if(!g.over){
        if(g.eSlowT>0){g.eSlowT-=dt;if(g.eSlowT<=0)g.eSlowAmt=0;}
        const eSpd=BASE_ENEMY_SPEED*(1-g.eSlowAmt);
        const edx=g.px-g.ex, edy=g.py-g.ey;
        const ed=Math.sqrt(edx*edx+edy*edy)||1;
        if(ed>PLAYER_R+ENEMY_R+4){
          if(g.arena){
            const m=slideMove(g.ex,g.ey,(edx/ed)*eSpd*dt,(edy/ed)*eSpd*dt,ENEMY_R,g.walls,g.arena);
            g.ex=m.x; g.ey=m.y;
          } else {
            g.ex+=(edx/ed)*eSpd*dt; g.ey+=(edy/ed)*eSpd*dt;
          }
        } else {
          g.pHp=Math.max(0,g.pHp-ENEMY_DPS*dt);g.hitFlash=0.12;
          if(g.pHp<=0){g.over=true;g.won=false;}
        }
      }

      // burn
      if(g.burnT>0){
        g.burnT-=dt;g.eHp=Math.max(0,g.eHp-BURN_DPS*dt);
        if(g.eHp<=0&&!g.over){g.over=true;g.won=true;}
        if(Math.random()<0.4) g.pars.push(mkP(g.ex+rnd(-12,12),g.ey+rnd(-12,12),rnd(-30,30),rnd(-70,-20),0.5,'#FF4400',4));
      }

      // particles
      g.pars=g.pars.filter(p=>p.life>0);
      for(const p of g.pars){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.life-=dt;}
      if(g.eFlash>0)g.eFlash-=dt;
      if(g.hitFlash>0)g.hitFlash-=dt;
      if(g.fAttFlash>0)g.fAttFlash-=dt;
    }

    render(g,c,charId);

    setUi({
      pHp:g.pHp,pMax:g.pMax,eHp:g.eHp,eMax:g.eMax,
      gaugeT:g.gaugeT,gaugeMax:g.gaugeMax,
      shotT:g.lastShot,ultCharge:g.ultCharge,ultReady:g.ultReady,ultActive:g.ultActive,qFiring:g.qFiring,
      jAmmo:g.jAmmo,jUltCharge:g.jUltCharge,jUltReady:g.jUltReady,jFieldActive:g.jFieldActive,jFieldTimer:g.jFieldTimer,
      fAmmo:g.fAmmo,fUltCharge:g.fUltCharge,fUltReady:g.fUltReady,fChargeState:g.fChargeState,
      eSlowed:g.eSlowT>0,
      sAmmo:g.sAmmo,sMaxAmmo:saitoCfg(g.pHp/g.pMax).max,
    });

    if(g.over){setTimeout(()=>onFinish(g.won),1200);return;}
    raf.current=requestAnimationFrame(loop);
  },[onFinish,charId]);

  useEffect(()=>{
    prev.current=performance.now();
    raf.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(raf.current);
  },[loop]);

  // ── touch ────────────────────────────────────────────────────────────────────
  const onTS=useCallback((e:React.TouchEvent)=>{
    e.preventDefault();const W=window.innerWidth,H=window.innerHeight;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2)left.current={on:true,sx:t.clientX,sy:t.clientY,dx:0,dy:0};
      else if(t.clientY<H*0.3)ult.current=true;
      else atk.current=true;
    }
  },[]);
  const onTM=useCallback((e:React.TouchEvent)=>{
    e.preventDefault();const W=window.innerWidth;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2){
        const lr=left.current;if(!lr.on)continue;
        const dx=t.clientX-lr.sx,dy=t.clientY-lr.sy;
        const l=Math.sqrt(dx*dx+dy*dy)||1,cap=Math.min(l,60);
        left.current.dx=(dx/l)*cap/60;left.current.dy=(dy/l)*cap/60;
      }
    }
  },[]);
  const onTE=useCallback((e:React.TouchEvent)=>{
    e.preventDefault();const W=window.innerWidth;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2)left.current={on:false,sx:0,sy:0,dx:0,dy:0};
      else{atk.current=false;ult.current=false;}
    }
  },[]);

  // ── keyboard (desktop) ───────────────────────────────────────────────────────
  const keys=useRef<Set<string>>(new Set());
  useEffect(()=>{
    const kd=(e:KeyboardEvent)=>{
      keys.current.add(e.key.toLowerCase());
      if(e.key===' '||e.key==='j')atk.current=true;
      if(e.key==='e'||e.key==='k')ult.current=true;
    };
    const ku=(e:KeyboardEvent)=>{
      keys.current.delete(e.key.toLowerCase());
      if(e.key===' '||e.key==='j')atk.current=false;
      if(e.key==='e'||e.key==='k')ult.current=false;
    };
    const updateKeys=()=>{
      const k=keys.current;
      let dx=0,dy=0;
      if(k.has('w')||k.has('arrowup'))dy=-1;
      if(k.has('s')||k.has('arrowdown'))dy=1;
      if(k.has('a')||k.has('arrowleft'))dx=-1;
      if(k.has('d')||k.has('arrowright'))dx=1;
      if(dx!==0||dy!==0){
        const l=Math.sqrt(dx*dx+dy*dy);
        left.current={on:true,sx:0,sy:0,dx:dx/l,dy:dy/l};
      }else if(!('ontouchstart' in window)){
        left.current={on:false,sx:0,sy:0,dx:0,dy:0};
      }
      kf.current=requestAnimationFrame(updateKeys);
    };
    window.addEventListener('keydown',kd);
    window.addEventListener('keyup',ku);
    const kf={current:requestAnimationFrame(updateKeys)};
    return()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);cancelAnimationFrame(kf.current);};
  },[]);

  // ── HUD ──────────────────────────────────────────────────────────────────────
  const gR=Math.min(ui.gaugeT/TOASTER_MAX,1);
  const jUP=Math.min(ui.jUltCharge/JAMIE_ULT_MAX,1);
  const fUP=Math.min(ui.fUltCharge/FORK_ULT_MAX,1);
  const sUP=Math.min(ui.ultCharge/SAITO_ULT_MAX,1);

  return (
    <div className="fixed inset-0 select-none touch-none overflow-hidden bg-[#120B2E]"
      onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
      <canvas ref={cvs} className="absolute inset-0"/>

      {/* Mode badge */}
      {isBox&&<div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#AA44FF]/50 text-[#AA44FF] bg-black/40">📦 ボックスバトル</div>}

      {/* Player HP */}
      <div className="absolute top-10 left-4 z-10">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]/70">
          {charId==='char_pochi'?'ポチっとな':charId==='char_saito'?'ギャンブラー斎藤':charId==='char_jamie'?'ジャミー':'フォーク親父'}
        </div>
        <div className="w-36 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 mt-1">
          <div className="h-full rounded-full" style={{width:`${(ui.pHp/ui.pMax)*100}%`,background:ui.pHp>ui.pMax*0.5?'#00F0FF':'#FF4D8D'}}/>
        </div>
        <div className="text-[10px] text-white/50 mt-0.5">{Math.ceil(ui.pHp)}/{ui.pMax}</div>
      </div>

      {/* Enemy HP */}
      <div className="absolute top-10 right-4 z-10 flex flex-col items-end">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#FF00E5]/70">エネミー</div>
        <div className="w-36 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 mt-1">
          <div className="h-full rounded-full bg-[#FF00E5]" style={{width:`${(ui.eHp/ui.eMax)*100}%`}}/>
        </div>
        <div className="text-[10px] text-white/50 mt-0.5">{Math.ceil(ui.eHp)}/{ui.eMax}</div>
      </div>

      {/* ポチっとな HUD */}
      {charId==='char_pochi'&&(
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest" style={{color:ui.gaugeMax?'#FF6600':'#AAA'}}>
            {ui.gaugeMax?'🔥 MAX HEAT':`🍞 ${Math.floor(gR*100)}%`}
          </div>
          <div className="w-40 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <div className="h-full rounded-full" style={{width:`${gR*100}%`,background:ui.gaugeMax?'linear-gradient(90deg,#FF4400,#FFCC00)':'linear-gradient(90deg,#888,#CC4400)',boxShadow:ui.gaugeMax?'0 0 8px #FF6600':'none'}}/>
          </div>
          <div className="flex gap-3 mt-1">
            {Array.from({length:POCHI_AMMO}).map((_,i)=>(
              <div key={i} className="w-4 h-4 rounded-full border-2 border-white/30" style={{background:i<(gsR.current?.ammo??0)?'#FFEE00':'transparent',boxShadow:i<(gsR.current?.ammo??0)?'0 0 6px #FFEE00':'none'}}/>
            ))}
          </div>
        </div>
      )}

      {/* ギャンブラー斎藤 HUD */}
      {charId==='char_saito'&&(
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{color:ui.ultReady?'#FFD700':'#888'}}>{ui.ultReady?'✨ 必殺技READY':`必殺技 ${Math.floor(sUP*100)}%`}</div>
            <div className="w-28 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full" style={{width:`${sUP*100}%`,background:'linear-gradient(90deg,#FFD700,#FF6600)',boxShadow:ui.ultReady?'0 0 8px #FFD700':'none'}}/>
            </div>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            {ui.shotT&&<div className="px-3 py-1 rounded-full font-black text-xs uppercase" style={{background:ui.shotT==='miss'?'#444':ui.shotT==='hit'?'#FF00E5':'#00F0FF',color:ui.shotT==='miss'?'#aaa':'#000'}}>{ui.shotT==='miss'?'外れ…':ui.shotT==='hit'?'当たり！':'中当たり！'}</div>}
            {ui.qFiring&&<div className="text-[10px] text-yellow-300 font-black animate-pulse">発射中...</div>}
            <div className="flex gap-2 flex-wrap justify-center" style={{maxWidth:'220px'}}>
              {Array.from({length:ui.sMaxAmmo}).map((_,i)=>(
                <div key={i} className="w-3.5 h-3.5 rounded-full border-2 border-white/20" style={{background:i<ui.sAmmo?'#FF00E5':'transparent',boxShadow:i<ui.sAmmo?'0 0 5px #FF00E5':'none'}}/>
              ))}
            </div>
          </div>
          {ui.ultReady&&!ui.ultActive&&<div className="absolute top-14 right-4 z-10 pointer-events-none"><div className="w-14 h-14 rounded-full border-4 border-[#FFD700] flex items-center justify-center animate-pulse" style={{background:'rgba(255,215,0,0.15)',boxShadow:'0 0 18px #FFD700'}}><span className="text-[10px] font-black text-[#FFD700]">必殺</span></div></div>}
          {ui.ultActive&&<div className="absolute top-14 right-4 z-10 pointer-events-none text-[10px] font-black text-[#FFD700] animate-pulse">クライマックス！</div>}
        </>
      )}

      {/* ジャミー HUD */}
      {charId==='char_jamie'&&(
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{color:ui.jUltReady?'#CC44FF':'#888'}}>{ui.jUltReady?'🫐 ウルトREADY':`ジャムチャージ ${Math.floor(jUP*100)}%`}</div>
            <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full" style={{width:`${jUP*100}%`,background:'linear-gradient(90deg,#7722AA,#CC44FF)',boxShadow:ui.jUltReady?'0 0 8px #CC44FF':'none'}}/>
            </div>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            {ui.jFieldActive&&<div className="px-3 py-1 rounded-full font-black text-xs text-[#CC44FF] border border-[#CC44FF]/40 animate-pulse">{`ジャムフィールド ${Math.ceil(ui.jFieldTimer)}秒`}</div>}
            {ui.eSlowed&&<div className="text-[10px] font-black text-[#AAFFAA]">💧 スロー中</div>}
            <div className="flex gap-3">
              {Array.from({length:JAMIE_AMMO}).map((_,i)=>(
                <div key={i} className="w-4 h-4 rounded-full border-2 border-white/30" style={{background:i<ui.jAmmo?'#CC44FF':'transparent',boxShadow:i<ui.jAmmo?'0 0 6px #CC44FF':'none'}}/>
              ))}
            </div>
          </div>
          {ui.jUltReady&&!ui.jFieldActive&&<div className="absolute top-14 right-4 z-10 pointer-events-none"><div className="w-14 h-14 rounded-full border-4 border-[#CC44FF] flex items-center justify-center animate-pulse" style={{background:'rgba(204,68,255,0.15)',boxShadow:'0 0 18px #CC44FF'}}><span className="text-[10px] font-black text-[#CC44FF]">必殺</span></div></div>}
        </>
      )}

      {/* フォーク親父 HUD */}
      {charId==='char_fork'&&(
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{color:ui.fUltReady?'#FF8800':'#888'}}>{ui.fUltReady?'🍴 チャージREADY':`串刺しチャージ ${Math.floor(fUP*100)}%`}</div>
            <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full" style={{width:`${fUP*100}%`,background:'linear-gradient(90deg,#884400,#FF8800)',boxShadow:ui.fUltReady?'0 0 8px #FF8800':'none'}}/>
            </div>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            {ui.fChargeState==='windup'&&<div className="text-sm font-black text-[#FF6600] animate-pulse">構え中...</div>}
            {ui.fChargeState==='charging'&&<div className="text-sm font-black text-[#FFAA00] animate-pulse">串刺し！！</div>}
            {ui.fChargeState==='stuck'&&<div className="text-sm font-black text-[#FF4400] animate-pulse">刺さった！</div>}
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-white/30" style={{background:ui.fAmmo>0?'#FF8800':'transparent',boxShadow:ui.fAmmo>0?'0 0 8px #FF8800':'none'}}/>
            </div>
          </div>
          {ui.fUltReady&&ui.fChargeState==='idle'&&<div className="absolute top-14 right-4 z-10 pointer-events-none"><div className="w-14 h-14 rounded-full border-4 border-[#FF8800] flex items-center justify-center animate-pulse" style={{background:'rgba(255,136,0,0.15)',boxShadow:'0 0 18px #FF8800'}}><span className="text-[10px] font-black text-[#FF8800]">必殺</span></div></div>}
        </>
      )}

      {/* Touch zones */}
      <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-auto"/>
      <div className="absolute inset-y-0 right-0 w-1/2 flex items-end justify-center pb-8 pointer-events-auto">
        <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center pointer-events-none"
          style={{borderColor:'rgba(255,238,0,0.2)',background:'rgba(255,238,0,0.04)'}}>
          <span className="text-[11px] font-black text-yellow-300/30">攻撃</span>
        </div>
      </div>
    </div>
  );
}

// ─── Update: ポチっとな ────────────────────────────────────────────────────────
function updatePochi(g:GS,dt:number,W:number,H:number,atkRef:React.MutableRefObject<boolean>){
  if(!g.gaugeMax){g.gaugeT=Math.min(TOASTER_MAX,g.gaugeT+dt);if(g.gaugeT>=TOASTER_MAX)g.gaugeMax=true;}
  if(g.ammo<POCHI_AMMO){g.relT+=dt;if(g.relT>=POCHI_RELOAD){g.ammo=Math.min(POCHI_AMMO,g.ammo+1);g.relT=0;}}

  if(g.rushing){
    const step=RUSH_SPEED*dt;
    let nx=g.px+g.rdx*step, ny=g.py+g.rdy*step;
    let hitWall=false;

    if(g.arena){
      // Check arena bounds
      if(nx<g.arena.x+PLAYER_R||nx>g.arena.x+g.arena.w-PLAYER_R||
         ny<g.arena.y+PLAYER_R||ny>g.arena.y+g.arena.h-PLAYER_R) hitWall=true;
      // Check internal walls
      if(!hitWall&&g.walls.some(w=>circleRect(nx,ny,PLAYER_R,w.x,w.y,w.w,w.h))) hitWall=true;
      if(!hitWall){g.px=clamp(nx,g.arena.x+PLAYER_R,g.arena.x+g.arena.w-PLAYER_R);g.py=clamp(ny,g.arena.y+PLAYER_R,g.arena.y+g.arena.h-PLAYER_R);}
    } else {
      if(nx<PLAYER_R||nx>W-PLAYER_R||ny<PLAYER_R||ny>H-PLAYER_R) hitWall=true;
      if(!hitWall){g.px=clamp(nx,PLAYER_R,W-PLAYER_R);g.py=clamp(ny,PLAYER_R,H-PLAYER_R);}
    }
    if(hitWall) g.rushing=false;

    g.rtrav+=step;
    if(d2(g.px,g.py,g.ex,g.ey)<PLAYER_R+ENEMY_R){
      let dmg=g.atk;if(g.gaugeMax)dmg=Math.round(dmg*BONUS);
      hitEnemy(g,dmg);if(g.gaugeMax)g.burnT=Math.max(g.burnT,BURN_DUR);
      sparks(g,g.ex,g.ey,g.gaugeMax?'#FF6600':'#FFEE00');g.rushing=false;
    }
    if(g.rtrav>=RUSH_DIST)g.rushing=false;
  } else {
    if(atkRef.current&&g.ammo>0){
      atkRef.current=false;g.ammo--;g.relT=0;
      const dx=g.ex-g.px,dy=g.ey-g.py,l=Math.sqrt(dx*dx+dy*dy)||1;
      g.rdx=dx/l;g.rdy=dy/l;g.rsx=g.px;g.rsy=g.py;g.rtrav=0;g.rushing=true;
    }
  }
  if(g.gaugeT/TOASTER_MAX>0.5&&Math.random()<0.18)
    g.pars.push(mkP(g.px+rnd(-6,6),g.py-PLAYER_R-8,rnd(-12,12),rnd(-35,-18),0.8,g.gaugeMax?'#FF8800':'#999',3));
}

// ─── Update: ギャンブラー斎藤 ─────────────────────────────────────────────────
function updateSaito(g:GS,dt:number,W:number,H:number,atkRef:React.MutableRefObject<boolean>,ultRef:React.MutableRefObject<boolean>){
  const ratio=g.pHp/g.pMax,cfg=saitoCfg(ratio);
  if(g.sAmmo>cfg.max)g.sAmmo=cfg.max;
  if(g.sAmmo<cfg.max){g.sRelT+=dt;if(g.sRelT>=cfg.reload){g.sAmmo=Math.min(cfg.max,g.sAmmo+1);g.sRelT=0;}}
  if(g.sCool>0)g.sCool-=dt;
  if(g.qFiring&&g.qshots.length>0){
    g.qTimer+=dt;
    for(const q of g.qshots){if(!q.fired&&g.qTimer>=q.delay){q.fired=true;spawnBlt(g,q.dx,q.dy,q.dmg,false,'#FF00E5',7);}}
    if(g.qshots.every(q=>q.fired)){g.qshots=[];g.qFiring=false;}
  }
  if(ultRef.current&&g.ultReady&&!g.ultActive){ultRef.current=false;g.ultActive=true;g.ultTimer=SAITO_ULT_DUR;g.ultCharge=0;g.ultReady=false;}
  if(g.ultActive){g.ultTimer-=dt;g.pHp=Math.min(g.pMax,g.pHp+SAITO_HEAL_PS*dt);if(g.ultTimer<=0)g.ultActive=false;}
  if(atkRef.current&&g.sAmmo>0&&g.sCool<=0&&!g.qFiring){
    atkRef.current=false;g.sAmmo--;g.sRelT=0;
    const roll=Math.floor(Math.random()*3),type:ShotT=roll===0?'miss':roll===1?'hit':'mid';
    g.lastShot=type;const ax=g.aimX,ay=g.aimY;
    if(type==='miss'){
      g.qFiring=true;g.qTimer=0;
      g.qshots=[-0.4,-0.2,0,0.2,0.4].map((a,i)=>{const c=Math.cos(a),s=Math.sin(a);return{delay:i*0.1,fired:false,dx:ax*c-ay*s,dy:ax*s+ay*c,dmg:g.missAtk};});
    } else if(type==='hit'){
      const px=-ay*0.1,py=ax*0.1;spawnBlt(g,ax+px,ay+py,g.hitAtk,false,'#FF00E5',7);spawnBlt(g,ax-px,ay-py,g.hitAtk,false,'#FF00E5',7);g.sCool=0.7;
    } else {spawnBlt(g,ax,ay,g.midAtk,true,'#00F0FF',9);}
  }
  moveBullets(g,dt,W,H);
}

// ─── Update: ジャミー ─────────────────────────────────────────────────────────
function updateJamie(g:GS,dt:number,W:number,H:number,atkRef:React.MutableRefObject<boolean>,ultRef:React.MutableRefObject<boolean>){
  if(g.jAmmo<JAMIE_AMMO){g.jRelT+=dt;if(g.jRelT>=JAMIE_RELOAD){g.jAmmo=Math.min(JAMIE_AMMO,g.jAmmo+1);g.jRelT=0;}}
  if(g.jFieldActive){
    g.jFieldTimer-=dt;
    if(g.jFieldTimer<=0)g.jFieldActive=false;
    else if(d2(g.ex,g.ey,g.jFieldX,g.jFieldY)<JAMIE_FIELD_R){g.eSlowT=0.2;g.eSlowAmt=Math.max(g.eSlowAmt,JAMIE_FIELD_SLOW);}
  }
  if(ultRef.current&&g.jUltReady&&!g.jFieldActive){
    ultRef.current=false;g.jUltReady=false;
    g.jFieldActive=true;g.jFieldTimer=JAMIE_FIELD_DUR;g.jFieldX=g.px;g.jFieldY=g.py;
    for(let i=0;i<20;i++){const a=Math.random()*Math.PI*2,sp=60+Math.random()*140;g.pars.push(mkP(g.px,g.py,Math.cos(a)*sp,Math.sin(a)*sp,0.8,'#9933CC',5+Math.random()*5));}
  }
  if(atkRef.current&&g.jAmmo>0){atkRef.current=false;g.jAmmo--;g.jRelT=0;spawnBlt(g,g.aimX,g.aimY,g.jAtk,false,'#9933CC',JAMIE_BR,JAMIE_SLOW,JAMIE_SLOW_DUR);}
  moveBullets(g,dt,W,H);
}

// ─── Update: フォーク親父 ──────────────────────────────────────────────────────
function updateFork(g:GS,dt:number,W:number,H:number,atkRef:React.MutableRefObject<boolean>,ultRef:React.MutableRefObject<boolean>){
  if(g.fAmmo<FORK_AMMO&&g.fChargeState==='idle'){g.fRelT+=dt;if(g.fRelT>=FORK_RELOAD){g.fAmmo=Math.min(FORK_AMMO,g.fAmmo+1);g.fRelT=0;}}

  if(g.fChargeState==='windup'){
    g.fChargeTimer-=dt;
    if(g.fChargeTimer<=0){g.fChargeState='charging';g.fChargeDist=0;g.fChargeDmg=0;g.fChargeDX=g.aimX;g.fChargeDY=g.aimY;}
  } else if(g.fChargeState==='charging'){
    const step=FORK_CHARGE_SPD*dt;
    const nx=g.px+g.fChargeDX*step, ny=g.py+g.fChargeDY*step;
    // Wall/arena collision during charge
    let hitWall=false;
    if(g.arena){
      hitWall=nx<g.arena.x+PLAYER_R||nx>g.arena.x+g.arena.w-PLAYER_R||
               ny<g.arena.y+PLAYER_R||ny>g.arena.y+g.arena.h-PLAYER_R||
               g.walls.some(w=>circleRect(nx,ny,PLAYER_R,w.x,w.y,w.w,w.h));
    } else {
      hitWall=nx<=PLAYER_R||nx>=W-PLAYER_R||ny<=PLAYER_R||ny>=H-PLAYER_R;
    }
    if(!hitWall){g.px=clamp(nx,0,W);g.py=clamp(ny,0,H);}
    g.fChargeDist+=step;
    // Damage enemy on contact
    if(d2(g.px,g.py,g.ex,g.ey)<PLAYER_R+ENEMY_R){
      const dmgF=Math.min(FORK_ULT_DPS*dt,FORK_ULT_DMG_MAX-g.fChargeDmg);
      if(dmgF>0){hitEnemy(g,dmgF);g.fChargeDmg+=dmgF;g.fUltCharge=Math.min(FORK_ULT_MAX,g.fUltCharge+dmgF*0.3);}
    }
    if(hitWall){g.fChargeState='stuck';g.fChargeTimer=FORK_STUCK;}
    else if(g.fChargeDist>=FORK_CHARGE_DIST||g.fChargeDmg>=FORK_ULT_DMG_MAX){g.fChargeState='idle';}
  } else if(g.fChargeState==='stuck'){
    g.fChargeTimer-=dt;if(g.fChargeTimer<=0)g.fChargeState='idle';
  }

  if(ultRef.current&&g.fUltReady&&g.fChargeState==='idle'){ultRef.current=false;g.fUltReady=false;g.fUltCharge=0;g.fChargeState='windup';g.fChargeTimer=FORK_WINDUP;}

  if(atkRef.current&&g.fAmmo>0&&g.fChargeState==='idle'){
    atkRef.current=false;g.fAmmo--;g.fRelT=0;
    const dist=d2(g.px,g.py,g.ex,g.ey)-PLAYER_R-ENEMY_R;
    if(dist<=FORK_RANGE){
      const dmg=dist<=FORK_CLOSE?g.fAtkClose:Math.round(g.fAtkClose+((dist-FORK_CLOSE)/(FORK_RANGE-FORK_CLOSE))*(g.fAtkFar-g.fAtkClose));
      hitEnemy(g,dmg);g.fUltCharge=Math.min(FORK_ULT_MAX,g.fUltCharge+dmg);
      if(g.fUltCharge>=FORK_ULT_MAX&&!g.fUltReady)g.fUltReady=true;
      g.fAttFlash=0.18;sparks(g,g.ex,g.ey,'#FF8800');
    } else {g.fAttFlash=0.1;}
  }
}

// ─── Bullet movement (shared: handles wall collision) ─────────────────────────
function moveBullets(g:GS,dt:number,W:number,H:number){
  for(const b of g.bullets){
    if(b.homing&&b.d>SHOT_RANGE*0.65){
      const bx=g.ex-b.x,by=g.ey-b.y,bl=Math.sqrt(bx*bx+by*by)||1;
      b.vx+=(bx/bl)*380*dt;b.vy+=(by/bl)*380*dt;
      const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;b.vx=(b.vx/spd)*SHOT_SPEED;b.vy=(b.vy/spd)*SHOT_SPEED;
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    b.d+=Math.sqrt(b.vx*b.vx+b.vy*b.vy)*dt;
  }
  g.bullets=g.bullets.filter(b=>{
    // Range limit
    if(b.d>SHOT_RANGE*1.2)return false;
    // Wall collision (box mode)
    if(g.arena){
      if(b.x<g.arena.x||b.x>g.arena.x+g.arena.w||b.y<g.arena.y||b.y>g.arena.y+g.arena.h)return false;
      for(const w of g.walls)if(circleRect(b.x,b.y,4,w.x,w.y,w.w,w.h))return false;
    }
    // Enemy hit
    if(d2(b.x,b.y,g.ex,g.ey)<ENEMY_R+b.br){
      hitEnemy(g,b.dmg);
      // Ult charge for jamie/saito
      g.jUltCharge=Math.min(JAMIE_ULT_MAX,g.jUltCharge+b.dmg);
      if(g.jUltCharge>=JAMIE_ULT_MAX&&!g.jUltReady)g.jUltReady=true;
      g.ultCharge=Math.min(SAITO_ULT_MAX,g.ultCharge+b.dmg);
      if(g.ultCharge>=SAITO_ULT_MAX&&!g.ultReady)g.ultReady=true;
      if(b.slow!=null){g.eSlowT=Math.max(g.eSlowT,b.slowDur??JAMIE_SLOW_DUR);g.eSlowAmt=Math.max(g.eSlowAmt,b.slow);}
      sparks(g,g.ex,g.ey,b.col);return false;
    }
    return true;
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render(g:GS,c:HTMLCanvasElement,charId:string){
  const ctx=c.getContext('2d')!,W=c.width,H=c.height;

  // Full background
  ctx.fillStyle='#080518';ctx.fillRect(0,0,W,H);

  if(g.arena){
    // Darken outside arena
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,H);
    // Clear (redraw) arena area
    ctx.fillStyle='#130B30';
    ctx.fillRect(g.arena.x,g.arena.y,g.arena.w,g.arena.h);
    ctx.restore();

    // Arena grid
    ctx.save();ctx.strokeStyle='rgba(0,240,255,0.04)';ctx.lineWidth=1;
    for(let x=g.arena.x;x<g.arena.x+g.arena.w;x+=50){ctx.beginPath();ctx.moveTo(x,g.arena.y);ctx.lineTo(x,g.arena.y+g.arena.h);ctx.stroke();}
    for(let y=g.arena.y;y<g.arena.y+g.arena.h;y+=50){ctx.beginPath();ctx.moveTo(g.arena.x,y);ctx.lineTo(g.arena.x+g.arena.w,y);ctx.stroke();}
    ctx.restore();

    // Arena border
    ctx.save();
    ctx.strokeStyle='#4422AA';ctx.lineWidth=3;
    ctx.shadowColor='#6644CC';ctx.shadowBlur=12;
    ctx.strokeRect(g.arena.x,g.arena.y,g.arena.w,g.arena.h);
    // Corner accents
    const ca=16;const corners=[[g.arena.x,g.arena.y],[g.arena.x+g.arena.w,g.arena.y],[g.arena.x,g.arena.y+g.arena.h],[g.arena.x+g.arena.w,g.arena.y+g.arena.h]];
    ctx.strokeStyle='#00F0FF';ctx.lineWidth=3;
    for(const [cx,cy] of corners){
      const sx=cx===g.arena.x?1:-1,sy=cy===g.arena.y?1:-1;
      ctx.beginPath();ctx.moveTo(cx+sx*ca,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*ca);ctx.stroke();
    }
    ctx.restore();

    // Walls
    for(const w of g.walls){
      ctx.save();
      ctx.shadowColor='#6644AA';ctx.shadowBlur=10;
      ctx.fillStyle='#1E1040';
      ctx.fillRect(w.x,w.y,w.w,w.h);
      ctx.strokeStyle='#5533AA';ctx.lineWidth=2;
      ctx.strokeRect(w.x,w.y,w.w,w.h);
      // Top edge highlight
      ctx.fillStyle='rgba(140,100,255,0.3)';
      ctx.fillRect(w.x,w.y,w.w,4);
      ctx.restore();
    }
  } else {
    // Normal mode grid
    ctx.fillStyle='#120B2E';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,240,255,0.05)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }

  // Saito ult zone
  if(g.ultActive){
    ctx.save();ctx.globalAlpha=0.15+Math.sin(Date.now()/180)*0.05;ctx.fillStyle='#FFD700';
    ctx.beginPath();ctx.arc(g.px,g.py,120,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.5;ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.setLineDash([7,5]);
    ctx.beginPath();ctx.arc(g.px,g.py,120,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }

  // Jamie field
  if(g.jFieldActive) drawJamField(ctx,g.jFieldX,g.jFieldY,JAMIE_FIELD_R,g.jFieldTimer,JAMIE_FIELD_DUR);

  // Particles
  ctx.save();
  for(const p of g.pars){ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(p.life/p.ml),0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;ctx.restore();

  // Bullets
  for(const b of g.bullets){
    ctx.save();ctx.shadowColor=b.col;ctx.shadowBlur=10;ctx.fillStyle=b.col;
    ctx.beginPath();ctx.arc(b.x,b.y,b.br,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // Rush trail
  if(charId==='char_pochi'&&g.rushing){
    ctx.save();ctx.strokeStyle=g.gaugeMax?'#FF6600':'#FFEE00';ctx.lineWidth=5;ctx.globalAlpha=0.28;
    ctx.beginPath();ctx.moveTo(g.rsx,g.rsy);ctx.lineTo(g.px,g.py);ctx.stroke();ctx.restore();
  }

  drawEnemy(ctx,g.ex,g.ey,g.eFlash>0,g.burnT>0,g.eSlowT>0);

  if     (charId==='char_pochi') drawPochi(ctx,g.px,g.py,g.walk,g.gaugeT/TOASTER_MAX,g.gaugeMax,g.rushing,g.hitFlash>0);
  else if(charId==='char_saito') drawSaito(ctx,g.px,g.py,g.walk,g.hitFlash>0,g.ultActive);
  else if(charId==='char_jamie') drawJamie(ctx,g.px,g.py,g.walk,g.hitFlash>0,g.jFieldActive,g.jUltReady);
  else if(charId==='char_fork')  drawFork (ctx,g.px,g.py,g.walk,g.hitFlash>0,g.fChargeState,g.aimX,g.aimY,g.fAttFlash);

  if(g.over){
    ctx.save();ctx.fillStyle=g.won?'#00F0FF':'#FF4D8D';ctx.font='bold 76px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=28;
    ctx.fillText(g.won?'勝利！':'敗北...',W/2,H/2);ctx.restore();
  }
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawJamField(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,timer:number,maxT:number){
  const p=timer/maxT;
  ctx.save();ctx.globalAlpha=0.16+p*0.09;ctx.fillStyle='#6600AA';
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=p*0.28;ctx.fillStyle='#000';
  for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2+timer*0.3,dr=r*(0.25+(i%4)*0.18);ctx.beginPath();ctx.arc(x+Math.cos(a)*dr,y+Math.sin(a)*dr,5,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=0.4;ctx.strokeStyle='#AA44FF';ctx.lineWidth=3;ctx.setLineDash([8,5]);
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}

function drawEnemy(ctx:CanvasRenderingContext2D,x:number,y:number,flash:boolean,burn:boolean,slowed:boolean){
  ctx.save();
  ctx.shadowColor=burn?'#FF4400':slowed?'#AAFFAA':'#FF00E5';ctx.shadowBlur=burn?20:slowed?8:10;
  ctx.fillStyle=flash?'#FFF':burn?'#FF3300':slowed?'#AA66BB':'#CC00BB';
  ctx.beginPath();
  for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2-Math.PI/2,r=i%2===0?ENEMY_R:ENEMY_R*0.64;
    if(i===0)ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(x-8,y-6,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+8,y-6,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x-7,y-5,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+9,y-5,2.5,0,Math.PI*2);ctx.fill();
  if(slowed){ctx.globalAlpha=0.8;ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(170,255,170,0.9)';ctx.fillText('🐌',x,y-ENEMY_R-4);}
  ctx.restore();
}

function drawPochi(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,gR:number,gMax:boolean,rush:boolean,flash:boolean){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,col='#C8860A',tc=gMax?'#FF6600':gR>0.5?'#CC4400':'#888',sw=Math.sin(walk)*0.5;
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.1,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-8,y+R*0.4);ctx.lineTo(x-10+sw*8,y+R+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8,y+R*0.4);ctx.lineTo(x+10-sw*8,y+R+8);ctx.stroke();
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,R*0.85,R,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=tc;ctx.fillRect(x+R*0.4,y-R*0.7,R*0.7,R*0.9);
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x+R*0.5,y-R*0.6,4,R*0.4);ctx.fillRect(x+R*0.72,y-R*0.6,4,R*0.4);
  if(gR>0.3){ctx.save();ctx.globalAlpha=gR*0.5;ctx.shadowColor='#FF6600';ctx.shadowBlur=12*gR;ctx.fillStyle='#FF8800';ctx.fillRect(x+R*0.4,y-R*0.7,R*0.7,R*0.9);ctx.restore();}
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x-4,y-R*0.85,R*0.6,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-R*0.5,y-R*1.1);ctx.lineTo(x-R*0.8,y-R*1.6);ctx.lineTo(x-R*0.15,y-R*1.2);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.1,y-R*1.1);ctx.lineTo(x+R*0.35,y-R*1.55);ctx.lineTo(x+R*0.5,y-R*1.1);ctx.closePath();ctx.fill();
  ctx.fillStyle='#3A1A00';ctx.beginPath();ctx.ellipse(x-1,y-R*0.78,4,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1A0A00';ctx.beginPath();ctx.arc(x-9,y-R*0.95,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+2,y-R*0.95,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(x-8,y-R*0.97,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+3,y-R*0.97,1,0,Math.PI*2);ctx.fill();
  if(rush){ctx.strokeStyle='#FFEE00';ctx.lineWidth=2;ctx.globalAlpha=0.35;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-R-5,y-8+i*8);ctx.lineTo(x-R-26,y-8+i*8);ctx.stroke();}}
  ctx.restore();
}

function drawSaito(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,flash:boolean,ult:boolean){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,col='#6666AA',sw=Math.sin(walk)*0.5;
  if(ult){ctx.shadowColor='#FFD700';ctx.shadowBlur=18;}
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.1,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-8,y+R*0.4);ctx.lineTo(x-10+sw*8,y+R+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8,y+R*0.4);ctx.lineTo(x+10-sw*8,y+R+8);ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-R*0.5,y+R*0.3);ctx.quadraticCurveTo(x-R*1.4,y+R*0.8,x-R*1.2,y-R*0.3);ctx.stroke();
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,R*0.85,R,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#444488';ctx.beginPath();ctx.moveTo(x-5,y-R*0.2);ctx.lineTo(x,y-R*0.7);ctx.lineTo(x+5,y-R*0.2);ctx.closePath();ctx.fill();
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y-R*0.85,R*0.62,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-R*0.3,y-R*1.1);ctx.lineTo(x-R*0.6,y-R*1.72);ctx.lineTo(x-R*0.05,y-R*1.25);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.3,y-R*1.1);ctx.lineTo(x+R*0.6,y-R*1.72);ctx.lineTo(x+R*0.05,y-R*1.25);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FF9999';
  ctx.beginPath();ctx.moveTo(x-R*0.32,y-R*1.14);ctx.lineTo(x-R*0.54,y-R*1.6);ctx.lineTo(x-R*0.1,y-R*1.28);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.32,y-R*1.14);ctx.lineTo(x+R*0.54,y-R*1.6);ctx.lineTo(x+R*0.1,y-R*1.28);ctx.closePath();ctx.fill();
  ctx.fillStyle='#9999CC';ctx.beginPath();ctx.ellipse(x,y-R*0.72,8,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#220022';ctx.beginPath();ctx.ellipse(x,y-R*0.8,4,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFDD00';ctx.beginPath();ctx.arc(x-8,y-R*0.98,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+8,y-R*0.98,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x-8,y-R*0.98,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+8,y-R*0.98,2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawJamie(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,flash:boolean,fieldActive:boolean,ultReady:boolean){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,bounce=Math.sin(walk*0.5)*2;
  const bodyCol=fieldActive?'#CC44FF':ultReady?'#AA33EE':'#7722BB';
  if(fieldActive||ultReady){ctx.shadowColor='#CC44FF';ctx.shadowBlur=14;}
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.05,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bodyCol;ctx.beginPath();ctx.arc(x,y+bounce,R,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#1A0033';
  for(const dp of [{dx:-9,dy:-3},{dx:5,dy:-9},{dx:9,dy:5},{dx:-4,dy:8},{dx:1,dy:-1},{dx:-6,dy:6}])
    {ctx.beginPath();ctx.arc(x+dp.dx,y+dp.dy+bounce,2.8,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(x-8,y-R*0.3+bounce,5.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+8,y-R*0.3+bounce,5.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x-7,y-R*0.3+bounce,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+9,y-R*0.3+bounce,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(x-6,y-R*0.35+bounce,1.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+10,y-R*0.35+bounce,1.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bodyCol;
  ctx.beginPath();ctx.ellipse(x-R*0.92,y+bounce,5,9,-.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(x+R*0.92,y+bounce,5,9,.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawFork(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,flash:boolean,chargeState:string,aimX:number,aimY:number,attFlash:number){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,sw=Math.sin(walk)*0.5;
  if(chargeState==='charging'){
    ctx.strokeStyle='#FFAA00';ctx.lineWidth=2;ctx.globalAlpha=0.4;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x-35-i*8,y-12+i*7);ctx.lineTo(x-12-i*8,y-12+i*7);ctx.stroke();}
    ctx.globalAlpha=flash?0.4:1;
  }
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.1,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#554422';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-8,y+R*0.4);ctx.lineTo(x-10+sw*6,y+R+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8,y+R*0.4);ctx.lineTo(x+10-sw*6,y+R+8);ctx.stroke();
  ctx.fillStyle=chargeState==='stuck'?'#884400':'#7B5022';
  ctx.beginPath();ctx.ellipse(x,y,R*0.9,R,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#CCCCCC';ctx.beginPath();ctx.moveTo(x-R*0.5,y-R*0.3);ctx.lineTo(x-R*0.45,y+R*0.8);ctx.lineTo(x+R*0.45,y+R*0.8);ctx.lineTo(x+R*0.5,y-R*0.3);ctx.closePath();ctx.fill();
  ctx.fillStyle='#D4A074';ctx.beginPath();ctx.arc(x,y-R*0.88,R*0.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#EEEEEE';ctx.beginPath();ctx.arc(x,y-R*1.1,R*0.42,Math.PI,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x,y-R*0.65,R*0.36,0.1,Math.PI-0.1);ctx.fill();
  ctx.strokeStyle='#333';ctx.lineWidth=2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-7,y-R*0.9);ctx.lineTo(x-3,y-R*0.88);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+3,y-R*0.9);ctx.lineTo(x+7,y-R*0.88);ctx.stroke();
  const forkLen=attFlash>0?100:56,perpX=-aimY,perpY=aimX;
  const fbx=x+aimX*R*0.4,fby=y+aimY*R*0.4;
  ctx.strokeStyle='#BBBBBB';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(fbx-aimX*10,fby-aimY*10);ctx.lineTo(fbx+aimX*(forkLen*0.55),fby+aimY*(forkLen*0.55));ctx.stroke();
  ctx.lineWidth=3;
  for(const s of [-1,0,1]){ctx.beginPath();ctx.moveTo(fbx+aimX*forkLen*0.5+perpX*s*10,fby+aimY*forkLen*0.5+perpY*s*10);ctx.lineTo(fbx+aimX*forkLen+perpX*s*10,fby+aimY*forkLen+perpY*s*10);ctx.stroke();}
  if(chargeState==='windup'){ctx.globalAlpha=0.9;ctx.fillStyle='#FF6600';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('!!',x,y-R-14);}
  if(chargeState==='stuck'){ctx.globalAlpha=0.9;ctx.fillStyle='#FFAAAA';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('×_×',x,y-R-14);}
  ctx.restore();
}

// ─── Micro-helpers ────────────────────────────────────────────────────────────
function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
function d2(ax:number,ay:number,bx:number,by:number){const dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy);}
function rnd(a:number,b:number){return a+Math.random()*(b-a);}
function mkP(x:number,y:number,vx:number,vy:number,life:number,col:string,r:number):Par{return{x,y,vx,vy,life,ml:life,col,r};}
function hitEnemy(g:GS,dmg:number){g.eHp=Math.max(0,g.eHp-dmg);g.eFlash=0.18;if(g.eHp<=0&&!g.over){g.over=true;g.won=true;}}
function sparks(g:GS,x:number,y:number,col:string){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*110;g.pars.push(mkP(x,y,Math.cos(a)*s,Math.sin(a)*s,0.45,col,3+Math.random()*4));}}
function spawnBlt(g:GS,dx:number,dy:number,dmg:number,homing:boolean,col:string,br:number,slow?:number,slowDur?:number){
  const l=Math.sqrt(dx*dx+dy*dy)||1;
  g.bullets.push({x:g.px,y:g.py,vx:(dx/l)*SHOT_SPEED,vy:(dy/l)*SHOT_SPEED,dmg,d:0,homing,br,col,slow,slowDur});
}
