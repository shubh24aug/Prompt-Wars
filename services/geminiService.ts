
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherType, LevelConfig } from "../types";

export const generateLevelConfig = async (levelNumber: number): Promise<LevelConfig> => {
  try {
    // Correct initialization using named parameter and direct process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a report for level ${levelNumber}.`,
      config: {
        systemInstruction: `You are a witty AI traffic reporter for the game 'Mario's Morning Commute'. 
        Provide a level configuration in JSON. 
        Difficulty scales: Day 1 is easy/sunny; Day 5 is extreme traffic/bad weather.
        Weather: SUNNY, RAINY, FOGGY, SNOWY, WINDY.
        Traffic: 1 to 10.
        Friction: 0.3 (ice) to 1.0 (perfect).
        Visibility: 0.1 (blind) to 1.0 (clear).`,
        // Thinking budget is appropriate for Gemini 3 Flash
        thinkingConfig: { thinkingBudget: 1000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: { type: Type.STRING, enum: ['SUNNY', 'RAINY', 'FOGGY', 'SNOWY', 'WINDY'] },
            trafficDensity: { type: Type.NUMBER },
            visibility: { type: Type.NUMBER },
            friction: { type: Type.NUMBER },
            windSpeed: { type: Type.NUMBER },
            description: { type: Type.STRING },
            strategy: { type: Type.STRING },
          },
          required: ['weather', 'trafficDensity', 'visibility', 'friction', 'windSpeed', 'description', 'strategy']
        }
      }
    });

    // Accessing .text property directly as it returns string | undefined
    const data = JSON.parse(response.text || '{}');
    return {
      ...data,
      levelNumber,
      weather: (data.weather as WeatherType) || WeatherType.SUNNY
    };
  } catch (error) {
    console.warn("Gemini service failed, using fallback.", error);
    return {
      levelNumber,
      weather: WeatherType.SUNNY,
      trafficDensity: Math.min(levelNumber * 2, 10),
      visibility: 1,
      friction: 0.9,
      windSpeed: 0,
      description: "Standard morning commute. Regular traffic reported.",
      strategy: "Keep moving right. Use platforms to avoid slow-moving vehicles.",
    };
  }
};
