
// =====================================================================
// 1.13 · Copiar/reenviar mensagens · Pessoal › Meu dia
// =====================================================================

// ----- aviso rápido -----
let timerToast = null;
function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; t.classList.add('on'); clearTimeout(timerToast); timerToast = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 250); }, 1600); }
async function copiarTexto(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch {}
  try { const a = document.createElement('textarea'); a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
}

// ----- segurar uma mensagem: Copiar · Reenviar · Copiar resposta -----
const CAMPO_DA_TELA = () => ({ recados: 'entrada', escrever: 'entradaEsc', fin: 'entradaFin', pessoal: pesAba === 'meudia' ? 'entradaDia' : 'entradaPes' })[tela];
function textoDaBolha(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('.meta, .actions, .bts, .esc-pe, .esc-mover, button, .ex, .mini, .prog, .dica.copiar-nao').forEach(x => x.remove());
  c.querySelectorAll('span, b, em, small, i, strong, s').forEach(x => x.insertAdjacentText('afterend', ' '));
  c.querySelectorAll('dt').forEach(x => x.insertAdjacentText('beforeend', ':'));
  c.querySelectorAll('dd, p, div, br, .etq').forEach(x => x.insertAdjacentText('afterend', '\n'));
  return c.textContent.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').replace(/:\n/g, ': ').replace(/ ([,.·)])/g, '$1').trim();
}
let msgAlvo = null, segurar = null, inicioToque = null;
function abrirMenuMsg(el) {
  const meu = el.classList.contains('me');
  const txt = textoDaBolha(el); if (!txt) return;
  const en = el.dataset.escMe && escrever.find(x => x.id === el.dataset.escMe), ft = el.dataset.finT ? Number(el.dataset.finT) : null, fm = ft && fin.chat.find(x => x.k === 'me' && x.t === ft);
  msgAlvo = { txt, meu, ed: en ? { tipo: 'esc', id: en.id, texto: en.texto } : fm ? { tipo: 'fin', t: ft, texto: fm.texto } : null };
  $('msgOv').querySelector('[data-mo="editar"]').hidden = !msgAlvo.ed;
  const ap = $('msgOv').querySelector('[data-mo="apagar"]'); ap.hidden = !msgAlvo.ed; ap.classList.remove('armed'); ap.textContent = en?.desfeito ? 'Apagar a mensagem' : 'Apagar a mensagem e o que ela criou';
  $('moTit').textContent = meu ? 'Sua mensagem' : 'Resposta do AZote';
  $('moPrev').textContent = txt.length > 90 ? txt.slice(0, 90) + '…' : txt;
  $('msgOv').querySelector('[data-mo="copiar"]').textContent = meu ? 'Copiar' : 'Copiar resposta';
  $('msgOv').querySelector('[data-mo="reenviar"]').hidden = !meu || !CAMPO_DA_TELA();
  try { navigator.vibrate?.(12); } catch {}
  $('msgOv').hidden = false;
}
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.chat .msg'); if (!el || el.closest('#chatNotas') || e.target.closest('button, a, input, textarea, select')) return;
  inicioToque = { x: e.clientX, y: e.clientY };
  clearTimeout(segurar); segurar = setTimeout(() => { segurar = null; el.classList.add('segurado'); setTimeout(() => el.classList.remove('segurado'), 300); abrirMenuMsg(el); }, 480);
});
document.addEventListener('pointermove', e => { if (segurar && inicioToque && Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 10) { clearTimeout(segurar); segurar = null; } });
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => { clearTimeout(segurar); segurar = null; }));
document.addEventListener('contextmenu', e => { if (e.target.closest('.chat .msg')) e.preventDefault(); });
$('msgOv').addEventListener('click', async e => {
  if (e.target === $('msgOv')) { $('msgOv').hidden = true; return; }
  const b = e.target.closest('[data-mo]'); if (!b || !msgAlvo) return;
  if (b.dataset.mo === 'apagar' && !b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Toque de novo para apagar'; return; }
  $('msgOv').hidden = true;
  if (b.dataset.mo === 'editar' && msgAlvo.ed) { comecarEdicao(msgAlvo.ed); return; }
  if (b.dataset.mo === 'apagar' && msgAlvo.ed) {
    if (msgAlvo.ed.tipo === 'esc') { const en = escrever.find(x => x.id === msgAlvo.ed.id); if (en) { await apagarEntradaEsc(en); renderEscrever(); } }
    else await apagarMsgFin(msgAlvo.ed.t);
    toast('Mensagem apagada'); return;
  }
  if (b.dataset.mo === 'copiar') toast(await copiarTexto(msgAlvo.txt) ? 'Copiado ✓' : 'Não deu para copiar');
  if (b.dataset.mo === 'reenviar') { const c = $(CAMPO_DA_TELA()); if (!c) return; c.value = msgAlvo.txt; c.dispatchEvent(new Event('input')); c.focus(); try { c.setSelectionRange(c.value.length, c.value.length); } catch {} }
});

// =====================================================================
// Meu dia: você conta o dia em um texto, o app separa as atividades e pergunta o que falta
// =====================================================================
const norm = finTxt; // um normalizador só para o app inteiro (1.14)
const ATIVS = [
  ['trabalho', /\b(trabalh\w*|servico|expediente|escritorio|plantao|empresa|home office)\b/],
  ['treino', /\b(trein\w*|academia|musculacao|malh\w*|crossfit|funcional|pilates|yoga|ioga)\b/],
  ['corrida', /\b(corr[ie]\w*|caminh\w*|pedal\w*|bike|nad[eo]\w*|natacao)\b/],
  ['leitura', /\b(ler|li|leitura|lendo|livro)\b/],
  ['estudo', /\b(estud\w*|monografia|tcc|dissertacao|tese|curso|aula|faculdade|revis\w*|artigo)\b/],
];
const ICONE_ATIV = { trabalho: '💼', treino: '🏋️', corrida: '🏃', leitura: '📖', estudo: '✍️', evento: '📅', habito: '✅' };
const CAT_ATIV = { trabalho: 'trabalho', treino: 'saude', corrida: 'saude', leitura: 'lazer', estudo: 'estudo', evento: 'pessoal' };
// horários numa frase: "entrei 8h10 e saí 17h40", "das 20 às 21h15", "umas 21h30 por meia hora"
function lerHorario(txt, dia0) {
  const s = ' ' + norm(txt) + ' ', achados = [];
  let m; const reH = /(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?![\d\w])/g;
  while ((m = reH.exec(s))) { const antes = s.slice(Math.max(0, m.index - 9), m.index); if (/(por|durante|em)\s+$/.test(antes)) continue; const h = +m[1], mi = +(m[2] || m[3] || 0); if (h <= 24 && mi < 60) achados.push({ p: m.index, min: h * 60 + mi }); }
  const reB = /\b(?:das|de|as|ate|entre|e)\s+(\d{1,2})(?![\d:h,.]|\s*(?:km|min|pag|p\b|x|kg|vez|hora|livro|cap))/g;
  while ((m = reB.exec(s))) { const h = +m[1]; if (h <= 24 && !achados.some(a => Math.abs(a.p - m.index) < 6)) achados.push({ p: m.index, min: h * 60 }); }
  achados.sort((a, b) => a.p - b.p);
  let dur = null;
  if ((m = /\b(?:por|durante|em)\s+(?:(\d{1,2})\s*h(?:oras?)?\s*(\d{2})?|(\d{1,3})\s*min\w*|meia hora|uma hora|(\d)\s*horas?)/.exec(s))) dur = m[1] ? +m[1] * 60 + +(m[2] || 0) : m[3] ? +m[3] : /meia/.test(m[0]) ? 30 : m[4] ? +m[4] * 60 : 60;
  if (!achados.length) return null;
  let ini = achados[0].min, fim = achados[1] ? achados[1].min : dur ? ini + dur : null;
  if (fim !== null && fim <= ini && fim + 720 > ini) fim += 720;
  if (ini < 6 * 60 && fim !== null && fim < 12 * 60 && /tarde|noite/.test(s)) { ini += 720; fim += 720; }
  return { ini: dia0 + ini * 60000, fim: fim !== null ? dia0 + fim * 60000 : null };
}
function lerPagina(txt) {
  const s = norm(txt); let m;
  if ((m = /(\d{1,4})\s*pag/.exec(s)) && !/(ate|pagina)\s*a?\s*$/.test(s.slice(0, m.index))) return { qtd: +m[1] };
  if ((m = /(?:pagina|pag\.?|p\.)\s*(\d{1,4})|ate\s+a?\s*(\d{1,4})\b/.exec(s))) return { pagina: +(m[1] || m[2]) };
  return null;
}
const limparHorarios = t => t.replace(/(?<![\wÀ-ú])(das?|de|às|as|até|ate|entre|umas?|por|durante)\s+\d{1,2}(?:[:h]\d{0,2})?\s*h?(?![\wÀ-ú])/gi, '').replace(/\d{1,2}[:h]\d{0,2}(?![\wÀ-ú])/g, '').replace(/(?<![\wÀ-ú])(entrei|saí|sai|comecei|terminei|às|as)(?![\wÀ-ú])/gi, ' ').replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,+/g, ',').replace(/^(?:[\s,.;-]|e(?=[\s,]))+|(?:[\s,.;-]|(?<=[\s,])e)+$/gi, '').trim();
function diaDoRelato(agora = Date.now()) { const d = new Date(agora); if (d.getHours() < 5) d.setDate(d.getDate() - 1); return inicioDoDia(d.getTime()).getTime(); }
function detectarAtividades(texto, dia0) {
  const partes = norm(texto).split(/[,;.!\n]|\s+e\s+|\btambem\b|\bdepois\b|\bmas\b|\balem disso\b/).map(x => x.trim()).filter(Boolean);
  const agenda = linhasDaAgenda(dia0, dia0 + 86400000 - 1).filter(e => !e.pulado);
  const out = [], tem = (tipo, nome) => out.some(a => a.tipo === tipo && (!nome || a.nome === nome));
  const novo = (tipo, parte, extra = {}) => { const negado = /\bnao\b/.test(parte) && !/\bnao so\b/.test(parte); const h = lerHorario(parte, dia0); const a = { tipo, feito: !negado, parcial: /\b(metade|parte|um pouco|pouco)\b/.test(parte), ...extra }; if (h && h.fim) { a.ini = h.ini; a.fim = h.fim; } if (tipo === 'leitura') Object.assign(a, lerPagina(parte) || {}); if (tipo === 'corrida') { const km = /(\d+(?:[,.]\d+)?)\s*km/.exec(parte); if (km) a.km = parseFloat(km[1].replace(',', '.')); } return a; };
  for (const parte of partes) {
    for (const [tipo, re] of ATIVS) {
      if (!re.test(parte)) continue;
      if (tipo === 'leitura' && /monografia|tcc|artigo|dissertacao/.test(parte) && !/\blivro\b/.test(parte)) continue;
      if (tipo === 'estudo') {
        const mat = pes.materias.find(m => parte.includes(norm(m.nome))) || null;
        const chave = mat ? mat.nome : (/(monografia|tcc|dissertacao|tese)/.exec(parte) || [])[1];
        const nome = mat ? mat.nome : chave ? maiuscula(chave === 'tcc' ? 'TCC' : chave) : 'Estudo';
        if (!tem('estudo', nome)) out.push(novo('estudo', parte, { nome, materiaId: mat?.id || null, escrita: /escrev/.test(parte) }));
        continue;
      }
      if (tem(tipo)) continue;
      out.push(novo(tipo, parte, { nome: { trabalho: 'Trabalho', treino: 'Treino', corrida: 'Corrida', leitura: 'Leitura' }[tipo] }));
    }
    // matérias citadas sem a palavra "estudei" (ex.: "fiz python")
    for (const m of pes.materias) if (parte.includes(norm(m.nome)) && !tem('estudo', m.nome)) out.push(novo('estudo', parte, { nome: m.nome, materiaId: m.id }));
  }
  // compromissos da agenda citados pelo nome (ex.: "fui ao dentista")
  const t = norm(texto);
  for (const e of agenda) {
    if (e.trabalho) continue;
    const pal = finPalavras(e.titulo).filter(w => w.length >= 4);
    if (!pal.length || !pal.some(w => t.includes(w))) continue;
    const ja = out.find(a => (a.tipo === 'treino' && /academia|treino|muscul|crossfit|pilates|yoga/.test(norm(e.titulo))) || (a.tipo === 'estudo' && (norm(e.titulo).includes(norm(a.nome)) || (a.materiaId && e.categoria === 'estudo' && pal.some(w => norm(a.nome).includes(w))))));
    if (ja) { if (!ja.evId) Object.assign(ja, { evId: e.id, chave: e.chave, planIni: e.quando, planFim: e.quando + e.dur * 60000, planTit: e.titulo }); continue; }
    if (out.some(a => a.evId === e.id)) continue;
    const parte = partes.find(p => pal.some(w => p.includes(w))) || t;
    out.push(novo('evento', parte, { nome: e.titulo, evId: e.id, chave: e.chave, planIni: e.quando, planFim: e.quando + e.dur * 60000, planTit: e.titulo }));
  }
  // trabalho e treino puxam o horário previsto da agenda
  for (const a of out) {
    if (a.evId) continue;
    const e = a.tipo === 'trabalho' ? agenda.find(x => x.trabalho) : a.tipo === 'treino' ? agenda.find(x => /academia|treino|muscul|crossfit|pilates|yoga/.test(norm(x.titulo))) : a.tipo === 'estudo' ? agenda.find(x => norm(x.titulo).includes(norm(a.nome))) : a.tipo === 'corrida' ? agenda.find(x => /corr|caminh|pedal|nata/.test(norm(x.titulo))) : null;
    if (e) Object.assign(a, { evId: e.id, chave: e.chave, planIni: e.quando, planFim: e.quando + e.dur * 60000, planTit: e.titulo });
  }
  // hábitos citados viram "feito" sem pergunta
  for (const h of pes.habitos.filter(x => tipoHab(x) === 'sim')) { const raiz = norm(h.nome).slice(0, Math.max(4, norm(h.nome).length - 2)); if (raiz.length >= 4 && t.includes(raiz) && !out.some(a => a.tipo !== 'habito' && norm(a.nome || '').startsWith(raiz))) out.push({ tipo: 'habito', nome: h.nome, habitoId: h.id, feito: !new RegExp('nao\\s+\\w*\\s*' + raiz).test(t) }); }
  return out;
}
const precisaPergunta = a => a.feito && !a.pulado && a.tipo !== 'habito' && (a.tipo === 'leitura' ? (!a.respondida && !(a.pagina || a.qtd)) : !(a.ini && a.fim));
let diaRasc = null;
const relatoPorId = id => (pes.relatos || []).find(r => r.id === id);
const relatoAberto = () => (pes.relatos || []).slice().reverse().find(r => r.fase === 'perguntas' || r.fase === 'resumo') || null;
function proximaPergunta(r) { const i = r.ativs.findIndex(precisaPergunta); r.atual = i; r.fase = i >= 0 ? 'perguntas' : 'resumo'; pes.diaChat.push(i >= 0 ? { k: 'q', rid: r.id, i, t: Date.now() } : { k: 'resumo', rid: r.id, t: Date.now() }); }
async function processarDia(texto) {
  const aberto = relatoAberto();
  pes.diaChat.push({ k: 'me', texto, t: Date.now() });
  if (aberto && aberto.fase === 'perguntas') responderDia(aberto, texto);
  else {
    const dia0 = diaDoRelato();
    const r = { id: novoId(), chave: chaveDia(dia0), dia0, t: Date.now(), texto, ativs: detectarAtividades(texto, dia0), fase: 'perguntas', atual: -1 };
    pes.relatos.push(r);
    pes.diaChat.push({ k: 'lista', rid: r.id, t: Date.now() });
    if (r.ativs.length) proximaPergunta(r); else r.fase = 'vazio';
    if (pes.relatos.length > 120) pes.relatos = pes.relatos.slice(-120);
  }
  if (pes.diaChat.length > 400) pes.diaChat = pes.diaChat.slice(-400);
  await salvarPes(); if (tela === 'pessoal' && pesAba === 'meudia') renderDia();
  return relatoAberto() || pes.relatos[pes.relatos.length - 1];
}
function responderDia(r, texto, sug) {
  const a = r.ativs[r.atual]; if (!a) return;
  if (sug === 'pular' || /^\s*(pular|pula|nao lembro|não lembro|sei la|sei lá)\s*$/i.test(texto)) { a.pulado = true; proximaPergunta(r); return; }
  if (sug === 'plan' && a.planIni) { a.ini = a.planIni; a.fim = a.planFim; a.respondida = true; pes.diaChat.push({ k: 'ok', rid: r.id, i: r.atual, t: Date.now() }); proximaPergunta(r); return; }
  if (sug === 'semdados') { a.respondida = true; pes.diaChat.push({ k: 'ok', rid: r.id, i: r.atual, t: Date.now() }); proximaPergunta(r); return; }
  if (sug === 'naofiz') { a.feito = false; proximaPergunta(r); return; }
  const h = lerHorario(texto, r.dia0);
  if (!h && a.planIni && /como (na|da) agenda|previsto|hor[aá]rio normal|normalmente|no hor[aá]rio|^\s*(sim|isso)\s*$/i.test(texto) && a.tipo !== 'leitura') { responderDia(r, texto, 'plan'); return; }
  if (h) { a.ini = h.ini; a.fim = h.fim || (h.ini + ((a.planFim && a.planIni) ? a.planFim - a.planIni : 3600000)); a.estimado = !h.fim; }
  if (a.tipo === 'leitura') {
    const pg = lerPagina(texto); if (pg) Object.assign(a, pg);
    const l = livroAtual(); a.paginaAntes = l?.pagina || 0;
    if (!l) { const tit = limparHorarios(texto).replace(/(?<![\wÀ-ú])(até|ate|página|pagina|páginas|paginas|pág|pag|li|lendo|o|a|do|da|livro)(?![\wÀ-ú])|\d+/gi, ' ').replace(/\s+/g, ' ').trim(); if (tit.length >= 3 && /[a-zà-ú]{3}/i.test(tit) && !/^(sim|n[aã]o|isso|ok|foi|esse|este|mesmo|o mesmo|claro)$/i.test(tit)) a.livroNovo = maiuscula(tit); }
    if (!pg && !h && !a.livroNovo) { pes.diaChat.push({ k: 'erro', rid: r.id, i: r.atual, html: 'Não achei a página. Responda como <i>“até a página 170”</i> ou <i>“li 20 páginas”</i>, ou toque em <b>Só marcar que li</b>.', t: Date.now() }); return; }
    a.respondida = true;
  } else {
    if (a.tipo === 'corrida') { const km = /(\d+(?:[,.]\d+)?)\s*km/.exec(norm(texto)); if (km) a.km = parseFloat(km[1].replace(',', '.')); }
    if (!h && !(a.tipo === 'corrida' && a.km)) { pes.diaChat.push({ k: 'erro', rid: r.id, i: r.atual, html: 'Não achei o horário. Responda como <i>“das 18h às 19h”</i> ou <i>“entrei 8h10 e saí 17h40”</i>, ou toque em <b>Pular</b>.', t: Date.now() }); return; }
    a.respondida = true;
  }
  if (a.tipo === 'treino') { try { const rp = interpretarPessoal(texto, new Date(), {}); if (rp?.acao === 'treino' && rp.exercicios?.length) a.exercicios = rp.exercicios; } catch {} }
  const resto = limparHorarios(texto).replace(/\b(sim|isso|foi|como na agenda)\b/gi, '').trim();
  if (resto.length > 2 && a.tipo !== 'leitura') a.nota = resto.slice(0, 120);
  pes.diaChat.push({ k: 'ok', rid: r.id, i: r.atual, t: Date.now() });
  proximaPergunta(r);
}
// ----- textos das perguntas -----
const faixa = (a, b) => fmtHora(new Date(a)) + '–' + fmtHora(new Date(b));
function perguntaHTML(r, i, comChips) {
  const a = r.ativs[i], n = r.ativs.filter(x => x.feito && x.tipo !== 'habito').length, pos = r.ativs.slice(0, i + 1).filter(x => x.feito && x.tipo !== 'habito').length;
  const plan = a.planIni ? faixa(a.planIni, a.planFim) : null, l = livroAtual();
  let q, sug = [];
  if (a.tipo === 'trabalho') { q = 'Que horas você <b>entrou</b> e <b>saiu</b>?'; if (plan) sug.push(['plan', plan + ', como na agenda']); }
  else if (a.tipo === 'treino') { q = 'Que horas você treinou? Se quiser, diga o que treinou.'; if (plan) sug.push(['plan', plan + ', como na agenda']); }
  else if (a.tipo === 'corrida') { q = 'Quantos km e que horas?'; if (plan) sug.push(['plan', plan + ', como na agenda']); }
  else if (a.tipo === 'leitura') { q = l ? 'Foi o <b>' + esc(l.titulo) + '</b>? Até que página e mais ou menos que horas?' : 'Qual livro e até que página?'; sug.push(['semdados', 'Só marcar que li']); }
  else if (a.tipo === 'estudo') { q = 'Que horas você ' + (a.escrita || /monografia|tcc|tese|disserta/i.test(a.nome) ? 'escreveu' : 'estudou') + '? Qual parte?'; if (plan) sug.push(['plan', plan + ', como na agenda']); }
  else { q = '<b>' + esc(a.nome) + '</b>: foi no horário previsto?'; if (plan) sug.push(['plan', 'Sim, ' + plan]); sug.push(['naofiz', 'Não fui']); }
  sug.push(['pular', 'Pular']);
  return '<span class="etq">' + pos + '/' + n + ' · ' + ICONE_ATIV[a.tipo] + ' ' + esc(a.nome) + '</span><p>' + q + '</p>' +
    (comChips ? '<div class="ex">' + sug.map(([v, t], k) => '<button type="button" class="chip' + (k === 0 && v !== 'pular' ? ' on' : '') + '" data-dsug="' + v + '">' + esc(t) + '</button>').join('') + '</div>' : '');
}
function okHTML(r, i) {
  const a = r.ativs[i]; let h = '<p><b class="am">✓</b> ' + esc(a.nome) + ' ';
  if (a.ini && a.fim) h += '<b>' + faixa(a.ini, a.fim) + '</b> · ' + fmtLivre((a.fim - a.ini) / 60000) + (a.estimado ? ' (fim estimado)' : '');
  if (a.tipo === 'leitura') { const l = livroAtual(); h += a.livroNovo ? '· novo livro <b>' + esc(a.livroNovo) + '</b>' : ''; if (a.pagina) h += ' · <b>p. ' + (a.paginaAntes ?? l?.pagina ?? 0) + ' → ' + a.pagina + '</b>'; if (a.qtd) h += ' · <b>+' + a.qtd + ' páginas</b>'; if (!a.pagina && !a.qtd && !a.livroNovo) h += '· lido hoje'; }
  if (a.km) h += ' · ' + String(a.km).replace('.', ',') + ' km';
  h += '</p>';
  if (a.planIni && a.ini && a.fim) { const dif = Math.round(((a.fim - a.ini) - (a.planFim - a.planIni)) / 60000); if (Math.abs(dif) >= 5) h += '<p class="dica">' + fmtLivre(Math.abs(dif)) + (dif < 0 ? ' a menos' : ' a mais') + ' que o previsto</p>'; }
  if (a.nota) h += '<p class="dica">' + esc(a.nota) + '</p>';
  if (a.exercicios?.length) h += '<p class="dica">' + a.exercicios.map(e => esc(e.nome) + ' ' + e.series + '×' + e.reps + (e.carga ? ' ' + String(e.carga).replace('.', ',') + ' kg' : '')).join(' · ') + '</p>';
  return h;
}
function listaHTML(r) {
  if (!r.ativs.length) return '<p>Não reconheci atividades nesse texto. Guardei no <b>Diário de hoje</b> mesmo assim.</p><p class="dica">Tente citar o que fez, como <i>“trabalhei, treinei e li um pouco”</i>.</p>';
  const feitos = r.ativs.filter(a => a.feito), nao = r.ativs.filter(a => !a.feito);
  return '<span class="etq">📋 Entendi ' + r.ativs.length + (r.ativs.length === 1 ? ' atividade' : ' atividades') + '</span>' + r.ativs.map(a => {
    const st = !a.feito ? ['não feito', 'nf'] : a.tipo === 'habito' ? ['feito', 'ok'] : precisaPergunta(a) && r.fase !== 'salvo' ? [a.tipo === 'leitura' ? 'páginas?' : 'horário?', ''] : ['ok', 'ok'];
    return '<div class="ativ"><span class="e">' + ICONE_ATIV[a.tipo] + '</span><b>' + esc(a.nome) + '</b><em class="' + st[1] + '">' + st[0] + '</em><small>' + (a.ini && a.fim ? faixa(a.ini, a.fim) : a.planIni ? 'agenda: ' + faixa(a.planIni, a.planFim) : a.tipo === 'leitura' && livroAtual() ? 'livro atual: ' + esc(livroAtual().titulo) + ', p. ' + (livroAtual().pagina || 0) : a.tipo === 'estudo' ? (a.materiaId ? 'matéria em Estudos' : 'vou criar a matéria em Estudos') : a.tipo === 'habito' ? 'hábito de hoje' : '') + '</small></div>';
  }).join('') + (feitos.some(precisaPergunta) ? '<p class="dica">' + feitos.filter(precisaPergunta).length + ' perguntas rápidas. Responda do seu jeito ou toque numa sugestão.</p>' : '') +
    (nao.length ? '' : '') + (r.fase === 'perguntas' ? '<div class="actions"><button type="button" class="btn" data-md="sotexto" data-rid="' + r.id + '">Só guardar o texto</button><button type="button" class="btn" data-md="cancelar" data-rid="' + r.id + '">Cancelar</button></div>' : '');
}
function resumoDiaHTML(r, final) {
  const comHora = r.ativs.filter(a => a.feito && !a.pulado && a.ini && a.fim).sort((a, b) => a.ini - b.ini);
  let h = '<span class="etq">' + (final ? '✓ Dia salvo' : '🗓️ Seu dia') + ' · ' + DIAS[new Date(r.dia0).getDay()] + ', ' + new Date(r.dia0).getDate() + '</span>';
  if (comHora.length) h += '<div class="md-tl">' + comHora.map(a => { const c = categoriaPorId(CAT_ATIV[a.tipo] || 'pessoal'); return '<div class="md-it' + (a.tipo === 'trabalho' ? ' tr' : '') + '" data-md="reperguntar" data-rid="' + r.id + '" data-i="' + r.ativs.indexOf(a) + '"><i style="background:' + c.cor + '"></i><span class="hr">' + faixa(a.ini, a.fim) + '</span><b>' + esc(a.nome) + '</b><small>' + fmtLivre((a.fim - a.ini) / 60000) + (a.planIni ? ' · prev. ' + fmtLivre((a.planFim - a.planIni) / 60000) : '') + '</small></div>'; }).join('') + '</div>';
  const tot = comHora.reduce((s, a) => s + (a.fim - a.ini) / 60000, 0);
  if (comHora.length) h += '<p class="dica">' + fmtLivre(tot) + ' registradas' + (final ? '' : ' · toque numa atividade para corrigir') + '</p>';
  const onde = [];
  const nSes = comHora.length; if (nSes) onde.push(['⏱', 'Cronômetro · ' + nSes + (nSes === 1 ? ' sessão' : ' sessões'), 'real × planejado no Resumo da semana']);
  const tr = r.ativs.find(a => a.tipo === 'treino' && a.feito && !a.pulado); if (tr) onde.push(['🏋️', 'Academia · treino', tr.nota ? esc(tr.nota) : tr.exercicios?.length ? tr.exercicios.map(e => e.nome).join(', ') : 'treino de hoje na semana']);
  const co = r.ativs.find(a => a.tipo === 'corrida' && a.feito && !a.pulado); if (co) onde.push(['🏃', 'Corrida' + (co.km ? ' · ' + String(co.km).replace('.', ',') + ' km' : ''), 'em Academia']);
  for (const a of r.ativs.filter(x => x.tipo === 'estudo' && x.feito && !x.pulado)) onde.push(['✍️', 'Estudos › ' + a.nome + (a.ini && a.fim ? ' · +' + fmtLivre((a.fim - a.ini) / 60000) : ''), a.materiaId ? (a.nota ? esc(a.nota) : 'horas da semana') : 'nova matéria em Estudos']);
  const le = r.ativs.find(a => a.tipo === 'leitura' && a.feito && !a.pulado); if (le) { const l = livroAtual(); onde.push(['📖', 'Leitura' + (a => a.livroNovo ? ' · ' + esc(a.livroNovo) : l ? ' · ' + esc(l.titulo) : '')(le), le.pagina ? 'até a página ' + le.pagina : le.qtd ? '+' + le.qtd + ' páginas' : 'lido hoje']); }
  const hb = r.ativs.filter(a => a.tipo === 'habito' && a.feito); if (hb.length) onde.push(['✅', 'Hábitos · ' + hb.map(a => esc(a.nome)).join(', '), 'marcados como feitos']);
  onde.push(['📔', 'Diário de ' + DIAS[new Date(r.dia0).getDay()], 'o texto que você escreveu']);
  h += '<div class="rot" style="margin-top:10px">' + (final ? 'Guardado em' : 'Onde vou guardar') + '</div>' + onde.map(([i, b, s]) => '<div class="md-onde"><span>' + i + '</span><b>' + b + '</b><small>' + s + '</small></div>').join('');
  const nao = r.ativs.filter(a => !a.feito || a.pulado); if (nao.length) h += '<p class="dica">' + (nao.some(a => !a.feito) ? 'Não feito: ' + nao.filter(a => !a.feito).map(a => esc(a.nome)).join(', ') + '. ' : '') + (nao.some(a => a.pulado) ? 'Sem horário (não vai para o Cronômetro): ' + nao.filter(a => a.pulado).map(a => esc(a.nome)).join(', ') + '.' : '') + '</p>';
  if (!final && r.fase === 'resumo') h += '<div class="actions"><button type="button" class="btn primary" data-md="salvar" data-rid="' + r.id + '">✓ Salvar meu dia</button><button type="button" class="btn" data-md="cancelar" data-rid="' + r.id + '">Cancelar</button></div>';
  if (final && r.fase === 'salvo') h += '<div class="actions"><button type="button" class="btn" data-md="desfazer" data-rid="' + r.id + '">Desfazer</button></div>';
  return h;
}
// ----- salvar e desfazer -----
async function salvarDia(r, soTexto = false) {
  const cr = { sessoes: [], treinos: [], corridas: [], leituras: [], materias: [], habitos: [], livros: [], diario: null };
  if (!soTexto) for (const a of r.ativs) {
    if (!a.feito || a.pulado) continue;
    if (a.tipo === 'habito') { const hb = pes.habitos.find(x => x.id === a.habitoId); if (hb && !feitoHab(hb, r.chave)) { marcarHabito(hb, r.chave, true); cr.habitos.push(hb.id); } continue; }
    let matId = a.materiaId;
    if (a.tipo === 'estudo' && !matId) { const m = { id: novoId(), nome: a.nome, metaMin: 0, cor: CORES_MAT[pes.materias.length % CORES_MAT.length] }; pes.materias.push(m); matId = m.id; cr.materias.push(m.id); }
    if (a.ini && a.fim && !(a.evId && crono.sessoes.some(s => s.evId === a.evId && s.chave === a.chave))) {
      const s = { id: novoId(), evId: a.evId || null, chave: a.chave || null, titulo: a.tipo === 'leitura' ? 'Leitura' : a.nome, categoria: CAT_ATIV[a.tipo] || 'pessoal', materiaId: a.tipo === 'estudo' ? matId : undefined, ini: a.ini, fim: a.fim, pausaMin: 0, planIni: a.planIni || null, planFim: a.planFim || null, nota: 'Meu dia' + (a.nota ? ' · ' + a.nota : '') };
      crono.sessoes.push(s); cr.sessoes.push(s.id);
    }
    if (a.tipo === 'treino' && !pes.treinos.some(t => chaveDia(t.t) === r.chave)) { const t = { id: novoId(), t: a.ini || Date.now(), exercicios: a.exercicios || [], nota: a.nota || '' }; pes.treinos.push(t); cr.treinos.push(t.id); }
    if (a.tipo === 'corrida') { const c = { id: novoId(), t: a.ini || Date.now(), tipo: 'corrida', km: a.km || 0, min: a.ini && a.fim ? (a.fim - a.ini) / 60000 : null }; pes.corridas.push(c); cr.corridas.push(c.id); }
    if (a.tipo === 'leitura') {
      let l = livroAtual();
      if (a.livroNovo) { l = { id: novoId(), titulo: a.livroNovo, paginas: null, pagina: 0, status: 'lendo', inicio: Date.now(), atualizado: Date.now() }; pes.livros.push(l); cr.livros.push(l.id); }
      if (l && (a.pagina || a.qtd)) { const antes = { pagina: l.pagina, status: l.status, fim: l.fim, atualizado: l.atualizado }; l.pagina = a.pagina ? Math.min(a.pagina, l.paginas || a.pagina) : Math.min((l.pagina || 0) + a.qtd, l.paginas || 99999); l.atualizado = Date.now(); if (l.paginas && l.pagina >= l.paginas) { l.status = 'lido'; l.fim = Date.now(); }
        const reg = { id: novoId(), livroId: l.id, t: a.fim || Date.now(), pagina: l.pagina }; pes.leituras.push(reg); cr.leituras.push({ livro: l.id, antes, reg: reg.id }); }
    }
  }
  const ant = pes.diario.find(d => d.chave === r.chave) || null;
  cr.diario = ant ? { ...ant } : 'novo';
  const nd = { chave: r.chave, t: ant?.t || Date.now(), energia: ant?.energia ?? null, humor: ant?.humor ?? null, nota: [ant?.nota, r.texto].filter(Boolean).join('\n') };
  pes.diario = pes.diario.filter(d => d.chave !== r.chave); pes.diario.push(nd);
  r.criados = cr; r.fase = 'salvo';
  pes.diaChat.push({ k: 'salvo', rid: r.id, t: Date.now() });
  await salvarPes(); await salvarCrono();
}
async function desfazerDia(r) {
  const c = r.criados; if (!c) return;
  crono.sessoes = crono.sessoes.filter(s => !c.sessoes.includes(s.id));
  pes.treinos = pes.treinos.filter(t => !c.treinos.includes(t.id)); pes.corridas = pes.corridas.filter(x => !c.corridas.includes(x.id));
  for (const lr of c.leituras) { const l = pes.livros.find(x => x.id === lr.livro); if (l) Object.assign(l, lr.antes); pes.leituras = pes.leituras.filter(x => x.id !== lr.reg); }
  pes.livros = pes.livros.filter(l => !c.livros.includes(l.id));
  for (const id of c.habitos) { const hb = pes.habitos.find(x => x.id === id); if (hb) marcarHabito(hb, r.chave, false); }
  pes.materias = pes.materias.filter(m => !c.materias.includes(m.id));
  pes.diario = pes.diario.filter(d => d.chave !== r.chave); if (c.diario && c.diario !== 'novo') pes.diario.push(c.diario);
  r.criados = null; r.fase = 'desfeito';
  pes.diaChat.push({ k: 'txt', rid: r.id, html: '<p>Desfeito. Nada desse dia ficou guardado.</p>', t: Date.now() });
  await salvarPes(); await salvarCrono();
}
// ----- tela -----
function renderDia() {
  const ab = relatoAberto();
  $('entradaDia').placeholder = ab && ab.fase === 'perguntas' ? 'Responda ou toque numa sugestão…' : 'Conte como foi o dia…';
  const boas = bolhaHTML('app', '<p>🌙 <b>Como foi seu dia?</b> Conte do seu jeito, em um texto só. Eu separo as atividades (trabalho, treino, estudos, leitura, compromissos da agenda) e pergunto só o que faltar, como os horários.</p><div class="ex"><button type="button" class="chip" data-ex="Hoje trabalhei normalmente, fui treinar e consegui ler um pouco">Hoje trabalhei normalmente, fui treinar e consegui ler um pouco</button></div><p class="dica">Segure qualquer mensagem para copiar ou reenviar.</p>', null);
  const ultQ = (() => { for (let k = pes.diaChat.length - 1; k >= 0; k--) { const it = pes.diaChat[k]; if (it.k === 'q') return it; if (it.k === 'me') continue; } return null; })();
  $('p-meudia').innerHTML = boas + comSeparadores(pes.diaChat, it => {
    if (it.k === 'me') return bolhaHTML('me', '<p>' + esc(it.texto) + '</p>', it.t);
    const r = relatoPorId(it.rid);
    if (it.k === 'txt') return bolhaHTML('app', it.html, it.t);
    if (!r) return '';
    if (it.k === 'lista') return bolhaHTML('app', listaHTML(r), it.t);
    if (it.k === 'q') return bolhaHTML('app', perguntaHTML(r, it.i, r.fase === 'perguntas' && r.atual === it.i && it === ultQ), it.t);
    if (it.k === 'erro') return bolhaHTML('app', '<p>' + it.html + '</p>' + (r.fase === 'perguntas' && r.atual === it.i ? '<div class="ex">' + (r.ativs[it.i].tipo === 'leitura' ? '<button type="button" class="chip on" data-dsug="semdados">Só marcar que li</button>' : '') + '<button type="button" class="chip" data-dsug="pular">Pular</button></div>' : ''), it.t);
    if (it.k === 'ok') return bolhaHTML('app', okHTML(r, it.i), it.t);
    if (it.k === 'resumo') return bolhaHTML('app', resumoDiaHTML(r, false), it.t);
    if (it.k === 'salvo') return bolhaHTML('app', resumoDiaHTML(r, true), it.t);
    return '';
  });
  rolarChat();
}
$('p-meudia').addEventListener('click', async e => {
  const ex = e.target.closest('[data-ex]'); if (ex) { $('entradaDia').value = ex.dataset.ex; ajustarDia(); $('entradaDia').focus(); return; }
  const sg = e.target.closest('[data-dsug]');
  if (sg) { const r = relatoAberto(); if (!r || r.fase !== 'perguntas') return; pes.diaChat.push({ k: 'me', texto: sg.textContent, t: Date.now() }); responderDia(r, sg.textContent, sg.dataset.dsug); await salvarPes(); renderDia(); return; }
  const b = e.target.closest('[data-md]'); if (!b) return;
  const r = relatoPorId(b.dataset.rid); if (!r) return;
  const a = b.dataset.md;
  if (a === 'salvar') { await salvarDia(r); toast('Dia salvo ✓'); }
  if (a === 'sotexto') { r.ativs.forEach(x => x.pulado = true); await salvarDia(r, true); }
  if (a === 'cancelar') { r.fase = 'cancelado'; pes.diaChat.push({ k: 'txt', rid: r.id, html: '<p>Combinado, não guardei esse relato.</p>', t: Date.now() }); }
  if (a === 'desfazer') await desfazerDia(r);
  if (a === 'reperguntar' && r.fase === 'resumo') { const i = +b.dataset.i, at = r.ativs[i]; delete at.ini; delete at.fim; delete at.respondida; delete at.pulado; r.atual = i; r.fase = 'perguntas'; pes.diaChat.push({ k: 'q', rid: r.id, i, t: Date.now() }); }
  await salvarPes(); renderDia();
});
const campoDia = $('entradaDia');
function ajustarDia() { campoDia.style.height = 'auto'; campoDia.style.height = Math.min(campoDia.scrollHeight, 140) + 'px'; }
campoDia.addEventListener('input', ajustarDia);
$('formDia').addEventListener('submit', async e => {
  e.preventDefault(); const texto = campoDia.value.trim(); if (!texto) return;
  campoDia.value = ''; ajustarDia(); await processarDia(texto); campoDia.focus();
});
campoDia.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('formDia').requestSubmit(); } });
