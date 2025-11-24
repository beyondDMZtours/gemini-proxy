// Vercel Serverless Function - Gemini API Proxy
// API 키를 서버에서만 관리하여 클라이언트 노출 방지

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 환경 변수에서 API 키 가져오기
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { contents, generationConfig } = req.body;

        // 요청 검증
        if (!contents || !Array.isArray(contents)) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        // Gemini API 호출
        const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
        
        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents,
                generationConfig
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            return res.status(response.status).json({ 
                error: 'Gemini API error', 
                details: errorData 
            });
        }

        const result = await response.json();
        return res.status(200).json(result);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message 
        });
    }
}
