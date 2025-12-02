// api/sts.js - ElevenLabs Speech-to-Speech (Voice Changer) Proxy
// Vercel Serverless Function

import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

// Vercel에서 body parser 비활성화 (multipart 처리를 위해)
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
    // Multipart form data 파싱
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // 필드 추출 (formidable v3는 배열로 반환)
    const voiceId = Array.isArray(fields.voice_id) ? fields.voice_id[0] : fields.voice_id;
    const modelId = Array.isArray(fields.model_id) ? fields.model_id[0] : (fields.model_id || 'eleven_multilingual_sts_v2');
    const removeNoise = Array.isArray(fields.remove_background_noise) ? fields.remove_background_noise[0] : fields.remove_background_noise;

    // 오디오 파일 가져오기
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!audioFile || !voiceId) {
      return res.status(400).json({ error: 'audio file and voice_id are required' });
    }

    console.log('[STS] Voice ID:', voiceId);
    console.log('[STS] Model ID:', modelId);
    console.log('[STS] Audio file size:', audioFile.size);

    // ElevenLabs API로 전송할 FormData 생성
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('audio', fs.createReadStream(audioFile.filepath), {
      filename: audioFile.originalFilename || 'recording.webm',
      contentType: audioFile.mimetype || 'audio/webm',
    });
    elevenLabsFormData.append('model_id', modelId);

    if (removeNoise === 'true') {
      elevenLabsFormData.append('remove_background_noise', 'true');
    }

    // ElevenLabs Speech-to-Speech API 호출
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          ...elevenLabsFormData.getHeaders(),
        },
        body: elevenLabsFormData,
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

    // 임시 파일 삭제
    fs.unlink(audioFile.filepath, () => {});

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
