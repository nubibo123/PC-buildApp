// Image Recognition Service using Nyckel API
// API: https://www.nyckel.com/v1/functions/computer-component-types/invoke

const NYCKEL_API_URL = 'https://www.nyckel.com/v1/functions/computer-component-types/invoke';
const NYCKEL_TOKEN_URL = 'https://www.nyckel.com/connect/token';
const NYCKEL_CLIENT_ID = 'bwd3cmorx2hhxfxq7kvbmfnjskmy5hfk';
const NYCKEL_CLIENT_SECRET = '69ly185dtk1dv8nms5zjn3av9ubrzplfmxbotzpyeii1eaojx060hww3ypp6wed3';

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export interface PCPartPrediction {
  label: string;
  confidence: number;
}

export interface RecognitionResult {
  predictions: PCPartPrediction[];
  topPrediction?: PCPartPrediction;
}

/**
 * Get access token from Nyckel
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(NYCKEL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&client_id=${NYCKEL_CLIENT_ID}&client_secret=${NYCKEL_CLIENT_SECRET}`
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    
    // Token expires in 3600 seconds (1 hour), cache for 55 minutes
    tokenExpiry = Date.now() + (55 * 60 * 1000);
    
    return cachedToken;
  } catch (error: any) {
    console.error('[Nyckel Token Error]', error);
    throw new Error('Failed to authenticate with Nyckel API');
  }
}

/**
 * Recognize PC part from image using Nyckel API
 * @param imageUri - Local image URI or image URL
 * @returns Recognition result with predictions
 */
export async function recognizePCPart(imageUri: string): Promise<RecognitionResult> {
  try {
    // Get access token
    const token = await getAccessToken();
    
    // Use image URL directly or convert to base64
    let imageData = imageUri;
    
    // If it's a local file, convert to base64
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      try {
        const base64Response = await fetch(imageUri);
        const blob = await base64Response.blob();
        
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.log('[Image conversion] Using URL directly');
      }
    }

    const response = await fetch(NYCKEL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: imageData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Nyckel Response]', data);
    
    // Parse Nyckel response format
    const predictions: PCPartPrediction[] = [];
    
    // Handle single prediction response
    if (data.labelName && data.confidence !== undefined) {
      predictions.push({
        label: data.labelName,
        confidence: data.confidence
      });
    }

    // Handle multiple predictions
    if (Array.isArray(data.labels)) {
      data.labels.forEach((item: any) => {
        predictions.push({
          label: item.labelName || item.label,
          confidence: item.confidence
        });
      });
    }

    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    return {
      predictions,
      topPrediction: predictions[0]
    };

  } catch (error: any) {
    console.error('[Nyckel API Error]', error);
    throw new Error(error.message || 'Failed to recognize PC part');
  }
}

/**
 * Recognize PC part from text description
 * @param text - Text description of the part
 * @returns Recognition result
 */
export async function recognizePCPartFromText(text: string): Promise<RecognitionResult> {
  try {
    // Get access token
    const token = await getAccessToken();

    const response = await fetch(NYCKEL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: text
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    const predictions: PCPartPrediction[] = [];
    
    if (data.labelName && data.confidence !== undefined) {
      predictions.push({
        label: data.labelName,
        confidence: data.confidence
      });
    }

    predictions.sort((a, b) => b.confidence - a.confidence);

    return {
      predictions,
      topPrediction: predictions[0]
    };

  } catch (error: any) {
    console.error('[Nyckel API Error]', error);
    throw new Error(error.message || 'Failed to recognize PC part');
  }
}
