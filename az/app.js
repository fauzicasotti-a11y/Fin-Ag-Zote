
// =====================================================================
// AZote · app (Capacitor/Android). O interpretador de mensagens e
// o cálculo de horas livres ficam no bloco acima (interpretar, ocorrencias…).
// =====================================================================

// ===== Plugins nativos do Capacitor (existem só dentro do app Android) =====
const Cap = window.Capacitor;
const Notif = Cap?.Plugins?.LocalNotifications || null;
const Prefs = Cap?.Plugins?.Preferences || null;
const Teclado = Cap?.Plugins?.Keyboard || null;
const AppNativo = Cap?.Plugins?.App || null;
const Arquivos = Cap?.Plugins?.Filesystem || null;
const Compartilhar = Cap?.Plugins?.Share || null;
const VERSAO = '2.0.0';

// ===== Utilidades =====
const $ = id => document.getElementById(id);
const DIAS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const DIAS_CURTO = ['dom','seg','ter','qua','qui','sex','sáb'];
const MESES_N = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_LONGO = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const pad = n => String(n).padStart(2, '0');
const fmtHora = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const inicioDoDia = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
const difDias = t => Math.round((inicioDoDia(t) - inicioDoDia(Date.now())) / 86400000);
const mesmoDia = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const maiuscula = s => s.replace(/^./, c => c.toUpperCase());
function fmtData(d) {
  const dif = difDias(d);
  const base = DIAS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_N[d.getMonth()];
  if (dif === 0) return 'hoje (' + base + ')';
  if (dif === 1) return 'amanhã (' + base + ')';
  return base;
}
function fmtQuandoCurto(t) { // usado na lista da tela inicial
  const d = new Date(t), dif = difDias(t);
  if (dif === 0) return fmtHora(d);
  if (dif === -1) return 'ontem';
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
}
function fmtSeparador(t) {
  const dif = difDias(t), d = new Date(t);
  if (dif === 0) return 'Hoje';
  if (dif === -1) return 'Ontem';
  return d.getDate() + ' de ' + MESES_LONGO[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : '');
}
function fmtAviso(min) {
  if (min === null || min === undefined) return 'sem aviso';
  if (min === 0) return 'na hora';
  if (min % 1440 === 0) return (min / 1440) + (min === 1440 ? ' dia' : ' dias') + ' antes';
  if (min % 60 === 0) return (min / 60) + (min === 60 ? ' hora' : ' horas') + ' antes';
  return min + ' min antes';
}
function fmtRepetir(r) {
  if (!r) return '';
  if (r.tipo === 'diario') return 'todo dia';
  if (r.tipo === 'mensal') return 'todo mês';
  if (r.tipo === 'anual') return 'todo ano';
  const d = r.dias || [];
  if (d.join() === '1,2,3,4,5') return 'dias úteis';
  if (d.length === 7) return 'todo dia';
  if (d.length === 1) return (d[0] === 0 || d[0] === 6 ? 'todo ' : 'toda ') + DIAS[d[0]];
  return 'toda ' + d.map(x => DIAS_CURTO[x]).join(', ');
}
function fmtDuracao(min) {
  min = min ?? 60;
  if (min >= 900) return 'dia todo';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? h + 'h' + (m ? pad(m) : '') : m + ' min';
}
const fmtLivre = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h + 'h' + (m ? pad(m) : ''); };
const fimDe = (t, ev) => new Date(t + (ev.duracao ?? 60) * 60000);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// O Android exige um número inteiro como id da notificação
function idNumerico(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000 + 1; }

// ===== Armazenamento no próprio celular =====
async function ler(chave, padrao) {
  try {
    const txt = Prefs ? (await Prefs.get({ key: chave })).value : localStorage.getItem(chave);
    return txt ? JSON.parse(txt) : padrao;
  } catch { return padrao; }
}
// grava com até 3 tentativas; se não der, avisa e tenta de novo em 5 s (1.14)
const gravacoesPendentes = new Map();
async function gravarTexto(chave, txt) { if (Prefs) await Prefs.set({ key: chave, value: txt }); else localStorage.setItem(chave, txt); }
async function guardar(chave, valor) {
  const txt = JSON.stringify(valor);
  for (let k = 0; k < 3; k++) {
    try { await gravarTexto(chave, txt); gravacoesPendentes.delete(chave); if (chave !== 'az-widget' && typeof atualizarWidget === 'function') atualizarWidget(); return true; }
    catch { await new Promise(r => setTimeout(r, 200 * (k + 1))); }
  }
  gravacoesPendentes.set(chave, txt);
  try { toast('⚠ Não consegui salvar. Vou tentar de novo.'); } catch {}
  setTimeout(regravarPendentes, 5000);
  return false;
}
async function regravarPendentes() {
  for (const [chave, txt] of [...gravacoesPendentes]) { try { await gravarTexto(chave, txt); gravacoesPendentes.delete(chave); } catch {} }
  if (gravacoesPendentes.size) setTimeout(regravarPendentes, 15000); else try { toast('Salvo ✓'); } catch {}
}
const CHAVE = 'recado-agenda-eventos'; // mantida desde a 1ª versão para não perder dados
let eventos = [];
let recados = [];   // histórico da conversa Recados
let notas = [];     // anotações
let tarefas = [];   // tarefas sem horário
let config = { avisoPadrao: 15, resumoHora: '07:00', ultimoBackup: null, metas: {} };

async function salvarEvento(ev) {
  const i = eventos.findIndex(e => e.id === ev.id);
  if (i >= 0) eventos[i] = ev; else eventos.push(ev);
  await guardar(CHAVE, eventos);
  await agendarAviso(ev);
  agendarResumosDepois();
  atualizarTudo();
}
async function apagarEvento(id) {
  eventos = eventos.filter(e => e.id !== id);
  await guardar(CHAVE, eventos);
  await cancelarAviso(id);
  agendarResumosDepois();
  atualizarTudo();
}

// ===== Navegação entre conversas =====
let tela = 'home';
function soltarTeclado() { document.documentElement.style.setProperty('--kb', '0px'); }
function abrir(t) {
  tela = t;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) document.activeElement.blur();
  soltarTeclado();
  $('app').dataset.tela = t;
  if (t === 'home') renderHome();
  if (t === 'escrever') renderEscrever();
  if (t === 'recados') { renderRecados(); }
  if (t === 'agenda') renderAgenda();
  if (t === 'cal') { if (!calSel) { const h = new Date(); calSel = new Date(h.getFullYear(), h.getMonth(), h.getDate()); } renderCal(); }
  if (t === 'notas') renderNotas();
  if (t === 'tarefas') { tarefaAberta = null; renderTarefas(); }
  if (t === 'busca') renderBusca();
  if (t === 'resumo') { resumoRef = inicioSemana(Date.now()); renderResumo(); }
  if (t === 'config') renderConfig();
  if (t === 'pessoal') renderPessoal();
  if (t === 'revisao') renderRevisao();
  if (t === 'plano') renderPlano();
  if (t === 'retro') renderRetro();
  if (t === 'relatorio') renderRelatorio();
  if (t === 'fin') { if (fin.contas.length === 0 && fin.chat.length === 0 && finAba === 'saldos') finAba = 'saldos'; renderFin(); }
  atualizarBarra(); rolarChat();
}
document.addEventListener('click', e => { if (e.target.closest('[data-voltar]')) voltar(); });
function voltar() {
  if (!$('overlay').hidden) { $('overlay').hidden = true; return true; }
  if (!$('folhaOv').hidden) { $('folhaOv').hidden = true; return true; }
  if (!$('seletorOv').hidden) { $('seletorOv').hidden = true; return true; }
  if (!$('metaOv').hidden) { $('metaOv').hidden = true; return true; }
  for (const ov of ['lancOv', 'cadOv', 'movOv', 'msgOv', 'dlgOv', 'formOv', 'cartaoOv', 'pagFatOv', 'agTarOv', 'contaOv', 'saldoOv', 'baixaOv', 'agOv', 'metaFinOv', 'divOv', 'pagarOv', 'cronoOv', 'outraOv']) if (!$(ov).hidden) { $(ov).hidden = true; return true; }
  if (tela === 'fin' && finConta) { finConta = null; renderFin(); return true; }
  if (tela === 'fin' && finAba === 'cartoes' && cartaoSel) { cartaoSel = null; faturaSel = null; renderFin(); return true; }
  if (tela === 'config' && (cfgPag !== 'main' || cfgBusca)) { cfgPag = cfgBusca ? cfgPag : (cfgPilha.pop() || 'main'); cfgBusca = ''; renderConfig(); return true; }
  if (tela === 'pessoal' && pesAba === 'habitos' && habSel) { habSel = null; renderPessoal(); return true; }
  if (tela === 'relatorio') { abrir(relVoltar || 'home'); return true; }
  if (tela === 'busca') { abrir(buscaVoltar && buscaVoltar !== 'busca' ? buscaVoltar : 'home'); return true; }
  if (tela === 'tarefas' && tarefaAberta) { tarefaAberta = null; renderTarefas(); return true; }
  if (tela === 'fin' && finAba === 'extrato' && extRevisar) { extRevisar = false; renderFin(); return true; }
  if (msgEditando) { cancelarEdicaoMsg(); return true; }
  if (tela === 'notas' && notaEditando) { notaEditando = null; campoNota.value = ''; ajustarAltura(); renderNotas(); return true; }
  if (tela === 'tarefas' && tarefasAba === 'projetos' && projSel) { projSel = null; renderTarefas(); return true; }
  if (tela === 'fin' && finAba === 'metas' && metaSel) { metaSel = null; renderFin(); return true; }
  if (tela === 'fin' && finAba === 'div' && divSel) { divSel = null; renderFin(); return true; }
  if (tela !== 'home') { abrir('home'); return true; }
  return false;
}
try {
  AppNativo?.addListener('backButton', () => { if (!voltar()) AppNativo.minimizeApp(); });
} catch {}

