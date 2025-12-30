// gemini.ts
// Gemini API client in TypeScript
// ⚠️ Do not commit real API keys to GitHub

const GEMINI_API_KEY: string = 'AIzaSyD-uoZHcLtxm21Y_c8UILInYUYMn54d9zA'; 
const GEMINI_API_URL: string =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
  GEMINI_API_KEY;

// Define message type
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: string[];
}

/**
 * Chat with Gemini model
 */
export async function chatWithGemini(messages: GeminiMessage[]): Promise<string> {
  const body = {
    contents: messages.map(m => ({
      role: m.role,
      parts: m.parts.map(text => ({ text })),
    })),
  };

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to call Gemini API';
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errorMsg += ': ' + errData.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[Gemini Answer]', answer); // Log Gemini's answer
  return answer;
}

/**
 * List available Gemini models and their supported methods.
 */
export async function listGeminiModels(): Promise<any[]> {
  const url =
    'https://generativelanguage.googleapis.com/v1/models?key=' + GEMINI_API_KEY;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    let errorMsg = 'Failed to list Gemini models';
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errorMsg += ': ' + errData.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  return data.models || [];
}

/**
 * Send the build configuration to Gemini to analyze the build.
 * @param buildConfig - Build configuration object
 * @param options - { prompt?: string } (optional extra prompt)
 * @returns string - Analysis from Gemini
 */
export async function analyzeBuildWithGemini(
  buildConfig: any,
  options?: { prompt?: string }
): Promise<string> {
  // Create default prompt
  let prompt = options?.prompt
    ? options.prompt
    : 'Analyze the following PC build: assess strengths/weaknesses, gaming and productivity performance, and suggest upgrades if needed. Keep the answer short and easy to understand for general users.';

  // Format build data for AI
  const buildInfo = JSON.stringify(buildConfig, null, 2);

  // Send to Gemini
  const messages: GeminiMessage[] = [
    {
      role: 'user', // Explicitly type as 'user'
      parts: [
        `${prompt}\n\nBuild configuration:\n${buildInfo}`
      ]
    }
  ];
  return await chatWithGemini(messages);
}
