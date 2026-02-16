
import React, { useEffect, useState, useRef } from 'react';
import { WeatherType } from '../types';

interface Particle {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  angle: number;
}

interface Props {
  type: WeatherType;
  intensity: number;
}

const WeatherOverlay: React.FC<Props> = ({ type, intensity }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Determine particle count based on intensity
    const count = intensity * 15;
    const initialParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      speed: Math.random() * 2 + (type === WeatherType.RAINY ? 5 : 1),
      size: type === WeatherType.SNOWY ? Math.random() * 4 + 2 : 1,
      angle: Math.random() * Math.PI * 2
    }));
    setParticles(initialParticles);

    const animate = () => {
      setParticles(prev => prev.map(p => {
        let nx = p.x;
        let ny = p.y;
        
        if (type === WeatherType.RAINY) {
          ny = (ny + p.speed) % 100;
        } else if (type === WeatherType.SNOWY) {
          ny = (ny + p.speed * 0.5) % 100;
          nx = (nx + Math.sin(ny / 5) * 0.5) % 100;
        } else if (type === WeatherType.WINDY) {
          nx = (nx + (intensity > 5 ? 4 : 2)) % 100;
          ny = (ny + Math.sin(nx / 10) * 0.2) % 100;
        }

        return { ...p, x: nx, y: ny };
      }));
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [type, intensity]);

  if (type === WeatherType.SUNNY) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Fog Layer */}
      {type === WeatherType.FOGGY && (
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] mix-blend-overlay" />
      )}
      
      {/* Dynamic Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute transition-none ${
            type === WeatherType.RAINY ? 'w-[1px] h-4 bg-blue-200/60' : 
            type === WeatherType.SNOWY ? 'bg-white rounded-full' :
            type === WeatherType.WINDY ? 'w-8 h-[1px] bg-white/20' : ''
          }`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: type === WeatherType.SNOWY ? `${p.size}px` : undefined,
            height: type === WeatherType.SNOWY ? `${p.size}px` : undefined,
            opacity: type === WeatherType.RAINY ? 0.4 : 0.8
          }}
        />
      ))}

      {/* Lightning effect for heavy rain */}
      {type === WeatherType.RAINY && intensity > 7 && (
        <div className="absolute inset-0 animate-[flash_5s_infinite] bg-white pointer-events-none mix-blend-overlay opacity-0" />
      )}

      <style>{`
        @keyframes flash {
          0%, 94%, 100% { opacity: 0; }
          95% { opacity: 0.3; }
          96% { opacity: 0; }
          97% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WeatherOverlay;