// ===== Linhas da agenda =====
function linhasAgenda(de, ate) {
  const out = [];
  for (const e of eventos) for (const t of ocorrencias(e, de, ate, 200)) out.push({ ...e, quando: t });
  return out.sort((a, b) => a.quando - b.quando);
}
// ===== Bolhas de conversa =====
function bolhaHTML(lado, html, t) {
  return '<div class="msg ' + lado + '">' + html + '<div class="meta">' + (t ? fmtHora(new Date(t)) : '') + '</div></div>';
}
function comSeparadores(itens, paraHTML) {
  let h = '', ultimo = null;
  for (const it of itens) {
    const dia = inicioDoDia(it.t).getTime();
    if (dia !== ultimo) { h += '<div class="sep">' + fmtSeparador(it.t) + '</div>'; ultimo = dia; }
    h += paraHTML(it);
  }
  return h;
}
function chatAtual() { return { recados: $('chatRecados'), notas: $('chatNotas'), fin: finAba === 'chat' ? $('chatFin') : null, pessoal: pesAba === 'lancar' ? $('chatPes') : pesAba === 'meudia' ? $('p-meudia') : null, plano: $('planoCorpo'), escrever: $('chatEsc') }[tela] || null; }
function rolarChat() { setTimeout(() => { const c = chatAtual(); if (c) c.scrollTop = c.scrollHeight; }, 60); }

// ===== Recados =====
const EXEMPLOS = ['Dentista amanhã às 15h, avisar 30 min antes', 'Preciso de 2h para estudar essa semana', 'Trabalho das 08 às 18 todo dia útil, sem aviso',
  'Academia toda segunda e quarta das 18h às 19h', 'Reunião sexta das 14h às 16h', 'Remédio todo dia às 22h'];
