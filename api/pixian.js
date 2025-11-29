// Vercel Serverless Function for Pixian.ai Background Removal API
// File: api/pixian.js
// Deploy to: gemini-proxy-gold-mu.vercel.app/api/pixian
//
// Environment Variables Required:
// - PIXIAN_API_ID: Your Pixian.ai API ID (from https://pixian.ai/api)
// - PIXIAN_API_SECRET: Your Pixian.ai API Secret (from https://pixian.ai/api)
//
// NO ADDITIONAL PACKAGES REQUIRED! (form-data 불필요)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiId = process.env.PIXIAN_API_ID;
  const apiSecret = process.env.PIXIAN_API_SECRET;

  if (!apiId || !apiSecret) {
    return res.status(500).json({ error: 'PIXIAN_API_ID or PIXIAN_API_SECRET not configured' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // Pixian.ai API 호출 (Base64 URL 방식 - form-data 패키지 불필요!)
    // HTTP Basic Auth: username = API ID, password = API Secret
    const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiId + ':' + apiSecret).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image.base64=${encodeURIComponent(image)}&test=true`,
    });

    if (!pixianResponse.ok) {
      const errorText = await pixianResponse.text();
      console.error('Pixian API Error:', pixianResponse.status, errorText);
      return res.status(pixianResponse.status).json({
        success: false,
        error: `Pixian API Error: ${pixianResponse.status} - ${errorText}`,
      });
    }

    // 응답은 PNG 이미지
    const resultBuffer = await pixianResponse.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      image: resultBase64,
    });

  } catch (error) {
    console.error('Pixian Proxy Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
