
export enum GameStatus {
  START = 'START',
  BRIEFING = 'BRIEFING',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  SUCCESS = 'SUCCESS'
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
  FOGGY = 'FOGGY',
  SNOWY = 'SNOWY',
  WINDY = 'WINDY'
}

export interface LevelConfig {
  weather: WeatherType;
  trafficDensity: number; // 1-10
  visibility: number; // 0-1
  friction: number;
  windSpeed: number;
  description: string;
  strategy: string; // New field for clear expectations
  levelNumber: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  size: Vector2;
  vel: Vector2;
  type: 'player' | 'car' | 'puddle' | 'platform' | 'coin' | 'goal';
}
