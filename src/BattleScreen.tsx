/**
 * BattleScreen — ポチっとな & ギャンブラー斎藤
 * Left half: virtual joystick / Right half: attack (top-right: ultimate)
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface BattleScreenProps {
  charId: string;
  level: number;
  onFinish: (won: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_R = 26, ENEMY_R = 30;
const PLAYER_SPEED = 190, ENEMY_SPEED = 72, ENEMY_DPS = 120;

// ポチっとな
const RUSH_SPEED = 960, RUSH_DIST = 230;
const POCHI_AMMO = 3, POCHI_RELOAD = 4;
const TOASTER_MAX = 12, BURN_DPS = 400, BURN_DUR = 3, BONUS = 1.5;

// ギャンブラー斎藤
const SHOT_SPEED = 480, SHOT_RANGE = 380;
const ULT_CHARGE_MAX = 10000, ULT_DURATION = 5, ULT_HEAL_PER_SEC = 3000;

function pochiStats(lv: number) {
  const t = (Math.max(1, Math.min(5, lv)) - 1) / 4;
  return { hp: Math.round(6000 + t * 6000), atk: Math.round(1000 + t * 1300) };
}
function saitoStats(lv: number) {
  const t = (Math.max(1, Math.min(5, lv)) - 1) / 4;
  return {
    hp:   Math.round(4300 + t * 4300),
    miss: Math.round(500  + t * 500),
    hit:  Math.round(1000 + t * 1000),
    mid:  Math.round(1500 + t * 1500),
  };
}
function saitoCfg(ratio: number) {
  if (ratio >= 0.90) return { max: 2, reload: 1 };
  if (ratio >= 0.75) return { max: 4, reload: 2 };
  if (ratio >  0.30) return { max: 6, reload: 3 };
  return                    { max: 8, reload: 4 };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pt  { x: number; y: number }
interface Par { x:number;y:number;vx:number;vy:number;life:number;ml:number;col:string;r:number }
interface Blt { x:number;y:number;vx:number;vy:number;dmg:number;d:number;homing:boolean }
type ShotT = 'miss'|'hit'|'mid';
interface QShot { t: number; fired: boolean; dx: number; dy: number; dmg: number }

interface GS {
  px:number;py:number;pdx:number;pdy:number;
  pHp:number;pMax:number;aimX:number;aimY:number;
  walk:number;hitFlash:number;
  ex:number;ey:number;eHp:number;eMax:number;eFlash:number;
  burnT:number;
  pars:Par[];bullets:Blt[];
  over:boolean;won:boolean;
  // pochi
  rushing:boolean;rsx:number;rsy:number;rdx:number;rdy:number;rtrav:number;
  ammo:number;relT:number;gaugeT:number;gaugeMax:boolean;
  atk:number;
  // saito
  sAmmo:number;sRelT:number;sCool:number;
  qshots:QShot[];qTimer:number;qFiring:boolean;
  ultCharge:number;ultReady:boolean;ultActive:boolean;ultTimer:number;
  lastShot:ShotT|null;
  missAtk:number;hitAtk:number;midAtk:number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BattleScreen({ charId, level, onFinish }: BattleScreenProps) {
  const isPochi = charId === 'char_pochi';
  const cvs  = useRef<HTMLCanvasElement>(null);
  const gs   = useRef<GS | null>(null);
  const left = useRef({ on:false, sx:0, sy:0, dx:0, dy:0 });
  const atk  = useRef(false);
  const ult  = useRef(false);
  const raf  = useRef(0);
  const prev = useRef(0);

  const [ui, setUi] = useState({
    pHp:1,pMax:1,eHp:1,eMax:1,
    ammo:1,maxAmmo:1,
    gauge:0,gaugeMax:false,
    shotT:null as ShotT|null,
    ultCharge:0,ultReady:false,ultActive:false,
    qFiring:false,
  });

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = cvs.current!;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const W = c.width, H = c.height;
    const ps = isPochi ? pochiStats(level) : saitoStats(level);
    const initA = isPochi ? POCHI_AMMO : saitoCfg(1).max;
    gs.current = {
      px:W*0.3,py:H*0.5,pdx:0,pdy:0,
      pHp:ps.hp,pMax:ps.hp,aimX:1,aimY:0,
      walk:0,hitFlash:0,
      ex:W*0.72,ey:H*0.5,eHp:4500,eMax:4500,eFlash:0,
      burnT:0,pars:[],bullets:[],over:false,won:false,
      rushing:false,rsx:0,rsy:0,rdx:1,rdy:0,rtrav:0,
      ammo:initA,relT:0,gaugeT:0,gaugeMax:false,
      atk:(ps as any).atk??0,
      sAmmo:initA,sRelT:0,sCool:0,
      qshots:[],qTimer:0,qFiring:false,
      ultCharge:0,ultReady:false,ultActive:false,ultTimer:0,
      lastShot:null,
      missAtk:(ps as any).miss??0,
      hitAtk:(ps as any).hit??0,
      midAtk:(ps as any).mid??0,
    };
    const onR = () => { c.width=window.innerWidth; c.height=window.innerHeight; };
    window.addEventListener('resize',onR);
    return () => window.removeEventListener('resize',onR);
  }, [charId,level,isPochi]);

  // ── loop ──────────────────────────────────────────────────────────────────
  const loop = useCallback((ts:number)=>{
    const g = gs.current, c = cvs.current;
    if(!g||!c) return;
    const dt = Math.min((ts-prev.current)/1000, 0.05);
    prev.current = ts;
    const W=c.width, H=c.height;

    if(!g.over){
      // ── common: movement ──
      const lr=left.current;
      if(lr.on){ g.pdx=lr.dx; g.pdy=lr.dy;
        const l=Math.sqrt(lr.dx*lr.dx+lr.dy*lr.dy)||1;
        if(l>0.05){ g.aimX=lr.dx/l; g.aimY=lr.dy/l; }
      } else { g.pdx*=0.7; g.pdy*=0.7; }
      if(Math.abs(g.pdx)>0.05||Math.abs(g.pdy)>0.05) g.walk+=dt*8;
      g.px = clamp(g.px+g.pdx*PLAYER_SPEED*dt, PLAYER_R, W-PLAYER_R);
      g.py = clamp(g.py+g.pdy*PLAYER_SPEED*dt, PLAYER_R, H-PLAYER_R);

      if(isPochi){ updatePochi(g,dt,W,H,atk); }
      else        { updateSaito(g,dt,W,H,atk,ult); }

      // enemy AI
      const edx=g.px-g.ex, edy=g.py-g.ey;
      const ed=Math.sqrt(edx*edx+edy*edy)||1;
      if(ed>PLAYER_R+ENEMY_R+4){ g.ex+=(edx/ed)*ENEMY_SPEED*dt; g.ey+=(edy/ed)*ENEMY_SPEED*dt; }
      else { g.pHp=Math.max(0,g.pHp-ENEMY_DPS*dt); g.hitFlash=0.12; if(g.pHp<=0){g.over=true;g.won=false;} }

      // burn
      if(g.burnT>0){
        g.burnT-=dt; g.eHp=Math.max(0,g.eHp-BURN_DPS*dt);
        if(g.eHp<=0&&!g.over){g.over=true;g.won=true;}
        if(Math.random()<0.4) g.pars.push(mkPar(g.ex+rand(-12,12),g.ey+rand(-12,12),rand(-30,30),rand(-70,-20),0.5,'#FF4400',4));
      }

      // particles
      g.pars=g.pars.filter(p=>p.life>0);
      for(const p of g.pars){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.life-=dt;}
      if(g.eFlash>0)  g.eFlash-=dt;
      if(g.hitFlash>0) g.hitFlash-=dt;
    }

    draw(g,c,isPochi);
    setUi({
      pHp:g.pHp,pMax:g.pMax,eHp:g.eHp,eMax:g.eMax,
      ammo:isPochi?g.ammo:g.sAmmo,
      maxAmmo:isPochi?POCHI_AMMO:saitoCfg(g.pHp/g.pMax).max,
      gauge:g.gaugeT,gaugeMax:g.gaugeMax,
      shotT:g.lastShot,ultCharge:g.ultCharge,
      ultReady:g.ultReady,ultActive:g.ultActive,qFiring:g.qFiring,
    });

    if(g.over){ setTimeout(()=>onFinish(g.won),1200); return; }
    raf.current=requestAnimationFrame(loop);
  },[onFinish,isPochi]);

  useEffect(()=>{
    prev.current=performance.now();
    raf.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(raf.current);
  },[loop]);

  // ── touch ─────────────────────────────────────────────────────────────────
  const ts = useCallback((e:React.TouchEvent)=>{
    e.preventDefault();
    const W=window.innerWidth,H=window.innerHeight;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2){ left.current={on:true,sx:t.clientX,sy:t.clientY,dx:0,dy:0}; }
      else if(t.clientY<H*0.3){ ult.current=true; }
      else { atk.current=true; }
    }
  },[]);
  const tm = useCallback((e:React.TouchEvent)=>{
    e.preventDefault();
    const W=window.innerWidth;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2){
        const lr=left.current;
        if(!lr.on) continue;
        const dx=t.clientX-lr.sx, dy=t.clientY-lr.sy;
        const len=Math.sqrt(dx*dx+dy*dy)||1, cap=Math.min(len,60);
        left.current.dx=(dx/len)*cap/60; left.current.dy=(dy/len)*cap/60;
      }
    }
  },[]);
  const te = useCallback((e:React.TouchEvent)=>{
    e.preventDefault();
    const W=window.innerWidth;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<W/2){ left.current={on:false,sx:0,sy:0,dx:0,dy:0}; }
      else { atk.current=false; ult.current=false; }
    }
  },[]);

  // ── HUD ───────────────────────────────────────────────────────────────────
  const gRatio = Math.min(ui.gauge/TOASTER_MAX,1);
  const uPct   = Math.min(ui.ultCharge/ULT_CHARGE_MAX,1);

  return (
    <div className="fixed inset-0 select-none touch-none overflow-hidden bg-[#120B2E]"
      onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}>
      <canvas ref={cvs} className="absolute inset-0" />

      {/* Player HP */}
      <div className="absolute top-4 left-4 z-10">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]/70">
          {isPochi?'ポチっとな':'ギャンブラー斎藤'}
        </div>
        <div className="w-36 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 mt-1">
          <div className="h-full rounded-full" style={{
            width:`${(ui.pHp/ui.pMax)*100}%`,
            background:ui.pHp>ui.pMax*0.5?'#00F0FF':'#FF4D8D',
            transition:'width 0.1s'
          }}/>
        </div>
        <div className="text-[10px] text-white/50 mt-0.5">{Math.ceil(ui.pHp)}/{ui.pMax}</div>
      </div>

      {/* Enemy HP */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#FF00E5]/70">エネミー</div>
        <div className="w-36 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 mt-1">
          <div className="h-full rounded-full bg-[#FF00E5]" style={{width:`${(ui.eHp/ui.eMax)*100}%`,transition:'width 0.1s'}}/>
        </div>
        <div className="text-[10px] text-white/50 mt-0.5">{Math.ceil(ui.eHp)}/{ui.eMax}</div>
      </div>

      {/* ポチっとな HUD */}
      {isPochi&&(
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest" style={{color:ui.gaugeMax?'#FF6600':'#AAAAAA'}}>
            {ui.gaugeMax?'🔥 MAX HEAT':`🍞 トースター ${Math.floor(gRatio*100)}%`}
          </div>
          <div className="w-40 h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <div className="h-full rounded-full" style={{
              width:`${gRatio*100}%`,
              background:ui.gaugeMax?'linear-gradient(90deg,#FF4400,#FFCC00)':'linear-gradient(90deg,#888,#CC4400)',
              boxShadow:ui.gaugeMax?'0 0 8px #FF6600':'none',
            }}/>
          </div>
          <div className="flex gap-3 mt-1">
            {Array.from({length:POCHI_AMMO}).map((_,i)=>(
              <div key={i} className="w-4 h-4 rounded-full border-2 border-white/30" style={{
                background:i<ui.ammo?'#FFEE00':'transparent',
                boxShadow:i<ui.ammo?'0 0 6px #FFEE00':'none',
              }}/>
            ))}
          </div>
        </div>
      )}

      {/* ギャンブラー斎藤 HUD */}
      {!isPochi&&(
        <>
          {/* ultimate gauge - top center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{color:ui.ultReady?'#FFD700':'#888'}}>
              {ui.ultReady?'✨ 必殺技 READY':`必殺技 ${Math.floor(uPct*100)}%`}
            </div>
            <div className="w-28 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full" style={{
                width:`${uPct*100}%`,
                background:'linear-gradient(90deg,#FFD700,#FF6600)',
                boxShadow:ui.ultReady?'0 0 8px #FFD700':'none',
              }}/>
            </div>
          </div>
          {/* bottom center: ammo + shot type */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            {ui.shotT&&(
              <div className="px-3 py-1 rounded-full font-black text-xs uppercase tracking-widest" style={{
                background:ui.shotT==='miss'?'#444':ui.shotT==='hit'?'#FF00E5':'#00F0FF',
                color:ui.shotT==='miss'?'#aaa':'#000',
              }}>
                {ui.shotT==='miss'?'外れ…':ui.shotT==='hit'?'当たり！':'中当たり！'}
              </div>
            )}
            {ui.qFiring&&<div className="text-[10px] text-yellow-300 font-black animate-pulse">発射中...</div>}
            <div className="flex gap-2 flex-wrap justify-center" style={{maxWidth:'220px'}}>
              {Array.from({length:ui.maxAmmo}).map((_,i)=>(
                <div key={i} className="w-3.5 h-3.5 rounded-full border-2 border-white/20" style={{
                  background:i<ui.ammo?'#FF00E5':'transparent',
                  boxShadow:i<ui.ammo?'0 0 5px #FF00E5':'none',
                }}/>
              ))}
            </div>
          </div>
          {/* ultimate button hint top-right */}
          {ui.ultReady&&!ui.ultActive&&(
            <div className="absolute top-14 right-4 z-10 pointer-events-none">
              <div className="w-14 h-14 rounded-full border-4 border-[#FFD700] flex items-center justify-center animate-pulse"
                style={{background:'rgba(255,215,0,0.15)',boxShadow:'0 0 18px #FFD700'}}>
                <span className="text-[10px] font-black text-[#FFD700]">必殺</span>
              </div>
            </div>
          )}
          {ui.ultActive&&(
            <div className="absolute top-14 right-4 z-10 pointer-events-none text-[10px] font-black text-[#FFD700] animate-pulse">
              クライマックス！
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Update: ポチっとな ────────────────────────────────────────────────────────
function updatePochi(g:GS, dt:number, W:number, H:number, atkRef:React.MutableRefObject<boolean>) {
  // toaster gauge
  if(!g.gaugeMax){ g.gaugeT=Math.min(TOASTER_MAX,g.gaugeT+dt); if(g.gaugeT>=TOASTER_MAX) g.gaugeMax=true; }

  // reload
  if(g.ammo<POCHI_AMMO){ g.relT+=dt; if(g.relT>=POCHI_RELOAD){g.ammo=Math.min(POCHI_AMMO,g.ammo+1);g.relT=0;} }

  if(g.rushing){
    const step=RUSH_SPEED*dt;
    g.px=clamp(g.px+g.rdx*step,PLAYER_R,W-PLAYER_R);
    g.py=clamp(g.py+g.rdy*step,PLAYER_R,H-PLAYER_R);
    g.rtrav+=step;
    // hit enemy?
    if(d2(g.px,g.py,g.ex,g.ey)<PLAYER_R+ENEMY_R){
      let dmg=g.atk; if(g.gaugeMax) dmg=Math.round(dmg*BONUS);
      hitEnemy(g,dmg); if(g.gaugeMax) g.burnT=Math.max(g.burnT,BURN_DUR);
      hits(g,g.ex,g.ey,g.gaugeMax?'#FF6600':'#FFEE00');
      g.rushing=false;
    }
    if(g.rtrav>=RUSH_DIST) g.rushing=false;
  } else {
    // trigger rush
    if(atkRef.current&&g.ammo>0){
      atkRef.current=false; g.ammo--; g.relT=0;
      const dx=g.ex-g.px, dy=g.ey-g.py, l=Math.sqrt(dx*dx+dy*dy)||1;
      g.rdx=dx/l; g.rdy=dy/l; g.rsx=g.px; g.rsy=g.py; g.rtrav=0; g.rushing=true;
    }
  }
  // smoke
  if(g.gaugeT/TOASTER_MAX>0.5&&Math.random()<0.18)
    g.pars.push(mkPar(g.px+rand(-6,6),g.py-PLAYER_R-8,rand(-12,12),rand(-35,-18),0.8,g.gaugeMax?'#FF8800':'#999',3));
}

// ─── Update: ギャンブラー斎藤 ─────────────────────────────────────────────────
function updateSaito(g:GS,dt:number,W:number,H:number,atkRef:React.MutableRefObject<boolean>,ultRef:React.MutableRefObject<boolean>){
  const ratio=g.pHp/g.pMax;
  const cfg=saitoCfg(ratio);
  if(g.sAmmo>cfg.max) g.sAmmo=cfg.max;

  // reload
  if(g.sAmmo<cfg.max){ g.sRelT+=dt; if(g.sRelT>=cfg.reload){g.sAmmo=Math.min(cfg.max,g.sAmmo+1);g.sRelT=0;} }
  if(g.sCool>0) g.sCool-=dt;

  // queued fan shots (外れ)
  if(g.qFiring&&g.qshots.length>0){
    g.qTimer+=dt;
    for(const q of g.qshots){
      if(!q.fired&&g.qTimer>=q.t){
        q.fired=true;
        spawnBlt(g,q.dx,q.dy,q.dmg,false);
      }
    }
    if(g.qshots.every(q=>q.fired)){ g.qshots=[]; g.qFiring=false; }
  }

  // ultimate
  if(ultRef.current&&g.ultReady&&!g.ultActive){
    ultRef.current=false; g.ultActive=true; g.ultTimer=ULT_DURATION; g.ultCharge=0; g.ultReady=false;
  }
  if(g.ultActive){
    g.ultTimer-=dt;
    g.pHp=Math.min(g.pMax,g.pHp+ULT_HEAL_PER_SEC*dt);
    if(g.ultTimer<=0) g.ultActive=false;
  }

  // fire
  if(atkRef.current&&g.sAmmo>0&&g.sCool<=0&&!g.qFiring){
    atkRef.current=false; g.sAmmo--; g.sRelT=0;
    const roll=Math.floor(Math.random()*3);
    const type:ShotT=roll===0?'miss':roll===1?'hit':'mid';
    g.lastShot=type;
    const ax=g.aimX, ay=g.aimY;
    if(type==='miss'){
      // 5 bullets fan, 0.1s apart
      g.qFiring=true; g.qTimer=0;
      g.qshots=[-0.4,-0.2,0,0.2,0.4].map((a,i)=>{
        const c=Math.cos(a),s2=Math.sin(a);
        return {t:i*0.1,fired:false,dx:ax*c-ay*s2,dy:ax*s2+ay*c,dmg:g.missAtk};
      });
    } else if(type==='hit'){
      const px=-ay*0.1, py=ax*0.1;
      spawnBlt(g,ax+px,ay+py,g.hitAtk,false);
      spawnBlt(g,ax-px,ay-py,g.hitAtk,false);
      g.sCool=0.7;
    } else {
      spawnBlt(g,ax,ay,g.midAtk,true);
    }
  }

  // move bullets
  for(const b of g.bullets){
    if(b.homing&&b.d>SHOT_RANGE*0.65){
      const bx=g.ex-b.x,by=g.ey-b.y,bl=Math.sqrt(bx*bx+by*by)||1;
      b.vx+=(bx/bl)*380*dt; b.vy+=(by/bl)*380*dt;
      const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;
      b.vx=(b.vx/spd)*SHOT_SPEED; b.vy=(b.vy/spd)*SHOT_SPEED;
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    b.d+=Math.sqrt(b.vx*b.vx+b.vy*b.vy)*dt;
  }
  g.bullets=g.bullets.filter(b=>{
    if(b.d>SHOT_RANGE) return false;
    if(d2(b.x,b.y,g.ex,g.ey)<ENEMY_R+9){
      hitEnemy(g,b.dmg);
      g.ultCharge=Math.min(ULT_CHARGE_MAX,g.ultCharge+b.dmg);
      if(g.ultCharge>=ULT_CHARGE_MAX&&!g.ultReady) g.ultReady=true;
      hits(g,g.ex,g.ey,'#FF00E5');
      return false;
    }
    return true;
  });
}

// ─── Draw ────────────────────────────────────────────────────────────────────
function draw(g:GS,c:HTMLCanvasElement,isPochi:boolean){
  const ctx=c.getContext('2d')!;
  const W=c.width,H=c.height;
  ctx.fillStyle='#120B2E'; ctx.fillRect(0,0,W,H);
  // grid
  ctx.strokeStyle='rgba(0,240,255,0.05)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  // ultimate zone
  if(g.ultActive){
    ctx.save();
    ctx.globalAlpha=0.15+Math.sin(Date.now()/180)*0.06;
    ctx.fillStyle='#FFD700';
    ctx.beginPath();ctx.arc(g.px,g.py,120,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.7;
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.setLineDash([7,5]);
    ctx.beginPath();ctx.arc(g.px,g.py,120,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }

  // particles
  ctx.save();
  for(const p of g.pars){
    ctx.globalAlpha=p.life/p.ml;
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*(p.life/p.ml),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();

  // bullets
  if(!isPochi){
    for(const b of g.bullets){
      ctx.save();
      ctx.shadowColor=b.homing?'#00F0FF':'#FF00E5';ctx.shadowBlur=10;
      ctx.fillStyle=b.homing?'#00F0FF':'#FF00E5';
      ctx.beginPath();ctx.arc(b.x,b.y,b.homing?9:7,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }

  // rush trail
  if(isPochi&&g.rushing){
    ctx.save();ctx.strokeStyle=g.gaugeMax?'#FF6600':'#FFEE00';ctx.lineWidth=5;ctx.globalAlpha=0.28;
    ctx.beginPath();ctx.moveTo(g.rsx,g.rsy);ctx.lineTo(g.px,g.py);ctx.stroke();ctx.restore();
  }

  drawEnemy(ctx,g.ex,g.ey,g.eFlash>0,g.burnT>0);
  if(isPochi) drawPochi(ctx,g.px,g.py,g.walk,g.gaugeT/TOASTER_MAX,g.gaugeMax,g.rushing,g.hitFlash>0);
  else        drawSaito(ctx,g.px,g.py,g.walk,g.hitFlash>0,g.ultActive);

  if(g.over){
    ctx.save();
    ctx.fillStyle=g.won?'#00F0FF':'#FF4D8D';
    ctx.font='bold 76px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=28;
    ctx.fillText(g.won?'勝利！':'敗北...',W/2,H/2);ctx.restore();
  }
}

function drawEnemy(ctx:CanvasRenderingContext2D,x:number,y:number,flash:boolean,burn:boolean){
  ctx.save();
  ctx.shadowColor=burn?'#FF4400':'#FF00E5';ctx.shadowBlur=burn?20:10;
  ctx.fillStyle=flash?'#FFF':burn?'#FF3300':'#CC00BB';
  ctx.beginPath();
  for(let i=0;i<16;i++){
    const a=(i/16)*Math.PI*2-Math.PI/2;
    const r=i%2===0?ENEMY_R:ENEMY_R*0.64;
    if(i===0)ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    else      ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
  }
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFF';
  ctx.beginPath();ctx.arc(x-8,y-6,5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+8,y-6,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.arc(x-7,y-5,2.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+9,y-5,2.5,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawPochi(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,gR:number,gMax:boolean,rush:boolean,flash:boolean){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,col='#C8860A';
  const tc=gMax?'#FF6600':gR>0.5?'#CC4400':'#888';
  const sw=Math.sin(walk)*0.5;
  // shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.1,5,0,0,Math.PI*2);ctx.fill();
  // legs
  ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-8,y+R*0.4);ctx.lineTo(x-10+sw*8,y+R+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8,y+R*0.4);ctx.lineTo(x+10-sw*8,y+R+8);ctx.stroke();
  // body
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,R*0.85,R,0,0,Math.PI*2);ctx.fill();
  // toaster
  ctx.fillStyle=tc;ctx.fillRect(x+R*0.4,y-R*0.7,R*0.7,R*0.9);
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(x+R*0.5,y-R*0.6,4,R*0.4);ctx.fillRect(x+R*0.72,y-R*0.6,4,R*0.4);
  if(gR>0.3){
    ctx.save();ctx.globalAlpha=gR*0.5;ctx.shadowColor='#FF6600';ctx.shadowBlur=12*gR;
    ctx.fillStyle='#FF8800';ctx.fillRect(x+R*0.4,y-R*0.7,R*0.7,R*0.9);ctx.restore();
  }
  // head
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x-4,y-R*0.85,R*0.6,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-R*0.5,y-R*1.1);ctx.lineTo(x-R*0.8,y-R*1.6);ctx.lineTo(x-R*0.15,y-R*1.2);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.1,y-R*1.1);ctx.lineTo(x+R*0.35,y-R*1.55);ctx.lineTo(x+R*0.5,y-R*1.1);ctx.closePath();ctx.fill();
  ctx.fillStyle='#3A1A00';ctx.beginPath();ctx.ellipse(x-1,y-R*0.78,4,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1A0A00';
  ctx.beginPath();ctx.arc(x-9,y-R*0.95,3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+2,y-R*0.95,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFF';
  ctx.beginPath();ctx.arc(x-8,y-R*0.97,1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+3,y-R*0.97,1,0,Math.PI*2);ctx.fill();
  if(rush){
    ctx.strokeStyle='#FFEE00';ctx.lineWidth=2;ctx.globalAlpha=0.35;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-R-5,y-8+i*8);ctx.lineTo(x-R-26,y-8+i*8);ctx.stroke();}
  }
  ctx.restore();
}

function drawSaito(ctx:CanvasRenderingContext2D,x:number,y:number,walk:number,flash:boolean,ult:boolean){
  ctx.save();if(flash)ctx.globalAlpha=0.4;
  const R=PLAYER_R,col='#6666AA';
  const sw=Math.sin(walk)*0.5;
  if(ult){ctx.shadowColor='#FFD700';ctx.shadowBlur=18;}
  // shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+R+4,R*1.1,5,0,0,Math.PI*2);ctx.fill();
  // legs
  ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-8,y+R*0.4);ctx.lineTo(x-10+sw*8,y+R+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8,y+R*0.4);ctx.lineTo(x+10-sw*8,y+R+8);ctx.stroke();
  // tail
  ctx.strokeStyle=col;ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(x-R*0.5,y+R*0.3);ctx.quadraticCurveTo(x-R*1.4,y+R*0.8,x-R*1.2,y-R*0.3);ctx.stroke();
  // body
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,R*0.85,R,0,0,Math.PI*2);ctx.fill();
  // tie detail
  ctx.fillStyle='#444488';ctx.beginPath();ctx.moveTo(x-5,y-R*0.2);ctx.lineTo(x,y-R*0.7);ctx.lineTo(x+5,y-R*0.2);ctx.closePath();ctx.fill();
  // head
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y-R*0.85,R*0.62,0,Math.PI*2);ctx.fill();
  // pointed ears
  ctx.fillStyle=col;
  ctx.beginPath();ctx.moveTo(x-R*0.3,y-R*1.1);ctx.lineTo(x-R*0.6,y-R*1.72);ctx.lineTo(x-R*0.05,y-R*1.25);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.3,y-R*1.1);ctx.lineTo(x+R*0.6,y-R*1.72);ctx.lineTo(x+R*0.05,y-R*1.25);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FF9999';
  ctx.beginPath();ctx.moveTo(x-R*0.32,y-R*1.14);ctx.lineTo(x-R*0.54,y-R*1.6);ctx.lineTo(x-R*0.1,y-R*1.28);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+R*0.32,y-R*1.14);ctx.lineTo(x+R*0.54,y-R*1.6);ctx.lineTo(x+R*0.1,y-R*1.28);ctx.closePath();ctx.fill();
  // snout
  ctx.fillStyle='#9999CC';ctx.beginPath();ctx.ellipse(x,y-R*0.72,8,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#220022';ctx.beginPath();ctx.ellipse(x,y-R*0.8,4,3,0,0,Math.PI*2);ctx.fill();
  // sharp eyes
  ctx.fillStyle='#FFDD00';
  ctx.beginPath();ctx.arc(x-8,y-R*0.98,4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+8,y-R*0.98,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.arc(x-8,y-R*0.98,2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+8,y-R*0.98,2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

// ─── Micro-helpers ───────────────────────────────────────────────────────────
function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
function d2(ax:number,ay:number,bx:number,by:number){const dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy);}
function rand(a:number,b:number){return a+Math.random()*(b-a);}
function mkPar(x:number,y:number,vx:number,vy:number,life:number,col:string,r:number):Par{return{x,y,vx,vy,life,ml:life,col,r};}
function hitEnemy(g:GS,dmg:number){g.eHp=Math.max(0,g.eHp-dmg);g.eFlash=0.2;if(g.eHp<=0&&!g.over){g.over=true;g.won=true;}}
function hits(g:GS,x:number,y:number,col:string){for(let i=0;i<11;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*120;g.pars.push(mkPar(x,y,Math.cos(a)*s,Math.sin(a)*s,0.45,col,4+Math.random()*4));}}
function spawnBlt(g:GS,dx:number,dy:number,dmg:number,homing:boolean){const l=Math.sqrt(dx*dx+dy*dy)||1;g.bullets.push({x:g.px,y:g.py,vx:(dx/l)*SHOT_SPEED,vy:(dy/l)*SHOT_SPEED,dmg,d:0,homing});}
