
// =====================================================================
// 1.15 · Atalhos do ícone (segurar o AZote na tela inicial) e widget
// O widget lê 'az-widget' das Preferences (o Android guarda em CapacitorStorage).
// =====================================================================
let widgetUlt = null, timerWidget = null;
function dadosWidget() {
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), ocultar = !!config.esconderValores, ant = OCULTAR;
  OCULTAR = false;
  const brl = v => ocultar ? 'R$ ••' : fmtBRL(v).replace(/,\d\d$/, '');
  let gastar = '—', gastarSub = 'abra o AZote';
  try {
    if (orcDisponivel()) { const c = calcOrcamento(); gastar = brl(Math.abs(c.hojeResta)); gastarSub = c.hojeResta >= 0 ? 'pode gastar hoje' : 'passou do dia'; }
    else if (fin.contas.length) { gastar = brl(fin.contas.filter(c => !ehInvest(c)).reduce((a, c) => a + saldoConta(c), 0)); gastarSub = 'saldo nas contas'; }
  } catch {}
  OCULTAR = ant;
  let prox = '—', proxSub = 'nada marcado';
  try {
    const e = linhasAgenda(agora - 3 * 3600000, agora + 14 * 86400000).filter(x => !x.trabalho && x.quando + (x.duracao ?? 60) * 60000 > agora)[0];
    if (e) { const d = new Date(e.quando), dif = difDias(e.quando); prox = fmtHora(d); proxSub = (dif === 0 ? '' : dif === 1 ? 'amanhã · ' : DIAS_CURTO[d.getDay()] + ' · ') + e.titulo; }
  } catch {}
  let hab = '', habSub = '';
  try {
    const ch = hojeChave(), h = pes.habitos.find(x => x.id === config.atalhoHabito && tipoHab(x) === 'qtd') || pes.habitos.find(x => tipoHab(x) === 'qtd' && (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(new Date().getDay()));
    if (h) { hab = fmtQtd(totalHab(h, ch), h.unidade, false); habSub = 'de ' + fmtQtd(h.meta, h.unidade) + ' · ' + h.nome.toLowerCase(); }
    else { const n = tarefas.filter(t => !t.feita).length, u = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo <= hoje0).length; hab = String(n); habSub = u ? u + ' para hoje' : n === 1 ? 'tarefa aberta' : 'tarefas abertas'; }
  } catch {}
  return { gastar, gastarSub, prox, proxSub, hab, habSub };
}
async function gravarWidget() {
  if (!Prefs) return;
  try { const d = dadosWidget(), txt = JSON.stringify(d); if (txt === widgetUlt) return; widgetUlt = txt; await Prefs.set({ key: 'az-widget', value: JSON.stringify({ ...d, t: Date.now() }) }); } catch {}
}
function atualizarWidget() { clearTimeout(timerWidget); timerWidget = setTimeout(gravarWidget, 900); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { clearTimeout(timerWidget); gravarWidget(); } });

// ----- atalhos: azote://escrever, gasto, crono, habito, hoje -----
let ultimoLink = null;
async function tratarLink(url) {
  const m = /^(?:azote|agzote|finzote):\/\/([a-z-]+)(?:\?(.*))?/i.exec(url || ''); if (!m) return;
  if (ultimoLink && ultimoLink.url === url && Date.now() - ultimoLink.t < 3000) return; // o mesmo toque não conta duas vezes
  ultimoLink = { url, t: Date.now() };
  const a = m[1].toLowerCase(), q = new URLSearchParams(m[2] || '');
  for (const ov of document.querySelectorAll('.overlay')) ov.hidden = true;
  if (APP === 'fin') {
    if (['gasto', 'receita', 'cartao', 'transf'].includes(a)) { abrir('home'); abrirLanc({ tipo: a, valor: q.get('valor') ? Number(q.get('valor')) : null, desc: q.get('desc') || '' }); }
    else if (a === 'cadastro') { abrir('home'); abrirCadastro(); }
    else if (a === 'extrato') { extRevisar = false; abrirFin('extrato'); }
    else abrir('home');
    return;
  }
  if (a === 'escrever') { abrir('escrever'); setTimeout(() => $('entradaEsc').focus(), 250); }
  else if (a === 'tarefa' || a === 'tarefas') { tarefasAba = 'tarefas'; abrir('tarefas'); if (a === 'tarefa') setTimeout(() => $('entradaTarefa').focus(), 250); }
  else if (a === 'gasto' && APP !== 'ag') { abrirFin('chat'); setTimeout(() => $('entradaFin').focus(), 250); }
  else if (a === 'crono') { abrir('home'); if (!crono.ativo) abrirOutra(); }
  else if (a === 'habito' && APP !== 'ag') {
    const h = pes.habitos.find(x => x.id === config.atalhoHabito) || pes.habitos.find(x => tipoHab(x) === 'qtd');
    if (!h) { pesAba = 'habitos'; abrir('pessoal'); toast('Cadastre um hábito com medida, como água'); return; }
    abrir('home'); tocarHabito(h); await salvarPes(); agendarAvisosPessoalDepois(); renderHome();
  } else abrir('home');
}
try { AppNativo?.addListener('appUrlOpen', ev => tratarLink(ev?.url)); } catch {}
async function iniciarNativo() {
  try { const r = await AppNativo?.getLaunchUrl?.(); if (r?.url) setTimeout(() => tratarLink(r.url), 300); } catch {}
  atualizarWidget();
}

// ----- Configurações › Facilidades -----
PAGINAS_EXTRA.push(() => ({ uso: { titulo: 'Facilidades', itens: [
  { t: 'sw', k: 'sugestoes', titulo: 'Sugestões ao escrever', sub: 'o que você costuma lançar nesta hora, os mais usados e completar o texto' },
  { t: 'sw', k: 'descobertas', titulo: 'Descobertas da semana', sub: 'padrões em gastos, estudo, humor e tarefas, no painel Hoje' },
  { t: 'acao', a: 'desc-voltar', titulo: 'Mostrar de novo as descobertas dispensadas' },
  { t: 'sec', titulo: 'Atalhos e widget' },
  { t: 'esc', k: 'atalhoHabito', titulo: 'Hábito do atalho “+1”', sub: 'usado no atalho do ícone e no widget', ops: [[null, 'O primeiro com medida'], ...pes.habitos.filter(h => tipoHab(h) === 'qtd').map(h => [h.id, (h.emoji || '') + ' ' + h.nome])] },
  { t: 'info', html: '<b>Atalhos:</b> segure o ícone do AgZote na tela inicial para abrir direto o Escrever, uma nova tarefa ou o cronômetro.<br><b>Widget:</b> segure um espaço vazio da tela inicial › Widgets › AgZote. Mostra o próximo compromisso, as horas livres de hoje e as tarefas.' },
  { t: 'sec', titulo: 'Gestos' },
  { t: 'info', html: 'Em Tarefas e no Extrato, deslize o item: → conclui ou edita, ← adia para amanhã ou exclui. Sempre aparece <b>Desfazer</b> embaixo.<br>Na Agenda › Semana, segure um compromisso e arraste para remarcar; toque num espaço vazio para marcar ali.<br>Segure a sua mensagem no Escrever ou em Lançamentos para <b>editar</b> ou apagar: o app refaz o que ela criou.' },
] } }));
CFG_ACOES['desc-voltar'] = async () => { config.descOcultas = {}; await guardar('az-config', config); toast('Descobertas de volta no Hoje'); };
