# PC Part Scanner Setup Guide

## Overview
The PC Part Scanner feature allows users to take photos or upload images of PC components to automatically identify them using AI image recognition.

## Features
- 📸 Take photos with camera
- 🖼️ Upload images from gallery
- 🤖 AI-powered component recognition
- 📊 Confidence scores for predictions
- 🎯 Real-time analysis results

## Setup Instructions

### 1. Get Nyckel API Token

1. Visit [https://www.nyckel.com/](https://www.nyckel.com/)
2. Sign up for a free account
3. Go to **Settings** → **API Keys**
4. Create a new API key
5. Copy your Bearer token

### 2. Update API Token

Open `lib/imageRecognitionService.ts` and replace:

```typescript
const NYCKEL_BEARER_TOKEN = 'YOUR_BEARER_TOKEN';
```

With your actual token:

```typescript
const NYCKEL_BEARER_TOKEN = 'your_actual_token_here';
```

### 3. Permissions Setup

The app already handles camera permissions automatically. When user clicks "Take Photo", they will be prompted to grant camera access.

For iOS, ensure `app.json` has camera permissions (already configured):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow app to access your photos to scan PC parts.",
          "cameraPermission": "Allow app to access your camera to scan PC parts."
        }
      ]
    ]
  }
}
```

## Usage

1. Open the app and navigate to the **Scan Part** tab
2. Choose one of two options:
   - **Take Photo**: Use camera to capture a PC component
   - **Choose from Gallery**: Select an existing image
3. Wait for AI analysis (usually 1-3 seconds)
4. View detection results with confidence scores
5. Top prediction is highlighted in green

## Supported PC Components

The Nyckel model can recognize:
- CPU (Processors)
- GPU (Graphics Cards)
- RAM (Memory)
- Motherboard
- Power Supply (PSU)
- Storage (HDD/SSD)
- PC Case
- Cooling Systems
- And more...

## API Details

### Endpoint
```
POST https://www.nyckel.com/v1/functions/parts-of-a-computer/invoke
```

### Request Format
```json
{
  "data": "base64_encoded_image_or_url"
}
```

### Response Format
```json
{
  "labelName": "GPU",
  "confidence": 0.95
}
```

## Troubleshooting

### "Failed to analyze image"
- Check your API token is correct
- Ensure you have internet connection
- Verify Nyckel API is accessible

### "Permission Required"
- Grant camera permissions in device settings
- Restart the app after granting permissions

### Poor Recognition Results
- Take clear, well-lit photos
- Focus on the component itself
- Avoid background clutter
- Try different angles

## Alternative APIs

If you want to use a different image recognition service:

1. Update `lib/imageRecognitionService.ts`
2. Modify the API endpoint and request format
3. Update response parsing logic

### Popular Alternatives:
- **Google Cloud Vision API**
- **AWS Rekognition**
- **Clarifai**
- **Azure Computer Vision**

## Cost

**Nyckel Free Tier:**
- 1,000 predictions/month free
- Perfect for testing and small projects
- Upgrade for higher limits

## Future Enhancements

- [ ] Add manual component selection if AI is uncertain
- [ ] Save scan history
- [ ] Compare scanned parts with database
- [ ] Generate price estimates
- [ ] Suggest compatible components
- [ ] Batch scanning for multiple parts

## Support

For issues or questions about the Nyckel API, visit:
- [Nyckel Documentation](https://www.nyckel.com/docs)
- [Nyckel Support](https://www.nyckel.com/support)
