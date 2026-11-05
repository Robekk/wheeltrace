import core from './core.js';
import html from './html.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=20'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(html.HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
      });
    }

    if (url.pathname === '/api/wheel') {
      try {
        const state = await core.fetchState();
        return new Response(JSON.stringify(state), { headers: JSON_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: String((err && err.message) || err) }), {
          status: 502,
          headers: JSON_HEADERS
        });
      }
    }

    if (url.pathname === '/api/history') {
      const data = env && env.WHEEL_KV ? await env.WHEEL_KV.get('history', 'json') : null;
      return new Response(JSON.stringify({ samples: data || [] }), { headers: JSON_HEADERS });
    }

    return new Response('not found', { status: 404 });
  },

  // Cron: sample the hamster every minute so the artwork has a real trace.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const state = await core.fetchState();
      const prev = (await env.WHEEL_KV.get('history', 'json')) || [];
      prev.push(state);
      // keep a rolling 24h window (1440 samples)
      const trimmed = prev.slice(-1440);
      await env.WHEEL_KV.put('history', JSON.stringify(trimmed));
    })());
  }
};
