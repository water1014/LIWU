/* ============================================================
   API 对接层
   目标：用户随便填一个中转站地址，不管带不带 /v1、末尾有没有斜杠，
        都能自己试出可用的那条；失败时给出人话。
   三种协议共用一层，业务侧只调用 API.chat / API.models。
   ============================================================ */
window.API = (function () {
  const V1 = /\/v\d+[a-z]*$/i;

  function norm(raw) {
    return String(raw || '').trim().replace(/\/+$/, '');
  }

  /* 候选地址：不确定用户填到哪一层，就两种都试一遍，谁先成功用谁 */
  function bases(raw, protocol) {
    const b = norm(raw);
    if (!b) return [];
    if (V1.test(b)) return [b];
    if (protocol === 'anthropic') return [b, b + '/v1'];
    if (protocol === 'gemini') return [b, b + '/v1beta'];
    return [b, b + '/v1'];
  }

  function friendly(e) {
    const msg = String((e && e.message) || e || '');
    if (/AbortError|aborted|timeout/i.test(msg)) return '等了太久没有回应，检查网络或换个接口地址';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return '连不上，检查网络、地址，或该接口是否允许浏览器跨域';
    if (/\b401\b|\b403\b/.test(msg)) return '密钥不对，或这个密钥没有该模型的权限';
    if (/\b404\b/.test(msg)) return '地址路径不对，试试去掉或补上 /v1';
    if (/\b429\b/.test(msg)) return '请求太快被限流了，等一会儿再试';
    if (/\b5\d\d\b/.test(msg)) return '对方服务端出错了，稍后再试或换线路';
    if (/不是 JSON/i.test(msg)) return '接口有回应，但返回的不是对话数据，多半是地址填错了';
    if (/返回结果为空/i.test(msg)) return '接口通了，但没有返回内容，可能是模型名不对';
    return msg || '未知错误';
  }

  async function req(url, opt, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 45000);
    try {
      return await fetch(url, Object.assign({ signal: ctl.signal }, opt));
    } finally {
      clearTimeout(timer);
    }
  }

  async function body(res) {
    const txt = await res.text();
    if (!res.ok) throw new Error('HTTP ' + res.status + (txt ? ' ' + txt.slice(0, 120) : ''));
    try { return JSON.parse(txt); } catch (e) { throw new Error('返回不是 JSON：' + txt.slice(0, 80)); }
  }

  /* 逐个候选试，全部失败才抛最后一个错误 */
  async function attempt(cfg, fn) {
    const list = bases(cfg.baseUrl, cfg.protocol);
    if (!list.length) throw new Error('未填写 Base URL');
    let last;
    for (const base of list) {
      try { return await fn(base); } catch (e) { last = e; }
    }
    throw last;
  }

  /* 用量记账：有官方 usage 就用官方的，没有就按字数估 */
  function estTok(str) {
    let cjk = 0;
    const t = String(str || '');
    for (const ch of t) if (/[\u4e00-\u9fa5]/.test(ch)) cjk++;
    return Math.round(cjk / 1.6 + (t.length - cjk) / 3.6);
  }
  function rec(data, messages, out, ok) {
    let inTok = 0, outTok = 0;
    const u = data && (data.usage || data.usageMetadata);
    if (u) {
      inTok = u.prompt_tokens || u.input_tokens || u.promptTokenCount || 0;
      outTok = u.completion_tokens || u.output_tokens || u.candidatesTokenCount || 0;
    }
    if (!inTok) inTok = (messages || []).reduce((a, m) => a + estTok(m.content), 0);
    if (!outTok && ok) outTok = estTok(out);
    try { if (window.A && A.addUsage) A.addUsage(inTok, outTok, ok); } catch (e) {}
  }

  async function models(cfg) {
    return attempt(cfg, async (base) => {
      const headers = {};
      if (cfg.protocol === 'anthropic') {
        headers['x-api-key'] = cfg.key;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      } else if (cfg.key) {
        headers.Authorization = 'Bearer ' + cfg.key;
      }
      const res = await req(base + '/models', { headers }, 20000);
      const data = await body(res);
      const rows = data.data || data.models || [];
      const ids = rows.map((m) => m.id || m.name).filter(Boolean);
      if (!ids.length) throw new Error('返回结果为空');
      return ids;
    });
  }

  async function chat(cfg, messages) {
    return attempt(cfg, async (base) => {
      const headers = { 'Content-Type': 'application/json' };
      let url = base + '/chat/completions';
      let payload;

      if (cfg.protocol === 'anthropic') {
        url = base + '/messages';
        headers['x-api-key'] = cfg.key;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        payload = {
          model: cfg.model,
          max_tokens: cfg.maxTokens || 1024,
          temperature: cfg.temp == null ? 0.9 : cfg.temp,
          system: messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n'),
          messages: messages.filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        };
      } else if (cfg.protocol === 'gemini') {
        url = base + '/models/' + cfg.model + ':generateContent?key=' + encodeURIComponent(cfg.key || '');
        payload = {
          contents: messages.filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          systemInstruction: { parts: [{ text: messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n') }] },
          generationConfig: { temperature: cfg.temp == null ? 0.9 : cfg.temp, maxOutputTokens: cfg.maxTokens || 1024 }
        };
      } else {
        headers.Authorization = 'Bearer ' + cfg.key;
        payload = {
          model: cfg.model,
          messages,
          temperature: cfg.temp == null ? 0.9 : cfg.temp,
          max_tokens: cfg.maxTokens || 1024
        };
      }

      const res = await req(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await body(res);

      let out = '';
      if (cfg.protocol === 'anthropic') out = (data.content || []).map((c) => c.text || '').join('');
      else if (cfg.protocol === 'gemini') out = (((data.candidates || [])[0] || {}).content || {}).parts?.map((p) => p.text || '').join('') || '';
      else out = ((data.choices || [])[0] || {}).message?.content || '';

      if (!String(out).trim()) throw new Error('返回结果为空');
      rec(data, messages, out, true);
      return out;
    }).catch((e) => { rec(null, messages, '', false); throw e; });
  }

  return { norm, bases, models, chat, friendly, estTok };
})();
