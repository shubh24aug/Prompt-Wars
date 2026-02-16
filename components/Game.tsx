
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, LevelConfig, Vector2, Entity, WeatherType } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, PLAYER_SIZE, HITBOX_MARGIN } from '../constants';
import WeatherOverlay from './WeatherOverlay';

interface Props {
  config: LevelConfig;
  onGameOver: () => void;
  onSuccess: () => void;
  onScoreUpdate: (points: number) => void;
}

const CAR_STYLES = [
  { color: '#ef4444', size: { x: 75, y: 35 } },
  { color: '#3b82f6', size: { x: 75, y: 35 } },
  { color: '#f59e0b', size: { x: 85, y: 30 } },
  { color: '#10b981', size: { x: 105, y: 50 } },
];

class SoundEngine {
  private static ctx: AudioContext | null = null;
  static init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  static play(type: 'jump' | 'hit' | 'win') {
    this.init();
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain); gain.connect(this.ctx!.destination);
    const now = this.ctx!.currentTime;
    if (type === 'jump') {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      osc.start(); osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.1, now);
      osc.start(); osc.stop(now + 0.2);
    } else if (type === 'win') {
      // Added handling for 'win' sound effect
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      osc.start(); osc.stop(now + 0.3);
    }
  }
}

const Game: React.FC<Props> = ({ config, onGameOver, onSuccess, onScoreUpdate }) => {
  const worldRef = useRef({
    player: { x: 100, y: GROUND_Y - PLAYER_SIZE.y, vx: 0, vy: 0 },
    entities: [] as Entity[],
    cameraX: 0,
    levelWidth: 5000,
    goalX: 4500,
    isJumping: false,
    coyoteTime: 0,
    jumpBuffer: 0,
    lastScoreX: 100
  });

  const [_, setFrame] = useState(0); 
  const [countdown, setCountdown] = useState(3);
  const [cleared, setCleared] = useState(false);
  
  const keys = useRef<Record<string, boolean>>({});
  // Fixed: useRef expects 1 argument (initial value). 
  // Line 64 was likely the rafRef declaration which had 0 arguments in some strict environments.
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const w = worldRef.current;
    const ents: Entity[] = [];
    ents.push({ id: 'goal', pos: { x: w.goalX, y: GROUND_Y - 120 }, size: { x: 120, y: 120 }, vel: { x: 0, y: 0 }, type: 'goal' });
    
    const trafficGap = 1500 - (config.trafficDensity * 110);
    for (let i = 800; i < w.goalX - 400; i += trafficGap) {
      const style = CAR_STYLES[Math.floor(Math.random() * CAR_STYLES.length)];
      ents.push({
        id: `car-${i}`,
        pos: { x: i, y: GROUND_Y - style.size.y },
        size: style.size,
        vel: { x: -(2.5 + Math.random() * 2.5), y: 0 },
        type: 'car'
      });
      if (Math.random() > 0.4) {
        ents.push({ id: `plat-${i}`, pos: { x: i + 350, y: GROUND_Y - 100 }, size: { x: 140, y: 25 }, vel: { x: 0, y: 0 }, type: 'platform' });
      }
    }
    w.entities = ents;
  }, [config]);

  const loop = useCallback(() => {
    if (countdown > 0 || cleared) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const w = worldRef.current;
    const p = w.player;

    let ax = 0;
    if (keys.current['ArrowRight'] || keys.current['d']) ax += 1;
    if (keys.current['ArrowLeft'] || keys.current['a']) ax -= 1;

    const friction = config.friction || 0.8;
    const speedMult = config.weather === WeatherType.SNOWY ? 0.75 : 1;
    const targetVx = ax * MOVE_SPEED * speedMult;
    p.vx += (targetVx - p.vx) * (1 - friction);
    p.vx += (config.windSpeed * 0.03);
    p.vy += GRAVITY;

    const nextX = p.x + p.vx;
    const nextY = p.y + p.vy;

    let onGround = false;
    if (nextY + PLAYER_SIZE.y >= GROUND_Y) {
      p.y = GROUND_Y - PLAYER_SIZE.y;
      p.vy = 0;
      onGround = true;
    } else {
      p.y = nextY;
    }
    p.x = Math.max(0, Math.min(nextX, w.levelWidth - PLAYER_SIZE.x));

    if (onGround) { w.coyoteTime = 8; w.isJumping = false; } else { w.coyoteTime--; }
    if (keys.current[' '] || keys.current['ArrowUp'] || keys.current['w']) w.jumpBuffer = 10; else w.jumpBuffer--;

    if (w.jumpBuffer > 0 && w.coyoteTime > 0 && !w.isJumping) {
      p.vy = JUMP_FORCE;
      w.isJumping = true;
      w.coyoteTime = 0;
      w.jumpBuffer = 0;
      SoundEngine.play('jump');
    }

    w.entities.forEach(ent => {
      if (ent.type === 'car') {
        ent.pos.x += ent.vel.x;
        if (ent.pos.x < -200) ent.pos.x = w.levelWidth;
      }

      const margin = ent.type === 'car' ? HITBOX_MARGIN : 0;
      const isColliding = (
        p.x + margin < ent.pos.x + ent.size.x - margin &&
        p.x + PLAYER_SIZE.x - margin > ent.pos.x + margin &&
        p.y + margin < ent.pos.y + ent.size.y - margin &&
        p.y + PLAYER_SIZE.y - margin > ent.pos.y + margin
      );

      if (isColliding) {
        if (ent.type === 'car') { SoundEngine.play('hit'); onGameOver(); }
        else if (ent.type === 'goal') { setCleared(true); SoundEngine.play('win'); setTimeout(onSuccess, 2000); }
        else if (ent.type === 'platform') {
          if (p.vy > 0 && p.y + PLAYER_SIZE.y <= ent.pos.y + 15) {
            p.y = ent.pos.y - PLAYER_SIZE.y;
            p.vy = 0;
            w.coyoteTime = 8;
            w.isJumping = false;
          }
        }
      }
    });

    if (p.x > w.lastScoreX + 100) { onScoreUpdate(10); w.lastScoreX = p.x; }

    const targetCamX = Math.max(0, Math.min(p.x - CANVAS_WIDTH / 2, w.levelWidth - CANVAS_WIDTH));
    w.cameraX += (targetCamX - w.cameraX) * 0.1;

    setFrame(f => f + 1);
    rafRef.current = requestAnimationFrame(loop);
  }, [countdown, cleared, onGameOver, onSuccess, onScoreUpdate, config]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current[e.key] = true;
    const up = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const w = worldRef.current;
  const progress = Math.min(100, Math.max(0, ((w.player.x - 100) / (w.goalX - 100)) * 100));

  return (
    <div className="relative w-full h-[320px] overflow-hidden bg-slate-900 shadow-inner" role="application" aria-label="Mario Rush Hour Simulation">
      <div className={`absolute inset-0 transition-colors duration-1000 ${
        config.weather === WeatherType.RAINY ? 'bg-slate-800' :
        config.weather === WeatherType.SNOWY ? 'bg-indigo-100' :
        config.weather === WeatherType.FOGGY ? 'bg-gray-400' : 'bg-sky-400'
      }`} />

      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-2 bg-black/40 rounded-full z-50 p-0.5 border border-white/10">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative h-full" style={{ transform: `translateX(${-w.cameraX}px)` }}>
        <div className="absolute w-[6000px] h-[30px] bg-slate-800 border-t-2 border-slate-700" style={{ top: GROUND_Y }} />
        
        {w.entities.map(ent => (
          <div key={ent.id} className="absolute overflow-hidden" style={{ left: ent.pos.x, top: ent.pos.y, width: ent.size.x, height: ent.size.y }}>
            {ent.type === 'car' ? (
              <div className="w-full h-full rounded shadow-md border-t-2 border-white/20" style={{ backgroundColor: (ent as any).color || '#ef4444' }}>
                 <div className="absolute top-1 left-1 w-3 h-1.5 bg-white/30" />
                 <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-yellow-400/80 rounded-full" />
              </div>
            ) : ent.type === 'goal' ? (
              <div className="bg-white border-4 border-blue-600 w-full h-full flex flex-col items-center justify-center text-blue-900 font-bold p-2 shadow-xl">
                <i className="fas fa-building text-3xl mb-1" />
                <div className="text-center text-[8px] tracking-tighter uppercase">Mario Corp HQ</div>
              </div>
            ) : (
              <div className="bg-slate-700 w-full h-full rounded-md border-b-2 border-slate-950" />
            )}
          </div>
        ))}

        <div className="absolute z-50" style={{ left: w.player.x, top: w.player.y, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y }}>
          <div className={`w-full h-full relative ${w.player.vx < -0.1 ? '-scale-x-100' : ''}`}>
             <div className="w-full h-1/4 bg-red-600 rounded-t" />
             <div className="w-full h-1/4 bg-orange-200" />
             <div className="w-full h-1/2 bg-blue-700 rounded-b flex items-end">
                <div className="w-full h-1/3 bg-red-600/50" />
             </div>
             <div className="absolute -bottom-0.5 left-0 w-1.5 h-1.5 bg-black rounded-full" />
             <div className="absolute -bottom-0.5 right-0 w-1.5 h-1.5 bg-black rounded-full" />
          </div>
        </div>
      </div>

      {countdown > 0 && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="text-7xl font-black text-white animate-ping">{countdown}</div>
        </div>
      )}

      {cleared && (
        <div className="absolute inset-0 bg-green-600/40 z-[100] flex flex-col items-center justify-center animate-pulse">
           <div className="bg-white p-6 rounded-2xl shadow-2xl text-center">
             <h2 className="text-2xl font-black text-slate-900 mb-1">PUNCHED IN!</h2>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Day Complete</p>
           </div>
        </div>
      )}

      <WeatherOverlay type={config.weather} intensity={config.trafficDensity} />
      {config.visibility < 1 && (
        <div className="absolute inset-0 pointer-events-none z-[45]" style={{ background: `radial-gradient(circle at 50% 50%, transparent 120px, rgba(100,100,110,${1 - config.visibility}) 500px)` }} />
      )}
    </div>
  );
};

export default Game;
