// /api/claude.js - CORS 완벽 해결 버전
export default async function handler(req, res) {
  // CORS 헤더 설정 - 가장 중요!
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5173',  // Vite 기본 포트
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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('[Claude API] 요청 받음:', {
    origin: req.headers.origin,
    method: req.method,
    body: req.body ? 'exists' : 'empty'
  });
  
  try {
    const { prompt, image } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }
    
    // Anthropic API 키 (환경변수명 주의!)
    const API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!API_KEY) {
      console.error('ANTHROPIC_API_KEY가 설정되지 않았습니다!');
      return res.status(500).json({ 
        error: 'API key not configured' 
      });
    }
    
    // Claude API 호출 본문 구성
    const messages = [{
      role: 'user',
      content: []
    }];
    
    // 텍스트 추가
    messages[0].content.push({
      type: 'text',
      text: prompt
    });
    
    // 이미지가 있으면 추가
    if (image) {
      const imageData = image.startsWith('data:') 
        ? image.split(',')[1] 
        : image;
      
      messages[0].content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: imageData
        }
      });
    }
    
    // Claude API 호출
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Claude API] 에러:', data);
      throw new Error(data.error?.message || 'Claude API error');
    }
    
    console.log('[Claude API] 성공');
    
    // 성공 응답
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
