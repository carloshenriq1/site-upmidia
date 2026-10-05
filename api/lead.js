const SHEET_ID = '1DfRxesDqaQVlYt_0DJ581sto-7CW3Ccmkcxr2-1olL8';
const SHEET_RANGE = 'A:J';
const WHATSAPP_NUMBER = '5561981590786';

function clean(value) {
  return String(value || '').trim().slice(0, 2000);
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método não permitido' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const nome = clean(body.nome);
  const email = clean(body.email);
  const whatsapp = clean(body.whatsapp);
  const projeto = clean(body.projeto);
  const mensagem = clean(body.mensagem);
  const origem = clean(body.origem) || 'Portfólio UP Mídia';

  if (!nome || !email) return json(res, 400, { ok: false, error: 'Nome e e-mail são obrigatórios' });
  if (!process.env.MATON_API_KEY) return json(res, 500, { ok: false, error: 'Integração sem chave de API' });

  const row = [
    new Date().toISOString(),
    nome,
    email,
    whatsapp,
    projeto,
    mensagem,
    origem,
    clean(body.page),
    clean(body.userAgent),
    'Novo lead'
  ];

  const endpoint = `https://api.maton.ai/google-sheets/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const sheetResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.MATON_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ values: [row] })
  });

  const sheetText = await sheetResponse.text();
  let sheetData = {};
  try { sheetData = JSON.parse(sheetText || '{}'); } catch (_) {}

  if (!sheetResponse.ok) {
    return json(res, 502, {
      ok: false,
      error: 'Falha ao gravar no Sheets',
      detail: clean(sheetData.message || sheetData?.error?.message || sheetText)
    });
  }

  const text = `Olá, vim pelo portfólio da UP Mídia e quero solicitar um orçamento.\n\nNome: ${nome}\nE-mail: ${email}\nWhatsApp: ${whatsapp || '-'}\nProjeto: ${projeto || '-'}\nMensagem: ${mensagem || '-'}`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

  return json(res, 200, {
    ok: true,
    whatsappUrl,
    sheets: { updatedRange: sheetData?.updates?.updatedRange || null }
  });
};
