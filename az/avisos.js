
// =====================================================================
// 1.14 · Avisos: ajustes por tipo, não perturbe, modo foco, agrupar e histórico
// =====================================================================
let avisosLog = []; // { id, t, tipo, titulo, acao, acaoT, bandeja }
const NOMES_TIPO = { comp: 'Compromissos', contas: 'Contas', rem: 'Remédios', hab: 'Hábitos', tar: 'Tarefas', metas: 'Metas', rotina: 'Rotinas e relatórios', crono: 'Cronômetro', outro: 'Outros' };
function tipoNotif(n) {
  const x = n.extra || {};
  if (x.eventoId) return 'comp'; if (x.remedio) return 'rem'; if (x.habito) return 'hab'; if (x.tarefa) return 'tar'; if (x.crono) return 'crono';
  if (x.fin === 'metas' || x.meta) return 'metas'; if (x.fin || x.conta) return 'contas'; if (x.rotina || x.resumo || x.relatorio || x.backup) return 'rotina';
  return 'outro';
}
const excecaoDnd = tipo => (tipo === 'rem' && config.dndExRem !== false) || (tipo === 'comp' && config.dndExComp !== false) || (tipo === 'contas' && config.dndExContas) || (tipo === 'hab' && config.dndExHab) || tipo === 'crono' || tipo === 'outro';
function janelaDnd(dia) {
  let ini = config.dndIni || '22:30', fim = config.dndFim || '07:00';
  if (config.dndFds && (dia.getDay() === 0 || dia.getDay() === 6)) fim = fim < '09:00' ? '09:00' : fim;
  return [minDeHora(ini), minDeHora(fim)];
}
// devolve o novo horário (ou o mesmo) de acordo com não perturbe, foco no trabalho e agrupar
function ajustarHorario(n) {
  const tipo = tipoNotif(n), at = new Date(n.schedule?.at || Date.now());
  if (!n.schedule?.at || tipo === 'crono' || n.extra?.info) return at;
  let t = at;
  if (config.dndAtivo && !excecaoDnd(tipo)) {
    const [ini, fim] = janelaDnd(t), m = t.getHours() * 60 + t.getMinutes(), dentro = ini > fim ? (m >= ini || m < fim) : (m >= ini && m < fim);
    if (dentro) { const d = new Date(t); if (ini > fim && m >= ini) d.setDate(d.getDate() + 1); d.setHours(Math.floor(fim / 60), fim % 60, 0, 0); t = d; }
  }
  if (config.focoTrabalho && (tipo === 'hab' || tipo === 'metas')) {
    const d0 = inicioDoDia(t.getTime()).getTime(), trab = intervalosNoPeriodo(eventos.filter(e => e.trabalho), d0, d0 + 86400000).find(i => i.ini <= t.getTime() && i.fim > t.getTime());
    if (trab) t = new Date(trab.fim + 5 * 60000);
  }
  if (config.agrupar && (tipo === 'hab' || tipo === 'metas' || tipo === 'tar')) {
    const d = new Date(t), m = d.getHours() * 60 + d.getMinutes();
    if (m <= 12 * 60) d.setHours(12, 0, 0, 0); else if (m <= 18 * 60) d.setHours(18, 0, 0, 0); else { d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); }
    t = d;
  }
  return t;
}
function ajustarAvisos(lista) {
  return lista.map(n => {
    const tipo = tipoNotif(n), at = ajustarHorario(n), m = { ...n, group: 'azote-' + tipo };
    if (n.schedule?.at) m.schedule = { ...n.schedule, at };
    if (n.schedule?.at && !n.extra?.info && tipo !== 'crono') registrarAgendado(m, tipo);
    return m;
  });
}
// ----- histórico -----
let timerLog = null;
function registrarAgendado(n, tipo) {
  const t = new Date(n.schedule.at).getTime(), i = avisosLog.findIndex(x => x.id === n.id && Math.abs(x.t - t) < 60000);
  const item = { id: n.id, t, tipo, titulo: n.title };
  if (i >= 0) avisosLog[i] = { ...avisosLog[i], ...item }; else avisosLog.push(item);
  clearTimeout(timerLog); timerLog = setTimeout(salvarLog, 1500);
}
async function salvarLog() {
  const limite = Date.now() - 14 * 86400000, futuro = Date.now() + 70 * 86400000;
  avisosLog = avisosLog.filter(x => x.t > limite && x.t < futuro).sort((a, b) => a.t - b.t).slice(-600);
  await guardar('az-avisos-log', avisosLog);
}
function registrarAcaoAviso(ev) {
  const n = ev?.notification; if (!n) return;
  const cand = avisosLog.filter(x => x.id === n.id && x.t <= Date.now() + 60000).sort((a, b) => b.t - a.t)[0];
  const acao = ev.actionId && ev.actionId !== 'tap' ? ev.actionId : 'abriu';
  if (cand) { cand.acao = acao; cand.acaoT = Date.now(); } else avisosLog.push({ id: n.id, t: Date.now(), tipo: tipoNotif(n), titulo: n.title, acao, acaoT: Date.now() });
  salvarLog();
}
async function conferirBandeja() {
  if (!Notif?.getDeliveredNotifications) return;
  try { const r = await Notif.getDeliveredNotifications(); const ids = new Set((r?.notifications || []).map(n => n.id)); for (const x of avisosLog) if (x.t <= Date.now()) x.bandeja = ids.has(x.id); salvarLog(); } catch {}
}
const NOMES_ACAO = { abriu: 'aberto', tomei: 'Tomei', adiar: 'Adiado', feito: 'Feito', paguei: 'Paguei', pausar: 'Pausado', parar: 'Parado', m0: '+1', m1: '+1', depois: 'Mais tarde' };
function estadoAviso(x) { return x.acao ? [NOMES_ACAO[x.acao] || x.acao, x.acao === 'adiar' || x.acao === 'depois' ? 'a' : ''] : x.bandeja ? ['não visto', 'n'] : ['ignorado', 'n']; }
let histFiltro = 'hoje';
function historicoHTML() {
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime();
  const passados = avisosLog.filter(x => x.t <= agora && (histFiltro === 'hoje' ? x.t >= hoje0 : x.t >= agora - 7 * 86400000)).filter(x => histFiltro !== 'ign' || !x.acao).sort((a, b) => b.t - a.t);
  let h = '<div class="cfg-pad"><div class="ex">' + [['hoje', 'Hoje'], ['7', '7 dias'], ['ign', 'Só ignorados']].map(([k, n]) => '<button type="button" class="chip' + (histFiltro === k ? ' on' : '') + '" data-ca="hist-f:' + k + '">' + n + '</button>').join('') + '</div>';
  h += passados.length ? passados.slice(0, 80).map(x => { const [e, c] = estadoAviso(x), d = new Date(x.t); return '<div class="hist"><span class="h">' + (histFiltro === 'hoje' ? fmtHora(d) : DIAS_CURTO[d.getDay()] + '<br>' + fmtHora(d)) + '</span><b>' + esc(x.titulo || '') + '</b><em class="' + c + '">' + e + (x.acaoT && x.acao !== 'abriu' ? ' ' + fmtHora(new Date(x.acaoT)) : '') + '</em><small>' + NOMES_TIPO[x.tipo] + '</small></div>'; }).join('') : '<p class="txt mut" style="padding:10px 0">Nenhum aviso ' + (histFiltro === 'hoje' ? 'hoje' : 'nesse período') + '.</p>';
  // sugestão: tipo ignorado 4+ vezes em 7 dias
  const ign = {}; for (const x of avisosLog) if (x.t <= agora && x.t >= agora - 7 * 86400000 && !x.acao && x.tipo !== 'crono') ign[x.tipo] = (ign[x.tipo] || 0) + 1;
  const pior = Object.entries(ign).filter(([t, n]) => n >= 4 && ['tar', 'hab', 'contas', 'metas', 'rotina'].includes(t)).sort((a, b) => b[1] - a[1])[0];
  if (pior) { const [t, n] = pior; const mudar = { tar: ['tarefasHora', '19:00'], contas: ['contasHora', '19:00'] }[t];
    h += '<div class="notif-prev sug"><b>Você ignorou “' + NOMES_TIPO[t] + '” ' + n + ' vezes esta semana</b><p>' + (mudar ? 'Quer mudar o horário desse aviso para 19:00 ou desligar?' : 'Quer desligar esse tipo de aviso?') + '</p><div class="ac">' + (mudar ? '<button type="button" data-ca="hist-mudar:' + mudar[0] + ':' + mudar[1] + '">MUDAR PARA 19:00</button>' : '') + '<button type="button" data-ca="hist-desligar:' + t + '">DESLIGAR</button></div></div>'; }
  return h + '<p class="dica">Avisos que ainda estão na barra de notificações aparecem como “não visto”. O histórico guarda 14 dias.</p></div>';
}
CFG_ACOES['hist-f'] = a => { histFiltro = a.split(':')[1]; renderConfig(); };
CFG_ACOES['hist-mudar'] = async a => { const [, k, ...v] = a.split(':'); config[k] = v.join(':'); await guardar('az-config', config); await aplicarConfig(k); toast('Horário mudado ✓'); renderConfig(); };
CFG_ACOES['hist-desligar'] = async a => { const t = a.split(':')[1], k = { tar: 'tarefasHora', hab: 'habitosAviso', contas: 'contasAviso', metas: 'metasLembrete', rotina: 'revisaoHora' }[t]; config[k] = k.endsWith('Hora') ? null : false; await guardar('az-config', config); await aplicarConfig(k); toast('Desligado'); renderConfig(); };
CFG_ACOES['testar'] = () => testarAviso();
CFG_ACOES['ver-resumo'] = () => { const h = new Date(), r = textoResumo(new Date(h.getFullYear(), h.getMonth(), h.getDate())); responderConfig('Resumo de hoje', '<p><b>' + esc(r.titulo) + '</b></p><p style="margin-top:6px;white-space:pre-wrap">' + esc(r.corpo) + '</p>'); };
// ----- modo foco: com o cronômetro rodando, só remédios e compromissos tocam -----
async function segurarAvisosFoco() {
  if (config.focoCrono === false || !Notif?.getPending) return;
  try {
    const r = await Notif.getPending(), limite = Date.now() + 4 * 3600000, guardados = [];
    for (const n of r?.notifications || []) { const at = new Date(n.schedule?.at || 0).getTime(), tipo = tipoNotif(n); if (!at || at > limite || ['rem', 'comp', 'crono', 'outro'].includes(tipo)) continue; guardados.push({ id: n.id, title: n.title, body: n.body, actionTypeId: n.actionTypeId, extra: n.extra, at }); }
    if (!guardados.length) return;
    await Notif.cancel({ notifications: guardados.map(n => ({ id: n.id })) });
    await guardar('az-foco', guardados);
  } catch {}
}
async function liberarAvisosFoco() {
  const l = await ler('az-foco', null); if (!l || !l.length || !Notif) return;
  await guardar('az-foco', null);
  const agora = Date.now(), futuros = l.filter(n => n.at > agora + 30000), perdidos = l.filter(n => n.at <= agora + 30000);
  const lista = futuros.map(n => ({ id: n.id, title: n.title, body: n.body, actionTypeId: n.actionTypeId, extra: n.extra, schedule: { at: new Date(n.at), allowWhileIdle: true } }));
  if (perdidos.length) lista.push({ id: idNumerico('foco#' + agora), title: '⏱ Enquanto você focava: ' + perdidos.length + (perdidos.length === 1 ? ' aviso' : ' avisos'), body: perdidos.map(n => n.title).join(' · ').slice(0, 220), schedule: { at: new Date(agora + 2000), allowWhileIdle: true }, extra: { info: true } });
  try { if (lista.length) await agendarNotif(lista); } catch {}
}
// ----- ações das notificações novas -----
async function baixaRapida(ag, chave) {
  const o = ocorrenciasConta(ag, new Date(chave + 'T00:00').getTime(), new Date(chave + 'T23:59').getTime()).find(x => x.chave === chave); if (!o || o.paga) return null;
  if (!fin.contas.length) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' });
  const m = { id: novoId(), t: Date.now(), tipo: 'gasto', valor: ag.valor, contaId: ag.contaId || contaPadrao()?.id, titulo: ag.titulo, categoria: ag.categoria, agId: ag.id, chave };
  ag.baixas = { ...(ag.baixas || {}), [chave]: m.id }; fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t: Date.now() });
  await salvarFin(); agendarAvisosFinDepois(); return m;
}
async function tratarNotif114(ev) {
  const x = ev?.notification?.extra || {}, a = ev.actionId;
  if (x.conta && (a === 'paguei' || a === 'adiar')) {
    const ag = fin.agendadas.find(g => g.id === x.conta); if (!ag) return true;
    if (a === 'paguei') { const m = await baixaRapida(ag, x.chave); try { await agendarNotif([{ id: idNumerico('fin#ok#' + ag.id), title: m ? '✓ Baixa: ' + ag.titulo : ag.titulo + ' já estava paga', body: m ? fmtBRL(m.valor) + ' saiu de ' + (contaPorId(m.contaId)?.nome || 'sua conta') + '. Toque para conferir.' : '', schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true }, extra: { fin: 'contas', info: true } }]); } catch {} }
    else { const n = ev.notification; try { await agendarNotif([{ id: idNumerico('fin#adiar#' + ag.id + '#' + Date.now()), title: n.title, body: n.body, actionTypeId: 'conta', schedule: { at: new Date(Date.now() + 86400000), allowWhileIdle: true }, extra: x }]); } catch {} }
    atualizarTudo(); return true;
  }
  if (x.habito && a === 'depois') return true;
  if (x.relatorio) { abrirRelatorio(x.relatorio, undefined, 'home'); return true; }
  if (x.backup) { cfgPag = 'backup'; abrir('config'); return true; }
  if (x.rotina === 'meudia') { pesAba = 'meudia'; abrir('pessoal'); return true; }
  if (x.rotina === 'semana') { abrir('resumo'); return true; }
  if (x.fin === 'metas') { abrirFin('metas'); return true; }
  return false;
}
// ----- Configurações › Avisos -----
PAGINAS_EXTRA.push(() => {
  const nIgn = avisosLog.filter(x => x.t <= Date.now() && x.t >= Date.now() - 7 * 86400000 && !x.acao).length;
  return {
    notif: { titulo: 'Avisos', itens: [
      { t: 'acao', a: 'ativar', titulo: 'Avisos do AZote', sub: !Notif ? 'funcionam só no app instalado' : permissaoOk ? '● ativos neste celular' : 'desligados · toque para ativar', dir: permissaoOk ? 'ativos' : 'ativar', ok: permissaoOk },
      { t: 'acao', a: 'exato', titulo: 'Alarmes exatos', sub: exatoOk === false ? 'desligado: os avisos podem atrasar · toque para permitir' : 'tocar no minuto certo, mesmo com a tela bloqueada', dir: exatoOk === false ? 'permitir' : 'ok' },
      { t: 'nav', p: 'dnd', ic: '🌙', bg: '#26304a', titulo: 'Não perturbe e foco', sub: config.dndAtivo ? (config.dndIni + ' às ' + config.dndFim + ' · remédios ' + (config.dndExRem !== false ? 'passam' : 'esperam')) : 'desligado' + (config.focoCrono !== false ? ' · foco no cronômetro ligado' : '') },
      { t: 'sec', titulo: 'Por tipo' },
      { t: 'nav', p: 'av-comp', ic: '📅', bg: '#1f2a45', titulo: 'Compromissos', sub: fmtAviso(config.avisoPadrao) + ' · ou o que o recado disser' },
      { t: 'nav', p: 'av-contas', ic: '💳', bg: '#13324a', titulo: 'Contas e faturas', sub: config.contasAviso === false ? 'desligado' : [3, 2, 1, 0].filter(d => config['contasD' + d]).map(d => d ? d + 'd antes' : 'no dia').join(', ') + ', ' + (config.contasHora || '09:00') + (config.contasBotoes !== false ? ' · Paguei / Adiar' : '') },
      { t: 'nav', p: 'av-rem', ic: '💊', bg: '#173d2a', titulo: 'Remédios', sub: config.remediosAviso === false ? 'desligado' : 'na hora · Tomei / Adiar ' + (config.remAdiar || 15) + ' min' },
      { t: 'nav', p: 'av-hab', ic: '🔥', bg: '#3a2f12', titulo: 'Hábitos', sub: config.habitosAviso === false ? 'desligado' : 'horário de cada hábito ou intervalo (água)' },
      { t: 'esc', k: 'tarefasHora', titulo: '✅ Tarefas com prazo', sub: 'no dia do prazo', ops: [[null, 'Desligado'], ...horas(7, 20)] },
      { t: 'sw', k: 'metasLembrete', titulo: '🎯 Metas', sub: 'lembrete para guardar (cada meta tem o seu)' },
      { t: 'sw', k: 'cronoNotif', titulo: '⏱ Cronômetro', sub: 'notificação fixa enquanto roda' },
      { t: 'nav', p: 'relatorios', ic: '📊', bg: '#2c2140', titulo: 'Relatórios e rotinas', sub: 'resumo da manhã, revisão, Meu dia, semana, mês' },
      { t: 'sec', titulo: 'Geral' },
      { t: 'nav', p: 'historico', ic: '🕘', bg: '#1a1a1a', titulo: 'Histórico de avisos', sub: 'o que chegou e o que você fez' + (nIgn ? ' · ' + nIgn + ' ignorados em 7 dias' : '') },
      { t: 'sw', k: 'esconderNotif', titulo: 'Esconder conteúdo dos avisos', sub: 'a notificação mostra só “Você tem um aviso do AZote”' },
      { t: 'botao', a: 'testar', titulo: 'Testar aviso' },
    ] },
    'av-comp': { titulo: 'Compromissos', itens: [
      { t: 'esc', k: 'avisoPadrao', titulo: 'Aviso padrão', sub: 'quando o recado não disser', ops: [[0, 'Na hora'], [5, '5 min antes'], [15, '15 min antes'], [30, '30 min antes'], [60, '1 hora antes'], [1440, '1 dia antes'], [null, 'Sem aviso']] },
      { t: 'info', html: 'Cada compromisso pode ter o próprio aviso: escreva “avisar 30 min antes” no recado ou mude em Editar.' },
    ] },
    'av-contas': { titulo: 'Contas e faturas', itens: [
      { t: 'sw', k: 'contasAviso', titulo: 'Avisos de contas', sub: 'contas a pagar, a receber e faturas' },
      { t: 'sec', titulo: 'Avisar' },
      { t: 'sw', k: 'contasD3', titulo: '3 dias antes' }, { t: 'sw', k: 'contasD2', titulo: '2 dias antes' }, { t: 'sw', k: 'contasD1', titulo: '1 dia antes' }, { t: 'sw', k: 'contasD0', titulo: 'No dia do vencimento' },
      { t: 'esc', k: 'contasHora', titulo: 'Horário', ops: [['08:00', '08:00'], ['09:00', '09:00'], ['12:00', '12:00'], ['19:00', '19:00']] },
      { t: 'sec', titulo: 'Mais' },
      { t: 'sw', k: 'contasInsistir', titulo: 'Insistir até dar baixa', sub: 'conta atrasada avisa todo dia, por até 7 dias' },
      { t: 'esc', k: 'contasMin', titulo: 'Só contas acima de', sub: 'contas pequenas não avisam', ops: [[0, 'Todas'], [50, 'R$ 50'], [100, 'R$ 100'], [200, 'R$ 200'], [500, 'R$ 500']] },
      { t: 'sw', k: 'contasFatFecha', titulo: 'Fatura fechou', sub: 'aviso 1 dia depois do fechamento do cartão' },
      { t: 'sw', k: 'contasReceber', titulo: 'Salário e entradas', sub: 'avisar quando é dia de receber' },
      { t: 'sw', k: 'contasBotoes', titulo: 'Botões na notificação', sub: '“Paguei” dá baixa direto; “Adiar 1 dia” avisa amanhã' },
    ] },
    'av-rem': { titulo: 'Remédios', itens: [
      { t: 'sw', k: 'remediosAviso', titulo: 'Avisos de remédios', sub: 'nos horários de cada remédio, com Tomei e Adiar' },
      { t: 'esc', k: 'remAdiar', titulo: 'Adiar por', ops: [[10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 hora']] },
      { t: 'info', html: 'No não perturbe, remédios tocam mesmo assim (dá para mudar em Não perturbe e foco).' },
    ] },
    'av-hab': { titulo: 'Hábitos', itens: [
      { t: 'sw', k: 'habitosAviso', titulo: 'Avisos de hábitos', sub: 'cada hábito escolhe: horário fixo ou intervalo' },
      { t: 'info', html: 'Hábitos de quantidade, como a água, podem avisar a cada intervalo só quando você estiver atrás do ritmo, com <b>+1 copo</b> direto na notificação. Ajuste em Pessoal › Hábitos › Editar.' },
    ] },
    dnd: { titulo: 'Não perturbe e foco', itens: [
      { t: 'sw', k: 'dndAtivo', titulo: 'Não perturbe', sub: 'avisos desse horário chegam no fim dele' },
      { t: 'esc', k: 'dndIni', titulo: 'Das', ops: horas(20, 23, 30) },
      { t: 'esc', k: 'dndFim', titulo: 'Até', ops: horas(5, 10, 30) },
      { t: 'sw', k: 'dndFds', titulo: 'Fim de semana até 09:00' },
      { t: 'sec', titulo: 'Podem tocar mesmo assim' },
      { t: 'sw', k: 'dndExRem', titulo: '💊 Remédios' }, { t: 'sw', k: 'dndExComp', titulo: '📅 Compromissos marcados' }, { t: 'sw', k: 'dndExContas', titulo: '💳 Contas' }, { t: 'sw', k: 'dndExHab', titulo: '🔥 Hábitos' },
      { t: 'sec', titulo: 'Modo foco' },
      { t: 'sw', k: 'focoCrono', titulo: 'Com o cronômetro rodando', sub: 'só remédios e compromissos; o resto chega num resumo ao parar' },
      { t: 'sw', k: 'focoTrabalho', titulo: 'No horário de trabalho', sub: 'hábitos e metas ficam para depois do trabalho' },
      { t: 'sec', titulo: 'Resumo em vez de vários avisos' },
      { t: 'sw', k: 'agrupar', titulo: 'Juntar avisos não urgentes', sub: 'hábitos, metas e tarefas chegam juntos às 12:00 e às 18:00' },
    ] },
    historico: { titulo: 'Histórico de avisos', itens: [{ t: 'html', html: historicoHTML() }] },
  };
});
