
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherType, LevelConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateLevelConfig = async (levelNumber: number): Promise<LevelConfig> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a weather and traffic report for level ${levelNumber} of 'Mario's Morning Commute'. 
      Mario is trying to get to his office. 
      
      RULES:
      - Level 1: Intro. Levels 2-4: Escalating. Level 5: Extreme finale.
      - SUNNY: High friction (0.95), no wind, perfect visibility.
      - RAINY: Low friction (0.6), medium visibility (0.8).
      - SNOWY: Very low friction (0.4), low visibility (0.6).
      - WINDY: Strong wind force (-5 to 5), medium friction.
      - FOGGY: Very low visibility (0.2), normal friction.

      The 'description' should be a funny radio-style news bite.
      The 'strategy' MUST give a clear, practical gameplay tip based on the weather/traffic (e.g., "Tap jump for precision in high winds" or "Watch for cars hidden in fog").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: { type: Type.STRING, description: 'One of: SUNNY, RAINY, FOGGY, SNOWY, WINDY' },
            trafficDensity: { type: Type.NUMBER, description: '1 to 10 scale' },
            visibility: { type: Type.NUMBER, description: '0 to 1 scale' },
            friction: { type: Type.NUMBER, description: '0.1 to 0.95' },
            windSpeed: { type: Type.NUMBER, description: '-10 to 10' },
            description: { type: Type.STRING, description: 'A funny commuter report (max 80 chars).' },
            strategy: { type: Type.STRING, description: 'Actionable gameplay tip based on conditions.' },
          },
          required: ['weather', 'trafficDensity', 'visibility', 'friction', 'windSpeed', 'description', 'strategy']
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      ...data,
      levelNumber,
      weather: data.weather as WeatherType
    };
  } catch (error) {
    console.error("Gemini Error, using fallback config:", error);
    return {
      levelNumber,
      weather: WeatherType.SUNNY,
      trafficDensity: 3,
      visibility: 1,
      friction: 0.9,
      windSpeed: 0,
      description: "Clear skies and moderate traffic. A perfect day for a promotion!",
      strategy: "Keep moving right. Use platforms to jump over cars safely.",
    };
  }
};
