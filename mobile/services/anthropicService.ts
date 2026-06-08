import { AnalysisResult, Temperature } from '../types';

interface RawAnalysis {
  minutes: string;
  actions: string;
  temperature: string;
  temperature_reason: string;
}

export async function analyzeTranscript(
  transcript: string,
  apiKey: string
): Promise<Omit<AnalysisResult, 'id' | 'date' | 'transcript' | 'duration'>> {
  const prompt = `あなたは優秀な営業アシスタントです。以下は商談の音声文字起こしです。

【文字起こし】
${transcript}

以下の3つを日本語で出力してください。必ずJSON形式で返してください。

{
  "minutes": "議事録（誰が何を言ったかを整理。発言者が不明な場合は「営業」「お客様」で区別。箇条書きで5〜10項目）",
  "actions": "次にやるべきアクション（営業担当がすべき具体的な行動を箇条書きで3〜5項目）",
  "temperature": "HOT または WARM または COLD のいずれか1つだけ",
  "temperature_reason": "温度感の判断理由（1〜2文）"
}

HOT = 購買意欲が高く成約が近い
WARM = 興味はあるが検討中
COLD = 興味が薄いまたは否定的`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message ?? `Claude API エラー (${response.status})`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AIの応答を解析できませんでした');

  const parsed: RawAnalysis = JSON.parse(jsonMatch[0]);
  const temp = (parsed.temperature ?? 'WARM').toUpperCase() as Temperature;

  return {
    minutes: parsed.minutes ?? '',
    actions: parsed.actions ?? '',
    temperature: ['HOT', 'WARM', 'COLD'].includes(temp) ? temp : 'WARM',
    temperatureReason: parsed.temperature_reason ?? '',
  };
}
