  // /api/claude.js - CORS 완벽 해결 버전 (Multi-Image 지원)
  export default async function handler(req, res) {
    // CORS 헤더 설정
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://comic-voca-manufacturing.vercel.app'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,      
  Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { prompt, image, firstImage, lastImage } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const API_KEY = process.env.ANTHROPIC_API_KEY;

      if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      // 메시지 콘텐츠 구성
      const content = [];

      // First 이미지 (새 필드)
      if (firstImage) {
        const imageData = firstImage.startsWith('data:')
          ? firstImage.split(',')[1]
          : firstImage;
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        });
      }

      // Last 이미지 (새 필드)
      if (lastImage) {
        const imageData = lastImage.startsWith('data:')
          ? lastImage.split(',')[1]
          : lastImage;
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        });
      }

      // 기존 단일 이미지 호환 (image 필드)
      if (image && !firstImage && !lastImage) {
        const imageData = image.startsWith('data:')
          ? image.split(',')[1]
          : image;
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        });
      }

      // 텍스트 프롬프트 추가
      content.push({
        type: 'text',
        text: prompt
      });

      // Claude API 호출
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: content
          }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Claude API] 에러:', data);
        throw new Error(data.error?.message || 'Claude API error');
      }

      res.status(200).json({
        success: true,
        result: data.content[0].text
      });

    } catch (error) {
      console.error('[Claude API] 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
