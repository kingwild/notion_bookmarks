type Provider = { id: 'zhipu' | 'siliconflow' | 'custom'; url: string; key: string; model: string };
export function aiProviders(env: Record<string, string | undefined> = process.env): Provider[] {
  const providers: Provider[] = [];
  if (env.ZHIPU_API_KEY?.trim()) providers.push({ id: 'zhipu', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', key: env.ZHIPU_API_KEY.trim(), model: 'glm-4.7-flash' });
  if (env.SILICONFLOW_API_KEY?.trim()) providers.push({ id: 'siliconflow', url: 'https://api.siliconflow.cn/v1/chat/completions', key: env.SILICONFLOW_API_KEY.trim(), model: env.SILICONFLOW_MODEL?.trim() || 'XingChenAGI/Xing4.0-29B' });
  // Keep existing installations working, without adding an unselected third fallback.
  if (!providers.length && env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL) {
    const url = new URL('chat/completions', env.AI_BASE_URL.replace(/\/?$/, '/'));
    if (url.protocol === 'https:' && !url.username && !url.password) providers.push({ id: 'custom', url: url.href, key: env.AI_API_KEY, model: env.AI_MODEL });
  }
  return providers;
}
export function aiConfigured() { try { return aiProviders().length > 0; } catch { return false; } }
export async function aiText(system: string, content: string, options: { validate?: (value: string) => boolean } = {}) {
  const providers = aiProviders();
  if (!providers.length) throw new Error('AI 服务尚未配置，可以先手动整理并预览');
  let limited = false;
  let overloaded = false, unauthorized = false;
  for (const provider of providers) {
    for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(provider.url, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: provider.model, messages: [{ role: 'system', content: system }, { role: 'user', content }], temperature: 0.2, max_tokens: 1800, stream: false, ...(provider.id === 'zhipu' ? { thinking: { type: 'disabled' } } : {}) }), signal: AbortSignal.timeout(18000), cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 429) limited = true;
        if (response.status === 401) unauthorized = true;
        const error = await response.json().catch(() => null);
        const busy = provider.id === 'zhipu' && response.status === 429 && String(error?.error?.code) === '1305';
        if (busy) overloaded = true;
        // Retry temporary model overload once, respecting the provider's delay.
        // Account rate limits and policy responses are never retried here.
        const header = response.headers.get('retry-after');
        const wait = header === null ? 1500 : /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
        if (busy && attempt === 0 && Number.isFinite(wait) && wait >= 0 && wait <= 5000) {
          await new Promise(resolve => setTimeout(resolve, Math.max(1500, wait)));
          continue;
        }
        // Invalid input / moderation responses must not be retried on another provider.
        if (response.status >= 400 && response.status < 500 && ![401, 404, 408, 429].includes(response.status)) throw new AIPolicyError();
        break;
      }
      const result = await response.json(); const choice = result.choices?.[0], text = choice?.message?.content;
      if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new AIPolicyError();
      if (choice?.finish_reason === 'length' || typeof text !== 'string' || !text.trim() || (options.validate && !options.validate(text))) break;
      return text.trim();
    } catch (error) {
      if (error instanceof AIPolicyError) throw new Error('AI 无法处理这段内容，请调整后重试或手动整理；内容尚未保存');
      break; // Network / invalid response: move to the configured backup, without logging private content.
    }
    }
  }
  throw new Error(overloaded ? '智谱模型当前繁忙；请稍后再试或手动整理，内容尚未保存' : limited ? 'AI 服务达到调用频率限制，请稍后重试或手动整理；内容尚未保存' : unauthorized ? 'AI 密钥验证失败，请站主检查服务端配置；内容尚未保存' : 'AI 暂时无法完成整理，请稍后重试或手动整理；内容尚未保存');
}
class AIPolicyError extends Error {}