function respostaHTML(ev, r) {
  const d = new Date(ev.inicio);
  let h = '<p>Anotado na agenda ✓</p><dl class="ticket">' +
    '<dt>O quê</dt><dd>' + esc(ev.titulo) + (ev.trabalho ? ' <span class="pill trab">trabalho</span>' : '') + '</dd>' +
    '<dt>Quando</dt><dd>' + esc(fmtData(d)) + ', ' + fmtHora(d) + '–' + fmtHora(fimDe(ev.inicio, ev)) + ' (' + fmtDuracao(ev.duracao) + ')</dd>' +
    (ev.repetir ? '<dt>Repete</dt><dd>' + esc(fmtRepetir(ev.repetir)) + '</dd>' : '') +
    '<dt>Aviso</dt><dd>' + esc(fmtAviso(ev.avisoMin)) + '</dd></dl>';
  const faltas = [];
  if (r?.faltouData) faltas.push('não achei a data, coloquei amanhã');
  if (r?.faltouHora) faltas.push('não achei a hora, coloquei 09:00');
  if (faltas.length) h += '<div class="note">Confira: ' + faltas.join('; ') + '.</div>';
  h += '<div class="actions"><button class="btn" data-a="editar" data-id="' + esc(ev.id) + '" type="button">Editar</button><button class="btn" data-a="desfazer" data-id="' + esc(ev.id) + '" type="button">Desfazer</button></div>';
  return h;
}
function renderRecados() {
  const boas = bolhaHTML('app', '<p>Escreva como se fosse uma mensagem. Eu separo a <b>data</b>, a <b>hora</b>, a <b>duração</b> e quando <b>avisar</b>. Toque num exemplo:</p><div class="ex">' +
    EXEMPLOS.map(t => '<button type="button" class="chip" data-ex="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>', null);
  $('chatRecados').innerHTML = boas + comSeparadores(recados, it => it.k === 'me' ? bolhaHTML('me', '<p>' + esc(it.texto) + '</p>', it.t) : bolhaHTML('app', htmlRecado(it), it.t)) + avisosTemporarios.map(h => bolhaHTML('app', h, Date.now())).join('');
  rolarChat();
}
function htmlRecado(it) {
  if (it.k === 'conf') return conflitoHTML(it);
  if (it.k === 'busca') return buscaHTML(it);
  if (it.k === 'cancelado') return '<p>Combinado, não marquei “' + esc(it.titulo) + '”.</p>';
  const ev = eventos.find(e => e.id === it.id);
  if (ev) return respostaHTML(ev, it.r);
  return '<p>“' + esc(it.titulo || 'Compromisso') + '” não está mais na agenda.</p>';
}
let avisosTemporarios = []; // mensagens do app que não ficam no histórico
function avisoNoRecados(html) { avisosTemporarios.push(html); if (tela === 'recados') renderRecados(); }
$('chatRecados').addEventListener('click', e => cliqueRecados(e));
async function cliqueRecados(e) {
  const ex = e.target.closest('[data-ex]');
  if (ex) { $('entrada').value = ex.dataset.ex; $('entrada').focus(); return; }
  const b = e.target.closest('button[data-a]'); if (!b) return;
  if (b.dataset.a === 'editar') abrirEdicao(b.dataset.id);
  if (b.dataset.a === 'desfazer') await apagarEvento(b.dataset.id);
  if (b.dataset.a === 'exato') { try { Notif.changeExactNotificationSetting(); } catch {} }
  if (b.dataset.a === 'marcar') {
    const bu = recados.find(x => x.k === 'busca' && x.id === b.dataset.id); if (!bu) return;
    const ev = { id: novoId(), titulo: bu.titulo, inicio: Number(b.dataset.t), avisoMin: config.avisoPadrao, repetir: null, duracao: bu.dur, trabalho: false, categoria: categorizar(bu.titulo), texto: bu.texto, criado: Date.now() };
    Object.assign(bu, { k: 'ev', id: ev.id, titulo: ev.titulo, r: {} }); delete bu.sugestoes;
    await guardar('az-recados', recados); await salvarEvento(ev); return;
  }
  const it = recados.find(x => x.k === 'conf' && x.id === b.dataset.id);
  if (!it) return;
  if (b.dataset.a === 'forcar') await resolverConflito(it, it.ev);
  if (b.dataset.a === 'cancelar') { it.k = 'cancelado'; it.titulo = it.ev.titulo; delete it.ev; await guardar('az-recados', recados); renderRecados(); }
  if (b.dataset.a === 'livres') {
    it.sugestoes = sugerirComPreferencias(it.ev.inicio, it.ev.duracao ?? 60, 4);
    await guardar('az-recados', recados); renderRecados();
  }
  if (b.dataset.a === 'usar') {
    const t = Number(b.dataset.t), dur = (it.ev.duracao ?? 60) * 60000;
    await resolverConflito(it, { ...it.ev, inicio: t });
  }
}
function buscaHTML(it) {
  if (!it.sugestoes.length) return '<p>Não achei ' + fmtDuracao(it.dur) + ' livres ' + esc(it.periodo) + ', entre 7h e 22h. Tente outro período, como “semana que vem”.</p>';
  return '<p>Encontrei estes horários livres de <b>' + fmtDuracao(it.dur) + '</b> ' + esc(it.periodo) + ':</p><div class="ex">' +
    it.sugestoes.map(t => { const s = new Date(t); return '<button type="button" class="chip" data-a="marcar" data-id="' + esc(it.id) + '" data-t="' + t + '">' + DIAS_CURTO[s.getDay()] + ' ' + s.getDate() + ' · ' + fmtHora(s) + '–' + fmtHora(new Date(t + it.dur * 60000)) + '</button>'; }).join('') +
    '</div><p class="dica">Toque num horário para marcar “' + esc(it.titulo) + '”.</p>';
}
function conflitoHTML(it) {
  const c = it.conf, n = it.ev;
  const d = new Date(c.ini);
  let h = '<p class="alerta">⚠ <b>Conflito de horário</b></p><p>' + maiuscula(fmtData(d)) + ', você já tem <b>' + esc(c.titulo) + '</b> das ' +
    fmtHora(d) + ' às ' + fmtHora(new Date(c.fim)) + '.' + (c.total > 1 ? ' E mais ' + (c.total - 1) + (c.total === 2 ? ' choque' : ' choques') + ' nas próximas semanas.' : '') + '</p>' +
    '<p class="dica">Você pediu: ' + esc(n.titulo) + ', ' + fmtHora(new Date(n.inicio)) + '–' + fmtHora(fimDe(n.inicio, n)) + (n.repetir ? ' (' + esc(fmtRepetir(n.repetir)) + ')' : '') + '.</p>';
  if (it.sugestoes) {
    h += it.sugestoes.length ? '<p style="margin-top:8px">Horários livres de ' + fmtDuracao(n.duracao) + ':</p><div class="ex">' +
      it.sugestoes.map(t => { const s = new Date(t); return '<button type="button" class="chip" data-a="usar" data-id="' + esc(it.id) + '" data-t="' + t + '">' + DIAS_CURTO[s.getDay()] + ' ' + s.getDate() + ' · ' + fmtHora(s) + '–' + fmtHora(fimDe(t, n)) + '</button>'; }).join('') +
      '</div><p class="dica">Toque num horário para marcar “' + esc(n.titulo) + '” nele.</p>'
      : '<p class="dica">Não achei horário livre de ' + fmtDuracao(n.duracao) + ' nos próximos 14 dias.</p>';
  }
  h += '<div class="actions"><button class="btn primary" type="button" data-a="forcar" data-id="' + esc(it.id) + '">Marcar mesmo assim</button>' +
    (!n.repetir && !it.sugestoes ? '<button class="btn" type="button" data-a="livres" data-id="' + esc(it.id) + '">Ver horários livres</button>' : '') +
    '<button class="btn" type="button" data-a="cancelar" data-id="' + esc(it.id) + '">Cancelar</button></div>';
  return h;
}
async function resolverConflito(it, ev) {
  it.k = 'ev'; it.titulo = ev.titulo; delete it.ev; delete it.conf; delete it.sugestoes;
  await guardar('az-recados', recados);
  await salvarEvento(ev);
}
$('formRecados').addEventListener('submit', async e => {
  e.preventDefault();
  const texto = $('entrada').value.trim();
  if (!texto) return;
  $('entrada').value = '';
  await processarRecado(texto); $('entrada').focus();
});
async function processarRecado(texto) {
  const busca = interpretarBusca(texto, new Date());
  if (busca) {
    const t = Date.now();
    recados.push({ k: 'me', texto, t }, { k: 'busca', id: novoId(), titulo: busca.titulo, dur: busca.dur, periodo: busca.periodo, texto, t,
      sugestoes: sugerirComPreferencias(busca.de, busca.dur, 4, busca.ate) });
    await guardar('az-recados', recados); renderRecados(); return;
  }
  const r = interpretar(texto, new Date(), { avisoPadrao: config.avisoPadrao });
  const ev = { id: novoId(), titulo: r.titulo, inicio: r.inicio.getTime(), avisoMin: r.avisoMin, repetir: r.repetir || null,
    duracao: r.duracao ?? (config.duracaoPadrao || 60), trabalho: !!r.trabalho, categoria: categorizar(r.titulo, r.trabalho), texto, criado: Date.now() };
  const t = Date.now();
  const resp = { k: 'ev', id: ev.id, titulo: ev.titulo, r: { faltouData: r.faltouData, faltouHora: r.faltouHora }, t };
  const conf = config.avisarConflitos === false ? [] : conflitosDe(ev, eventos);
  const cp = !conf.length && config.avisarConflitos !== false ? conflitoPreferencia(ev) : null;
  if (conf.length || cp) { // não salva ainda: pergunta o que fazer
    const c = conf[0] || cp;
    resp.k = 'conf'; resp.ev = ev;
    resp.conf = { titulo: c.ev.titulo, ini: c.ini, fim: c.fim, total: conf.length ? new Set(conf.map(x => chaveDia(x.quando))).size : 1 };
  }
  recados.push({ k: 'me', texto, t }, resp);
  if (recados.length > 300) recados = recados.slice(-300);
  await guardar('az-recados', recados);
  if (resp.k === 'ev') await salvarEvento(ev); else renderRecados();
}

// ===== Anotações (uma mensagem de cada lado, alternando) =====
let notaSel = null;
const campoNota = $('entradaNota');
function ajustarAltura() { campoNota.style.height = 'auto'; campoNota.style.height = Math.min(campoNota.scrollHeight, 140) + 'px'; }
campoNota.addEventListener('input', ajustarAltura);
$('formNotas').addEventListener('submit', async e => {
  e.preventDefault();
  const texto = campoNota.value.replace(/\s+$/, '');
  if (!texto.trim()) return;
  campoNota.value = ''; ajustarAltura(); notaSel = null;
  if (notaEditando) { const n = notas.find(x => x.id === notaEditando); notaEditando = null; if (n) { n.texto = texto; n.editada = Date.now(); n.pasta = pastaDoTexto(texto) || notaPastaNova || null; n.fixa = notaFixarNova; await guardar('az-notas', notas); } }
  else { const n = await processarNota(texto, { fixa: notaFixarNova, pasta: notaPastaNova }); }
  notaFixarNova = false; notaPastaNova = notaPasta && notaPasta !== '#fix' ? notaPasta : null;
  renderNotas(); $('notasLista').scrollTop = 0; campoNota.focus();
});
async function processarNota(texto, extra = {}) {
  const n = { id: novoId(), texto, t: Date.now(), pasta: pastaDoTexto(texto) || extra.pasta || null, fixa: !!extra.fixa };
  notas.push(n); await guardar('az-notas', notas); return n;
}

// ===== Notificações do Android =====
let permissaoOk = false;
async function pedirPermissao() {
  if (!Notif) return false;
  try {
    let p = await Notif.checkPermissions();
    if (p.display !== 'granted') p = await Notif.requestPermissions();
    permissaoOk = p.display === 'granted';
  } catch { permissaoOk = false; }
  if (permissaoOk) await verificarExato();
  return permissaoOk;
}
let avisouExato = false;
async function verificarExato() {
  if (!Notif || typeof Notif.checkExactNotificationSetting !== 'function') return;
  try {
    const r = await Notif.checkExactNotificationSetting();
    exatoOk = !r.exact_alarm || r.exact_alarm === 'granted';
  } catch {}
  if (exatoOk === false && !avisouExato) {
    avisouExato = true;
    avisoNoRecados('<p>Para os avisos tocarem <b>no minuto exato</b>, permita “Alarmes e lembretes” para o app.</p><div class="actions"><button class="btn primary" type="button" data-a="exato">Abrir configuração</button></div>');
  }
  if (tela === 'config') renderConfig();
}
// Compromissos repetidos: agendamos os próximos avisos (até MAX_AVISOS, dentro de 60 dias); a lista é renovada ao abrir o app.
const MAX_AVISOS = 30, JANELA = 60 * 86400000;
function idsAviso(id) { const ids = [{ id: idNumerico(id) }]; for (let k = 0; k < MAX_AVISOS; k++) ids.push({ id: idNumerico(id + '#' + k) }); return ids; }
function montarAvisos(ev) {
  if (ev.avisoMin == null) return [];
  const agora = Date.now(), antes = ev.avisoMin * 60000;
  return ocorrencias(ev, agora + antes, agora + JANELA + antes, MAX_AVISOS).map((t, k) => {
    const d = new Date(t);
    return { id: idNumerico(ev.id + '#' + k), title: ev.titulo, body: fmtData(d) + ' às ' + fmtHora(d) + (ev.avisoMin ? ' · ' + fmtAviso(ev.avisoMin) : ''), schedule: { at: new Date(t - antes), allowWhileIdle: true }, extra: { eventoId: ev.id } };
  });
}
async function agendarAviso(ev) {
  if (!Notif) return;
  await cancelarAviso(ev.id);
  const lista = montarAvisos(ev); if (!lista.length) return;
  if (!permissaoOk && !(await pedirPermissao())) return;
  try { await agendarNotif(lista); }
  catch (err) { avisoNoRecados('<div class="note">Não consegui agendar o aviso de “' + esc(ev.titulo) + '” (' + esc(err?.message || 'erro') + ').</div>'); }
}
async function cancelarAviso(id) {
  if (!Notif) return;
  try { await Notif.cancel({ notifications: idsAviso(id) }); } catch {}
}
// todos de uma vez: um cancelamento e um agendamento (antes era um por um)
async function reagendarTodos() {
  if (!Notif || !permissaoOk) return;
  try { await Notif.cancel({ notifications: eventos.flatMap(ev => idsAviso(ev.id)) }); } catch {}
  const lista = eventos.flatMap(montarAvisos);
  for (let i = 0; i < lista.length; i += 150) { try { await agendarNotif(lista.slice(i, i + 150)); } catch {} }
}

// ===== Agenda =====
let agendaAba = 'prog', agendaData = null; // agendaData: null = "7 dias", ou o início (meia-noite) do dia escolhido
function linhasDaAgenda(de, ate) {
  const linhas = [];
  for (const e of eventos) for (const o of ocorrenciasDet(e, de, ate, 200, true))
    linhas.push({ ...e, quando: o.t, dur: o.dur, chave: o.chave, mudado: o.mudado, pulado: o.pulado });
  return linhas.sort((a, b) => a.quando - b.quando);
}
function linhaHTML(e, agora) {
  const di = new Date(e.quando);
  const cls = (e.quando + e.dur * 60000 < agora ? 'past' : (e.quando - agora < 3 * 3600000 && e.quando > agora ? 'soon' : '')) + (e.trabalho ? ' trab' : '') + (e.pulado ? ' pulado' : '');
  const fim = new Date(e.quando + e.dur * 60000);
  return '<div class="ev ' + cls + '" data-id="' + esc(e.id) + '" data-chave="' + (e.chave || '') + '" data-t="' + e.quando + '"><span class="t">' + fmtHora(di) + '<br><small>' + fmtHora(fim) + '</small></span>' +
    '<div style="min-width:0"><div class="ti">' + esc(e.titulo) + '</div><div class="sub">' +
    (e.pulado ? '<span class="pill pulado">pulado só neste dia</span>' : '') +
    (e.mudado ? '<span class="pill mudado">mudado só neste dia</span>' : '') +
    pillCategoria(e) +
    (e.pulado ? '' : '<span class="pill ' + (e.avisoMin != null ? 'on' : '') + '">aviso: ' + esc(fmtAviso(e.avisoMin)) + '</span>') +
    (e.repetir ? '<span class="pill rep">↻ ' + esc(fmtRepetir(e.repetir)) + '</span>' : '') + '</div></div>' +
    '<div class="ev-actions">' + cronoBotoesHTML(e) + (e.pulado ? '<button class="icon-btn" data-a="despular" type="button">Desfazer pulo</button>'
      : e.repetir ? '<button class="icon-btn" data-a="opcoes" type="button">Opções</button>'
      : '<button class="icon-btn" data-a="editar" type="button">Editar</button><button class="icon-btn btn danger" data-a="apagar" type="button">Excluir</button>') +
    '</div></div>';
}
function renderAgenda() {
  const agora = Date.now();
  const hoje0 = inicioDoDia(agora).getTime();
  const dia = n => { const h = new Date(hoje0); return new Date(h.getFullYear(), h.getMonth(), h.getDate() + n).getTime(); };
  $('abaProg').classList.toggle('on', agendaAba === 'prog'); $('abaContas').classList.toggle('on', agendaAba === 'contas');
  $('diasAgenda').hidden = agendaAba !== 'prog'; $('agenda').hidden = agendaAba !== 'prog'; $('contas').hidden = agendaAba !== 'contas';
  if (agendaAba === 'contas') renderContasAgenda();
  $('abaSemana').classList.toggle('on', agendaAba === 'semana'); $('semanaAg').hidden = agendaAba !== 'semana';
  if (agendaAba === 'semana') { renderSemanaAg(); return; }
  const semana = linhasDaAgenda(hoje0, dia(7) - 1);
  // faixa de dias: calendário, "7 dias", data escolhida fora da semana (se houver) e os próximos 7 dias
  let chips = '<button type="button" class="calbtn" data-dia="cal" aria-label="Escolher uma data no calendário"><svg viewBox="0 0 24 24" width="20" height="20"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round"/></g></svg></button>';
  chips += '<button type="button" class="tudo' + (agendaData === null ? ' on' : '') + '" data-dia="">7 dias</button>';
  const naSemana = agendaData !== null && agendaData >= hoje0 && agendaData < dia(7);
  if (agendaData !== null && !naSemana) {
    const d = new Date(agendaData);
    chips += '<button type="button" class="on fora" data-dia="' + agendaData + '">' + DIAS_CURTO[d.getDay()] + '<b>' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '</b></button>';
  }
  for (let n = 0; n < 7; n++) {
    const d = new Date(dia(n));
    const tem = semana.some(e => !e.pulado && e.quando >= dia(n) && e.quando < dia(n + 1));
    chips += '<button type="button" data-dia="' + dia(n) + '" class="' + (agendaData === dia(n) ? 'on' : '') + '">' + (n === 0 ? 'hoje' : DIAS_CURTO[d.getDay()]) + '<b>' + d.getDate() + '</b>' + (tem ? '<i></i>' : '') + '</button>';
  }
  $('diasAgenda').innerHTML = chips;
  const nComp = new Set(semana.filter(e => !e.pulado && !e.trabalho).map(e => e.id)).size;
  const nomeDia = t => { const dif = difDias(t), d = new Date(t); return dif === 0 ? 'hoje' : dif === 1 ? 'amanhã' : dif === -1 ? 'ontem' : DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES_LONGO[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : ''); };
  $('subAgenda').textContent = agendaAba === 'contas' ? 'contas a pagar e a receber' : agendaData === null
    ? 'próximos 7 dias · ' + (nComp ? nComp + (nComp === 1 ? ' compromisso' : ' compromissos') : 'nada marcado')
    : maiuscula(nomeDia(agendaData));
  const box = $('agenda');
  if (!eventos.length) {
    box.innerHTML = '<div class="empty"><b>Nenhum compromisso ainda.</b><br>Escreva um recado, como <i>“academia hoje à noite”</i>, e ele aparece aqui organizado por dia.</div>' + botaoOutraHTML();
    return;
  }
  let de, ate, mostrar;
  if (agendaData === null) { de = hoje0; ate = dia(7); mostrar = semana; }
  else { de = agendaData; const d = new Date(de); ate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); mostrar = linhasDaAgenda(de, ate - 1); }
  const grupos = new Map();
  mostrar.forEach(e => { const k = inicioDoDia(e.quando).getTime(); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); });
  let h = '';
  if (!mostrar.length) h += '<div class="empty">' + (agendaData === null ? 'Nada marcado nos próximos 7 dias.' : 'Nada marcado neste dia.') + '</div>';
  for (const [k, evs] of grupos) {
    const d = new Date(k), dif = difDias(k);
    const rel = dif === 0 ? 'hoje' : dif === 1 ? 'amanhã' : dif === -1 ? 'ontem' : dif < 0 ? 'há ' + (-dif) + ' dias' : 'em ' + dif + ' dias';
    h += '<div class="day"><div class="day-h"><span class="d">' + pad(d.getDate()) + '</span><span class="w">' + DIAS[d.getDay()] + ' · ' + MESES_N[d.getMonth()] + '</span><span class="rel">' + rel + '</span></div>';
    evs.forEach(e => { h += linhaHTML(e, agora); });
    h += '</div>';
  }
  if (agendaData !== null && ate > agora) { // horários livres do dia escolhido
    const d = new Date(de);
    const info = livreNoDia(intervalosNoPeriodo(eventos, de, ate), d);
    const livres = info.livres.filter(([a, b]) => b > agora);
    h += '<div class="livres-dia"><h4>Horários livres · ' + fmtLivre(info.livreMin) + (info.trabalhoMin ? ' fora do trabalho' : '') + '</h4><div>' +
      (livres.length ? livres.map(([a, b]) => fmtHora(new Date(Math.max(a, agora > a && agora < b ? Math.ceil(agora / 1800000) * 1800000 : a))) + '–' + fmtHora(new Date(b))).join(' · ') : 'Nenhum horário livre entre 7h e 22h.') + '</div></div>';
  }
  if (agendaData === null || agendaData === inicioDoDia(agora).getTime()) h += botaoOutraHTML();
  box.innerHTML = h;
}
$('diasAgenda').addEventListener('click', e => {
  const b = e.target.closest('button[data-dia]'); if (!b) return;
  if (b.dataset.dia === 'cal') { abrirSeletor(); return; }
  agendaData = b.dataset.dia === '' ? null : Number(b.dataset.dia); renderAgenda(); $('agenda').scrollTop = 0;
});

