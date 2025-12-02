// Vercel Serverless Function - ElevenLabs TTS with Timestamps API Proxy
// Lip-Sync용 character-level alignment 데이터 포함

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // 환경 변수에서 API 키 가져오기
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
        console.error('ELEVENLABS_API_KEY not configured');
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    try {
        const { text, voice_id, model_id, voice_settings } = req.body;

        // 요청 검증
        if (!text || !voice_id) {
            return res.status(400).json({ error: 'text and voice_id are required' });
        }

        // ElevenLabs TTS with Timestamps API 호출
        const ttsEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/with-timestamps`;

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

        console.log(`[TTS-Timestamps] Calling ElevenLabs for voice: ${voice_id}`);

        const response = await fetch(ttsEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs TTS-Timestamps API Error:', errorText);
            return res.status(response.status).json({
                error: 'ElevenLabs API error',
                details: errorText
            });
        }

        // 응답은 JSON (audio_base64 + alignment)
        const result = await response.json();

        console.log(`[TTS-Timestamps] Success! Alignment characters: ${result.alignment?.characters?.length || 0}`);

        // 클라이언트에 반환
        return res.status(200).json({
            audio_base64: result.audio_base64,
            alignment: result.alignment,
            normalized_alignment: result.normalized_alignment
        });

    } catch (error) {
        console.error('TTS-Timestamps Proxy Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
