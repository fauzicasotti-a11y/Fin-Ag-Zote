
// =====================================================================
// 2.0 · AgZote: agenda, tarefas, anotações e Pessoal (sem finanças e sem hábitos)
// =====================================================================
function prepararAg() {
  habitosGuardados = pes.habitos || []; pes.habitos = [];
  config.valoresCalendario = false;
  if (pesAba === 'habitos') pesAba = 'hoje';
  $('pa-habitos').hidden = true;
  const ex = EXEMPLOS_ESC.filter(t => !/\d+,\d{2}|cart[aã]o|\b\d{3}\b/.test(t)); EXEMPLOS_ESC.length = 0; EXEMPLOS_ESC.push(...ex, 'remédio todo dia às 22h');
}
// Escrever: gastos vão para o FinZote
const destinoDeBase = destinoDe;
destinoDe = function (t) { const d = destinoDeBase(t); return APP === 'ag' && d === 'fin' ? 'finzote' : d; };
DESTINOS.finzote = ['💳', 'FinZote'];
function linkFinZote(texto) {
  let r = null; try { r = interpretarFin(texto, new Date(), { contas: [], agendadas: [], pendentes: () => [] }); } catch {}
  const tipo = r?.acao === 'receita' ? 'receita' : /\b(cart[aã]o|cr[eé]dito|\d+\s*x)\b/i.test(texto) ? 'cartao' : 'gasto';
  const q = new URLSearchParams(); if (r?.valor) q.set('valor', r.valor.toFixed(2)); if (r?.titulo && !/^(gasto|receita)$/i.test(r.titulo)) q.set('desc', r.titulo); q.set('texto', texto);
  return 'finzote://' + tipo + '?' + q.toString();
}
function abrirFinZote(texto) { try { location.href = linkFinZote(texto); } catch {} setTimeout(() => toast('Se nada abrir, instale o FinZote'), 1200); }
function finzoteHTML(en) {
  let v = null; try { v = finValor(finTxt(en.texto))?.valor; } catch {}
  return '<p>Gastos e recebimentos agora ficam no <b>FinZote</b>.' + (v ? ' Abro o cadastro já com <b>' + fmtBRL(v) + '</b>?' : '') + '</p><div class="actions"><button type="button" class="btn primary" data-ea="finzote">Abrir no FinZote</button></div>';
}