// ===== Seletor de data (calendário que abre do botão da Agenda) =====
let selRef = null;
function abrirSeletor() {
  const base = agendaData ? new Date(agendaData) : new Date();
  selRef = new Date(base.getFullYear(), base.getMonth(), 1);
  renderSeletor(); $('seletorOv').hidden = false;
}
function renderSeletor() {
  const ano = selRef.getFullYear(), mes = selRef.getMonth();
  $('selMes').textContent = MESES_LONGO[mes] + ' ' + ano;
  const ini = new Date(ano, mes, 1).getTime(), fim = new Date(ano, mes + 1, 1).getTime();
  const comAlgo = new Set(linhasDaAgenda(ini, fim - 1).filter(e => !e.pulado && !e.trabalho).map(e => inicioDoDia(e.quando).getDate()));
  const hoje = inicioDoDia(Date.now()).getTime();
  let h = '';
  for (let i = 0; i < new Date(ano, mes, 1).getDay(); i++) h += '<span></span>';
  for (let d = 1; d <= new Date(ano, mes + 1, 0).getDate(); d++) {
    const t = new Date(ano, mes, d).getTime();
    h += '<button type="button" data-t="' + t + '" class="' + (t === hoje ? 'hoje ' : '') + (t === agendaData ? 'on ' : '') + (t < hoje ? 'pas' : '') + '">' + d + (comAlgo.has(d) ? '<i></i>' : '') + '</button>';
  }
  $('selGrid').innerHTML = h;
}
$('selAnt').onclick = () => { selRef = new Date(selRef.getFullYear(), selRef.getMonth() - 1, 1); renderSeletor(); };
$('selProx').onclick = () => { selRef = new Date(selRef.getFullYear(), selRef.getMonth() + 1, 1); renderSeletor(); };
$('selHoje').onclick = () => { agendaData = inicioDoDia(Date.now()).getTime(); $('seletorOv').hidden = true; renderAgenda(); };
$('selGrid').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]'); if (!b) return;
  agendaData = Number(b.dataset.t); $('seletorOv').hidden = true; renderAgenda(); $('agenda').scrollTop = 0;
  setTimeout(() => { const c = $('diasAgenda').querySelector('.on'); if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 30);
});
$('seletorOv').addEventListener('click', e => { if (e.target === $('seletorOv')) $('seletorOv').hidden = true; });
$('abaProg').onclick = () => { agendaAba = 'prog'; renderAgenda(); };
$('abaContas').onclick = () => { agendaAba = 'contas'; renderAgenda(); };
$('abaMes').onclick = () => abrir('cal');
$('calAbaProg').onclick = () => { agendaAba = 'prog'; abrir('agenda'); };
$('abaSemana').onclick = () => { agendaAba = 'semana'; renderAgenda(); };
$('calAbaSem').onclick = () => { agendaAba = 'semana'; abrir('agenda'); };
$('calAbaContas').onclick = () => { agendaAba = 'contas'; abrir('agenda'); };
$('agenda').addEventListener('click', async e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  if (await tratarCronoClique(b)) return;
  const linha = b.closest('.ev'), id = linha.dataset.id; if (!eventos.some(x => x.id === id)) return;
  if (b.dataset.a === 'editar') abrirEdicao(id);
  if (b.dataset.a === 'opcoes') abrirFolha(id, linha.dataset.chave, Number(linha.dataset.t));
  if (b.dataset.a === 'despular') await mudarExcecao(id, linha.dataset.chave, null);
  if (b.dataset.a === 'apagar') {
    if (!b.classList.contains('armed')) {
      const original = b.textContent;
      b.classList.add('armed'); b.textContent = original === 'Excluir série' ? 'Excluir todas?' : 'Confirmar';
      setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = original; } }, 3000);
    } else await apagarEvento(id);
  }
});

// ===== Calendário colorido por horas livres =====
let calRef = new Date(); calRef.setDate(1);
let calSel = null;
function renderCal() {
  const ano = calRef.getFullYear(), mes = calRef.getMonth();
  $('calMes').textContent = MESES_LONGO[mes] + ' ' + ano;
  const primeiro = new Date(ano, mes, 1), diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const iv = intervalosNoPeriodo(eventos, primeiro.getTime(), new Date(ano, mes + 1, 1).getTime());
  const hoje = inicioDoDia(Date.now());
  let h = '';
  for (let i = 0; i < primeiro.getDay(); i++) h += '<span class="cel vazio"></span>';
  for (let d = 1; d <= diasNoMes; d++) {
    const dia = new Date(ano, mes, d);
    const info = livreNoDia(iv, dia);
    const cor = corDoDia(info);
    const cls = ['cel', 'escala'];
    const estilo = cor.rgb ? ' style="background:rgb(' + cor.rgb.join(',') + ');color:' + tintaPara(cor.rgb) + (cor.tipo === 'noite' ? ';box-shadow:inset 0 0 0 2px var(--accent)' : '') + '"' : '';
    if (dia < hoje) cls.push('passado');
    if (mesmoDia(dia, hoje)) cls.push('hoje-c');
    if (mesmoDia(dia, calSel)) cls.push('sel');
    h += '<button type="button" class="' + cls.join(' ') + '"' + estilo + ' data-d="' + d + '" aria-label="' + d + ' de ' + MESES_LONGO[mes] + ', ' + fmtLivre(info.livreMin) + ' livres"><span class="n">' + d + '</span><span class="h">' + (info.passa22 ? '+22h' : fmtLivre(info.livreMin)) + '</span>' + etiquetaValorDia(dia.getTime()) + (cor.trabalho ? '<i class="tq" aria-hidden="true"></i>' : '') + '</button>';
  }
  $('calGrid').innerHTML = h;
  renderDiaCal();
}
function renderDiaCal() {
  const box = $('calDia');
  if (!calSel) { box.innerHTML = '<div class="resumo">Toque num dia para ver os compromissos e os horários livres.</div>'; return; }
  const ini = calSel.getTime();
  const iv = intervalosNoPeriodo(eventos, ini, ini + 86400000);
  const info = livreNoDia(iv, calSel);
  const nOutros = iv.filter(i => !i.ev.trabalho).length;
  const itens = [
    ...iv.map(i => ({ t: i.ini, html: '<div class="slot' + (i.ev.trabalho ? ' trab' : '') + '"><span class="t">' + fmtHora(new Date(i.ini)) + '–' + fmtHora(new Date(i.fim)) + '</span><span class="d"><button type="button" data-id="' + esc(i.ev.id) + '" data-chave="' + (i.chave || '') + '" data-t="' + i.ini + '">' + esc(i.ev.titulo) + '</button> ' + pillCategoria(i.ev) + (i.ev.repetir ? ' <span class="pill rep">↻ ' + esc(fmtRepetir(i.ev.repetir)) + '</span>' : '') + '</span></div>' })),
    ...info.livres.map(([a, b]) => ({ t: a, html: '<div class="slot livre"><span class="t">' + fmtHora(new Date(a)) + '–' + fmtHora(new Date(b)) + '</span><span class="d">livre (' + fmtLivre((b - a) / 60000) + ')</span></div>' }))
  ].sort((x, y) => x.t - y.t);
  const base = '15h (7h às 22h)';
  const cor = corDoDia(info);
  const ocup = cor.tipo === 'noite' ? 'passa das 22h' : Math.round(cor.ocupacao * 100) + '% ocupado' + (info.trabalhoMin ? ', com o trabalho' : '');
  box.innerHTML = '<h3>' + maiuscula(DIAS[calSel.getDay()]) + ', ' + calSel.getDate() + ' de ' + MESES_LONGO[calSel.getMonth()] + '</h3>' +
    '<div class="resumo"><b>' + fmtLivre(info.livreMin) + ' livres</b> de ' + base + ' · ' + ocup + ' · ' + nOutros + (nOutros === 1 ? ' compromisso' : ' compromissos') + '</div>' +
    itens.map(x => x.html).join('') + contasDoDiaHTML(ini);
}
$('calGrid').addEventListener('click', e => {
  const c = e.target.closest('button.cel'); if (!c) return;
  calSel = new Date(calRef.getFullYear(), calRef.getMonth(), +c.dataset.d);
  renderCal();
});
$('calDia').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]'); if (!b) return;
  const ev = eventos.find(x => x.id === b.dataset.id);
  if (ev?.repetir) abrirFolha(ev.id, b.dataset.chave, Number(b.dataset.t)); else abrirEdicao(b.dataset.id);
});
$('calAnt').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1); renderCal(); };
$('calProx').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1); renderCal(); };
$('calHoje').onclick = () => { const h = new Date(); calRef = new Date(h.getFullYear(), h.getMonth(), 1); calSel = new Date(h.getFullYear(), h.getMonth(), h.getDate()); renderCal(); };

