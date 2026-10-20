// Petit serveur (Cloudflare Worker) pour Correcteur de Maths.
// Il garde ta clé d'API Anthropic côté serveur : elle n'apparaît jamais dans l'appli.
//
// Variables à créer dans Cloudflare (Settings > Variables and Secrets) :
//   ANTHROPIC_API_KEY  (secret, obligatoire)  ta clé d'API
//   APP_CODE           (secret, conseillé)    un code que l'appli envoie à chaque demande
//   ALLOWED_ORIGIN     (texte, facultatif)    l'adresse de ton site, ex. https://maths.exemple.com
//   MODEL              (texte, facultatif)    modèle normal, par défaut claude-sonnet-5-5
//   MODEL_COMPLEX      (texte, facultatif)    modèle du « Mode précis », par défaut claude-opus-5-5

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const cors = {
      'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-app-code',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    if (request.method !== 'POST' || pathname !== '/chat') return reply({ error: 'not_found' }, 404, cors);
    if (!env.ANTHROPIC_API_KEY) return reply({ error: 'missing_api_key' }, 500, cors);
    if (env.APP_CODE && request.headers.get('x-app-code') !== env.APP_CODE) {
      return reply({ error: 'forbidden' }, 403, cors);
    }

    let body;
    try { body = await request.json(); } catch { return reply({ error: 'bad_request' }, 400, cors); }

    const turns = Array.isArray(body.turns) ? body.turns : [];
    const images = Array.isArray(body.images) ? body.images : [];
    if (!turns.length || turns.length > 60 || images.length > 4) return reply({ error: 'bad_request' }, 400, cors);

    let size = 0;
    for (const t of turns) {
      const ok = t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content;
      if (!ok) return reply({ error: 'bad_request' }, 400, cors);
      size += t.content.length;
    }
    if (turns[turns.length - 1].role !== 'user') return reply({ error: 'bad_request' }, 400, cors);
    if (size > 200000) return reply({ error: 'too_large' }, 413, cors);

    for (const im of images) {
      const ok = im && ALLOWED_TYPES.includes(im.media_type) && typeof im.data === 'string' && im.data.length <= 8000000;
      if (!ok) return reply({ error: 'bad_image' }, 400, cors);
    }

    const messages = turns.map((t) => ({ role: t.role, content: t.content }));
    if (images.length) {
      const last = messages[messages.length - 1];
      last.content = [
        ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
        { type: 'text', text: last.content },
      ];
    }

    // « Mode précis » de l'appli : un modèle plus puissant, plus lent et plus cher.
    const model = body.tier === 'complex'
      ? (env.MODEL_COMPLEX || 'claude-opus-5-5')
      : (env.MODEL || 'claude-sonnet-5-5');

    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 4096, messages }),
      });
    } catch {
      return reply({ error: 'upstream_unreachable' }, 502, cors);
    }

    if (!upstream.ok) return reply({ error: 'upstream_error', status: upstream.status }, upstream.status === 429 ? 429 : 502, cors);

    const data = await upstream.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return reply({ text }, 200, cors);
  },
};