// ----- Hoje: linha do tempo do dia -----
function renderHomeAg() {
  atualizarBarra();
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), d = new Date(), am0 = maisDias(hoje0, 1);
  let h = '<div class="ola">' + saudacao() + (config.nome ? ', ' + esc(config.nome) : '') + '<small>' + maiuscula(DIAS[d.getDay()]) + ', ' + d.getDate() + ' de ' + MESES_LONGO[d.getMonth()] + '</small></div>';
  // faixa de dias
  const semana = linhasDaAgenda(hoje0, maisDias(hoje0, 7) - 1);
  h += '<div class="ag-dias">' + [...Array(7)].map((_, k) => { const t = maisDias(hoje0, k), dd = new Date(t), tem = semana.some(e => !e.pulado && !e.trabalho && e.quando >= t && e.quando < maisDias(t, 1));
    return '<button type="button" data-ha="dia" data-t="' + t + '" class="' + (k === 0 ? 'on' : '') + '">' + (k === 0 ? 'hoje' : DIAS_CURTO[dd.getDay()]) + '<b>' + dd.getDate() + '</b>' + (tem ? '<i></i>' : '') + '</button>'; }).join('') + '</div>';
  // linha do tempo
  const evs = linhasDaAgenda(hoje0, am0 - 1).filter(e => !e.pulado);
  const info = livreNoDia(intervalosNoPeriodo(eventos, hoje0, am0), new Date(hoje0));
  const itens = evs.map(e => ({ t: e.quando, fim: e.quando + e.dur * 60000, e }));
  for (const [a, b] of info.livres || []) { const ini = Math.max(a, Math.ceil(agora / 1800000) * 1800000); if (b - ini >= 30 * 60000) itens.push({ t: ini, fim: b, livre: true }); }
  itens.sort((x, y) => x.t - y.t);
  h += '<div class="rot hj-tit">Hoje · ' + fmtLivre(info.livreMin) + ' livres</div><div class="tl">';
  if (!itens.length) h += '<div class="tl-vazio">Nada marcado hoje. Escreva “dentista amanhã às 15h” no Escrever.</div>';
  for (const it of itens.slice(0, 9)) {
    const di = new Date(it.t);
    if (it.livre) { h += '<span class="h">' + fmtHora(di) + '</span><button type="button" class="tl-ev livre" data-ha="livre" data-t="' + it.t + '">' + fmtLivre((it.fim - it.t) / 60000) + ' livres · toque para marcar</button>'; continue; }
    const e = it.e, agoraNele = it.t <= agora && it.fim > agora, passou = it.fim <= agora, c = categoriaPorId(e.categoria || categorizar(e.titulo, e.trabalho));
    const cr = crono.ativo && crono.ativo.evId === e.id ? ' · ⏱ <span data-crono-tempo>' + fmtCrono(tempoDe(crono.ativo)) + '</span>' : '';
    h += '<span class="h">' + fmtHora(di) + '</span><button type="button" class="tl-ev' + (e.trabalho ? ' trab' : '') + (agoraNele ? ' agora' : '') + (passou ? ' pas' : '') + '" style="--c:' + c.cor + '" data-ha="ev" data-t="' + it.t + '"><b>' + esc(e.titulo) + '</b><small>' + (agoraNele ? 'agora · até ' + fmtHora(new Date(it.fim)) : fmtHora(di) + '–' + fmtHora(new Date(it.fim))) + (e.repetir ? ' · ↻' : '') + cr + '</small></button>';
  }
  h += '</div>';
  const amanha = linhasDaAgenda(am0, maisDias(am0, 1) - 1).filter(e => !e.pulado && !e.trabalho)[0];
  if (amanha) h += '<div class="tl-am">Amanhã: <b>' + fmtHora(new Date(amanha.quando)) + ' ' + esc(amanha.titulo) + '</b></div>';
  h += cardCronoHTML();
  // tarefas do dia
  const abertas = tarefas.filter(t => !t.feita), hojeT = abertas.filter(t => t.prazo !== null && t.prazo <= hoje0), feitasHoje = tarefas.filter(t => t.feita && t.feitaEm >= hoje0);
  h += '<div class="card"><div class="gh" style="margin:0"><span>Tarefas para hoje · ' + feitasHoje.length + '/' + (hojeT.length + feitasHoje.length) + '</span><button type="button" class="lnk" data-h="tarefas">' + abertas.length + ' abertas ›</button></div><div class="hb">' +
    (hojeT.length || feitasHoje.length ? [...feitasHoje.slice(0, 3), ...hojeT.slice(0, 6)].map(t => '<button type="button" class="' + (t.feita ? 'ok' : difDias(t.prazo) < 0 ? 'atr' : '') + '" data-ha="tf" data-id="' + esc(t.id) + '">' + (t.feita ? '✓ ' : '') + '<span>' + esc(t.titulo) + '</span></button>').join('') : '<span class="mut" style="font-size:0.84rem">Nada com prazo para hoje ✓</span>') + '</div></div>';
  // remédios
  const doses = dosesDoDia(hojeChave());
  if (doses.length) h += '<div class="card"><div class="rot">Remédios ' + doses.filter(x => x.dose).length + '/' + doses.length + '</div><div class="hb">' + doses.map(x => '<button type="button" class="rm' + (x.dose ? ' ok' : x.h <= fmtHora(new Date()) ? ' atr' : '') + '" data-h="dose" data-id="' + esc(x.r.id) + '" data-hr="' + x.h + '"' + (x.dose ? ' disabled' : '') + '>💊 <span>' + esc(x.r.nome) + ' ' + x.h + '</span></button>').join('') + '</div></div>';
  // finanças foram para o FinZote
  if (fin.movs.length && !config.finExportado) h += '<div class="card hj-fin"><b>💳 Suas finanças agora ficam no FinZote</b><small>Gere o arquivo com os ' + fin.movs.length + ' lançamentos e importe no FinZote (Início › Importar do AZote).</small><div class="actions"><button type="button" class="btn primary" data-ha="levar">Gerar arquivo</button><button type="button" class="btn" data-ha="levar-nao">Já fiz</button></div></div>';
  // rotina do momento e Meu dia
  const hm = fmtHora(new Date()), ch = hojeChave();
  if (hm >= '18:00' && !(pes.relatos || []).some(r => r.chave === ch && r.fase === 'salvo')) h += '<button type="button" class="card hj-rot hj-dia" data-h="meudia"><span class="em">🌙</span><div><b>Como foi seu dia?</b><small>conte em um texto e eu registro os horários</small></div><span class="chip on">Contar</span></button>';
  if (d.getDay() === 0 && hm >= '15:00') h += '<button type="button" class="card hj-rot" data-h="rot-plano"><span class="em">🗓️</span><div><b>Planejar a semana</b><small>conversa guiada de 2 minutos</small></div><span class="chip on">Abrir</span></button>';
  else if (hm >= (config.revisaoHora || '21:00')) h += '<button type="button" class="card hj-rot" data-h="rot-revisao"><span class="em">🌙</span><div><b>Revisão da noite</b><small>feito, pendente e amanhã</small></div><span class="chip on">Abrir</span></button>';
  h += descobertasHTML();
  const un = notas.slice().sort((a, b) => (b.editada || b.t) - (a.editada || a.t))[0];
  h += '<button type="button" class="card hj-rot" data-h="notas"><span class="em">📝</span><div><b>Anotações</b><small>' + (un ? notas.length + (notas.length === 1 ? ' nota' : ' notas') + ' · ' + esc(un.texto.replace(RE_TAGS, '$1').split('\n')[0].replace(/^#+\s*/, '').slice(0, 44)) : 'pastas, listas e caixinhas') + '</small></div><span class="chip">Ver</span></button>';
  h += '<div class="rot hj-tit">Atalhos</div><div class="atalhos">' + [['recados', 'i-recados', 'Recados'], ['resumo', 'i-resumo', 'Resumo'], ['crono-ver', 'i-crono', 'Sessões'], ['notas', 'i-notas', 'Anotações'], ['cal', 'i-cal', 'Mês'], ['busca', 'i-tarefas', 'Buscar']]
    .map(([k, ic, n]) => '<button type="button" data-' + (k === 'busca' ? 'ha' : 'h') + '="' + k + '"><i><svg><use href="#' + ic + '"/></svg></i><span>' + n + '</span></button>').join('') + '</div>';
  $('hoje').innerHTML = h;
  const dB = config.ultimoBackup ? (Date.now() - config.ultimoBackup) / 86400000 : null;
  $('btnConfig').classList.toggle('alerta', (dB === null && eventos.length > 0) || dB >= 7);
}
if (APP === 'ag') renderHome = renderHomeAg;
$('hoje').addEventListener('click', async e => {
  if (APP !== 'ag') return;
  const b = e.target.closest('[data-ha]'); if (!b) return;
  const a = b.dataset.ha;
  if (a === 'dia' || a === 'ev') { agendaAba = 'prog'; agendaData = inicioDoDia(Number(b.dataset.t)).getTime(); abrir('agenda'); }
  if (a === 'livre') novoCompromisso(Number(b.dataset.t));
  if (a === 'busca') abrirBusca();
  if (a === 'tf') { const t = tarefas.find(x => x.id === b.dataset.id); if (!t) return; const foto = clonar(tarefas); t.feita = !t.feita; t.feitaEm = t.feita ? Date.now() : null; await salvarTarefas(); await agendarAvisoTarefa(t); renderHome(); toastDesfazer(t.feita ? '✓ ' + t.titulo : 'Reaberta', () => voltarTarefas(foto)); }
  if (a === 'levar') { await exportarBackup(); config.finExportado = Date.now(); await guardar('az-config', config); renderHome(); }
  if (a === 'levar-nao') { config.finExportado = Date.now(); await guardar('az-config', config); renderHome(); }
});
// descobertas: sem a de gastos no AgZote
const calcDescobertasBase = calcDescobertas;
calcDescobertas = function (agora) { const l = calcDescobertasBase(agora); return APP === 'ag' ? l.filter(d => !d.id.startsWith('gasto-')) : []; };
// widget e atalhos do AgZote
if (APP === 'ag') dadosWidget = function () {
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime();
  let t1 = '—', s1 = 'nada marcado';
  try { const e = linhasAgenda(agora - 3 * 3600000, agora + 14 * 86400000).filter(x => !x.trabalho && x.quando + (x.duracao ?? 60) * 60000 > agora)[0];
    if (e) { const dd = new Date(e.quando), dif = difDias(e.quando); t1 = fmtHora(dd); s1 = (dif === 0 ? '' : dif === 1 ? 'amanhã · ' : DIAS_CURTO[dd.getDay()] + ' · ') + e.titulo; } } catch {}
  let t2 = '—', s2 = 'livres hoje';
  try { t2 = fmtLivre(livreNoDia(intervalosNoPeriodo(eventos, hoje0, hoje0 + 86400000), new Date(hoje0)).livreMin); } catch {}
  const n = tarefas.filter(t => !t.feita).length, u = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo <= hoje0).length;
  return { t1, s1, t2, s2, t3: String(n), s3: u ? u + ' para hoje' : n === 1 ? 'tarefa aberta' : 'tarefas abertas' };
};