// ===== Edição =====
let editando = null, editandoOc = null; // editandoOc = { chave, t, dur } quando muda só um dia
function abrirEdicao(id, oc = null, novo = null) {
  const ev = novo || eventos.find(x => x.id === id); if (!ev) return;
  editando = ev; editandoOc = oc;
  $('formEdit').classList.toggle('ocorrencia', !!oc);
  $('edTituloForm').textContent = novo ? 'Novo compromisso' : oc ? ev.titulo + ': só ' + fmtSeparador(oc.t).toLowerCase().replace(/^(\d)/, 'o dia $1') : 'Editar compromisso';
  const d = new Date(oc ? oc.t : ev.inicio);
  $('edTitulo').value = ev.titulo;
  $('edData').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  $('edHora').value = fmtHora(d);
  const sel = $('edAviso'); const v = ev.avisoMin == null ? '' : String(ev.avisoMin);
  if (![...sel.options].some(o => o.value === v)) sel.add(new Option(fmtAviso(ev.avisoMin), v));
  sel.value = v;
  const ds = $('edDuracao'), dv = String(oc ? oc.dur : ev.duracao ?? 60);
  [...ds.options].filter(o => o.dataset.extra).forEach(o => o.remove());
  if (![...ds.options].some(o => o.value === dv)) { const o = new Option(fmtDuracao(+dv), dv); o.dataset.extra = '1'; ds.add(o); }
  ds.value = dv;
  const rs = $('edRepetir');
  [...rs.options].filter(o => o.dataset.extra).forEach(o => o.remove());
  let rv = '';
  if (ev.repetir) {
    const t = ev.repetir.tipo, dias = (ev.repetir.dias || []).join();
    if (t === 'diario' || t === 'mensal' || t === 'anual') rv = t;
    else if (dias === '1,2,3,4,5') rv = 'uteis';
    else if (dias === String(d.getDay())) rv = 'semanal';
    else { const o = new Option(fmtRepetir(ev.repetir), 'custom'); o.dataset.extra = '1'; rs.add(o); rv = 'custom'; }
  }
  rs.value = rv;
  $('edTrabalho').checked = !!ev.trabalho;
  $('edCategoria').innerHTML = CATEGORIAS.map(c => '<option value="' + c.id + '">' + c.nome + '</option>').join('');
  $('edCategoria').value = ev.categoria || categorizar(ev.titulo, ev.trabalho);
  $('overlay').hidden = false;
}
$('edCancelar').onclick = () => { $('overlay').hidden = true; };
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) $('overlay').hidden = true; });
$('formEdit').addEventListener('submit', async e => {
  e.preventDefault();
  const [a, m, d] = $('edData').value.split('-').map(Number);
  const [hh, mm] = $('edHora').value.split(':').map(Number);
  const av = $('edAviso').value;
  if (editandoOc) {
    const ini = new Date(a, m - 1, d, hh, mm).getTime(), dur = Number($('edDuracao').value);
    $('overlay').hidden = true;
    const original = ocorrenciasDet({ ...editando, excecoes: {} }, editandoOc.t - 3 * 86400000, editandoOc.t + 3 * 86400000, 20).find(o => o.chave === editandoOc.chave);
    const igual = original && original.t === ini && original.dur === dur;
    await mudarExcecao(editando.id, editandoOc.chave, igual ? null : { inicio: ini, duracao: dur });
    return;
  }
  const ev = { ...editando, titulo: $('edTitulo').value.trim() || 'Compromisso', inicio: new Date(a, m - 1, d, hh, mm).getTime(),
    avisoMin: av === '' ? null : Number(av), duracao: Number($('edDuracao').value), trabalho: $('edTrabalho').checked, categoria: $('edTrabalho').checked ? 'trabalho' : $('edCategoria').value };
  if (ev._novo) { delete ev._novo; if (ev.categoria === 'pessoal') ev.categoria = categorizar(ev.titulo); }
  const rv = $('edRepetir').value, novoDia = new Date(ev.inicio).getDay();
  ev.repetir = rv === '' ? null : rv === 'uteis' ? { tipo: 'semanal', dias: [1, 2, 3, 4, 5] }
    : rv === 'semanal' ? { tipo: 'semanal', dias: [novoDia] }
    : rv === 'custom' ? editando.repetir : { tipo: rv };
  $('overlay').hidden = true;
  await salvarEvento(ev);
});

