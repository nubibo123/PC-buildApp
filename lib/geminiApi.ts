// gemini.ts
// AI API client - OpenRouter
// ⚠️ Get your API key from: https://openrouter.ai/settings/keys

const OPENROUTER_API_KEY: string = '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'; // Replace with your OpenRouter API key
const OPENROUTER_API_URL: string = 'https://openrouter.ai/api/v1/chat/completions';

// Define message type (OpenAI-compatible format)
export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Chat with AI model via OpenRouter
 */
export async function chatWithGemini(messages: GeminiMessage[]): Promise<string> {
  // Validate messages
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }
  
  // Filter out empty messages and ensure content is not empty
  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);
  
  if (validMessages.length === 0) {
    throw new Error('At least one message must have non-empty content');
  }

  // Try multiple free models in order of preference
  const freeModels = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemini-flash-1.5:free',
    'mistralai/mistral-7b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
  ];

  let lastError = null;

  for (const model of freeModels) {
    try {
      const body = {
        model: model,
        messages: validMessages,
      };

      const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://pc-build-assistant.app',
          'X-Title': 'PC Build Assistant',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        lastError = errData?.error?.message || `HTTP ${res.status}`;
        console.log(`[OpenRouter] Model ${model} failed: ${lastError}`);
        continue; // Try next model
      }

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content || '';
      console.log(`[OpenRouter] Success with model: ${model}`);
      console.log('[AI Answer]', answer);
      return answer;

    } catch (error: any) {
      lastError = error.message;
      console.log(`[OpenRouter] Model ${model} error: ${lastError}`);
      continue; // Try next model
    }
  }

  // If all models failed
  throw new Error(`All models failed. Last error: ${lastError || 'Unknown error'}`);
}

/**
 * List available models on OpenRouter
 */
export async function listGeminiModels(): Promise<any[]> {
  const url = 'https://openrouter.ai/api/v1/models';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  });

  if (!res.ok) {
    let errorMsg = 'Failed to list OpenRouter models';
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
  return data.data || [];
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

  // Validate that we have content
  if (!buildInfo || buildInfo.trim() === '{}' || buildInfo.trim() === 'null') {
    throw new Error('Build configuration is empty or invalid');
  }

  // Send to OpenRouter
  const messages: GeminiMessage[] = [
    {
      role: 'user',
      content: `${prompt}\n\nBuild configuration:\n${buildInfo}`
    }
  ];
  return await chatWithGemini(messages);
}
