import * as FileSystem from 'expo-file-system';

export async function transcribeAudio(
  audioUri: string,
  openaiApiKey: string
): Promise<string> {
  // Read audio file as base64
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to blob via fetch
  const audioBlob = await fetch(`data:audio/m4a;base64,${base64}`).then(r => r.blob());

  const formData = new FormData();
  formData.append('file', audioBlob as any, 'recording.m4a');
  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message ?? `Whisper API エラー (${response.status})`);
  }

  const text = await response.text();
  return text.trim();
}
