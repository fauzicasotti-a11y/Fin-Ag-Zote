
// =====================================================================
// 1.11 · Mono AMOLED: barra de baixo, painel Hoje e a conversa Escrever
// =====================================================================
let escrever = [];       // conversa única: { id, t, texto, dest, refs, ref, projeto, desfeito }
let escFiltro = '', escMover = null;
const TELAS_BARRA = APP === 'fin' ? { home: 'home', fin: 'fin' } : { home: 'home', agenda: 'agenda', cal: 'agenda', escrever: 'escrever', tarefas: 'tarefas', pessoal: 'pessoal' };
function atualizarBarra() {
  const on = APP === 'fin' && tela === 'fin' ? navFinAtual() : TELAS_BARRA[tela];
  $('barra').hidden = !on;
  $('barra').querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === on));
}
$('barra').addEventListener('click', e => {
  const b = e.target.closest('[data-nav]'); if (!b) return;
  const n = b.dataset.nav;
  if (APP === 'fin') { navFin(n); return; }
  if (n === 'escrever') { abrir('escrever'); return; }
  if (n === 'agenda') { if (tela !== 'agenda' && tela !== 'cal') { agendaAba = 'prog'; agendaData = null; } abrir(tela === 'cal' ? 'cal' : 'agenda'); return; }
  if (n === 'fin') { abrirFin(); return; }
  abrir(n);
});

