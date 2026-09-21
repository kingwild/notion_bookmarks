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
  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: provider.model, messages: [{ role: 'system', content: system }, { role: 'user', content }], temperature: 0.2, max_tokens: 1800, stream: false, ...(provider.id === 'zhipu' ? { thinking: { type: 'disabled' } } : {}) }), signal: AbortSignal.timeout(18000), cache: 'no-store' });
      if (!response.ok) {
        await response.body?.cancel();
        // Invalid input / moderation responses must not be retried on another provider.
        if (response.status >= 400 && response.status < 500 && ![401, 404, 408, 429].includes(response.status)) break;
        continue;
      }
      const result = await response.json(); const choice = result.choices?.[0], text = choice?.message?.content;
      if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) break;
      if (choice?.finish_reason === 'length' || typeof text !== 'string' || !text.trim() || (options.validate && !options.validate(text))) continue;
      return text.trim();
    } catch { /* Timeout, network failure, or malformed response: try the configured backup once. Never log private notes or keys. */ }
  }
  throw new Error('AI 暂时无法完成整理，请稍后重试或手动整理；内容尚未保存');
}
