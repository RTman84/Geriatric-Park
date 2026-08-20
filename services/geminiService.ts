type BattleDialogueRequest = {
  action: 'battleDialogue';
  elderName: string;
  elderType: string;
  actionText: string;
};

type ElderBioRequest = {
  action: 'elderBio';
  type: string;
  name: string;
};

type DailyMissionRequest = {
  action: 'dailyMission';
  level: number;
};

type GeminiRequest = BattleDialogueRequest | ElderBioRequest | DailyMissionRequest;

const callGemini = async (request: GeminiRequest): Promise<any> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  return response.json();
};

export const generateBattleDialogue = async (elderName: string, elderType: string, action: string) => {
  try {
    const data = await callGemini({ action: 'battleDialogue', elderName, elderType, actionText: action });
    return data.text || 'Where did I put my glasses?';
  } catch {
    return 'Where did I put my glasses?';
  }
};

export const generateElderBio = async (type: string, name: string) => {
  try {
    const data = await callGemini({ action: 'elderBio', type, name });
    return data.text || 'Once wrestled a goose for a stale bagel.';
  } catch {
    return 'Once wrestled a goose for a stale bagel.';
  }
};

export const generateDailyMission = async (level: number) => {
  try {
    const data = await callGemini({ action: 'dailyMission', level });
    if (typeof data.title !== 'string' || typeof data.description !== 'string') throw new Error('Invalid AI response');
    return { title: data.title, description: data.description };
  } catch {
    return { title: 'Denture Hunt', description: 'Find the lost teeth in the community garden.' };
  }
};
