
import React, { useState, useEffect } from 'react';
import { GameStatus, LevelConfig, WeatherType } from './types';
import { generateLevelConfig } from './services/geminiService';
import Game from './components/Game';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [level, setLevel] = useState(1);
  const [currentConfig, setCurrentConfig] = useState<LevelConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  const startLevel = async (lvl: number) => {
    setLoading(true);
    setStatus(GameStatus.BRIEFING);
    const config = await generateLevelConfig(lvl);
    setCurrentConfig(config);
    setLoading(false);
  };

  const handleLevelSuccess = () => {
    setScore(prev => prev + 1500); 
    if (level >= 5) {
      setStatus(GameStatus.SUCCESS);
    } else {
      setLevel(prev => prev + 1);
      setStatus(GameStatus.START);
    }
  };

  const handleGameOver = () => {
    setStatus(GameStatus.GAMEOVER);
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setStatus(GameStatus.START);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-mono select-none">
      <div className="max-w-4xl w-full bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700">
        
        <div className="bg-slate-950 p-6 flex justify-between items-center border-b-2 border-slate-800">
          <div className="flex flex-col">
            <span className="text-yellow-500 font-bold uppercase tracking-widest text-[10px]">Employee Status</span>
            <span className="text-2xl font-black text-white">MARIO B.</span>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-tighter">Performance Bonus</p>
              <p className="text-2xl font-black text-green-400">${score.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <p className="text-slate-500 text-[10px]">FLOOR</p>
              <p className="text-xl font-black text-yellow-500">{level}/5</p>
            </div>
          </div>
        </div>

        <div className="relative bg-slate-800 min-h-[450px]">
          {status === GameStatus.START && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-8">
              <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 py-2">
                MARIO: RUSH HOUR
              </h1>
              <div className="max-w-md bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Help Mario navigate the morning commute to reach the office lobby entrance. 
                  Watch out for traffic and treacherous weather!
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 bg-slate-800 rounded-xl text-[11px] text-slate-400">
                    <span className="text-white font-bold block mb-1">WASD</span> MOVE / JUMP
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl text-[11px] text-slate-400">
                    <span className="text-white font-bold block mb-1">SPACE</span> JUMP
                  </div>
                </div>
              </div>
              <button 
                onClick={() => startLevel(level)}
                className="group relative px-14 py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-2xl transition-all shadow-xl active:scale-95"
              >
                {level === 1 ? 'CLOCK IN' : `START DAY ${level}`}
              </button>
            </div>
          )}

          {status === GameStatus.BRIEFING && currentConfig && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-6 animate-in fade-in duration-500">
              <div className="w-full max-w-2xl bg-slate-900/95 border-4 border-slate-700 rounded-[3rem] p-10 space-y-6 shadow-2xl">
                <h2 className="text-3xl font-black text-yellow-400 italic tracking-tighter">MORNING BRIEFING: DAY {level}</h2>
                
                {loading ? (
                   <div className="animate-pulse space-y-4 py-10">
                      <div className="h-6 bg-slate-700 rounded w-3/4 mx-auto" />
                      <div className="h-6 bg-slate-700 rounded w-1/2 mx-auto" />
                   </div>
                ) : (
                  <>
                    <div className="bg-slate-950 p-8 rounded-3xl border-2 border-slate-800 relative overflow-hidden">
                      <div className="flex items-center justify-center gap-6 text-7xl mb-6">
                        {currentConfig.weather === WeatherType.SUNNY && <i className="fas fa-sun text-yellow-400 animate-spin-slow" />}
                        {currentConfig.weather === WeatherType.RAINY && <i className="fas fa-cloud-showers-heavy text-blue-400" />}
                        {currentConfig.weather === WeatherType.FOGGY && <i className="fas fa-smog text-gray-400" />}
                        {currentConfig.weather === WeatherType.SNOWY && <i className="fas fa-snowflake text-white animate-pulse" />}
                        {currentConfig.weather === WeatherType.WINDY && <i className="fas fa-wind text-cyan-300" />}
                      </div>
                      <p className="text-2xl italic text-white font-bold relative z-10 leading-tight">"{currentConfig.description}"</p>
                      <div className="mt-6 pt-6 border-t border-slate-800/50">
                         <span className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] block mb-2">Commuter Advisory</span>
                         <p className="text-slate-300 font-medium text-lg bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 italic">
                           "{currentConfig.strategy}"
                         </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Traffic Congestion</span>
                         <div className="flex gap-1.5 mt-3">
                           {Array.from({ length: 10 }).map((_, i) => (
                             <div key={i} className={`h-4 w-full rounded-sm ${i < currentConfig.trafficDensity ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-800'}`} />
                           ))}
                         </div>
                       </div>
                       <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Road Conditions</span>
                         <div className="flex gap-1.5 mt-3">
                           {Array.from({ length: 10 }).map((_, i) => (
                             <div key={i} className={`h-4 w-full rounded-sm ${i < (currentConfig.friction) * 10 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-800'}`} />
                           ))}
                         </div>
                       </div>
                    </div>

                    <button 
                      onClick={() => setStatus(GameStatus.PLAYING)}
                      className="w-full py-6 bg-green-600 hover:bg-green-500 text-white font-black text-2xl rounded-3xl mt-6 transition-all shadow-[0_10px_30px_rgba(22,163,74,0.4)] active:scale-95 transform hover:-translate-y-1"
                    >
                      BEGIN COMMUTE
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {status === GameStatus.PLAYING && currentConfig && (
            <Game 
              config={currentConfig} 
              onGameOver={handleGameOver} 
              onSuccess={handleLevelSuccess}
              onScoreUpdate={(p) => setScore(s => s + p)} 
            />
          )}

          {status === GameStatus.GAMEOVER && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-8 bg-slate-950/90 backdrop-blur-md absolute inset-0 z-[100] animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl">
                <i className="fas fa-exclamation-triangle" />
              </div>
              <h2 className="text-6xl font-black text-red-500 italic drop-shadow-xl">TERMINATED!</h2>
              <p className="text-xl text-slate-300 max-w-sm">You were hit by a car. HR has cancelled your badge access.</p>
              <button 
                onClick={resetGame}
                className="px-14 py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all scale-110 shadow-2xl"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {status === GameStatus.SUCCESS && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-8 bg-green-600 text-white animate-in slide-in-from-bottom duration-1000">
              <div className="text-8xl mb-4">🏆</div>
              <h2 className="text-7xl font-black italic tracking-tighter">PROMOTED!</h2>
              <p className="text-2xl font-bold opacity-80">You survived the weekly rush. Welcome to the C-Suite.</p>
              <div className="bg-white/10 p-10 rounded-3xl border-4 border-white/20 shadow-2xl">
                <p className="text-sm uppercase font-black tracking-[0.2em] mb-4 opacity-70">Total Earnings</p>
                <p className="text-8xl font-black">${score.toLocaleString()}</p>
              </div>
              <button 
                onClick={resetGame}
                className="px-14 py-6 bg-white text-green-700 font-black rounded-3xl hover:bg-slate-100 transition-all shadow-2xl text-xl animate-pulse"
              >
                REPLAY CAREER
              </button>
            </div>
          )}
        </div>

        {status === GameStatus.PLAYING && (
          <div className="bg-slate-950 p-4 border-t-2 border-slate-800 flex justify-between items-center text-xs text-slate-400 font-bold px-8">
            <div className="flex gap-6">
              <span className="flex items-center gap-2"><kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-white">WASD</kbd> MOVE</span>
              <span className="flex items-center gap-2"><kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-white">SPACE</kbd> JUMP</span>
            </div>
            <div className="flex items-center gap-3 text-yellow-500 uppercase tracking-widest">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
              <span>Reach the office!</span>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
