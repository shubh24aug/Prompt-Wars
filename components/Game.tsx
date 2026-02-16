
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

interface CarDetails {
  color: string;
  type: 'sedan' | 'truck' | 'sport';
  size: Vector2;
}

const CAR_STYLES: CarDetails[] = [
  { color: '#ef4444', type: 'sedan', size: { x: 80, y: 40 } },
  { color: '#3b82f6', type: 'sedan', size: { x: 80, y: 40 } },
  { color: '#f59e0b', type: 'sport', size: { x: 90, y: 35 } },
  { color: '#10b981', type: 'truck', size: { x: 120, y: 60 } },
  { color: '#8b5cf6', type: 'sedan', size: { x: 80, y: 40 } },
  { color: '#6b7280', type: 'truck', size: { x: 110, y: 55 } },
];

const playSound = (type: 'jump' | 'hit' | 'win') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'win') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, now + i * 0.1);
      });
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {}
};

const Game: React.FC<Props> = ({ config, onGameOver, onSuccess, onScoreUpdate }) => {
  const [player, setPlayer] = useState<Entity>({
    id: 'player',
    pos: { x: 100, y: GROUND_Y - PLAYER_SIZE.y },
    vel: { x: 0, y: 0 },
    size: PLAYER_SIZE,
    type: 'player'
  });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, life: number}[]>([]);
  const [cameraX, setCameraX] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isLevelCleared, setIsLevelCleared] = useState(false);
  
  const isJumping = useRef(false);
  const coyoteTimeCounter = useRef(0);
  const jumpBufferCounter = useRef(0);
  const lastScoreX = useRef(100);
  const keys = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number>();
  const entitiesRef = useRef<Entity[]>([]);
  const levelWidth = 6000;
  const goalX = levelWidth - 500;

  const carStylesRef = useRef<{ [key: string]: CarDetails }>({});

  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  useEffect(() => {
    const newEntities: Entity[] = [];
    newEntities.push({
      id: 'goal',
      pos: { x: goalX, y: GROUND_Y - 150 },
      size: { x: 150, y: 150 },
      vel: { x: 0, y: 0 },
      type: 'goal'
    });

    const trafficGap = 1400 - (config.trafficDensity * 100);
    for (let i = 800; i < goalX - 300; i += trafficGap) {
      const styleIndex = Math.floor(Math.random() * CAR_STYLES.length);
      const style = CAR_STYLES[styleIndex];
      const carId = `car-${i}`;
      carStylesRef.current[carId] = style;

      newEntities.push({
        id: carId,
        pos: { x: i, y: GROUND_Y - style.size.y },
        size: style.size,
        vel: { x: -(2.5 + (config.levelNumber * 0.4) + Math.random() * 2), y: 0 },
        type: 'car'
      });
      
      if (Math.random() > 0.3) {
        newEntities.push({
          id: `platform-${i}`,
          pos: { x: i + 350, y: GROUND_Y - 140 },
          size: { x: 180, y: 35 },
          vel: { x: 0, y: 0 },
          type: 'platform'
        });
      }
    }
    setEntities(newEntities);
  }, [config]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const hideTut = setTimeout(() => setShowTutorial(false), 5000);
      return () => clearTimeout(hideTut);
    }
  }, [countdown]);

  const update = useCallback(() => {
    if (countdown > 0 || isLevelCleared) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    setPlayer(prev => {
      let inputX = 0;
      if (keys.current['ArrowRight'] || keys.current['d']) inputX += 1;
      if (keys.current['ArrowLeft'] || keys.current['a']) inputX -= 1;

      const speedMult = config.weather === WeatherType.SNOWY ? 0.65 : 1.0;
      const friction = config.friction; 
      let targetVx = inputX * MOVE_SPEED * speedMult;
      let vx = prev.vel.x + (targetVx - prev.vel.x) * (1 - friction);
      vx += (config.windSpeed * 0.04);

      let nextVy = prev.vel.y + GRAVITY;
      let nextX = prev.pos.x + vx;
      let nextY = prev.pos.y + nextVy;

      let onGround = false;
      if (nextY + prev.size.y >= GROUND_Y) {
        nextY = GROUND_Y - prev.size.y;
        nextVy = 0;
        onGround = true;
      }

      if (onGround) {
        coyoteTimeCounter.current = 10;
        isJumping.current = false;
      } else {
        coyoteTimeCounter.current--;
      }

      if (keys.current['ArrowUp'] || keys.current['w'] || keys.current[' ']) {
        jumpBufferCounter.current = 10;
      } else {
        jumpBufferCounter.current--;
      }

      if (jumpBufferCounter.current > 0 && coyoteTimeCounter.current > 0 && !isJumping.current) {
        nextVy = JUMP_FORCE;
        isJumping.current = true;
        coyoteTimeCounter.current = 0;
        jumpBufferCounter.current = 0;
        playSound('jump');
      }

      if (nextX > lastScoreX.current + 100) {
        onScoreUpdate(15);
        lastScoreX.current = nextX;
      }

      entitiesRef.current.forEach(ent => {
        const margin = ent.type === 'car' ? HITBOX_MARGIN : 2;
        const isColliding = (
          nextX + margin < ent.pos.x + ent.size.x - margin &&
          nextX + prev.size.x - margin > ent.pos.x + margin &&
          nextY + margin < ent.pos.y + ent.size.y - margin &&
          nextY + prev.size.y - margin > ent.pos.y + margin
        );

        if (isColliding) {
          if (ent.type === 'car') {
            playSound('hit');
            onGameOver();
          }
          if (ent.type === 'goal') {
            setIsLevelCleared(true);
            playSound('win');
            setTimeout(onSuccess, 3000);
          }
          if (ent.type === 'platform') {
            if (prev.pos.y + prev.size.y <= ent.pos.y + 15 && nextVy >= 0) {
              nextY = ent.pos.y - prev.size.y;
              nextVy = 0;
              onGround = true;
              isJumping.current = false;
              coyoteTimeCounter.current = 10;
            }
          }
        }
      });

      if (nextX < 0) nextX = 0;
      if (nextX > levelWidth - prev.size.x) nextX = levelWidth - prev.size.x;

      return { ...prev, pos: { x: nextX, y: nextY }, vel: { x: vx, y: nextVy } };
    });

    setEntities(prev => prev.map(ent => {
      if (ent.type === 'car') {
        const carSpd = config.weather === WeatherType.SNOWY ? 0.6 : 1;
        let nx = ent.pos.x + (ent.vel.x * carSpd);
        if (nx < -300) nx = levelWidth + 300;
        return { ...ent, pos: { ...ent.pos, x: nx } };
      }
      return ent;
    }));

    setParticles(prev => prev.map(p => ({ ...p, y: p.y - 1, life: p.life - 0.05 })).filter(p => p.life > 0));

    requestRef.current = requestAnimationFrame(update);
  }, [config, countdown, isLevelCleared, onGameOver, onSuccess, onScoreUpdate]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  useEffect(() => {
    const targetCamX = Math.max(0, Math.min(player.pos.x - CANVAS_WIDTH / 2, levelWidth - CANVAS_WIDTH));
    setCameraX(prev => prev + (targetCamX - prev) * 0.15);
  }, [player.pos.x]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const progressValue = Math.min(100, Math.max(0, ((player.pos.x - 100) / (goalX - 100)) * 100));

  return (
    <div className="relative w-full h-[450px] overflow-hidden border-b-8 border-slate-900 shadow-2xl select-none">
      <div className={`absolute inset-0 transition-colors duration-[2000ms] ${
        config.weather === WeatherType.SUNNY ? 'bg-sky-400' :
        config.weather === WeatherType.RAINY ? 'bg-slate-800' :
        config.weather === WeatherType.SNOWY ? 'bg-indigo-100' :
        config.weather === WeatherType.FOGGY ? 'bg-gray-400' :
        config.weather === WeatherType.WINDY ? 'bg-indigo-900' : 'bg-sky-400'
      }`} />

      {/* Progress HUD */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-80 h-7 bg-black/50 rounded-full border border-white/30 z-[60] p-1 shadow-2xl backdrop-blur-sm">
        <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-300 relative" style={{ width: `${progressValue}%` }}>
          <div className="absolute -right-3 -top-3 text-white bg-blue-600 rounded-full w-7 h-7 flex items-center justify-center text-xs border-2 border-white shadow-xl">
             <i className="fas fa-running" />
          </div>
        </div>
        <div className="absolute -right-14 top-0 text-white font-black text-xl flex items-center h-full drop-shadow-lg">
           <i className="fas fa-building" />
        </div>
      </div>

      {countdown > 0 && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="text-9xl font-black text-white animate-bounce drop-shadow-2xl">{countdown}</div>
        </div>
      )}

      {/* LEVEL CLEAR OVERLAY */}
      {isLevelCleared && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in zoom-in duration-500">
           <div className="bg-white p-12 rounded-[4rem] shadow-[0_0_100px_rgba(34,197,94,0.5)] flex flex-col items-center border-[12px] border-green-500 transform scale-125 transition-all">
              <div className="bg-green-500 w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_infinite]">
                 <i className="fas fa-check text-5xl text-white" />
              </div>
              <h2 className="text-5xl font-black text-slate-900 italic tracking-tighter mb-2">PUNCHED IN!</h2>
              <p className="text-green-600 font-black uppercase tracking-[0.2em] text-sm bg-green-50 px-4 py-1 rounded-full">Level Completed</p>
           </div>
           <div className="mt-12 flex gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <i key={i} className="fas fa-star text-yellow-400 text-3xl animate-[ping_1.5s_infinite]" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
           </div>
        </div>
      )}

      {showTutorial && countdown === 0 && !isLevelCleared && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[90] bg-white/95 text-slate-900 px-8 py-3 rounded-full font-black shadow-2xl animate-pulse ring-4 ring-blue-500/20">
           RUN RIGHT! REACH MARIO CORP OFFICE!
        </div>
      )}

      {/* Skyline */}
      <div className="absolute bottom-0 w-[12000px] h-[400px] opacity-[0.07] pointer-events-none" style={{ transform: `translateX(${-cameraX * 0.15}px)` }}>
        <div className="flex items-end gap-3 h-full">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="bg-slate-950 w-28 rounded-t-3xl" style={{ height: `${120 + Math.sin(i * 0.5) * 150}px` }} />
          ))}
        </div>
      </div>

      <div className="relative h-full" style={{ transform: `translateX(${-cameraX}px)` }}>
        {/* Road with REALISTIC BUMPS, CRACKS AND PATCHES */}
        <div className="absolute bottom-0 w-[8000px] h-[60px] bg-slate-800 border-t-4 border-slate-700 overflow-hidden" style={{ top: GROUND_Y }}>
          <div className="flex h-full w-full">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="relative w-80 h-full border-r border-slate-900/40 flex flex-col justify-around px-8">
                 {/* Main Line */}
                 <div className="w-24 h-4 bg-yellow-400/10 rounded-full" />
                 
                 {/* Bumps / Patches */}
                 <div className="absolute top-2 right-12 w-20 h-8 bg-slate-900/30 rounded-xl transform -skew-x-12 blur-[1px]" />
                 <div className="absolute bottom-1 left-20 w-32 h-10 bg-slate-950/20 rounded-full blur-[2px]" />
                 
                 {/* Cracks */}
                 <div className="absolute top-4 left-4 w-12 h-[2px] bg-slate-950/40 transform rotate-12" />
                 <div className="absolute top-5 left-12 w-8 h-[2px] bg-slate-950/40 transform -rotate-45" />
                 
                 {/* Small gravel/grit */}
                 <div className="absolute top-1 right-20 w-2 h-2 bg-slate-900/50 rounded-full" />
                 <div className="absolute bottom-3 right-8 w-3 h-1 bg-slate-900/50 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {particles.map(p => (
          <div key={p.id} className="absolute bg-white/40 rounded-full pointer-events-none" style={{ left: p.x, top: p.y, width: 12 * p.life, height: 12 * p.life, opacity: p.life }} />
        ))}

        {entities.map(ent => {
          const carStyle = ent.type === 'car' ? carStylesRef.current[ent.id] : null;
          return (
            <div
              key={ent.id}
              className={`absolute ${
                ent.type === 'platform' ? 'bg-slate-700 border-b-8 border-slate-950 rounded-xl shadow-lg' :
                ent.type === 'goal' ? 'flex flex-col items-center justify-center' : ''
              }`}
              style={{ 
                left: ent.pos.x, 
                top: ent.pos.y, 
                width: ent.size.x, 
                height: ent.size.y,
                backgroundColor: carStyle ? carStyle.color : undefined,
                borderRadius: carStyle ? (carStyle.type === 'sport' ? '12px 24px 8px 8px' : '8px') : undefined,
                boxShadow: carStyle ? '0 12px 20px -5px rgba(0,0,0,0.5)' : undefined
              }}
            >
              {ent.type === 'car' && carStyle && (
                <div className="relative w-full h-full">
                  <div className={`absolute top-1 flex gap-1 ${ent.vel.x < 0 ? 'left-2' : 'right-2'}`}>
                    <div className="w-6 h-3 bg-blue-200/40 rounded-sm shadow-inner" />
                    {carStyle.type === 'truck' && <div className="w-8 h-3 bg-blue-200/40 rounded-sm shadow-inner" />}
                  </div>
                  <div className="absolute -bottom-2 left-2 w-5 h-5 bg-slate-950 rounded-full border-2 border-slate-800" />
                  <div className="absolute -bottom-2 right-2 w-5 h-5 bg-slate-950 rounded-full border-2 border-slate-800" />
                  <div className={`absolute top-1/2 -translate-y-1/2 ${ent.vel.x < 0 ? 'left-0' : 'right-0'} w-4 h-6 bg-yellow-200/70 blur-[8px] rounded-full`} />
                  {carStyle.type === 'truck' && <div className="absolute -top-6 left-4 right-4 h-6 bg-inherit rounded-t-xl opacity-90 shadow-lg" />}
                </div>
              )}
              {ent.type === 'goal' && (
                <div className="bg-white p-12 border-[14px] border-blue-600 rounded-[3.5rem] text-blue-950 font-black text-center shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-pulse scale-110 ring-[15px] ring-blue-500/10">
                  <i className="fas fa-building text-8xl mb-4 text-blue-700" />
                  <div className="text-4xl tracking-tighter leading-none mb-1">MARIO CORP</div>
                  <div className="text-sm font-bold opacity-50 uppercase tracking-[0.3em]">Corporate HQ</div>
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute z-50" style={{ left: player.pos.x, top: player.pos.y, width: player.size.x, height: player.size.y }}>
          <div className={`w-full h-full relative ${player.vel.x < -0.1 ? '-scale-x-100' : ''} ${isLevelCleared ? 'animate-bounce' : ''}`}>
            <div className="absolute top-0 left-0 w-full h-[22%] bg-red-600 rounded-t shadow-sm" />
            <div className="absolute top-[22%] left-[10%] w-[80%] h-[28%] bg-orange-200 shadow-inner" />
            <div className="absolute top-[50%] left-0 w-full h-[50%] bg-blue-700 flex flex-col items-center rounded-b">
              <div className="w-full h-1/4 bg-red-600" />
              <div className="flex justify-around w-full mt-1 px-1">
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-sm" />
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-sm" />
              </div>
            </div>
            <div className="absolute -bottom-1 left-0 w-[40%] h-[15%] bg-amber-950 rounded-full" />
            <div className="absolute -bottom-1 right-0 w-[40%] h-[15%] bg-amber-950 rounded-full" />
            <div className="absolute -right-4 bottom-2 w-7 h-8 bg-amber-950 rounded shadow-xl border-2 border-amber-900" />
          </div>
        </div>
      </div>

      <WeatherOverlay type={config.weather} intensity={config.trafficDensity} />
      
      {config.visibility < 1 && (
        <div className="absolute inset-0 pointer-events-none z-[70]" style={{ background: `radial-gradient(circle at 50% 50%, transparent 180px, rgba(200,200,210,${1 - config.visibility}) 750px)` }} />
      )}
    </div>
  );
};

export default Game;
