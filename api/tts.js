// Vercel Serverless Function - ElevenLabs TTS API Proxy
// API 키를 서버에서만 관리하여 클라이언트 노출 방지

export default async function handler(req, res) {
    // CORS 설정 - 모든 요청에 대해 먼저 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 환경 변수에서 API 키 가져오기
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
        console.error('ELEVENLABS_API_KEY not configured');
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    try {
        // GET 요청: 사용 가능한 음성 목록 가져오기
        if (req.method === 'GET') {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                method: 'GET',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs Voices API Error:', errorText);
                return res.status(response.status).json({ 
                    error: 'ElevenLabs API error', 
                    details: errorText 
                });
            }

            const voices = await response.json();
            return res.status(200).json(voices);
        }

        // POST 요청: 텍스트를 음성으로 변환
        if (req.method === 'POST') {
            const { text, voice_id, model_id, voice_settings } = req.body;

            // 요청 검증
            if (!text || !voice_id) {
                return res.status(400).json({ error: 'text and voice_id are required' });
            }

            // ElevenLabs TTS API 호출
            const ttsEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;
            
            const requestBody = {
                text: text,
                model_id: model_id || 'eleven_multilingual_v2',
                voice_settings: voice_settings || {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0,
                    use_speaker_boost: true
                }
            };

            const response = await fetch(ttsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs TTS API Error:', errorText);
                return res.status(response.status).json({ 
                    error: 'ElevenLabs API error', 
                    details: errorText 
                });
            }

            // 오디오 데이터를 Base64로 변환
            const audioBuffer = await response.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            
            return res.status(200).json({ 
                audio: base64Audio,
                content_type: 'audio/mpeg'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message 
        });
    }
}