// ----- Hoje -----
function saudacao() { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function cardCronoHTML() {
  const a = crono.ativo, hoje0 = inicioDoDia(Date.now()).getTime();
  if (a) return '<div class="card hj-crono on"><div class="rot">⏱ Cronômetro · ' + (pausado(a) ? 'pausado' : 'rodando') + '</div>' +
    '<div class="hj-ct"><div><span class="tempo" data-crono-tempo>' + fmtCrono(tempoDe(a)) + '</span><small>' + esc(a.titulo) + ' · desde ' + fmtHora(new Date(a.ini)) + '</small></div></div>' +
    '<div class="actions"><button type="button" class="btn" data-h="crono-pausa">' + (pausado(a) ? '▶ Continuar' : '❙❙ Pausar') + '</button><button type="button" class="btn primary" data-h="crono-parar">■ Parar</button></div></div>';
  const ss = crono.sessoes.filter(s => s.ini >= hoje0), tot = ss.reduce((t, s) => t + realMin(s), 0);
  const agora = Date.now();
  const atual = linhasDaAgenda(hoje0, hoje0 + 86400000 - 1).find(e => !e.pulado && e.quando - 15 * 60000 <= agora && e.quando + e.dur * 60000 > agora && !sessoesDe(e.id, e.chave).length);
  return '<div class="card hj-crono"><div class="rot">⏱ Cronômetro</div>' +
    '<div class="hj-ct"><div><span class="tempo">' + (tot ? fmtLivre(tot) : '0h') + '</span><small>' + (ss.length ? ss.length + (ss.length === 1 ? ' sessão hoje' : ' sessões hoje') : 'nada cronometrado hoje') + '</small></div></div>' +
    '<div class="actions">' + (atual ? '<button type="button" class="btn primary" data-h="crono-ev" data-id="' + esc(atual.id) + '" data-chave="' + esc(atual.chave || '') + '" data-t="' + atual.quando + '" data-dur="' + atual.dur + '">▶ ' + esc(atual.titulo) + '</button>' : '') +
    '<button type="button" class="btn' + (atual ? '' : ' primary') + '" data-h="crono-outra">▶ ' + (atual ? 'Outra' : 'Iniciar atividade') + '</button><button type="button" class="btn" data-h="crono-ver">Sessões</button></div></div>';
}
function renderHome() {
  atualizarBarra(); cacheSaldo = null;
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), d = new Date();
  let h = '<div class="ola">' + saudacao() + (config.nome ? ', ' + esc(config.nome) : '') + '<small>' + maiuscula(DIAS[d.getDay()]) + ', ' + d.getDate() + ' de ' + MESES_LONGO[d.getMonth()] + '</small></div>';
  // próximo compromisso
  const prox = linhasAgenda(agora - 3 * 3600000, agora + 30 * 86400000).filter(e => !e.trabalho && e.quando + (e.duracao ?? 60) * 60000 > agora)[0];
  const info = livreNoDia(intervalosNoPeriodo(eventos, hoje0, hoje0 + 86400000), new Date(hoje0));
  const total = ((config.janelaFim ?? 22) - (config.janelaIni ?? 7)) * 60;
  const ocup = Math.max(0, Math.min(100, Math.round((1 - info.livreMin / total) * 100)));
  if (prox) {
    const dp = new Date(prox.quando), dif = difDias(prox.quando), agoraNele = prox.quando <= agora;
    const quando = agoraNele ? 'agora · até ' + fmtHora(fimDe(prox.quando, prox)) : dif === 0 ? 'hoje' : dif === 1 ? 'amanhã' : DIAS_CURTO[dp.getDay()] + ', ' + dp.getDate() + '/' + (dp.getMonth() + 1);
    h += '<button type="button" class="card hj-prox" data-h="agenda"><div class="rot">' + (agoraNele ? 'Agora' : 'Próximo') + '</div><div class="prox"><span class="hr">' + fmtHora(dp) + '</span><div><b>' + esc(prox.titulo) + '</b><small>' + quando + ' · ' + fmtLivre(info.livreMin) + ' livres hoje</small></div></div><div class="bar"><i style="width:' + ocup + '%"></i></div></button>';
  } else h += '<button type="button" class="card hj-prox" data-h="agenda"><div class="rot">Agenda</div><div class="prox"><span class="hr">—</span><div><b>Nada marcado</b><small>' + fmtLivre(info.livreMin) + ' livres hoje · escreva “dentista amanhã às 15h”</small></div></div></button>';
  h += cardCronoHTML();
  // saldo e tarefas
  const abertas = tarefas.filter(t => !t.feita), urg = abertas.filter(t => t.prazo !== null && t.prazo <= hoje0).length;
  let saldo;
  if (fin.contas.length && config.mostrarSaldoHome !== false) {
    const tc = fin.contas.filter(c => !ehInvest(c)).reduce((a, c) => a + saldoConta(c), 0);
    const pc = todasOcorrencias(hoje0, hoje0 + 45 * 86400000).find(o => !o.paga && o.ag.tipo === 'pagar');
    saldo = '<button type="button" class="card" data-h="fin"><div class="rot">Saldo</div><div class="big hj-big">' + fmtBRL(tc).replace(',00', '') + '</div><small class="' + (pc ? 'gas' : 'mut') + '">' + (pc ? esc(pc.ag.titulo) + ' ' + fmtCurto(pc.mov?.valor ?? pc.ag.valor) + ' · ' + pad(new Date(pc.t).getDate()) + '/' + pad(new Date(pc.t).getMonth() + 1) : 'nenhuma conta a pagar') + '</small></button>';
  } else saldo = '<button type="button" class="card" data-h="fin"><div class="rot">Finanças</div><div class="big hj-big">' + (fin.contas.length ? '••••' : 'R$ 0') + '</div><small class="mut">' + (fin.contas.length ? 'toque para ver' : 'cadastre suas contas') + '</small></button>';
  h += cartaoOrcHoje();
  h += '<div class="g2">' + saldo + '<button type="button" class="card" data-h="tarefas"><div class="rot">Tarefas</div><div class="big hj-big">' + abertas.length + '</div><small class="' + (urg ? 'gas' : 'mut') + '">' + (urg ? urg + (urg === 1 ? ' para hoje ou atrasada' : ' para hoje ou atrasadas') : abertas.length ? 'nenhuma urgente' : 'tudo feito ✓') + '</small></button></div>';
  // hábitos e remédios
  const hj = new Date().getDay(), ch = hojeChave();
  const habs = pes.habitos.filter(x => (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(hj));
  const doses = dosesDoDia(ch);
  if (habs.length || doses.length) {
    h += '<div class="card"><div class="rot">' + [habs.length ? 'Hábitos ' + habs.filter(x => feitoHab(x, ch)).length + '/' + habs.length : '', doses.length ? 'Remédios ' + doses.filter(x => x.dose).length + '/' + doses.length : ''].filter(Boolean).join(' · ') + '</div><div class="hb">' +
      habs.map(x => '<button type="button" class="' + (feitoHab(x, ch) ? 'ok' : '') + '" data-h="hab" data-id="' + esc(x.id) + '">' + esc(x.emoji || '✓') + ' <span>' + esc(x.nome) + (tipoHab(x) === 'qtd' || tipoHab(x) === 'tempo' ? ' ' + fmtQtd(totalHab(x, ch), x.unidade, true) + '/' + (x.unidade === 'min' ? x.meta + ' min' : fmtQtd(x.meta, x.unidade)) + ' <b>+</b>' : '') + '</span></button>').join('') +
      doses.map(x => '<button type="button" class="rm' + (x.dose ? ' ok' : x.h <= fmtHora(new Date()) ? ' atr' : '') + '" data-h="dose" data-id="' + esc(x.r.id) + '" data-hr="' + x.h + '"' + (x.dose ? ' disabled' : '') + '>💊 <span>' + esc(x.r.nome) + ' ' + x.h + '</span></button>').join('') + '</div></div>';
  }
  // rotina do momento
  const hm = fmtHora(new Date());
  let rot = null;
  if (d.getDay() === 0 && hm >= '15:00') rot = ['🗓️', 'Planejar a semana', 'conversa guiada de 2 minutos', 'plano'];
  else if (hm >= (config.revisaoHora || '21:00') || hm >= '19:00') { const pend = linhasDaAgenda(hoje0, agora).filter(e => !e.pulado && !e.trabalho && !sessoesDe(e.id, e.chave).length).length + urg; rot = ['🌙', 'Revisão da noite', pend ? pend + (pend === 1 ? ' item para revisar' : ' itens para revisar') : 'feito, pendente e amanhã', 'revisao']; }
  else if (d.getDate() <= 3) rot = ['📊', 'Retrospectiva de ' + MESES_LONGO[(d.getMonth() + 11) % 12], 'como foi o mês', 'retro'];
  if (hm >= '18:00' && !(pes.relatos || []).some(r => r.chave === ch && r.fase === 'salvo')) h += '<button type="button" class="card hj-rot hj-dia" data-h="meudia"><span class="em">🌙</span><div><b>Como foi seu dia?</b><small>conte em um texto e eu registro os horários</small></div><span class="chip on">Contar</span></button>';
  if (rot) h += '<button type="button" class="card hj-rot" data-h="rot-' + rot[3] + '"><span class="em">' + rot[0] + '</span><div><b>' + rot[1] + '</b><small>' + rot[2] + '</small></div><span class="chip on">Abrir</span></button>';
  h += descobertasHTML();
  // anotações
  const un = notas[notas.length - 1];
  h += '<button type="button" class="card hj-rot" data-h="notas"><span class="em">📝</span><div><b>Anotações</b><small>' + (un ? notas.length + (notas.length === 1 ? ' nota' : ' notas') + ' · última: ' + esc(un.texto.split('\n')[0].slice(0, 48)) : 'escreva “nota: …” para guardar uma ideia') + '</small></div><span class="chip">Ver</span></button>';
  // atalhos
  h += '<div class="rot hj-tit">Atalhos</div><div class="atalhos">' + [['recados', 'i-recados', 'Recados'], ['tarefas', 'i-tarefas', 'Tarefas'], ['resumo', 'i-resumo', 'Resumo'], ['crono-ver', 'i-crono', 'Sessões'], ['notas', 'i-notas', 'Anotações'], ['cal', 'i-cal', 'Mês']]
    .map(([k, ic, n]) => '<button type="button" data-h="' + k + '"><i><svg><use href="#' + ic + '"/></svg></i><span>' + n + '</span></button>').join('') + '</div>';
  $('hoje').innerHTML = h;
  const dB = config.ultimoBackup ? (Date.now() - config.ultimoBackup) / 86400000 : null;
  $('btnConfig').classList.toggle('alerta', (dB === null && eventos.length > 0) || dB >= 7);
}
$('hoje').addEventListener('click', async e => {
  const b = e.target.closest('[data-h]'); if (!b) return;
  const a = b.dataset.h;
  if (a === 'agenda') { agendaAba = 'prog'; agendaData = null; abrir('agenda'); }
  if (['tarefas', 'recados', 'notas', 'cal'].includes(a)) abrir(a);
  if (a === 'resumo') abrir('resumo');
  if (a === 'fin') abrirFin('saldos');
  if (a === 'orc') abrirFin('gastar');
  if (a === 'crono-ver') { resumoAba = 'crono'; abrir('resumo'); }
  if (a === 'crono-outra') abrirOutra();
  if (a === 'crono-pausa') await pausarCrono();
  if (a === 'crono-parar') await pararCrono();
  if (a === 'crono-ev') {
    const ev = eventos.find(x => x.id === b.dataset.id); if (!ev) return;
    const t = Number(b.dataset.t);
    await iniciarCrono({ evId: ev.id, chave: b.dataset.chave || null, titulo: ev.titulo, categoria: ev.categoria || categorizar(ev.titulo, ev.trabalho), planIni: t, planFim: t + Number(b.dataset.dur) * 60000 });
  }
  if (a === 'hab') { const x = pes.habitos.find(y => y.id === b.dataset.id); if (!x) return; tocarHabito(x); await salvarPes(); agendarAvisosPessoalDepois(); }
  if (a === 'dose') { const r = pes.remedios.find(y => y.id === b.dataset.id); if (!r) return; registrarDose(r, Date.now(), b.dataset.hr); await salvarPes(); agendarAvisosPessoalDepois(); }
  if (a === 'meudia') { pesAba = 'meudia'; abrir('pessoal'); setTimeout(() => $('entradaDia').focus(), 150); }
  if (a === 'rot-plano') abrirPlano();
  if (a === 'rot-revisao') abrirRevisao();
  if (a === 'rot-retro') abrirRetro();
  if (tela === 'home') renderHome();
});
$('fxEscrever').onclick = () => { abrir('escrever'); setTimeout(() => $('entradaEsc').focus(), 120); };

// ----- Escrever: uma conversa que manda cada mensagem para o lugar certo -----
const DESTINOS = { agenda: ['📅', 'Agenda'], fin: ['💳', 'Finanças'], pes: ['🌱', 'Pessoal'], tarefa: ['✅', 'Tarefas'], nota: ['📝', 'Anotações'], dia: ['🌙', 'Meu dia'] };
const RE_NOTA = /^\s*(nota|notas|anota[çc][aã]o|anotar|anota|anote|ideia)\s*[:\-–]?\s+/i;
const RE_TAREFA = /^\s*(tarefa|fazer|to-?do)\s*[:\-–]\s*/i;
const RE_PES_VERBO = /^\s*(estudei|li|treinei|corri|caminhei|pedalei|nadei|tomei|fiz|pesei|terminei|comecei a ler|quero ler|revisei|energia|humor|peso|cintura|gordura)\b/i;
const RE_DINHEIRO = /r\$|\d+,\d{2}\b|\breais\b|\bmil\b|\b(paguei|gastei|comprei|recebi|ganhei|sal[aá]rio|pix|transferi|guardei|apliquei|resgatei|rendeu|rendimento|caiu|entrou|fatura|parcela|parcelas|cart[aã]o|boleto|conta de)\b/i;
const RE_VERBO_INF = /^\s*(?:lembrar de\s+|preciso\s+|tenho que\s+)?([a-zà-ú]{3,}(?:ar|er|ir|or))\b/i;
function destinoDe(texto) {
  if (RE_NOTA.test(texto)) return 'nota';
  try { if (lerRecebimentoPessoa(texto)) return 'fin'; } catch {}
  try { const dv = lerDivisao(texto); if (dv && interpretarFin(dv.base, new Date(), { contas: fin.contas, agendadas: fin.agendadas, pendentes: pendentesDe })?.acao === 'gasto') return 'fin'; } catch {}
  try { if (lerHorasTarefa(texto)) return 'tarefa'; } catch {}
  // relato do dia com várias atividades ("hoje trabalhei, treinei e li") vai para Meu dia
  if (/^\s*(hoje|ontem|o dia)\b/i.test(texto) && /\b(consegui|fui|fiz|trabalhei|treinei|estudei|li|escrevi|corri|tive)\b/i.test(texto)) { try { if (detectarAtividades(texto, diaDoRelato()).filter(a => a.tipo !== 'habito').length >= 2) return 'dia'; } catch {} }
  if (RE_TAREFA.test(texto) || /^\s*projeto\s*[:\-]/i.test(texto)) return 'tarefa';
  const agora = new Date();
  try { if (interpretarPessoal(texto, agora, { remedios: pes.remedios, materias: pes.materias, livros: pes.livros, habitos: pes.habitos })) return 'pes'; } catch {}
  if (RE_PES_VERBO.test(texto)) return 'pes';
  try { if (interpretarBusca(texto, agora)) return 'agenda'; } catch {}
  try { if (interpretarCartao(texto, agora, fin.cartoes || []) || interpretarMeta(texto, agora, fin.metas || []) || interpretarDivida(texto, agora, fin.dividas || [])) return 'fin'; } catch {}
  let ag = null; try { ag = interpretar(texto, agora, {}); } catch {}
  const temHora = ag && !ag.faltouHora, temData = ag && !ag.faltouData;
  let rf = null; try { rf = interpretarFin(texto, agora, { contas: fin.contas, agendadas: fin.agendadas, pendentes: pendentesDe }); } catch {}
  if (rf && rf.acao && rf.acao !== 'nada' && (RE_DINHEIRO.test(texto) || !temHora)) return 'fin';
  if (temHora) return 'agenda';
  let tf = null; try { tf = interpretarTarefa(texto, agora); } catch {}
  if ((tf && tf.prazo !== null) || RE_VERBO_INF.test(texto)) return 'tarefa';
  if (temData) return 'agenda';
  return 'nota';
}
const novosItens = (lista, antes) => lista.filter(x => !antes.has(x)).map(x => (x.uid = x.uid || novoId()));
async function processarComo(dest, texto) {
  if (dest === 'finzote') return {};
  if (dest === 'dia') { const r = await processarDia(texto); return { ref: r?.id }; }
  if (dest === 'nota') { const n = await processarNota(texto.replace(RE_NOTA, '') || texto); return { ref: n.id }; }
  if (dest === 'tarefa') { const r = await processarTarefa(texto.replace(RE_TAREFA, '') || texto); return r.projeto ? { projeto: true } : r.horas ? { ref: r.tarefa.id, horas: r.horas, horaId: r.horaId } : { ref: r.tarefa.id }; }
  if (dest === 'agenda') { const s = new Set(recados); await processarRecado(texto); return { refs: novosItens(recados, s) }; }
  if (dest === 'fin') { const s = new Set(fin.chat); await processarFin(texto); return { refs: novosItens(fin.chat, s) }; }
  if (dest === 'pes') { const s = new Set(pes.chat); await processarPes(texto); return { refs: novosItens(pes.chat, s) }; }
}
async function salvarEscrever() { if (escrever.length > 300) escrever = escrever.slice(-300); await guardar('az-escrever', escrever); }
$('formEsc').addEventListener('submit', async e => {
  e.preventDefault();
  const texto = $('entradaEsc').value.trim(); if (!texto) return;
  $('entradaEsc').value = '';
  if (await enviarEdicao('esc', texto)) { $('entradaEsc').focus(); return; }
  const dest = destinoDe(texto);
  const en = { id: novoId(), t: Date.now(), texto, dest };
  Object.assign(en, await processarComo(dest, texto));
  escrever.push(en); escMover = null;
  // os recados e lançamentos do Escrever também salvam o próprio item com uid
  await Promise.all([salvarEscrever(), guardar('az-recados', recados), salvarFin(), salvarPes()]);
  if (escFiltro && escFiltro !== dest) escFiltro = '';
  renderEscrever(); $('entradaEsc').focus();
});
async function desfazerEntrada(en) {
  if (en.dest === 'agenda') {
    for (const uid of en.refs || []) { const it = recados.find(x => x.uid === uid); if (it && it.k === 'ev' && eventos.some(e => e.id === it.id)) await apagarEvento(it.id); }
    recados = recados.filter(x => !(en.refs || []).includes(x.uid) && !(x.k === 'me' && x.texto === en.texto && Math.abs(x.t - en.t) < 5000));
    await guardar('az-recados', recados);
  }
  if (en.dest === 'fin') {
    await desfazerItensFin((en.refs || []).map(uid => fin.chat.find(x => x.uid === uid)).filter(Boolean));
    fin.chat = fin.chat.filter(x => !(en.refs || []).includes(x.uid));
    await salvarFin(); agendarAvisosFinDepois();
  }
  if (en.dest === 'pes') {
    for (const uid of en.refs || []) { const it = pes.chat.find(x => x.uid === uid); if (it?.undo && !it.desfeito) desfazerPes(it.undo); }
    pes.chat = pes.chat.filter(x => !(en.refs || []).includes(x.uid));
    await salvarPes(); await salvarCrono(); agendarAvisosPessoalDepois();
  }
  if (en.dest === 'tarefa' && en.ref && en.horaId) { const t = tarefas.find(x => x.id === en.ref); if (t) t.horas = (t.horas || []).filter(h => h.id !== en.horaId); await salvarTarefas(); }
  else if (en.dest === 'tarefa' && en.ref) { tarefas = tarefas.filter(t => t.id !== en.ref); await cancelarAvisoTarefa(en.ref); await salvarTarefas(); }
  if (en.dest === 'dia' && en.ref) { const r = relatoPorId(en.ref); if (r) { if (r.fase === 'salvo') await desfazerDia(r); r.fase = 'cancelado'; pes.diaChat = pes.diaChat.filter(x => x.rid !== r.id && !(x.k === 'me' && x.texto === en.texto)); await salvarPes(); } }
  if (en.dest === 'nota' && en.ref) { notas = notas.filter(n => n.id !== en.ref); await guardar('az-notas', notas); }
}
function respEscHTML(en) {
  const [ic, nome] = DESTINOS[en.dest];
  const etq = '<span class="etq">' + ic + ' ' + nome + '</span>';
  const pe = (podeDesfazer = true) => en.desfeito ? '' : '<div class="esc-pe">' + (podeDesfazer ? '<button type="button" data-ea="desfazer">Desfazer</button>' : '') + '<button type="button" data-ea="mover">Não era isso?</button><button type="button" data-ea="abrir">Abrir ' + nome + ' ›</button></div>' +
    (escMover === en.id ? '<div class="esc-mover"><small>Guardar em:</small>' + Object.entries(DESTINOS).filter(([k]) => k !== en.dest && k !== (APP === 'ag' ? 'fin' : 'finzote')).map(([k, [i, n]]) => '<button type="button" class="chip" data-ea="mover-para" data-para="' + k + '">' + i + ' ' + n + '</button>').join('') + '</div>' : '');
  const bol = (html, primeira, ultima) => '<div class="msg app" data-en="' + esc(en.id) + '" data-dest="' + en.dest + '">' + (primeira ? etq + (en.antes ? '<p class="dica corr">✎ Corrigido · antes: ' + esc(en.antes) + '</p>' : '') : '') + html + (ultima ? pe(en.dest !== 'tarefa' || !en.projeto) : '') + '<div class="meta">' + fmtHora(new Date(en.t)) + '</div></div>';
  if (en.desfeito) return bol('<p class="dica" style="margin-top:2px!important">Desfeito. Nada foi guardado.</p>', true, true);
  if (en.dest === 'finzote') return bol(finzoteHTML(en), true, true);
  if (en.dest === 'dia') {
    const r = relatoPorId(en.ref);
    if (!r || r.fase === 'cancelado') return bol('<p class="dica">Esse relato foi cancelado.</p>', true, true);
    const n = r.ativs.filter(a => a.tipo !== 'habito').length, faltam = r.ativs.filter(precisaPergunta).length;
    return bol('<p>Entendi <b>' + n + (n === 1 ? ' atividade' : ' atividades') + '</b>: ' + r.ativs.map(a => ICONE_ATIV[a.tipo] + ' ' + esc(a.nome)).join(' · ') + '.</p><p class="dica">' + (r.fase === 'salvo' ? 'Dia salvo ✓' : faltam ? faltam + (faltam === 1 ? ' pergunta' : ' perguntas') + ' sobre horários e páginas em Pessoal › Meu dia.' : 'Falta só confirmar o resumo.') + '</p>' + (r.fase !== 'salvo' ? '<div class="actions"><button type="button" class="btn primary" data-ea="abrir">Responder as perguntas</button></div>' : ''), true, true);
  }
  if (en.dest === 'nota') {
    const n = notas.find(x => x.id === en.ref);
    return bol(n ? '<p>Guardado ✓ <span class="mut">· ' + notas.length + (notas.length === 1 ? ' nota' : ' notas') + '</span></p><div class="actions"><button type="button" class="btn" data-ea="nota-tarefa">Virar tarefa</button></div>' : '<p class="dica">Essa anotação foi apagada.</p>', true, true);
  }
  if (en.dest === 'tarefa') {
    if (en.horas) { const t = tarefas.find(x => x.id === en.ref); if (!t) return bol('<p class="dica">Essa tarefa foi apagada.</p>', true, true); const tot = minTarefa(t);
      return bol('<p>✓ <b>+' + fmtLivre(en.horas) + '</b> em ' + esc(t.titulo) + '</p><p class="dica" style="margin-top:2px!important">Total ' + fmtLivre(tot) + (t.estimativa ? ' de ' + fmtLivre(t.estimativa) + ' estimadas' + (tot > t.estimativa ? ' · passou ' + fmtLivre(tot - t.estimativa) : '') : '') + '</p><div class="actions"><button type="button" class="btn" data-ea="tarefa-ver">Ver a tarefa</button></div>', true, true); }
    if (en.projeto) return bol('<p>Projeto criado ✓ Abra Tarefas › Projetos para adicionar as etapas.</p>', true, true);
    const t = tarefas.find(x => x.id === en.ref);
    if (!t) return bol('<p class="dica">Essa tarefa foi apagada.</p>', true, true);
    const c = categoriaPorId(t.categoria);
    return bol('<p>' + (t.feita ? '✓ <s>' + esc(t.titulo) + '</s>' : '<b>' + esc(t.titulo) + '</b>') + '</p><p class="dica" style="margin-top:2px!important">' + (t.prazo !== null ? maiuscula(fmtPrazo(t.prazo)) + (config.tarefasHora ? ' · aviso às ' + config.tarefasHora.replace(':00', 'h') : '') : 'Sem prazo') + ' · <span class="pill cat" style="background:' + c.cor + '">' + c.nome + '</span></p>' +
      (!t.feita ? '<div class="actions"><button type="button" class="btn primary" data-ea="tarefa-agendar">Agendar horário</button><button type="button" class="btn" data-ea="tarefa-feita">Feita</button></div>' : ''), true, true);
  }
  const lista = en.dest === 'agenda' ? recados : en.dest === 'fin' ? fin.chat : pes.chat;
  const itens = (en.refs || []).map(u => lista.find(x => x.uid === u)).filter(it => it && it.k !== 'me');
  if (!itens.length) return bol('<p class="dica">Esse registro não existe mais.</p>', true, true);
  return itens.map((it, i) => bol(en.dest === 'agenda' ? htmlRecado(it) : en.dest === 'fin' ? htmlItemFin(it) : htmlItemPes(it, true), i === 0, i === itens.length - 1)).join('');
}
const EXEMPLOS_ESC = ['hoje trabalhei normalmente, fui treinar e li um pouco', 'dentista amanhã às 15h', 'mercado 312,45', 'supino 4x10 40kg', 'pagar IPVA até sexta', 'nota: ideia de presente pra mãe', 'tênis 600 em 3x no cartão', 'estudei 1h de python', 'energia 4 humor 3'];
function renderEscrever() {
  $('abasEsc').querySelectorAll('[data-fe]').forEach(b => b.classList.toggle('on', b.dataset.fe === escFiltro));
  const boas = bolhaHTML('app', '<p>Escreva <b>qualquer coisa</b> como mensagem: compromisso, gasto, treino, remédio, tarefa ou ideia. Eu entendo e guardo no lugar certo, com uma etiqueta mostrando onde. Se eu errar, toque em <b>Não era isso?</b> ou segure a sua mensagem para <b>editar</b>: eu refaço o lançamento ou o compromisso.</p><div class="ex">' +
    EXEMPLOS_ESC.map(t => '<button type="button" class="chip" data-ex="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>', null);
  const lista = escrever.filter(en => !escFiltro || en.dest === escFiltro);
  $('chatEsc').innerHTML = (escFiltro ? '' : boas) + (escFiltro && !lista.length ? '<div class="sep">Nada em ' + DESTINOS[escFiltro][1] + ' por aqui ainda.</div>' : '') +
    comSeparadores(lista, en => '<div class="msg me" data-esc-me="' + esc(en.id) + '"><p>' + esc(en.texto) + '</p><div class="meta">' + (en.editada ? 'editada · ' : '') + fmtHora(new Date(en.t)) + '</div></div>' + respEscHTML(en));
  renderSug('esc'); mostrarFaixaEdicao();
  rolarChat();
}
$('abasEsc').addEventListener('click', e => { const b = e.target.closest('[data-fe]'); if (!b) return; escFiltro = b.dataset.fe; escMover = null; renderEscrever(); });
$('chatEsc').addEventListener('click', async e => {
  const ex = e.target.closest('[data-ex]'); if (ex && !e.target.closest('[data-en]')) { $('entradaEsc').value = ex.dataset.ex; $('entradaEsc').focus(); return; }
  const bol = e.target.closest('[data-en]'); if (!bol) return;
  const en = escrever.find(x => x.id === bol.dataset.en); if (!en) return;
  const b = e.target.closest('[data-ea]');
  if (b) {
    const a = b.dataset.ea;
    if (a === 'mover') { escMover = escMover === en.id ? null : en.id; renderEscrever(); return; }
    if (a === 'finzote' || (a === 'abrir' && en.dest === 'finzote')) { abrirFinZote(en.texto); return; }
    if (a === 'abrir') {
      if (en.dest === 'agenda') { agendaAba = 'prog'; const it = (en.refs || []).map(u => recados.find(x => x.uid === u)).find(x => x?.k === 'ev'); const ev = it && eventos.find(x => x.id === it.id); agendaData = ev ? inicioDoDia(ev.inicio).getTime() : null; abrir('agenda'); }
      if (en.dest === 'fin') abrirFin('chat');
      if (en.dest === 'pes') { pesAba = 'lancar'; abrir('pessoal'); }
      if (en.dest === 'tarefa') { tarefasAba = en.projeto ? 'projetos' : 'tarefas'; abrir('tarefas'); }
      if (en.dest === 'nota') abrir('notas');
      if (en.dest === 'dia') { pesAba = 'meudia'; abrir('pessoal'); }
      return;
    }
    if (a === 'desfazer') { await desfazerEntrada(en); en.desfeito = true; escMover = null; }
    if (a === 'mover-para') {
      if (!en.desfeito) await desfazerEntrada(en);
      delete en.refs; delete en.ref; delete en.projeto; en.desfeito = false; en.dest = b.dataset.para; escMover = null;
      Object.assign(en, await processarComo(en.dest, en.texto));
      await Promise.all([guardar('az-recados', recados), salvarFin(), salvarPes()]);
    }
    if (a === 'tarefa-ver') { abrirTarefa(en.ref); return; }
    if (a === 'tarefa-agendar') { const t = tarefas.find(x => x.id === en.ref); if (t) abrirAgendarTarefa(t); return; }
    if (a === 'tarefa-feita') { const t = tarefas.find(x => x.id === en.ref); if (t) { t.feita = true; t.feitaEm = Date.now(); await salvarTarefas(); await agendarAvisoTarefa(t); } }
    if (a === 'nota-tarefa') {
      const n = notas.find(x => x.id === en.ref); if (!n) return;
      notas = notas.filter(x => x.id !== n.id); await guardar('az-notas', notas);
      en.dest = 'tarefa'; Object.assign(en, await processarTarefa(n.texto).then(r => ({ ref: r.tarefa?.id, projeto: r.projeto })));
    }
    await salvarEscrever(); renderEscrever(); return;
  }
  // botões que pertencem à área (Editar, Desfazer do lançamento, horários sugeridos…)
  if (en.dest === 'agenda') await cliqueRecados(e);
  else if (en.dest === 'fin') await cliqueChatFin(e);
  else if (en.dest === 'pes') await cliquePes(e);
  if (tela === 'escrever') renderEscrever();
});
// ao fechar o teclado a barra volta e a conversa encolhe: mantém a última mensagem à vista
document.addEventListener('focusout', e => { if (e.target.closest?.('.composer')) setTimeout(rolarChat, 160); });
