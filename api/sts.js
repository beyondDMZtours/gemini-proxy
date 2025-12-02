// api/sts.js - ElevenLabs Speech-to-Speech (Voice Changer) Proxy
// Vercel Serverless Function - 수정 버전

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 요청 body를 그대로 Buffer로 읽기
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Content-Type 헤더에서 boundary 추출
    const contentType = req.headers['content-type'];

    // multipart 데이터 파싱
    const boundary = contentType.split('boundary=')[1];
    const parts = parseMultipart(buffer, boundary);

    const voiceId = parts.voice_id;
    const modelId = parts.model_id || 'eleven_multilingual_sts_v2';
    const audioData = parts.audio;
    const audioFilename = parts.audio_filename || 'recording.webm';
    const audioContentType = parts.audio_contentType || 'audio/webm';

    if (!audioData || !voiceId) {
      return res.status(400).json({ error: 'audio and voice_id are required' });
    }

    console.log('[STS] Voice ID:', voiceId);
    console.log('[STS] Audio size:', audioData.length);

    // ElevenLabs로 보낼 FormData 생성
    const formData = new FormData();
    formData.append('audio', new Blob([audioData], { type: audioContentType }), audioFilename);
    formData.append('model_id', modelId);

    // ElevenLabs Speech-to-Speech API 호출
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: formData,
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('[STS] ElevenLabs error:', elevenLabsResponse.status, errorText);
      return res.status(elevenLabsResponse.status).json({
        error: `ElevenLabs API error: ${elevenLabsResponse.status}`,
        details: errorText
      });
    }

    // 오디오 바이너리 → Base64 변환
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    console.log('[STS] Success! Audio size:', audioBuffer.byteLength);

    return res.status(200).json({
      audio_base64: base64Audio,
    });

  } catch (error) {
    console.error('[STS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Multipart 데이터 파싱 함수
function parseMultipart(buffer, boundary) {
  const result = {};
  const boundaryBuffer = Buffer.from('--' + boundary);
  const parts = [];

  let start = 0;
  let idx = buffer.indexOf(boundaryBuffer, start);

  while (idx !== -1) {
    const nextIdx = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
    if (nextIdx === -1) break;

    const partData = buffer.slice(idx + boundaryBuffer.length + 2, nextIdx - 2);
    parts.push(partData);

    idx = nextIdx;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4);

    // Content-Disposition에서 name 추출
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const name = nameMatch[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

    if (filenameMatch) {
      // 파일인 경우
      result[name] = body;
      result[name + '_filename'] = filenameMatch[1];
      if (contentTypeMatch) {
        result[name + '_contentType'] = contentTypeMatch[1];
      }
    } else {
      // 일반 필드인 경우
      result[name] = body.toString().trim();
    }
  }

  return result;
}
