// /api/sfx.js — ElevenLabs Sound Effects proxy
// (대장님 결정 2026-05-14 — 기존 /api/sfx 404 사실 측정 후 신설)
// 패턴: claude.js / tts.js 동일 구조 (CORS + CommonJS)
//
// 사용처: HVM SFX Studio 모달 (https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
// 환경변수: ELEVENLABS_API_KEY (vercel 프로젝트 settings에 박혀있어야 함)
//
// Request:  { text, duration_seconds (0.5~30), prompt_influence (0~1) }
// Response: { audio: <base64 MP3> }

module.exports = async function handler(req, res) {
  // CORS 헤더
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, duration_seconds, prompt_influence } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
    }

    // ElevenLabs SFX spec (Context7 검증):
    //   duration_seconds: 0.5 ~ 30
    //   prompt_influence: 0 ~ 1 (default 0.3)
    const dur = Math.max(0.5, Math.min(30, Number(duration_seconds ?? 3)));
    const promptInf = Math.max(0, Math.min(1, Number(prompt_influence ?? 0.3)));

    const apiRes = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text.trim(),
        duration_seconds: dur,
        prompt_influence: promptInf,
        model_id: 'eleven_text_to_sound_v2'
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('[SFX proxy] ElevenLabs', apiRes.status, errText.slice(0, 500));
      return res.status(apiRes.status).json({
        error: `ElevenLabs ${apiRes.status}: ${errText.slice(0, 500)}`
      });
    }

    // binary MP3 → base64 (클라이언트 기존 디코딩 호환)
    const buf = Buffer.from(await apiRes.arrayBuffer());
    const audioBase64 = buf.toString('base64');

    return res.status(200).json({ audio: audioBase64 });
  } catch (err) {
    console.error('[SFX proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
