import { Type } from "@google/genai";

type GeminiRequest = {
  contents: unknown;
  config?: unknown;
};

const callGemini = async (request: GeminiRequest): Promise<string> => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const generateBattleDialogue = async (elderName: string, elderType: string, action: string) => {
  try {
    return await callGemini({
      contents: `Generate a funny, elderly-themed battle quote for a character named ${elderName} (${elderType}). The action is: ${action}. The quote should be cheeky, involve things like 'back in my day', dentures, bingo, or general grumpiness. 1 short sentence max.`,
      config: {
        maxOutputTokens: 50,
        thinkingConfig: { thinkingBudget: 25 },
      },
    });
  } catch (error) {
    return "Where did I put my glasses?";
  }
};

export const generateElderBio = async (type: string, name: string) => {
  try {
    return await callGemini({
      contents: `Generate a short, hilarious, 2-sentence bio for a character in a game called 'Geriatric Park'. Character name: ${name}. Character archetype: ${type}. The tone should be cheeky and humorous but lighthearted.`,
      config: {
        maxOutputTokens: 100,
        thinkingConfig: { thinkingBudget: 50 },
      },
    });
  } catch (error) {
    return "Once wrestled a goose for a stale bagel.";
  }
};

export const generateDailyMission = async (level: number) => {
  try {
    const text = await callGemini({
      contents: `Create a funny RPG quest title and a one-sentence description for a game called 'Geriatric Park'. The player is level ${level}. Focus on stereotypical funny elder activities. Return as JSON with 'title' and 'description' keys.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"],
        },
      },
    });
    return JSON.parse(text.trim());
  } catch (error) {
    return { title: "Denture Hunt", description: "Find the lost teeth in the community garden." };
  }
};
