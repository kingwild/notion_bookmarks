export function aiConfigured() { return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL); }
export async function aiText(system: string, content: string) {
  if (!aiConfigured()) throw new Error('AI 服务尚未配置，可以先手动整理并预览');
  const url = new URL('chat/completions', process.env.AI_BASE_URL!.replace(/\/?$/, '/'));
  if (url.protocol !== 'https:') throw new Error('AI 服务必须使用 HTTPS');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content }], temperature: 0.2, max_tokens: 1800 }), signal: AbortSignal.timeout(45000), cache: 'no-store' });
  if (!response.ok) throw new Error('AI 服务暂时不可用，请稍后重试');
  const result = await response.json(); const text = result.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('AI 未返回可用结果');
  return text;
}
