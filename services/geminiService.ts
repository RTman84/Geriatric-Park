
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = (window as any).API_KEY || (window as any).GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export const generateBattleDialogue = async (elderName: string, elderType: string, action: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a funny, elderly-themed battle quote for a character named ${elderName} (${elderType}). 
      The action is: ${action}. The quote should be cheeky, involves things like 'back in my day', dentures, bingo, or general grumpiness. 1 short sentence max.`,
      config: { 
        maxOutputTokens: 50,
        // Set thinkingBudget when using maxOutputTokens to ensure room for the final output
        thinkingConfig: { thinkingBudget: 25 }
      }
    });
    return response.text || "I've had enough of this malarkey!";
  } catch (error) {
    return "Where did I put my glasses?";
  }
};

export const generateElderBio = async (type: string, name: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, hilarious, 2-sentence bio for a character in a game called 'Geriatric Park'. 
      Character name: ${name}. Character archetype: ${type}. 
      The tone should be cheeky and humorous but lighthearted.`,
      config: { 
        maxOutputTokens: 100,
        // Set thinkingBudget when using maxOutputTokens to ensure room for the final output
        thinkingConfig: { thinkingBudget: 50 }
      }
    });
    return response.text || "Just here for the early bird special.";
  } catch (error) {
    return "Once wrestled a goose for a stale bagel.";
  }
};

export const generateDailyMission = async (level: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a funny RPG quest title and a one-sentence description for a game called 'Geriatric Park'. 
      The player is level ${level}. Focus on stereotypical funny elder activities.
      Return as JSON with 'title' and 'description' keys.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });
    // Ensure the JSON string is trimmed as per Google GenAI best practices
    return JSON.parse(response.text.trim());
  } catch (error) {
    return { title: "Denture Hunt", description: "Find the lost teeth in the community garden." };
  }
};
