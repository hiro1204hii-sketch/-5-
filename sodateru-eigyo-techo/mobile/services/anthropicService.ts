import { AnalysisResult, Temperature } from '../types';

interface RawAnalysis {
  minutes: string;
  actions: string;
  temperature: string;
  temperature_reason: string;
  coach_comment: string;
}

export async function analyzeTranscript(
  transcript: string,
  apiKey: string,
): Promise<Omit<AnalysisResult, 'id' | 'date' | 'transcript' | 'duration' | 'customerId' | 'customerName'>> {
  const prompt = `あなたは優秀な営業アシスタントです。以下は商談の音声文字起こしです。

【文字起こし】
${transcript}

以下の5項目を日本語でJSONで返してください。

{
  "minutes": "議事録（誰が何を言ったかを整理。発言者は「営業」「お客様」で区別。箇条書き5〜10項目）",
  "actions": "次にやるべきアクション（営業担当がすべき具体的な行動を箇条書き3〜5項目）",
  "temperature": "HOT または WARM または COLD のいずれか1つだけ",
  "temperature_reason": "温度感の判断理由（1〜2文）",
  "coach_comment": "AIコーチとしての一言アドバイス（営業の改善点や称賛。2〜3文で具体的に）"
}

判定基準:
HOT = 購買意欲高く成約が近い / WARM = 興味あるが検討中 / COLD = 興味薄または否定的`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message ?? `Claude APIエラー (${res.status})`);
  }
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AIの応答を解析できませんでした');
  const p: RawAnalysis = JSON.parse(m[0]);
  const temp = (p.temperature ?? 'WARM').toUpperCase() as Temperature;
  return {
    minutes:           p.minutes ?? '',
    actions:           p.actions ?? '',
    temperature:       (['HOT','WARM','COLD'] as Temperature[]).includes(temp) ? temp : 'WARM',
    temperatureReason: p.temperature_reason ?? '',
    coachComment:      p.coach_comment ?? '',
  };
}

export async function chatWithCoach(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
): Promise<string> {
  const system = `あなたは「育てる営業手帳」のAI営業コーチです。
ユーザーはBtoBまたはBtoC営業職の方です。
具体的・実践的なアドバイスを、励ましを込めて提供してください。
返答は3〜5文程度で簡潔に。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      system,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`Claude APIエラー (${res.status})`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}
