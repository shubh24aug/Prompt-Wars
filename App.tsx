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
    setScore(prev => prev + 1000); 
    if (level >= 5) {
      setStatus(GameStatus.SUCCESS);
    } else {
      setLevel(prev => prev + 1);
      setStatus(GameStatus.START);
    }
  };

  const handleGameOver = () => setStatus(GameStatus.GAMEOVER);

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setStatus(GameStatus.START);
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-2 font-mono select-none overflow-hidden">
      <div className="max-w-3xl w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700">
        
        <div className="bg-slate-950 p-2 flex justify-between items-center border-b border-slate-800 px-4">
          <div className="flex flex-col">
            <span className="text-yellow-500 font-bold uppercase tracking-widest text-[8px]">Employee</span>
            <span className="text-base font-black text-white">MARIO B.</span>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-slate-500 text-[8px] uppercase tracking-tighter">Bonus</p>
              <p className="text-base font-black text-green-400">${score.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
              <p className="text-slate-500 text-[8px]">DAY</p>
              <p className="text-base font-black text-yellow-500">{level}/5</p>
            </div>
          </div>
        </div>

        <div className="relative bg-slate-800 h-[320px]">
          {status === GameStatus.START && (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-4">
              <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                MARIO: RUSH HOUR
              </h1>
              <div className="max-w-md bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                <p className="text-slate-300 text-[10px] leading-snug">
                  Reach the office HQ before the morning meeting starts. Watch for gridlock and changing conditions!
                </p>
              </div>
              <button 
                onClick={() => startLevel(level)}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-sm rounded-xl transition-all shadow-xl active:scale-95"
              >
                {level === 1 ? 'CLOCK IN' : `START DAY ${level}`}
              </button>
            </div>
          )}

          {status === GameStatus.BRIEFING && currentConfig && (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-3 animate-in fade-in duration-500">
              <div className="w-full max-w-xl bg-slate-900/90 border border-slate-700 rounded-3xl p-4 shadow-2xl">
                <h2 className="text-base font-black text-yellow-400 uppercase tracking-widest">Commuter Update: Day {level}</h2>
                
                {loading ? (
                   <div className="animate-pulse space-y-2 py-6">
                      <div className="h-3 bg-slate-700 rounded w-3/4 mx-auto" />
                      <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto" />
                   </div>
                ) : (
                  <>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 my-2">
                      <div className="flex items-center justify-center gap-4 text-4xl mb-2">
                        {currentConfig.weather === WeatherType.SUNNY && <i className="fas fa-sun text-yellow-400" />}
                        {currentConfig.weather === WeatherType.RAINY && <i className="fas fa-cloud-showers-heavy text-blue-400" />}
                        {currentConfig.weather === WeatherType.FOGGY && <i className="fas fa-smog text-gray-400" />}
                        {currentConfig.weather === WeatherType.SNOWY && <i className="fas fa-snowflake text-white" />}
                        {currentConfig.weather === WeatherType.WINDY && <i className="fas fa-wind text-cyan-300" />}
                      </div>
                      <p className="text-[11px] italic text-white font-bold leading-tight px-4">"{currentConfig.description}"</p>
                      <p className="text-[9px] text-blue-400 mt-2 font-black uppercase">Strategy: {currentConfig.strategy}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                         <span className="text-[8px] text-slate-500 font-bold uppercase">Traffic Density</span>
                         <div className="flex gap-1 mt-1">
                           {Array.from({ length: 10 }).map((_, i) => (
                             <div key={i} className={`h-1.5 w-full rounded-full ${i < currentConfig.trafficDensity ? 'bg-red-500' : 'bg-slate-800'}`} />
                           ))}
                         </div>
                       </div>
                       <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                         <span className="text-[8px] text-slate-500 font-bold uppercase">Road Traction</span>
                         <div className="flex gap-1 mt-1">
                           {Array.from({ length: 10 }).map((_, i) => (
                             <div key={i} className={`h-1.5 w-full rounded-full ${i < (currentConfig.friction) * 10 ? 'bg-green-500' : 'bg-slate-800'}`} />
                           ))}
                         </div>
                       </div>
                    </div>

                    <button 
                      onClick={() => setStatus(GameStatus.PLAYING)}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black text-sm rounded-xl mt-2 transition-all shadow-lg active:scale-95"
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
            <div className="h-full flex flex-col items-center justify-center p-4 bg-slate-950/90 absolute inset-0 z-[100] text-center gap-3">
              <i className="fas fa-car-crash text-5xl text-red-500" />
              <h2 className="text-2xl font-black text-red-500 italic">TERMINATED!</h2>
              <p className="text-[10px] text-slate-300 max-w-xs">You missed the morning huddle. Your access card is deactivated.</p>
              <button onClick={resetGame} className="px-8 py-2 bg-white text-black font-black rounded-lg hover:bg-slate-200 text-sm">RETRY</button>
            </div>
          )}

          {status === GameStatus.SUCCESS && (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-green-700 text-white animate-in slide-in-from-bottom absolute inset-0 z-[100] text-center gap-4">
              <div className="text-4xl">🏆</div>
              <h2 className="text-3xl font-black italic">PROMOTED!</h2>
              <p className="text-xs font-bold opacity-80">Weekly performance targets met.</p>
              <div className="bg-black/20 p-4 rounded-xl border border-white/20">
                <p className="text-[8px] uppercase font-black opacity-70">Payout</p>
                <p className="text-4xl font-black">${score.toLocaleString()}</p>
              </div>
              <button onClick={resetGame} className="px-10 py-3 bg-white text-green-700 font-black rounded-xl hover:bg-slate-100 text-sm">NEW CAREER</button>
            </div>
          )}
        </div>

        {status === GameStatus.PLAYING && (
          <div className="bg-slate-950 p-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold px-4">
            <div className="flex gap-4">
              <span>WASD MOVE</span>
              <span>SPACE JUMP</span>
            </div>
            <div className="text-yellow-500 uppercase tracking-tighter">REACH THE CORPORATE OFFICE</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;