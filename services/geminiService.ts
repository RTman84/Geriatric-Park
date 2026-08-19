type GeminiAction =
  | { action: 'battleDialogue'; elderName: string; elderType: string; actionText: string }
  | { action: 'elderBio'; type: string; name: string }
  | { action: 'dailyMission'; level: number };

const postGemini = async (payload: GeminiAction): Promise<any> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`AI request failed (${response.status})`);
  return response.json();
};

export const generateBattleDialogue = async (elderName: string, elderType: string, actionText: string) => {
  try {
    const result = await postGemini({ action: 'battleDialogue', elderName, elderType, actionText });
    return typeof result.text === 'string' && result.text.length <= 500
      ? result.text
      : "I've had enough of this malarkey!";
  } catch {
    return "Where did I put my glasses?";
  }
};

export const generateElderBio = async (type: string, name: string) => {
  try {
    const result = await postGemini({ action: 'elderBio', type, name });
    return typeof result.text === 'string' && result.text.length <= 1000
      ? result.text
      : "Just here for the early bird special.";
  } catch {
    return "Once wrestled a goose for a stale bagel.";
  }
};

export const generateDailyMission = async (level: number) => {
  try {
    const result = await postGemini({ action: 'dailyMission', level });
    if (result && typeof result.title === 'string' && typeof result.description === 'string') {
      return {
        title: result.title.slice(0, 120),
        description: result.description.slice(0, 500),
      };
    }
    throw new Error('Invalid mission response');
  } catch {
    return { title: "Denture Hunt", description: "Find the lost teeth in the community garden." };
  }
};
