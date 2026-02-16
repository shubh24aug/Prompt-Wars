import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../types';

interface Props {
  type: WeatherType;
  intensity: number;
}

const WeatherOverlay: React.FC<Props> = ({ type, intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);

  useEffect(() => {
    const count = intensity * 20;
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * 320,
      vx: type === WeatherType.WINDY ? Math.random() * 5 + 5 : (Math.random() - 0.5) * 1,
      vy: type === WeatherType.RAINY ? Math.random() * 10 + 10 : Math.random() * 2 + 1,
      size: type === WeatherType.SNOWY ? Math.random() * 3 + 1 : 1.5,
    }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (type === WeatherType.FOGGY) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = type === WeatherType.RAINY ? 'rgba(180, 210, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(180, 210, 255, 0.4)';
      
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > canvas.height) p.y = -10;
        if (p.x > canvas.width) p.x = -10;
        if (p.x < -10) p.x = canvas.width;

        if (type === WeatherType.RAINY) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 10);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [type, intensity]);

  if (type === WeatherType.SUNNY) return null;

  return (
    <canvas 
      ref={canvasRef} 
      width={window.innerWidth} 
      height={320} 
      className="absolute inset-0 pointer-events-none z-40"
    />
  );
};

export default WeatherOverlay;