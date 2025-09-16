// gemini.ts
// Gemini API client in TypeScript
// ⚠️ Đừng commit API key thật lên GitHub

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
 * Gửi cấu hình build lên Gemini để phân tích build.
 * @param buildConfig - Build configuration object
 * @param options - { prompt?: string } (tùy chọn prompt bổ sung)
 * @returns string - Phân tích từ Gemini
 */
export async function analyzeBuildWithGemini(
  buildConfig: any,
  options?: { prompt?: string }
): Promise<string> {
  // Tạo prompt mặc định
  let prompt = options?.prompt
    ? options.prompt
    : 'Phân tích cấu hình PC sau đây, đánh giá điểm mạnh/yếu, hiệu năng chơi game, làm việc, đề xuất nâng cấp nếu cần. Trả lời ngắn gọn, dễ hiểu cho người dùng phổ thông.';

  // Định dạng dữ liệu build cho AI
  const buildInfo = JSON.stringify(buildConfig, null, 2);

  // Gửi lên Gemini
  const messages: GeminiMessage[] = [
    {
      role: 'user', // Explicitly type as 'user'
      parts: [
        `${prompt}\n\nCấu hình:\n${buildInfo}`
      ]
    }
  ];
  return await chatWithGemini(messages);
}