// ===== Opções de compromisso repetido =====
let folhaAlvo = null;
function abrirFolha(id, chave, t) {
  const ev = eventos.find(x => x.id === id); if (!ev) return;
  folhaAlvo = { id, chave, t, dur: (ev.excecoes?.[chave]?.duracao) ?? ev.duracao ?? 60 };
  const d = new Date(t);
  $('folhaTit').textContent = ev.titulo + ' · ' + DIAS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_N[d.getMonth()];
  $('folhaSub').textContent = 'Compromisso repetido (' + fmtRepetir(ev.repetir) + ')';
  const ex = $('folhaOv').querySelector('[data-f="excluir"]'); ex.classList.remove('armed'); ex.textContent = 'Excluir a série';
  $('folhaOv').hidden = false;
}
$('folhaOv').addEventListener('click', async e => {
  if (e.target === $('folhaOv')) { $('folhaOv').hidden = true; return; }
  const b = e.target.closest('[data-f]'); if (!b || !folhaAlvo) return;
  const { id, chave, t, dur } = folhaAlvo;
  if (b.dataset.f === 'excluir' && !b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Toque de novo para excluir todas as datas'; return; }
  $('folhaOv').hidden = true;
  if (b.dataset.f === 'pular') await mudarExcecao(id, chave, { pular: true });
  if (b.dataset.f === 'mudar') abrirEdicao(id, { chave, t, dur });
  if (b.dataset.f === 'todos') abrirEdicao(id);
  if (b.dataset.f === 'excluir') await apagarEvento(id);
});
async function mudarExcecao(id, chave, valor) {
  const ev = eventos.find(x => x.id === id); if (!ev || !chave) return;
  const excecoes = { ...(ev.excecoes || {}) };
  if (valor) excecoes[chave] = valor; else delete excecoes[chave];
  await salvarEvento({ ...ev, excecoes });
}

// ===== Backup =====
function dadosBackup() {
  return { app: ESQUEMA, versao: VERSAO, exportado: new Date().toISOString(), eventos, notas, recados, tarefas, config, fin: { ...fin, avisos: [] }, crono, pessoal: { ...pes, avisos: [] }, projetos, escrever };
}
async function exportarBackup() {
  const hoje = new Date();
  const nome = ESQUEMA + '-' + pad(hoje.getDate()) + '-' + pad(hoje.getMonth() + 1) + '-' + hoje.getFullYear() + '.json';
  const texto = JSON.stringify(dadosBackup(), null, 1);
  try {
    if (Arquivos && Compartilhar) {
      const r = await Arquivos.writeFile({ path: nome, data: texto, directory: 'CACHE', encoding: 'utf8' });
      await Compartilhar.share({ title: 'Backup do AZote', text: 'Backup do AZote', files: [r.uri], dialogTitle: 'Guardar o backup em…' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = nome; a.click();
    }
    config.ultimoBackup = Date.now(); await guardar('az-config', config);
    responderConfig('Exportar backup', '<p>Pronto ✓ Gerei <b>' + esc(nome) + '</b> com ' + eventos.length + ' compromissos, ' + notas.length + ' anotações e ' + fin.movs.length + ' lançamentos. Guarde no Google Drive ou mande para você mesmo no WhatsApp ou por e-mail.</p>');
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (/cancel/i.test(msg)) responderConfig('Exportar backup', '<p>Backup cancelado. Nada foi enviado.</p>');
    else responderConfig('Exportar backup', '<div class="note">Não consegui gerar o backup (' + esc(msg || 'erro') + ').</div>');
  }
}
let importPendente = null;
$('arquivoBackup').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!['agenda-zote', 'azote', 'agzote', 'finzote'].includes(d?.app) || !(Array.isArray(d.eventos) || d.fin)) throw new Error('arquivo não é um backup do AgZote, FinZote ou AZOTE_ANTIGO'); d.eventos = d.eventos || [];
    importPendente = d;
    const quando = d.exportado ? new Date(d.exportado) : null;
    responderConfig('Importar ' + f.name, '<p>Esse backup' + (quando ? ' é de <b>' + quando.getDate() + ' de ' + MESES_LONGO[quando.getMonth()] + ', ' + fmtHora(quando) + '</b> e' : '') +
      ' tem <b>' + d.eventos.length + ' compromissos</b>, <b>' + (d.notas?.length || 0) + ' anotações</b> e <b>' + (d.fin?.movs?.length || 0) + ' lançamentos</b>. Hoje o app tem ' + eventos.length + ' e ' + notas.length + '.</p>' +
      '<div class="actions"><button class="btn primary" type="button" data-c="imp-juntar">Juntar com os atuais</button><button class="btn danger" type="button" data-c="imp-trocar">Substituir tudo</button><button class="btn" type="button" data-c="imp-cancelar">Cancelar</button></div>' +
      '<p class="dica">“Juntar” só acrescenta o que não existe aqui. “Substituir” apaga o que está no app e coloca o backup no lugar.</p>');
  } catch (err) { responderConfig('Importar ' + f.name, '<div class="note">Não consegui ler esse arquivo: ' + esc(err?.message || 'formato inválido') + '.</div>'); }
});
async function aplicarImport(modo) {
  const d = importPendente; importPendente = null; if (!d) return;
  for (const ev of eventos) await cancelarAviso(ev.id);
  if (modo === 'trocar') {
    eventos = d.eventos; notas = d.notas || []; recados = d.recados || []; tarefas = d.tarefas || [];
    config = { ...config, ...(d.config || {}), ultimoBackup: config.ultimoBackup };
    if (d.fin) fin = { contas: [], agendadas: [], movs: [], chat: [], metas: [], dividas: [], ...d.fin, avisos: fin.avisos };
    if (d.crono) crono = { ativo: null, sessoes: [], ...d.crono };
    if (d.pessoal) pes = { ...pes, ...d.pessoal, avisos: pes.avisos };
    if (d.projetos) projetos = d.projetos;
    if (d.escrever) escrever = d.escrever;
  } else {
    const ids = new Set(eventos.map(e => e.id)), idsN = new Set(notas.map(n => n.id));
    const novos = d.eventos.filter(e => !ids.has(e.id)), novasN = (d.notas || []).filter(n => !idsN.has(n.id));
    eventos = [...eventos, ...novos]; notas = [...notas, ...novasN].sort((a, b) => a.t - b.t);
    const idsT = new Set(tarefas.map(t => t.id)); tarefas = [...tarefas, ...(d.tarefas || []).filter(t => !idsT.has(t.id))];
    if (d.pessoal) for (const k of ['materias', 'revisoes', 'provas', 'livros', 'leituras', 'treinos', 'corridas', 'medidas', 'remedios', 'doses', 'metas', 'habitos']) { const ids = new Set((pes[k] || []).map(x => x.id)); pes[k] = [...(pes[k] || []), ...(d.pessoal[k] || []).filter(x => !ids.has(x.id))]; }
    if (d.pessoal?.diario) { const chs = new Set(pes.diario.map(x => x.chave)); pes.diario = [...pes.diario, ...d.pessoal.diario.filter(x => !chs.has(x.chave))]; }
    if (d.projetos) { const ids = new Set(projetos.map(x => x.id)); projetos = [...projetos, ...d.projetos.filter(x => !ids.has(x.id))]; }
    if (d.crono) { const ids = new Set(crono.sessoes.map(x => x.id)); crono.sessoes = [...crono.sessoes, ...(d.crono.sessoes || []).filter(x => !ids.has(x.id))]; }
    if (d.fin) for (const k of ['contas', 'agendadas', 'movs', 'metas', 'dividas']) { const ids = new Set(fin[k].map(x => x.id)); fin[k] = [...fin[k], ...(d.fin[k] || []).filter(x => !ids.has(x.id))]; }
  }
  await Promise.all([guardar(CHAVE, eventos), guardar('az-notas', notas), guardar('az-recados', recados), guardar('az-tarefas', tarefas), guardar('az-config', config), guardar('az-fin', fin), guardar('az-crono', crono), guardar('az-pessoal', pes), guardar('az-projetos', projetos), guardar('az-escrever', escrever)]);
  agendarAvisosPessoalDepois(); agendarRotinas();
  atualizarCronoUI();
  agendarAvisosFinDepois();
  for (const t of tarefas) await agendarAvisoTarefa(t);
  if (permissaoOk) { await reagendarTodos(); await agendarResumos(); }
  responderConfig(null, '<p>Pronto ✓ Agora o app tem <b>' + eventos.length + ' compromissos</b> e <b>' + notas.length + ' anotações</b>.</p>');
}

// ===== Resumo da manhã =====
const MAX_RESUMOS = 14;
async function agendarResumos() {
  if (!Notif) return;
  const ids = []; for (let k = 0; k < MAX_RESUMOS; k++) ids.push({ id: idNumerico('resumo#' + k) });
  try { await Notif.cancel({ notifications: ids }); } catch {}
  if (!config.resumoHora || !permissaoOk) return;
  const [hh, mm] = config.resumoHora.split(':').map(Number);
  const agora = new Date(), lista = [];
  for (let k = 0; k < MAX_RESUMOS; k++) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k);
    const at = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hh, mm);
    if (at <= agora) continue;
    const { titulo, corpo } = textoResumo(dia);
    lista.push({ id: idNumerico('resumo#' + k), title: titulo, body: corpo, largeBody: corpo, schedule: { at, allowWhileIdle: true }, extra: { resumo: true } });
  }
  try { if (lista.length) await agendarNotif(lista); } catch {}
}
let timerResumos = null;
function agendarResumosDepois() { clearTimeout(timerResumos); timerResumos = setTimeout(agendarResumos, 1500); }

// ===== Categorias =====
function pillCategoria(e) {
  const c = categoriaPorId(e.categoria || categorizar(e.titulo, e.trabalho));
  return '<span class="pill cat" style="background:' + c.cor + '">' + c.nome + '</span>';
}

