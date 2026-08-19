import { GoogleGenAI, Type } from '@google/genai';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'AI service is not configured' }, 503);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const ai = new GoogleGenAI({ apiKey });
  try {
    if (body?.action === 'battleDialogue') {
      const elderName = clean(body.elderName, 80), elderType = clean(body.elderType, 80), actionText = clean(body.actionText, 160);
      if (!elderName || !elderType || !actionText) return json({ error: 'Invalid input' }, 400);
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Generate one short, lighthearted fictional battle quote for a game character named ${elderName} (${elderType}). Action: ${actionText}. Maximum one sentence.`, config: { maxOutputTokens: 50, thinkingConfig: { thinkingBudget: 25 } } });
      return json({ text: (response.text || '').slice(0, 500) });
    }
    if (body?.action === 'elderBio') {
      const type = clean(body.type, 80), name = clean(body.name, 80);
      if (!type || !name) return json({ error: 'Invalid input' }, 400);
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Generate a short, humorous two-sentence fictional bio for a game character in Geriatric Park. Name: ${name}. Archetype: ${type}. Keep it lighthearted.`, config: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 50 } } });
      return json({ text: (response.text || '').slice(0, 1000) });
    }
    if (body?.action === 'dailyMission') {
      const level = Number(body.level);
      if (!Number.isInteger(level) || level < 1 || level > 10000) return json({ error: 'Invalid level' }, 400);
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Create a funny RPG quest title and one-sentence description for Geriatric Park. Player level: ${level}. Focus on fictional, stereotypical elder activities.`, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'description'] }, maxOutputTokens: 150 } });
      const parsed = JSON.parse(response.text.trim());
      if (typeof parsed.title !== 'string' || typeof parsed.description !== 'string') throw new Error('Invalid AI response');
      return json({ title: parsed.title.slice(0, 120), description: parsed.description.slice(0, 500) });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('Gemini request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'AI service temporarily unavailable' }, 502);
  }
}
