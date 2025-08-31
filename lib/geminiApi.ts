// Gemini API chat function
// You need to set your Gemini API key in GEMINI_API_KEY

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual Gemini API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

export async function chatWithGemini(messages: {role: 'user'|'model', parts: string[]}[]): Promise<string> {
  const body = {
    contents: messages.map(m => ({ role: m.role, parts: m.parts.map(text => ({ text })) }))
  };
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to call Gemini API');
  const data = await res.json();
  // Gemini returns response in candidates[0].content.parts[0].text
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