// ===== Tarefas =====
function fmtPrazo(t) {
  const dif = difDias(t), d = new Date(t);
  if (dif < -1) return 'venceu há ' + (-dif) + ' dias';
  if (dif === -1) return 'venceu ontem';
  if (dif === 0) return 'vence hoje';
  if (dif === 1) return 'até amanhã';
  if (dif < 7) return 'até ' + DIAS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_N[d.getMonth()];
  return 'até ' + d.getDate() + ' ' + MESES_N[d.getMonth()];
}
let tarefaSel = null;
function tarefaHTML(t) {
  const hoje = inicioDoDia(Date.now()).getTime();
  const urg = !t.feita && t.prazo !== null && t.prazo <= hoje;
  const c = categoriaPorId(t.categoria), feito = minTarefa(t), rod = crono.ativo?.tarefaId === t.id, est = t.estimativa || 0;
  const sub = t.feita ? 'feita ' + (difDias(t.feitaEm) === 0 ? 'hoje' : difDias(t.feitaEm) === -1 ? 'ontem' : 'em ' + new Date(t.feitaEm).getDate() + ' ' + MESES_N[new Date(t.feitaEm).getMonth()]) + (feito ? ' · ' + fmtLivre(feito) : '')
    : [t.prazo !== null ? fmtPrazo(t.prazo) : '', est ? 'estimado ' + fmtLivre(est) : '', feito || est ? 'feito ' + fmtLivre(feito) : ''].filter(Boolean).join(' · ');
  const barra = est && !t.feita ? '<div class="tbar"><i style="width:' + Math.min(100, feito / est * 100) + '%;background:' + (feito > est ? 'var(--gas)' : 'var(--accent)') + '"></i></div>' + (feito > est ? '<small class="gas">passou ' + fmtLivre(feito - est) + '</small>' : '') : '';
  const play = t.feita ? '' : rod ? '<button type="button" class="tplay on" data-t="crono" aria-label="Parar o cronômetro"><span data-crono-tempo>' + fmtCrono(tempoDe(crono.ativo)) + '</span> ■</button>' : '<button type="button" class="tplay" data-t="crono" aria-label="Cronometrar esta tarefa">▶</button>';
  const row = '<div class="tf' + (t.feita ? ' feita' : '') + (urg ? ' urg' : '') + (rod ? ' rod' : '') + '" data-tid="' + esc(t.id) + '">' +
    '<button type="button" class="ck' + (t.feita ? ' ok' : '') + '" data-t="feita" aria-label="' + (t.feita ? 'Desmarcar' : 'Marcar como feita') + '">' + (t.feita ? '✓' : '') + '</button>' +
    '<div class="tc"><button type="button" class="tc" data-t="abrir"><div class="tt">' + esc(t.titulo) + '</div></button>' +
    (sub ? '<small class="pz">' + sub + '</small>' : '') + barra +
    '<div class="sub" style="margin-top:3px"><span class="pill cat" style="background:' + c.cor + '">' + c.nome + '</span>' + (t.projetoId ? '<span class="pill">' + esc(projetos.find(p => p.id === t.projetoId)?.nome || 'projeto') + '</span>' : '') + '</div></div>' + play + '</div>';
  return t.feita ? row : swHTML('tarefa', t.id, 'Amanhã ⏭', '✓ Feita', row);
}
function renderTarefas() {
  renderAbaTarefas(); if (tarefasAba === 'projetos') return;
  if (tarefasAba === 'horas') { renderHorasTarefas(); return; }
  if (tarefaAberta) { renderTarefaDet(); return; }
  const hoje = inicioDoDia(Date.now()).getTime(), em7 = hoje + 7 * 86400000;
  const abertas = tarefas.filter(t => !t.feita);
  const grupos = [
    ['Atrasadas e para hoje', abertas.filter(t => t.prazo !== null && t.prazo <= hoje)],
    ['Vence nos próximos 7 dias', abertas.filter(t => t.prazo !== null && t.prazo > hoje && t.prazo < em7)],
    ['Mais para frente', abertas.filter(t => t.prazo !== null && t.prazo >= em7)],
    ['Sem prazo', abertas.filter(t => t.prazo === null)],
    ['Feitas', tarefas.filter(t => t.feita).sort((a, b) => b.feitaEm - a.feitaEm).slice(0, 15)],
  ];
  $('subTarefas').textContent = abertas.length ? abertas.length + (abertas.length === 1 ? ' tarefa aberta' : ' tarefas abertas') : 'coisas para fazer, sem horário marcado';
  let h = '';
  for (const [nome, lista] of grupos) {
    if (!lista.length) continue;
    if (nome !== 'Feitas' && nome !== 'Sem prazo') lista.sort((a, b) => a.prazo - b.prazo);
    h += '<div class="grp">' + nome + '</div>' + lista.map(tarefaHTML).join('');
  }
  $('tarefasLista').innerHTML = h ? h + '<p class="dica">Toque para ver horas e opções · deslize → para concluir ou ← para amanhã · ▶ cronometra.</p>' : '<div class="empty"><b>Nenhuma tarefa ainda.</b><br>Escreva embaixo, como <i>“pagar IPVA até sexta”</i> ou <i>“relatório mensal, estimado 2h”</i>. Se tiver prazo, eu aviso às 9h do dia.</div>';
}
async function salvarTarefas() { await guardar('az-tarefas', tarefas); }
$('formTarefa').addEventListener('submit', async e => {
  e.preventDefault();
  const texto = $('entradaTarefa').value.trim(); if (!texto) return;
  $('entradaTarefa').value = '';
  const r = await processarTarefa(texto, tarefasAba === 'projetos');
  if (r?.horas) toast('+' + fmtLivre(r.horas) + ' em ' + r.tarefa.titulo);
  renderTarefas(); $('entradaTarefa').focus();
});
async function processarTarefa(texto, emProjetos = false) {
  const hr = !emProjetos && lerHorasTarefa(texto); // "trabalhei 1h30 no relatório"
  if (hr) { const h = lancarHoras(hr.tarefa, hr.min, 'chat', (hr.ontem ? Date.now() - 86400000 : Date.now()) - hr.min * 60000); await salvarTarefas(); return { tarefa: hr.tarefa, horas: hr.min, horaId: h.id }; }
  let estimativa = null; const me = /[,;(]?\s*\b(?:estimad[oa]s?(?:\s+em)?|estimativa(?:\s+de)?|leva|levar|dura|durar|deve levar)\s+(\d{1,3}\s*h(?:oras?)?(?:\s*e?\s*\d{1,2})?(?:\s*min(?:utos)?)?|\d{1,3}\s*min(?:utos)?)\s*\)?/i.exec(texto);
  if (me) { estimativa = finDuracao(finTxt(me[1]))?.min || null; texto = (texto.slice(0, me.index) + ' ' + texto.slice(me.index + me[0].length)).replace(/\s{2,}/g, ' ').trim(); }
  if (emProjetos || /^\s*projeto\s*[:\-]/i.test(texto)) { if (novoProjetoOuEtapa(texto)) { tarefasAba = 'projetos'; await salvarProjetos(); return { projeto: true }; } }
  const r = interpretarTarefa(texto, new Date());
  const t = { id: novoId(), titulo: r.titulo, prazo: r.prazo, categoria: r.categoria, feita: false, feitaEm: null, criado: Date.now(), estimativa, horas: [] };
  tarefas.push(t); await salvarTarefas(); await agendarAvisoTarefa(t);
  return { tarefa: t };
}
$('tarefasLista').addEventListener('click', async e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const el = b.closest('[data-tid]'); const t = tarefas.find(x => x.id === el?.dataset.tid); if (!t) return;
  const acao = b.dataset.t;
  if (acao === 'feita') { const foto = clonar(tarefas); t.feita = !t.feita; t.feitaEm = t.feita ? Date.now() : null; tarefaSel = null; if (t.feita && crono.ativo?.tarefaId === t.id) await pararCrono(false); await salvarTarefas(); await agendarAvisoTarefa(t); renderTarefas(); toastDesfazer(t.feita ? '✓ ' + t.titulo : 'Reaberta', () => voltarTarefas(foto)); return; }
  if (acao === 'abrir') { abrirTarefa(t.id); return; }
  if (acao === 'crono') { await cronoTarefa(t); renderTarefas(); return; }
  if (acao === 'agendar') { abrirAgendarTarefa(t); return; }
  if (acao === 'cat') t.categoria = b.dataset.cat;
  if (acao === 'semprazo') t.prazo = null;
  if (acao === 'apagar') {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Apagar mesmo?'; return; }
    tarefas = tarefas.filter(x => x.id !== t.id); tarefaSel = null; await cancelarAvisoTarefa(t.id);
  }
  await salvarTarefas(); if (acao !== 'apagar') await agendarAvisoTarefa(t);
  renderTarefas();
});
async function agendarAvisoTarefa(t) {
  if (!Notif) return;
  await cancelarAvisoTarefa(t.id);
  if (t.feita || t.prazo === null || !permissaoOk || !config.tarefasHora) return;
  const [th, tm] = config.tarefasHora.split(':').map(Number);
  const d = new Date(t.prazo); const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), th, tm);
  if (at <= new Date()) return;
  try { await agendarNotif([{ id: idNumerico('tarefa#' + t.id), title: 'Tarefa para hoje: ' + t.titulo, body: 'Toque para ver suas tarefas.', schedule: { at, allowWhileIdle: true }, extra: { tarefa: t.id } }]); } catch {}
}
async function cancelarAvisoTarefa(id) { if (Notif) { try { await Notif.cancel({ notifications: [{ id: idNumerico('tarefa#' + id) }] }); } catch {} } }

// ===== Resumo da semana =====
function inicioSemana(t) { const d = inicioDoDia(t); const dif = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dif).getTime(); }
const maisDias = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
function calcularSemana(ini) {
  const fim = maisDias(ini, 7);
  const iv = intervalosNoPeriodo(eventos, ini, fim).filter(i => i.ini >= ini && i.ini < fim);
  const porCat = {};
  for (const i of iv) { const id = i.ev.categoria || categorizar(i.ev.titulo, i.ev.trabalho); porCat[id] = (porCat[id] || 0) + (i.fim - i.ini) / 60000; }
  const metas = config.metas || {};
  const cats = CATEGORIAS.map(c => ({ ...c, min: porCat[c.id] || 0, meta: metas[c.id] || 0 })).filter(c => c.min > 0 || c.meta > 0)
    .sort((a, b) => (b.id === 'trabalho') - (a.id === 'trabalho') || b.min - a.min);
  let livreMin = 0, pior = null;
  for (let k = 0; k < 7; k++) {
    const d = new Date(maisDias(ini, k));
    const info = livreNoDia(intervalosNoPeriodo(eventos, d.getTime(), d.getTime() + 86400000), d);
    livreMin += info.livreMin;
    if (!pior || info.livreMin < pior.info.livreMin) pior = { d, info };
  }
  const nComp = iv.filter(i => !i.ev.trabalho).length;
  const comPrazo = tarefas.filter(t => (t.prazo !== null && t.prazo >= ini && t.prazo < fim) || (t.feita && t.feitaEm >= ini && t.feitaEm < fim));
  const feitas = comPrazo.filter(t => t.feita).length;
  return { ini, fim, cats, livreMin, pior, nComp, tarefasTotal: comPrazo.length, tarefasFeitas: feitas };
}
let resumoRef = null, resumoAba = 'tempo', metaCat = null, metaValor = 0;
function renderResumo() {
  const r = calcularSemana(resumoRef);
  const fimD = new Date(r.fim - 86400000), iniD = new Date(r.ini);
  const atual = r.ini === inicioSemana(Date.now());
  $('subResumo').textContent = iniD.getDate() + (iniD.getMonth() !== fimD.getMonth() ? ' ' + MESES_N[iniD.getMonth()] : '') + ' a ' + fimD.getDate() + ' de ' + MESES_LONGO[fimD.getMonth()] + (atual ? ' · esta semana' : '');
  $('abaTempo').classList.toggle('on', resumoAba === 'tempo'); $('abaFin').classList.toggle('on', resumoAba === 'fin'); $('abaCrono').classList.toggle('on', resumoAba === 'crono'); $('abaBem').classList.toggle('on', resumoAba === 'bem');
  $('resumoTempo').hidden = resumoAba !== 'tempo'; $('resumoFin').hidden = resumoAba !== 'fin'; $('resumoCrono').hidden = resumoAba !== 'crono'; $('resumoBem').hidden = resumoAba !== 'bem';
  if (resumoAba === 'bem') renderResumoBem();
  if (resumoAba === 'crono') renderResumoCrono();
  if (resumoAba === 'fin') renderResumoFin();
  let h = '<div class="ex rotinas"><button type="button" class="chip" data-rot="plano">🗓️ Planejar a semana</button><button type="button" class="chip" data-rot="retro">📊 Retrospectiva do mês</button><button type="button" class="chip" data-rot="revisao">🌙 Revisão de hoje</button></div><div class="kp"><div><b>' + fmtLivre(r.livreMin) + '</b><small>livres (' + (config.janelaIni ?? 7) + 'h–' + (config.janelaFim ?? 22) + 'h)</small></div><div><b>' + r.nComp + '</b><small>' + (r.nComp === 1 ? 'compromisso' : 'compromissos') + '</small></div><div><b style="color:var(--accent)">' + r.tarefasFeitas + '/' + r.tarefasTotal + '</b><small>tarefas da semana feitas</small></div></div>';
  h += '<div class="grp">Horas por categoria · toque para definir uma meta</div>';
  if (!r.cats.length) h += '<p class="txt" style="color:var(--muted)">Nada marcado nesta semana.</p>';
  const maxMin = Math.max(...r.cats.map(c => Math.max(c.min, c.meta * 60)), 1);
  for (const c of r.cats) {
    const pct = c.meta ? Math.min(100, c.min / (c.meta * 60) * 100) : Math.min(100, c.min / maxMin * 100);
    const obs = c.meta ? (c.min >= c.meta * 60 ? '<small class="ok">meta batida ✓</small>' : '<small>faltam ' + fmtLivre(c.meta * 60 - c.min) + ' para a meta</small>') : '';
    h += '<button type="button" class="barra" data-meta="' + c.id + '"><div class="bl"><span class="sq" style="background:' + c.cor + '"></span>' + c.nome + '<b>' + fmtLivre(c.min) + (c.meta ? '<small> / ' + c.meta + 'h</small>' : '') + '</b></div><div class="bt"><div style="width:' + pct + '%;background:' + c.cor + '"></div></div>' + obs + '</button>';
  }
  const semMeta = CATEGORIAS.filter(c => !r.cats.some(x => x.id === c.id) && c.id !== 'trabalho');
  if (semMeta.length) h += '<div class="ex">' + semMeta.map(c => '<button type="button" class="chip" data-meta="' + c.id + '">+ meta de ' + c.nome + '</button>').join('') + '</div>';
  if (r.pior) h += '<div class="grp">Dia mais cheio</div><p class="txt">' + maiuscula(DIAS[r.pior.d.getDay()]) + ', ' + r.pior.d.getDate() + ': ' + (r.pior.info.livreMin < 60 ? 'menos de 1h livre' : 'só ' + fmtLivre(r.pior.info.livreMin) + ' livres') + (r.pior.info.trabalhoMin ? ' fora do trabalho' : '') + '.</p>';
  // prévia da semana seguinte
  const prox = calcularSemana(r.fim);
  let apertados = 0;
  for (let k = 0; k < 7; k++) { const d = new Date(maisDias(r.fim, k)); if (livreNoDia(intervalosNoPeriodo(eventos, d.getTime(), d.getTime() + 86400000), d).livreMin < 120) apertados++; }
  const tarefasProx = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo >= r.fim && t.prazo < prox.fim).length;
  h += '<div class="grp">Semana seguinte</div><p class="txt">' + prox.nComp + (prox.nComp === 1 ? ' compromisso' : ' compromissos') + ' · ' + apertados + (apertados === 1 ? ' dia' : ' dias') + ' com menos de 2h livres · ' + tarefasProx + (tarefasProx === 1 ? ' tarefa vencendo' : ' tarefas vencendo') + '</p>';
  $('resumoTempo').innerHTML = h;
}
$('abaTempo').onclick = () => { resumoAba = 'tempo'; renderResumo(); };
$('abaFin').onclick = () => { resumoAba = 'fin'; renderResumo(); };
$('abaCrono').onclick = () => { resumoAba = 'crono'; renderResumo(); };
$('abaBem').onclick = () => { resumoAba = 'bem'; renderResumo(); };
$('semAnt').onclick = () => { resumoRef = maisDias(resumoRef, -7); renderResumo(); };
$('semProx').onclick = () => { resumoRef = maisDias(resumoRef, 7); renderResumo(); };
$('resumoTempo').addEventListener('click', e => {
  const ro = e.target.closest('[data-rot]'); if (ro) { ({ plano: abrirPlano, retro: () => abrirRetro(), revisao: abrirRevisao })[ro.dataset.rot](); return; }
  const b = e.target.closest('[data-meta]'); if (!b) return;
  metaCat = b.dataset.meta; metaValor = (config.metas || {})[metaCat] || 0;
  $('metaTit').textContent = 'Meta semanal · ' + categoriaPorId(metaCat).nome; $('metaValor').textContent = metaValor + 'h';
  $('metaOv').hidden = false;
});
$('metaMenos').onclick = () => { metaValor = Math.max(0, metaValor - 1); $('metaValor').textContent = metaValor + 'h'; };
$('metaMais').onclick = () => { metaValor = Math.min(80, metaValor + 1); $('metaValor').textContent = metaValor + 'h'; };
async function salvarMeta(v) {
  config.metas = { ...(config.metas || {}) }; if (v) config.metas[metaCat] = v; else delete config.metas[metaCat];
  await guardar('az-config', config); $('metaOv').hidden = true; renderResumo();
}
$('metaSalvar').onclick = () => salvarMeta(metaValor);
$('metaTirar').onclick = () => salvarMeta(0);
$('metaOv').addEventListener('click', e => { if (e.target === $('metaOv')) $('metaOv').hidden = true; });

// ===== Atualização geral =====
function atualizarTudo() {
  if (tela === 'home') renderHome();
  if (tela === 'escrever') renderEscrever();
  if (tela === 'recados') renderRecados();
  if (tela === 'agenda') renderAgenda();
  if (tela === 'cal') renderCal();
  if (tela === 'config') renderConfig();
  if (tela === 'tarefas') renderTarefas();
  if (tela === 'resumo') renderResumo();
  if (tela === 'fin' && !document.activeElement?.closest?.('#formFin')) renderFin();
  if (tela === 'pessoal' && !document.activeElement?.closest?.('#formPes, #formDia, #p-diario')) renderPessoal();
  if (tela === 'revisao') renderRevisao();
}

// ===== Teclado =====
// Se o Android não encolher a tela ao abrir o teclado, empurramos o conteúdo nós mesmos.
let alturaAntes = window.innerHeight;
['entrada', 'entradaNota', 'entradaTarefa', 'entradaFin', 'entradaPes', 'entradaEsc', 'entradaDia'].forEach(id => $(id).addEventListener('focus', () => { alturaAntes = window.innerHeight; rolarChat(); setTimeout(rolarChat, 350); }));
if (Teclado) {
  try {
    Teclado.addListener('keyboardWillShow', () => { alturaAntes = window.innerHeight; });
    Teclado.addListener('keyboardDidShow', info => {
      setTimeout(() => {
        const encolheu = window.innerHeight < alturaAntes - 80;
        document.documentElement.style.setProperty('--kb', encolheu ? '0px' : (info.keyboardHeight || 0) + 'px');
        rolarChat();
      }, 80);
    });
    Teclado.addListener('keyboardWillHide', soltarTeclado);
    Teclado.addListener('keyboardDidHide', soltarTeclado);
  } catch {}
}
if (window.visualViewport) visualViewport.addEventListener('resize', rolarChat);
// Ao sair do campo de texto, o espaço do teclado é sempre devolvido (evita a tela cortada pela metade)
document.addEventListener('focusout', () => setTimeout(() => {
  if (!document.activeElement || !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) soltarTeclado();
}, 120));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soltarTeclado(); });

// Tocar na notificação abre a agenda
try { Notif?.addListener('localNotificationActionPerformed', async ev => { const x = ev?.notification?.extra || {};
  registrarAcaoAviso(ev); if (await tratarNotif114(ev)) return;
  if (x.crono) { if (ev.actionId === 'pausar') { pausarCrono(); return; } if (ev.actionId === 'parar') { pararCrono(); return; } agendaAba = 'prog'; abrir('agenda'); return; }
  if (x.remedio || x.habito) { acaoNotifPessoal(ev); return; }
  if (x.rotina) { ({ revisao: abrirRevisao, plano: abrirPlano, retro: () => abrirRetro() })[x.rotina](); return; }
  if (APP === 'ag' && (x.fin || x.conta)) return;
  if (APP === 'fin' && x.fin === 'contas') { abrirFin('fixas'); return; }
  if (x.fin === 'cartoes') { abrirFin('cartoes'); return; } if (x.fin === 'contas') { agendaAba = 'contas'; abrir('agenda'); } else if (x.fin) abrirFin(x.fin === 'metas' ? 'metas' : 'saldos'); else abrir(x.tarefa ? 'tarefas' : 'agenda'); }); } catch {}
// a cada minuto só as telas que dependem da hora; conversas não são redesenhadas (1.14)
function manterRolagem(el, f) { const st = el ? el.scrollTop : 0; f(); if (el) el.scrollTop = st; }
function atualizarMinuto() {
  if (document.visibilityState !== 'visible' || document.activeElement?.closest?.('form, .sheet')) return;
  if (tela === 'home') manterRolagem($('hoje'), renderHome);
  else if (tela === 'agenda' && agendaAba !== 'contas') manterRolagem(agendaAba === 'semana' ? $('semanaAg') : $('agenda'), renderAgenda);
  else if (tela === 'pessoal' && pesAba === 'hoje') manterRolagem($('p-hoje'), renderPesHoje);
  else if (tela === 'fin' && finAba === 'gastar') manterRolagem($('finGastar'), renderFin);
}
setInterval(atualizarMinuto, 60000);
let ultimaRenovacao = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  atualizarTudo();
  backupAutoSeHora(); conferirBandeja();
  if (permissaoOk && Date.now() - ultimaRenovacao > 6 * 3600000) { ultimaRenovacao = Date.now(); reagendarTodos(); agendarResumos(); agendarAvisosFin(); agendarAvisosPessoal(); agendarRotinas(); agendarRelatorios(); }
});

// ===== Início =====
(async () => {
  let finLido, cronoLido, pesLido, projLido, escLido, finChat, pesChat;
  [eventos, recados, notas, tarefas, config, finLido, cronoLido, pesLido, projLido, escLido, finChat, pesChat, avisosLog] = await Promise.all([ler(CHAVE, []), ler('az-recados', []), ler('az-notas', []), ler('az-tarefas', []), ler('az-config', { avisoPadrao: 15 }), ler('az-fin', null), ler('az-crono', null), ler('az-pessoal', null), ler('az-projetos', []), ler('az-escrever', []), ler('az-fin-chat', null), ler('az-pes-chat', null), ler('az-avisos-log', [])]);
  escrever = escLido || [];
  pes = { ...pes, ...(pesLido || {}) }; if (pesChat) { pes.chat = pesChat.chat || []; pes.diaChat = pesChat.diaChat || []; } pes.diaChat = pes.diaChat || []; pes.relatos = pes.relatos || [];
  projetos = projLido || [];
  crono = { ativo: null, sessoes: [], ...(cronoLido || {}) };
  fin = { contas: [], agendadas: [], movs: [], chat: [], avisos: [], metas: [], dividas: [], ...(finLido || {}) }; if (finChat) fin.chat = finChat;
  config = { ...CFG_PADRAO, ultimoBackup: null, metas: {}, ...config, prefs: { ...CFG_PADRAO.prefs, ...(config?.prefs || {}) } };
  await migrarDados();
  await prepararApp();
  definirJanela(config.janelaIni, config.janelaFim, config.trabalhoOcupado !== false); aplicarTamanho(); OCULTAR = !!config.esconderValores;
  atualizarCronoUI();
  renderHome();
  backupAutoSeHora();
  try { iniciarNativo(); } catch {}
  if (Notif) {
    try { permissaoOk = (await Notif.checkPermissions()).display === 'granted'; } catch {}
    if (permissaoOk) { await verificarExato(); await registrarTiposNotif(); await reagendarTodos(); await agendarResumos(); for (const t of tarefas) await agendarAvisoTarefa(t); await agendarAvisosFin(); await agendarAvisosPessoal(); await agendarRotinas(); await agendarRelatorios(); if (crono.ativo) notifCrono(); conferirBandeja(); }
  }
})();
