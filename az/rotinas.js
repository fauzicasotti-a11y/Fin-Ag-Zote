
// =====================================================================
// 1.10 · Rotinas: preferências de horário, agendar tarefas, projetos, revisão da noite,
// planejamento de domingo, retrospectiva do mês, bem-estar e ditar o recado.
// =====================================================================
let projetos = [], tarefasAba = 'tarefas', projSel = null, retroRef = null;
async function salvarProjetos() { await guardar('az-projetos', projetos); }
async function registrarTiposNotif() {
  if (!Notif || typeof Notif.registerActionTypes !== 'function') return;
  try { await Notif.registerActionTypes({ types: [{ id: 'remedio', actions: [{ id: 'tomei', title: 'Tomei' }, { id: 'adiar', title: 'Adiar ' + (config.remAdiar || 15) + ' min' }] }, { id: 'habito', actions: [{ id: 'feito', title: 'Feito' }] }, { id: 'crono', actions: [{ id: 'pausar', title: 'Pausar / continuar' }, { id: 'parar', title: 'Parar', foreground: true }] }, { id: 'conta', actions: [{ id: 'paguei', title: 'Paguei' }, { id: 'adiar', title: 'Adiar 1 dia' }] }, ...tiposNotifHabitos()] }); tiposRemOk = true; tiposCronoOk = true; } catch {}
}

// ----- preferências de horário -----
const minDeHora = h => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
function eventosPreferencia() {
  const p = config.prefs || {}, out = [], base = new Date(Date.now() - 10 * DIA_MS);
  const ev = (id, titulo, hIni, durMin, rep) => ({ id: 'pref-' + id, titulo, inicio: new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(hIni / 60), hIni % 60).getTime(), duracao: durMin, repetir: rep, trabalho: false, protegido: true });
  if (p.almoco !== false && p.almocoIni && p.almocoFim && minDeHora(p.almocoFim) > minDeHora(p.almocoIni)) out.push(ev('almoco', 'Almoço (protegido)', minDeHora(p.almocoIni), minDeHora(p.almocoFim) - minDeHora(p.almocoIni), { tipo: 'diario' }));
  if (p.fdsDepois) { const ini = (config.janelaIni ?? 7) * 60, fim = minDeHora(p.fdsDepois); if (fim > ini) out.push(ev('fds', 'Manhã de fim de semana (protegida)', ini, fim - ini, { tipo: 'semanal', dias: [0, 6] })); }
  if (p.acordar) { const ini = (config.janelaIni ?? 7) * 60, fim = minDeHora(p.acordar); if (fim > ini) out.push(ev('acordar', 'Antes de acordar', ini, fim - ini, { tipo: 'diario' })); }
  if (p.dormir) { const ini = minDeHora(p.dormir) - 30, fim = (config.janelaFim ?? 22) * 60; if (fim > ini) out.push(ev('dormir', 'Hora de dormir', ini, fim - ini, { tipo: 'diario' })); }
  return out;
}
function eventosParaSugestao(extras = []) {
  const pausa = (config.prefs || {}).pausa || 0;
  const evs = [...eventos, ...extras].map(e => pausa && !e.trabalho ? { ...e, inicio: e.inicio - pausa * 60000, duracao: (e.duracao ?? 60) + 2 * pausa, excecoes: e.excecoes ? Object.fromEntries(Object.entries(e.excecoes).map(([k, v]) => [k, v.inicio ? { ...v, inicio: v.inicio - pausa * 60000, duracao: (v.duracao ?? e.duracao ?? 60) + 2 * pausa } : v])) : undefined } : e);
  return [...evs, ...eventosPreferencia()];
}
function sugerirComPreferencias(aPartirDe, dur, quantos, ate, extras = []) { return sugerirHorarios(eventosParaSugestao(extras), aPartirDe, dur, quantos, Date.now(), ate); }
function conflitoPreferencia(ev) {
  if (ev.trabalho) return null;
  const c = conflitosDe(ev, eventosPreferencia());
  return c.length ? c[0] : null;
}

// ----- agendar tarefa nos horários livres -----
let agTarefa = null;
function abrirAgendarTarefa(t) {
  agTarefa = t; $('atTit').textContent = 'Agendar · ' + t.titulo;
  $('atSub').textContent = t.prazo !== null ? 'Horários livres até o prazo (' + fmtPrazo(t.prazo) + '), respeitando suas preferências.' : 'Horários livres nos próximos 7 dias, respeitando suas preferências.';
  $('atDur').value = String(t.duracaoEstimada || 60); $('atDividir').checked = false; listarSugestoesTarefa(); $('agTarOv').hidden = false;
}
function listarSugestoesTarefa() {
  const t = agTarefa, dur = +$('atDur').value, dividir = $('atDividir').checked, parte = dividir ? Math.ceil(dur / 2 / 15) * 15 : dur;
  const ate = t.prazo !== null ? t.prazo + DIA_MS - 1 : Date.now() + 7 * DIA_MS;
  const sug = sugerirComPreferencias(Date.now(), parte, 6, ate);
  let html;
  if (!sug.length) html = '<p class="txt" style="color:var(--muted)">Não achei ' + fmtDuracao(parte) + ' livres antes do prazo. Tente uma duração menor ou dividir em 2 dias.</p>';
  else if (dividir) { const dias = []; for (const s of sug) if (!dias.some(d => chaveDia(d) === chaveDia(s))) dias.push(s); html = dias.length >= 2 ? '<p class="txt">Duas partes de ' + fmtDuracao(parte) + ':</p><button type="button" class="op-sug" data-ts="' + dias[0] + ',' + dias[1] + '">' + rotSug(dias[0], parte) + ' + ' + rotSug(dias[1], parte) + '</button>' : '<p class="txt" style="color:var(--muted)">Não achei dois dias diferentes. Tente sem dividir.</p>'; }
  else html = sug.map(s => '<button type="button" class="op-sug" data-ts="' + s + '">' + rotSug(s, parte) + '</button>').join('');
  $('atLista').innerHTML = html;
}
const rotSug = (s, dur) => { const d = new Date(s); return DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' · ' + fmtHora(d) + '–' + fmtHora(new Date(s + dur * 60000)); };
$('atDur').onchange = listarSugestoesTarefa; $('atDividir').onchange = listarSugestoesTarefa;
$('atCancelar').onclick = () => { $('agTarOv').hidden = true; };
$('agTarOv').addEventListener('click', async e => {
  if (e.target === $('agTarOv')) { $('agTarOv').hidden = true; return; }
  const b = e.target.closest('[data-ts]'); if (!b) return;
  const t = agTarefa, dur = +$('atDur').value, partes = b.dataset.ts.split(',').map(Number), d1 = partes.length > 1 ? Math.ceil(dur / 2 / 15) * 15 : dur;
  t.duracaoEstimada = dur; t.agendados = t.agendados || [];
  for (const [i, ini] of partes.entries()) { const ev = { id: novoId(), titulo: t.titulo + (partes.length > 1 ? ' (' + (i + 1) + '/2)' : ''), inicio: ini, avisoMin: config.avisoPadrao, repetir: null, duracao: d1, trabalho: false, categoria: t.categoria || categorizar(t.titulo), tarefaId: t.id, texto: '', criado: Date.now() }; t.agendados.push(ev.id); await salvarEvento(ev); }
  await salvarTarefas(); $('agTarOv').hidden = true; tarefaSel = null; renderTarefas();
  mostrarDialogo('Tarefa agendada', '<p>“' + esc(t.titulo) + '” entrou na Agenda: ' + partes.map(p => rotSug(p, d1)).join(' e ') + '.</p>');
});

// ----- projetos com etapas (aba em Tarefas) -----
function progressoProj(p) { const n = p.etapas.length, f = p.etapas.filter(e => e.feita).length; return { n, f, pct: n ? f / n * 100 : 0, prox: p.etapas.find(e => !e.feita) || null }; }
function renderProjetos() {
  const box = $('projetosLista');
  if (projSel && projetos.some(p => p.id === projSel)) { renderProjetoDet(); return; } projSel = null;
  let h = '';
  if (!projetos.length) h = '<div class="empty"><b>Nenhum projeto.</b><br>Projetos são objetivos maiores divididos em etapas, como “mudança de casa” ou “TCC”. Escreva embaixo <i>“projeto: mudança até dezembro”</i> ou toque em + Novo projeto.</div>';
  for (const p of projetos.filter(p => !p.arquivado)) { const pr = progressoProj(p), atras = p.prazo && p.prazo < Date.now() && pr.pct < 100;
    h += '<button type="button" class="metac" data-pj="' + esc(p.id) + '"><div class="tp"><b>' + esc(p.nome) + '</b><em class="' + (pr.pct >= 100 ? 'e-ok' : atras ? 'e-atr' : 'e-vence') + '">' + (pr.pct >= 100 ? 'concluído ✓' : atras ? 'atrasado' : Math.round(pr.pct) + '%') + '</em></div><div class="prog"><div style="width:' + pr.pct + '%;background:var(--accent)"></div></div>' +
      '<div class="vals"><span><b>' + pr.f + '</b> de ' + pr.n + ' etapas</span><span>' + (p.prazo ? 'até ' + fmtDMA(p.prazo) : 'sem prazo') + '</span></div>' + (pr.prox ? '<div class="fontes"><span>próxima: ' + esc(pr.prox.titulo) + (pr.prox.prazo ? ' · ' + fmtDM(pr.prox.prazo) : '') + '</span></div>' : '') + '</button>'; }
  box.innerHTML = h + '<div class="actions"><button type="button" class="btn primary" data-pj="novo">+ Novo projeto</button></div>';
}
function renderProjetoDet() {
  const p = projetos.find(x => x.id === projSel), pr = progressoProj(p);
  let h = '<button type="button" class="volta-lista" data-pj="lista">‹ Projetos</button><div style="display:flex;align-items:flex-end;gap:10px"><span class="big">' + Math.round(pr.pct) + '%</span><span style="color:var(--muted);padding-bottom:8px">' + pr.f + ' de ' + pr.n + ' etapas' + (p.prazo ? ' · até ' + fmtDMA(p.prazo) : '') + '</span></div><div class="prog"><div style="width:' + pr.pct + '%;background:var(--accent)"></div></div>';
  h += '<div class="grp">Etapas · toque para marcar</div>' + (p.etapas.length ? p.etapas.map((e, i) => '<div class="tf' + (e.feita ? ' feita' : '') + (e.prazo && !e.feita && e.prazo < inicioDoDia(Date.now()).getTime() ? ' urg' : '') + '" data-et="' + esc(e.id) + '"><button type="button" class="ck' + (e.feita ? ' ok' : '') + '" data-pe2="marcar">' + (e.feita ? '✓' : '') + '</button><div class="tc"><button type="button" class="tc" data-pe2="abrir"><div class="tt">' + (i + 1) + '. ' + esc(e.titulo) + '</div></button>' + (e.prazo ? '<small class="pz">' + fmtPrazo(e.prazo) + '</small>' : '') +
    (etapaSel === e.id ? '<div class="mini"><button type="button" class="btn" data-pe2="subir">↑</button><button type="button" class="btn" data-pe2="descer">↓</button><button type="button" class="btn" data-pe2="tarefa">Virar tarefa</button><button type="button" class="btn danger" data-pe2="apagar">Apagar</button></div>' : '') + '</div></div>').join('') : '<p class="txt" style="color:var(--muted)">Escreva embaixo para adicionar etapas, como <i>“contratar mudança até 15/11”</i>.</p>');
  h += '<div class="actions"><button type="button" class="btn" data-pj="editar">Editar projeto</button></div>';
  $('projetosLista').innerHTML = h;
  $('subTarefas').textContent = p.nome;
}
let etapaSel = null;
$('projetosLista').addEventListener('click', async e => {
  const b2 = e.target.closest('[data-pe2]');
  if (b2) { const p = projetos.find(x => x.id === projSel), el = b2.closest('[data-et]'), et = p?.etapas.find(x => x.id === el?.dataset.et); if (!et) return; const i = p.etapas.indexOf(et), a = b2.dataset.pe2;
    if (a === 'marcar') { et.feita = !et.feita; et.feitaEm = et.feita ? Date.now() : null; }
    if (a === 'abrir') { etapaSel = etapaSel === et.id ? null : et.id; renderProjetoDet(); return; }
    if (a === 'subir' && i > 0) p.etapas.splice(i - 1, 0, p.etapas.splice(i, 1)[0]);
    if (a === 'descer' && i < p.etapas.length - 1) p.etapas.splice(i + 1, 0, p.etapas.splice(i, 1)[0]);
    if (a === 'tarefa') { const t = { id: novoId(), titulo: et.titulo + ' · ' + p.nome, prazo: et.prazo ?? null, categoria: categorizar(et.titulo), feita: false, feitaEm: null, criado: Date.now(), projetoId: p.id, etapaId: et.id, horas: [] }; tarefas.push(t); await salvarTarefas(); await agendarAvisoTarefa(t); mostrarDialogo('Virou tarefa', '<p>“' + esc(t.titulo) + '” está em Tarefas.</p>'); }
    if (a === 'apagar') { if (!b2.classList.contains('armed')) { b2.classList.add('armed'); b2.textContent = 'Apagar?'; return; } p.etapas.splice(i, 1); }
    await salvarProjetos(); renderProjetoDet(); return; }
  const b = e.target.closest('[data-pj]'); if (!b) return; const a = b.dataset.pj;
  if (a === 'lista') { projSel = null; etapaSel = null; renderTarefas(); return; }
  if (a === 'novo' || a === 'editar') { const p = a === 'editar' ? projetos.find(x => x.id === projSel) : null;
    abrirForm(p ? p.nome : 'Novo projeto', [{ k: 'nome', rot: 'Nome', v: p?.nome, ph: 'Ex.: Mudança de casa' }, { k: 'prazo', rot: 'Prazo final', tipo: 'date', v: p?.prazo ? dataInput(p.prazo) : '' }, { k: 'etapas', rot: p ? 'Adicionar etapas (uma por linha ou vírgula)' : 'Etapas (separadas por vírgula)', v: '', ph: 'Ex.: orçamento, contratar, embalar' }],
      async d => { if (!d.nome) return false; const novas = d.etapas.split(/[,\n]+/).map(x => x.trim()).filter(Boolean).map(x => ({ id: novoId(), titulo: x.replace(/^./, c => c.toUpperCase()), feita: false, prazo: null }));
        if (p) { p.nome = d.nome; p.prazo = d.prazo ? lerDataInput(d.prazo, 23) : null; p.etapas.push(...novas); } else { const n = { id: novoId(), nome: d.nome, prazo: d.prazo ? lerDataInput(d.prazo, 23) : null, etapas: novas, criado: Date.now() }; projetos.push(n); projSel = n.id; }
        await salvarProjetos(); renderTarefas(); },
      p ? { excluir: async () => { projetos = projetos.filter(x => x.id !== p.id); projSel = null; await salvarProjetos(); renderTarefas(); } } : {}); return; }
  projSel = a; etapaSel = null; renderTarefas();
});
function novoProjetoOuEtapa(texto) {
  let m;
  if ((m = /^\s*projeto\s*[:\-]\s*(.+)$/i.exec(texto))) { const r = interpretarTarefa(m[1], new Date()); const p = { id: novoId(), nome: r.titulo.replace(/^./, c => c.toUpperCase()), prazo: r.prazo, etapas: [], criado: Date.now() }; projetos.push(p); projSel = p.id; return true; }
  if (projSel) { const p = projetos.find(x => x.id === projSel); if (!p) return false; for (const parte of texto.split(/\s*[;\n]\s*/).filter(Boolean)) { const r = interpretarTarefa(parte, new Date()); p.etapas.push({ id: novoId(), titulo: r.titulo.replace(/^./, c => c.toUpperCase()), feita: false, prazo: r.prazo }); } return true; }
  return false;
}
function renderAbaTarefas() {
  $('abaTar').classList.toggle('on', tarefasAba === 'tarefas'); $('abaProj').classList.toggle('on', tarefasAba === 'projetos'); $('abaHoras').classList.toggle('on', tarefasAba === 'horas');
  $('tarefasLista').hidden = tarefasAba === 'projetos'; $('projetosLista').hidden = tarefasAba !== 'projetos';
  $('entradaTarefa').placeholder = tarefasAba === 'tarefas' ? 'Ex.: pagar IPVA até sexta' : projSel ? 'Nova etapa (ex.: contratar mudança até 15/11)' : 'Ex.: projeto: mudança de casa até dezembro';
  if (tarefasAba === 'projetos') { renderProjetos(); if (!projSel) $('subTarefas').textContent = projetos.length + (projetos.length === 1 ? ' projeto' : ' projetos'); }
}
$('abaTar').onclick = () => { tarefasAba = 'tarefas'; tarefaAberta = null; renderTarefas(); };
$('abaHoras').onclick = () => { tarefasAba = 'horas'; tarefaAberta = null; renderTarefas(); };
$('abaProj').onclick = () => { tarefasAba = 'projetos'; renderTarefas(); };

// ----- revisão da noite -----
function abrirRevisao() { abrir('revisao'); }
function renderRevisao() {
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), am0 = maisDias(hoje0, 1), ch = chaveDia(agora);
  const comp = linhasDaAgenda(hoje0, am0 - 1).filter(e => !e.pulado && !e.trabalho);
  const feitas = tarefas.filter(t => t.feita && t.feitaEm >= hoje0), pend = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo <= hoje0);
  const hab = pes.habitos.filter(x => (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(new Date().getDay())), rem = dosesDoDia(ch);
  const crMin = crono.sessoes.filter(s => s.ini >= hoje0).reduce((t, s) => t + realMin(s), 0), gastos = totais(hoje0, agora).gastos;
  const d = pes.diario.find(x => x.chave === ch) || {};
  let h = '<div class="retro"><small>' + maiuscula(DIAS[new Date().getDay()]) + ', ' + new Date().getDate() + ' de ' + MESES_LONGO[new Date().getMonth()] + '</small><h2>Como foi o dia</h2></div>';
  h += '<div class="g4"><div><b>' + comp.filter(e => e.quando + e.dur * 60000 <= agora).length + '/' + comp.length + '</b><small>compromissos</small></div><div><b class="rec">' + feitas.length + '</b><small>tarefas feitas</small></div><div><b>' + fmtLivre(crMin) + '</b><small>cronometrado</small></div><div><b class="gas">' + fmtBRL(gastos) + '</b><small>gastos de hoje</small></div></div>';
  h += '<div class="grp">Tarefas pendentes · ' + pend.length + '</div>' + (pend.length ? pend.map(t => '<div class="slot"><span class="t gas">' + (difDias(t.prazo) < 0 ? 'atrasada' : 'hoje') + '</span><span class="d">' + esc(t.titulo) + '</span></div>').join('') + '<div class="actions"><button type="button" class="btn primary" data-rv="mover">Mover tudo para amanhã</button></div>' : '<p class="txt rec">Nada pendente ✓</p>');
  if (hab.length) h += '<div class="grp">Hábitos de hoje</div>' + hab.map(x => '<div class="hab mini-h" data-hab="' + esc(x.id) + '"><button type="button" class="ck' + (feitoHab(x, ch) ? ' ok' : '') + '" data-rv="hab">' + (feitoHab(x, ch) ? '✓' : '') + '</button><span>' + esc((x.emoji || '') + ' ' + x.nome) + '</span></div>').join('');
  const remP = rem.filter(x => !x.dose);
  if (remP.length) h += '<div class="grp">Remédios não marcados</div>' + remP.map(x => '<div class="slot rem"><span class="t am">' + x.h + '</span><span class="d">' + esc(x.r.nome) + '</span><button type="button" class="btn" data-rv="rem" data-id="' + esc(x.r.id) + '" data-h="' + x.h + '">Tomei</button></div>').join('');
  h += '<div class="grp">Energia e humor</div><div class="notas5" data-campo="energia">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (d.energia === n ? 'on' : '') + '">⚡' + n + '</button>').join('') + '</div><div class="notas5" data-campo="humor" style="margin-top:6px">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (d.humor === n ? 'on' : '') + '">' + HUMOR[n] + '</button>').join('') + '</div>';
  // amanhã
  const amanha = linhasDaAgenda(am0, maisDias(am0, 1) - 1).filter(e => !e.pulado);
  const contasAm = todasOcorrencias(am0, maisDias(am0, 1) - 1).filter(o => !o.paga), tarAm = tarefas.filter(t => !t.feita && t.prazo !== null && inicioDoDia(t.prazo).getTime() === am0);
  const info = livreNoDia(intervalosNoPeriodo(eventos, am0, maisDias(am0, 1)), new Date(am0));
  h += '<div class="grp">Amanhã · ' + fmtLivre(info.livreMin) + ' livres</div>' + (amanha.length ? amanha.slice(0, 6).map(e => '<div class="slot' + (e.trabalho ? ' trab' : '') + '"><span class="t">' + fmtHora(new Date(e.quando)) + '</span><span class="d">' + esc(e.titulo) + '</span></div>').join('') : '<p class="txt" style="color:var(--muted)">Nada marcado.</p>') +
    contasAm.map(o => '<div class="slot"><span class="t gas">' + fmtBRL(o.ag.valor) + '</span><span class="d">' + esc(o.ag.titulo) + ' vence</span></div>').join('') + tarAm.map(t => '<div class="slot"><span class="t am">tarefa</span><span class="d">' + esc(t.titulo) + '</span></div>').join('');
  $('revisaoCorpo').innerHTML = h;
}
let revRasc = {};
$('revisaoCorpo').addEventListener('click', async e => {
  const n = e.target.closest('.notas5 button'); if (n) { const c = n.parentElement.dataset.campo; n.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === n)); revRasc[c] = +n.dataset.n; salvarDiario(revRasc.energia, revRasc.humor); await salvarPes(); return; }
  const b = e.target.closest('[data-rv]'); if (!b) return;
  if (b.dataset.rv === 'mover') { const am = maisDias(inicioDoDia(Date.now()).getTime(), 1); for (const t of tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo <= inicioDoDia(Date.now()).getTime())) { t.prazo = am; t.adiada = (t.adiada || 0) + 1; await agendarAvisoTarefa(t); } await salvarTarefas(); }
  if (b.dataset.rv === 'hab') { const x = pes.habitos.find(h => h.id === b.closest('[data-hab]').dataset.hab); if (x) { tocarHabito(x); await salvarPes(); } }
  if (b.dataset.rv === 'rem') { const r = pes.remedios.find(x => x.id === b.dataset.id); if (r) { registrarDose(r, Date.now(), b.dataset.h); await salvarPes(); agendarAvisosPessoalDepois(); } }
  renderRevisao();
});

// ----- planejamento de domingo -----
let plano = null;
function abrirPlano() { plano = null; abrir('plano'); }
function proximaSemana() { const hoje = new Date(); const dSeg = hoje.getDay() === 1 && hoje.getHours() < 12 ? 0 : ((8 - hoje.getDay()) % 7 || 7); const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dSeg).getTime(); return [ini, maisDias(ini, 7) - 1]; }
function montarPlano() {
  const [ini, fim] = proximaSemana(), sug = [], extras = [];
  const add = (titulo, dur, categoria, motivo, ate = fim, de = ini, extra = {}) => {
    const t = sugerirComPreferencias(Math.max(de, Date.now()), dur, 1, ate, extras)[0]; if (!t) return;
    const ev = { id: novoId(), titulo, inicio: t, duracao: dur, repetir: null, trabalho: false, categoria, avisoMin: config.avisoPadrao, texto: '', criado: Date.now(), plano: true, ...extra };
    extras.push(ev); sug.push({ ev, motivo, on: true });
  };
  for (const t of tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo >= ini && t.prazo <= fim && !(t.agendados || []).some(id => eventos.some(e => e.id === id)))) add(t.titulo, t.duracaoEstimada || 60, t.categoria || 'pessoal', 'tarefa com prazo ' + fmtPrazo(t.prazo), t.prazo + DIA_MS - 1, ini, { tarefaId: t.id });
  for (const m of pes.materias.filter(m => m.metaMin)) { const ja = linhasDaAgenda(ini, fim).filter(e => !e.pulado && finTxt(e.titulo).includes(finTxt(m.nome))).reduce((s, e) => s + e.dur, 0); let falta = m.metaMin - ja; let n = 0; while (falta > 20 && n < 4) { const d = Math.min(90, Math.max(30, Math.round(falta / Math.max(1, Math.ceil(falta / 90)) / 15) * 15)); add('Estudar ' + m.nome, d, 'estudo', 'meta de ' + fmtLivre(m.metaMin) + ' na semana', fim, maisDias(ini, n * 2)); falta -= d; n++; } }
  const metaT = config.treinosSemana || 0, jaT = linhasDaAgenda(ini, fim).filter(e => !e.pulado && /academia|treino|musculacao|corrida|correr/.test(finTxt(e.titulo))).length;
  for (let k = 0; k < Math.max(0, metaT - jaT) && pes.treinos.length + pes.corridas.length > 0; k++) add('Academia', 60, 'saude', 'meta de ' + metaT + ' treinos por semana', fim, maisDias(ini, Math.floor(k * 7 / Math.max(1, metaT))));
  for (const [cat, horasMeta] of Object.entries(config.metas || {})) { if (cat === 'estudo' && pes.materias.some(m => m.metaMin)) continue; const ja = linhasDaAgenda(ini, fim).filter(e => !e.pulado && (e.categoria || categorizar(e.titulo, e.trabalho)) === cat).reduce((s, e) => s + e.dur, 0) + extras.filter(e => e.categoria === cat).reduce((s, e) => s + e.duracao, 0); let falta = horasMeta * 60 - ja, n = 0; while (falta > 20 && n < 3) { const d = Math.min(120, Math.max(30, Math.round(falta / 15) * 15)); add(categoriaPorId(cat).nome, d, cat, 'meta de ' + horasMeta + 'h de ' + categoriaPorId(cat).nome + ' na semana', fim, maisDias(ini, n * 2)); falta -= d; n++; } }
  return { ini, fim, sug };
}
function renderPlano() {
  if (!plano) plano = montarPlano();
  const { ini, fim, sug } = plano, sem = linhasDaAgenda(ini, fim).filter(e => !e.pulado);
  let apertados = 0; for (let k = 0; k < 7; k++) { const d = new Date(maisDias(ini, k)); if (livreNoDia(intervalosNoPeriodo(eventos, d.getTime(), d.getTime() + DIA_MS), d).livreMin < 120) apertados++; }
  const contas = todasOcorrencias(ini, fim).filter(o => !o.paga), provas = pes.provas.filter(p => p.data >= ini && p.data <= maisDias(fim, 14)), tarSem = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo >= ini && t.prazo <= fim);
  const fimD = new Date(fim);
  let h = bolhaHTML('app', '<p>Vamos montar a semana de <b>' + new Date(ini).getDate() + ' a ' + fimD.getDate() + ' de ' + MESES_LONGO[fimD.getMonth()] + '</b>.</p><dl class="ticket"><dt>Agenda</dt><dd>' + new Set(sem.filter(e => !e.trabalho).map(e => e.id + e.quando)).size + ' compromissos · ' + apertados + (apertados === 1 ? ' dia apertado' : ' dias apertados') + '</dd>' +
    '<dt>Tarefas</dt><dd>' + tarSem.length + ' com prazo na semana</dd><dt>Contas</dt><dd>' + contas.length + ' · ' + fmtBRL(contas.filter(o => o.ag.tipo === 'pagar').reduce((s, o) => s + o.ag.valor, 0)) + '</dd>' + (provas.length ? '<dt>Provas</dt><dd>' + provas.map(p => esc(p.titulo) + ' ' + fmtDM(p.data)).join(', ') + '</dd>' : '') + '</dl>', null);
  const metasTxt = [...pes.materias.filter(m => m.metaMin).map(m => esc(m.nome) + ' ' + fmtLivre(m.metaMin)), ...(config.treinosSemana ? [config.treinosSemana + ' treinos'] : []), ...Object.entries(config.metas || {}).map(([c, hh]) => categoriaPorId(c).nome + ' ' + hh + 'h')];
  if (metasTxt.length) h += bolhaHTML('app', '<p><b>Suas metas da semana:</b> ' + metasTxt.join(' · ') + '.</p>', null);
  if (sug.length) {
    h += bolhaHTML('app', '<p>Encontrei horários livres para encaixar tudo, respeitando suas preferências. Desmarque o que não quiser:</p>' + sug.map((s, i) => { const d = new Date(s.ev.inicio); return '<label class="plano-it"><input type="checkbox" data-pi="' + i + '"' + (s.on ? ' checked' : '') + '><span><b>' + DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + ' · ' + fmtHora(d) + '–' + fmtHora(new Date(s.ev.inicio + s.ev.duracao * 60000)) + '</b> ' + esc(s.ev.titulo) + '<small>' + esc(s.motivo) + '</small></span></label>'; }).join('') +
      '<div class="actions"><button type="button" class="btn primary" data-pl2="tudo">Aceitar tudo</button><button type="button" class="btn" data-pl2="marcados">Aceitar marcados</button><button type="button" class="btn" data-pl2="refazer">Sugerir de novo</button></div>', null);
  } else h += bolhaHTML('app', '<p>Não há nada para encaixar: sem tarefas com prazo sem horário e metas já cobertas pela agenda. 👍</p><p class="dica">Defina metas por categoria no Resumo da semana, metas de estudo em Pessoal › Estudos e treinos por semana em Configurações › Pessoal.</p>', null);
  if (plano.feito) h += bolhaHTML('app', '<p>✓ ' + plano.feito + ' na agenda. Boa semana!</p><div class="actions"><button type="button" class="btn" data-pl2="agenda">Ver a agenda</button></div>', null);
  $('planoCorpo').innerHTML = h;
}
$('planoCorpo').addEventListener('change', e => { const c = e.target.closest('[data-pi]'); if (c && plano) plano.sug[+c.dataset.pi].on = c.checked; });
$('planoCorpo').addEventListener('click', async e => {
  const b = e.target.closest('[data-pl2]'); if (!b) return; const a = b.dataset.pl2;
  if (a === 'agenda') { agendaAba = 'prog'; agendaData = null; abrir('agenda'); return; }
  if (a === 'refazer') { plano = null; renderPlano(); return; }
  const escolhidos = plano.sug.filter(s => a === 'tudo' || s.on);
  for (const s of escolhidos) { await salvarEvento(s.ev); if (s.ev.tarefaId) { const t = tarefas.find(x => x.id === s.ev.tarefaId); if (t) { t.agendados = [...(t.agendados || []), s.ev.id]; } } }
  await salvarTarefas();
  const n = escolhidos.length; plano = { ...plano, sug: [], feito: n + (n === 1 ? ' horário entrou' : ' horários entraram') }; renderPlano();
});

// ----- retrospectiva do mês -----
function abrirRetro(ref) { const h = new Date(); retroRef = ref || new Date(h.getFullYear(), h.getMonth() - (h.getDate() <= 7 ? 1 : 0), 1).getTime(); abrir('retro'); }
function numerosMes(ini) {
  const d = new Date(ini), fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1, t = totais(ini, fim);
  const estudo = crono.sessoes.filter(s => s.ini >= ini && s.ini <= fim && (s.materiaId || s.categoria === 'estudo')).reduce((a, s) => a + realMin(s), 0);
  const cron = crono.sessoes.filter(s => s.ini >= ini && s.ini <= fim), cronMin = cron.reduce((a, s) => a + realMin(s), 0), plan = cron.filter(s => s.planIni), pr = plan.reduce((a, s) => a + realMin(s), 0), pp = plan.reduce((a, s) => a + planMin(s), 0);
  const tarT = tarefas.filter(x => (x.prazo !== null && x.prazo >= ini && x.prazo <= fim) || (x.feita && x.feitaEm >= ini && x.feitaEm <= fim));
  const diar = pes.diario.filter(x => { const tt = new Date(x.chave + 'T12:00').getTime(); return tt >= ini && tt <= fim; }), hum = diar.map(x => x.humor).filter(Boolean);
  return { ini, fim, estudo, treinos: treinosEntre(ini, fim), paginas: paginasEntre(ini, fim), livros: pes.livros.filter(l => l.status === 'lido' && l.fim >= ini && l.fim <= fim).length, remedios: emDia(ini, fim),
    guardado: t.guardado, gastos: t.gastos, receitas: t.receitas, cronMin, pctPlano: pp ? pr / pp : null, tarefas: [tarT.filter(x => x.feita).length, tarT.length], humor: hum.length ? hum.reduce((a, b) => a + b, 0) / hum.length : null,
    compromissos: new Set(linhasDaAgenda(ini, fim).filter(e => !e.pulado && !e.trabalho).map(e => e.id + e.quando)).size, cats: t.porCat };
}
function renderRetro() {
  const d = new Date(retroRef), ant = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), a = numerosMes(retroRef), b = numerosMes(ant);
  $('subRetro').textContent = MESES_LONGO[d.getMonth()] + ' de ' + d.getFullYear() + ' · comparado com ' + MESES_LONGO[new Date(ant).getMonth()];
  const var_ = (x, y, menorMelhor = false, fmt = v => v) => { if (y === null || x === null || y === undefined) return ''; const dif = x - y; if (Math.abs(dif) < 0.0001) return '<em>= ' + MESES_N[new Date(ant).getMonth()] + '</em>'; const bom = menorMelhor ? dif < 0 : dif > 0; return '<em class="' + (bom ? 'rec' : 'gas') + '">' + (dif > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(dif)) + '</em>'; };
  const pct = v => v === null ? '—' : Math.round(v * 100) + '%';
  let h = '<div class="retro"><small>' + MESES_LONGO[d.getMonth()].toUpperCase() + ' DE ' + d.getFullYear() + '</small><h2>Seu mês em números</h2><small>comparado com ' + MESES_LONGO[new Date(ant).getMonth()] + '</small></div>';
  h += '<div class="g4">' + [
    [fmtLivre(a.estudo), 'estudadas', '', var_(a.estudo, b.estudo, false, v => fmtLivre(v))], [a.treinos, 'treinos', '', var_(a.treinos, b.treinos)],
    [a.livros ? a.livros + (a.livros === 1 ? ' livro' : ' livros') : a.paginas + ' pág.', a.livros ? '+ ' + a.paginas + ' páginas lidas' : 'páginas lidas', '', var_(a.paginas, b.paginas, false, v => v + ' pág.')], [pct(a.remedios), 'remédios em dia', 'rec', a.remedios !== null && b.remedios !== null ? var_(a.remedios, b.remedios, false, v => Math.round(v * 100) + '%') : ''],
    [fmtBRL(a.guardado), 'guardado', 'inv', var_(a.guardado, b.guardado, false, fmtBRL)], [fmtBRL(a.gastos), 'gastos', 'gas', var_(a.gastos, b.gastos, true, fmtBRL)],
    [fmtLivre(a.cronMin), 'cronometradas' + (a.pctPlano !== null ? ' · ' + pct(a.pctPlano) + ' do plano' : ''), '', var_(a.cronMin, b.cronMin, false, v => fmtLivre(v))], [a.tarefas[0] + '/' + a.tarefas[1], 'tarefas feitas', '', ''],
    [a.humor !== null ? HUMOR[Math.round(a.humor)] + ' ' + a.humor.toFixed(1).replace('.', ',') : '—', 'humor médio', '', a.humor !== null && b.humor !== null ? var_(a.humor, b.humor, false, v => v.toFixed(1).replace('.', ',')) : ''], [a.compromissos, 'compromissos', '', var_(a.compromissos, b.compromissos)],
  ].map(([v, l, c, e]) => '<div><b class="' + c + '">' + v + '</b><small>' + l + '</small>' + e + '</div>').join('') + '</div>';
  // destaques
  const dest = [];
  const rec = {}; for (const t of pes.treinos.filter(t => t.t < a.ini)) for (const e of t.exercicios) rec[finTxt(e.nome)] = Math.max(rec[finTxt(e.nome)] || 0, e.carga);
  for (const t of pes.treinos.filter(t => t.t >= a.ini && t.t <= a.fim)) for (const e of t.exercicios) if (e.carga && e.carga > (rec[finTxt(e.nome)] || 0) && rec[finTxt(e.nome)] !== undefined) { dest.push(['🏆', 'Recorde em ' + e.nome + ': ' + String(e.carga).replace('.', ',') + ' kg', '+' + String(Math.round((e.carga - rec[finTxt(e.nome)]) * 10) / 10).replace('.', ',') + ' kg']); rec[finTxt(e.nome)] = e.carga; }
  const hmax = pes.habitos.map(x => ({ x, s: sequenciaHabito(x) })).sort((p, q) => q.s - p.s)[0]; if (hmax && hmax.s >= 5) dest.push(['🔥', hmax.s + ' dias seguidos de ' + hmax.x.nome, 'sequência atual']);
  const porDia = {}; for (const s of crono.sessoes.filter(s => s.ini >= a.ini && s.ini <= a.fim)) porDia[chaveDia(s.ini)] = (porDia[chaveDia(s.ini)] || 0) + realMin(s); for (const t of tarefas.filter(t => t.feita && t.feitaEm >= a.ini && t.feitaEm <= a.fim)) porDia[chaveDia(t.feitaEm)] = (porDia[chaveDia(t.feitaEm)] || 0) + 30;
  const melhor = Object.entries(porDia).sort((p, q) => q[1] - p[1])[0]; if (melhor) { const dd = new Date(melhor[0] + 'T12:00'); dest.push(['⭐', 'Dia mais produtivo: ' + DIAS[dd.getDay()] + ', ' + dd.getDate(), fmtLivre(crono.sessoes.filter(s => chaveDia(s.ini) === melhor[0]).reduce((x, s) => x + realMin(s), 0)) + ' cronometradas']); }
  const metasOk = (fin.metas || []).filter(m => guardadoMeta(m) >= m.alvo); for (const m of metasOk.slice(0, 2)) dest.push(['🎯', 'Meta concluída: ' + m.nome, fmtBRL(m.alvo)]);
  if (dest.length) h += '<div class="grp">Destaques</div>' + dest.slice(0, 5).map(([i, t, s]) => '<div class="dest"><span>' + i + '</span><div><b>' + esc(t) + '</b><small>' + esc(s) + '</small></div></div>').join('');
  // comparação
  const cmp = [['Estudo', a.estudo, b.estudo, '#5fd39b', v => fmtLivre(v)], ['Treinos', a.treinos, b.treinos, '#ff8fb8', v => v], ['Páginas lidas', a.paginas, b.paginas, '#c3a6ff', v => v], ['Gastos', a.gastos, b.gastos, '#ff6b6b', fmtBRL], ['Guardado', a.guardado, b.guardado, '#5fa8ff', fmtBRL]].filter(x => x[1] || x[2]);
  if (cmp.length) h += '<div class="grp">' + maiuscula(MESES_LONGO[d.getMonth()]) + ' × ' + MESES_LONGO[new Date(ant).getMonth()] + '</div>' + cmp.map(([n, x, y, c, f]) => { const mx = Math.max(x, y, 1); return '<div class="cmp"><div class="bl"><span>' + n + '</span><small>' + f(x) + ' × ' + f(y) + '</small></div><div class="bb"><div style="width:' + x / mx * 100 + '%;background:' + c + '"></div><div style="width:' + y / mx * 100 + '%;background:#3a3f52"></div></div></div>'; }).join('');
  // metas
  const ms = [...(fin.metas || []).map(m => [m.nome, statsMeta(m).status]), ...pes.metas.map(m => [m.nome, progressoMeta(m).st[0]])];
  if (ms.length) h += '<div class="grp">Metas no fim do mês</div>' + ms.slice(0, 6).map(([n, s]) => '<div class="slot"><span class="t ' + (/atras/.test(s) ? 'gas' : 'rec') + '">' + esc(s) + '</span><span class="d">' + esc(n) + '</span></div>').join('');
  // sugestões
  const sug = [];
  for (const m of pes.materias.filter(m => m.metaMin)) { const semanas = 4.3, feito = minEstudo(m, a.ini, a.fim), alvo = m.metaMin * semanas; if (feito < alvo * 0.75) sug.push(['r', esc(m.nome) + ' ficou ' + Math.round((1 - feito / alvo) * 100) + '% abaixo da meta. Use o planejamento de domingo para reservar horários.']); }
  for (const r of pes.remedios) { const dd = diasEstoque(r); if (dd !== null && dd <= 14) sug.push(['a', esc(r.nome) + ' acaba em ' + dd + ' dias.']); }
  for (const p of pes.provas.filter(p => p.data > Date.now() && p.data < Date.now() + 40 * DIA_MS)) sug.push(['a', esc(p.titulo) + ' em ' + fmtDM(p.data) + '.']);
  if (a.gastos > b.gastos * 1.15 && b.gastos) { const top = Object.entries(a.cats).sort((p, q) => q[1] - p[1])[0]; sug.push(['r', 'Gastos ' + Math.round((a.gastos / b.gastos - 1) * 100) + '% maiores que no mês anterior' + (top ? ', puxados por ' + categoriaPorId(top[0]).nome : '') + '.']); }
  if (sug.length) h += '<div class="grp">Para ' + MESES_LONGO[new Date(d.getFullYear(), d.getMonth() + 1, 1).getMonth()] + '</div>' + sug.map(([c, t]) => '<div class="aviso ' + c + '">' + t + '</div>').join('');
  h += '<div class="actions" style="margin-top:12px"><button type="button" class="btn primary" data-rt="compartilhar">Compartilhar imagem</button><button type="button" class="btn" data-rt="ant">‹ Mês anterior</button>' + (retroRef < new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() ? '<button type="button" class="btn" data-rt="prox">Próximo ›</button>' : '') + '</div>';
  $('retroCorpo').innerHTML = h; retroNums = a;
}
let retroNums = null;
$('retroCorpo').addEventListener('click', async e => {
  const b = e.target.closest('[data-rt]'); if (!b) return; const d = new Date(retroRef);
  if (b.dataset.rt === 'ant') { retroRef = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); renderRetro(); $('retroCorpo').scrollTop = 0; }
  if (b.dataset.rt === 'prox') { retroRef = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); renderRetro(); $('retroCorpo').scrollTop = 0; }
  if (b.dataset.rt === 'compartilhar') await compartilharRetro();
});
async function compartilharRetro() {
  const a = retroNums, d = new Date(retroRef), cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1080, 1350); grad.addColorStop(0, '#2a2140'); grad.addColorStop(0.55, '#14161f'); g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#ffb627'; g.font = '900 64px "Inter Display", Inter, sans-serif'; g.fillText('AZote.', 80, 130);
  g.fillStyle = '#9a9cae'; g.font = '600 36px Inter, sans-serif'; g.fillText(MESES_LONGO[d.getMonth()].toUpperCase() + ' DE ' + d.getFullYear(), 80, 200);
  g.fillStyle = '#ecebf2'; g.font = '900 76px "Inter Display", Inter, sans-serif'; g.fillText('Meu mês em números', 80, 290);
  const itens = [[fmtLivre(a.estudo), 'estudadas', '#5fd39b'], [String(a.treinos), 'treinos', '#ff8fb8'], [a.paginas + ' pág.', 'lidas', '#c3a6ff'], [a.remedios === null ? '—' : Math.round(a.remedios * 100) + '%', 'remédios em dia', '#7fe0ad'], [fmtBRL(a.guardado), 'guardado', '#5fa8ff'], [fmtLivre(a.cronMin), 'cronometradas', '#ffb627'], [a.tarefas[0] + '/' + a.tarefas[1], 'tarefas feitas', '#ecebf2'], [a.humor !== null ? a.humor.toFixed(1).replace('.', ',') : '—', 'humor médio', '#ffd770']];
  itens.forEach(([v, l, c], i) => { const x = 80 + (i % 2) * 470, y = 380 + Math.floor(i / 2) * 220; g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, 440, 190, 28) : g.rect(x, y, 440, 190); g.fill(); g.fillStyle = c; g.font = '900 68px "Inter Display", Inter, sans-serif'; g.fillText(v, x + 34, y + 100); g.fillStyle = '#9a9cae'; g.font = '500 32px Inter, sans-serif'; g.fillText(l, x + 34, y + 150); });
  g.fillStyle = '#5b5f73'; g.font = '500 28px Inter, sans-serif'; g.fillText('feito com o AZote', 80, 1290);
  const dataUrl = cv.toDataURL('image/png'), nome = 'azote-retrospectiva-' + (d.getMonth() + 1) + '-' + d.getFullYear() + '.png';
  try {
    if (Arquivos && Compartilhar) { const r = await Arquivos.writeFile({ path: nome, data: dataUrl.split(',')[1], directory: 'CACHE' }); await Compartilhar.share({ title: 'Minha retrospectiva', files: [r.uri], dialogTitle: 'Compartilhar com…' }); }
    else { const l = document.createElement('a'); l.href = dataUrl; l.download = nome; l.click(); }
  } catch {}
}

// ----- Resumo da semana › Bem-estar -----
function renderResumoBem() {
  const ini = resumoRef, fim = maisDias(ini, 7) - 1, box = $('resumoBem');
  const doPer = pes.diario.filter(x => { const t = new Date(x.chave + 'T12:00').getTime(); return t >= ini && t <= fim; });
  const todos = pes.diario.filter(x => x.humor || x.energia);
  if (!todos.length) { box.innerHTML = '<div class="empty"><b>Sem registros de energia e humor.</b><br>Responda na revisão da noite, em Pessoal › Diário ou escreva <i>“energia 4 humor 3”</i> em Pessoal. Aqui aparece o cruzamento com a sua agenda.</div>'; return; }
  const med = (l, k) => { const v = l.map(x => x[k]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const f1 = v => v === null ? '—' : v.toFixed(1).replace('.', ',');
  let h = '<div class="kp"><div><b>⚡ ' + f1(med(doPer, 'energia')) + '</b><small>energia média</small></div><div><b>' + (med(doPer, 'humor') ? HUMOR[Math.round(med(doPer, 'humor'))] + ' ' + f1(med(doPer, 'humor')) : '—') + '</b><small>humor médio</small></div><div><b>' + doPer.length + '/7</b><small>dias registrados</small></div></div>';
  h += '<div class="grp">Semana</div><div class="barras7">' + [0, 1, 2, 3, 4, 5, 6].map(k => { const t = maisDias(ini, k), x = pes.diario.find(y => y.chave === chaveDia(t)); return '<div><span class="vv">' + (x?.humor ? HUMOR[x.humor] : '') + '</span><i style="height:' + (x?.energia ? x.energia * 20 : 2) + '%;background:#ffd770"></i><small>' + DIAS_CURTO[new Date(t).getDay()] + '</small></div>'; }).join('') + '</div><div class="leg"><span>barra = energia · emoji = humor</span></div>';
  const comInfo = todos.map(x => { const t = new Date(x.chave + 'T12:00'), d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return { ...x, livre: livreNoDia(intervalosNoPeriodo(eventos, d0.getTime(), d0.getTime() + DIA_MS), d0).livreMin, treino: treinosEntre(d0.getTime(), d0.getTime() + DIA_MS - 1) > 0, estudo: crono.sessoes.some(s => chaveDia(s.ini) === x.chave && (s.materiaId || s.categoria === 'estudo')), sono: null }; });
  const linhas = [];
  const cruza = (filtro, rotA, rotB) => { const A = comInfo.filter(filtro), B = comInfo.filter(x => !filtro(x)); const ha = med(A, 'humor'), hb = med(B, 'humor'); if (A.length >= 2 && B.length >= 2 && ha !== null && hb !== null) linhas.push([rotA + ': humor ' + f1(ha), rotB + ': ' + f1(hb), ha - hb]); };
  cruza(x => x.livre < 240, 'Dias com menos de 4h livres', 'nos outros');
  cruza(x => x.treino, 'Dias com treino', 'sem treino');
  cruza(x => x.estudo, 'Dias com estudo', 'sem estudo');
  h += '<div class="grp">Cruzando com a agenda</div>' + (linhas.length ? linhas.map(([a, b, d]) => '<div class="slot"><span class="t ' + (d >= 0 ? 'rec' : 'gas') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + f1(Math.abs(d)) + '</span><span class="d">' + a + ' · ' + b + '</span></div>').join('') : '<p class="txt" style="color:var(--muted)">Registre pelo menos 2 semanas para ver os cruzamentos.</p>');
  box.innerHTML = h;
}

// ----- avisos das rotinas -----
async function agendarRotinas() {
  if (!Notif) return;
  const ids = []; for (let k = 0; k < 14; k++) ids.push({ id: idNumerico('rotina#rev#' + k) }); for (let k = 0; k < 3; k++) { ids.push({ id: idNumerico('rotina#dom#' + k) }); ids.push({ id: idNumerico('rotina#retro#' + k) }); }
  try { await Notif.cancel({ notifications: ids }); } catch {}
  if (!permissaoOk) return;
  const agora = new Date(), lista = [];
  if (config.revisaoHora) { const [hh, mm] = config.revisaoHora.split(':').map(Number); for (let k = 0; k < 14; k++) { const at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k, hh, mm); if (at > agora) lista.push({ id: idNumerico('rotina#rev#' + k), title: '🌙 Revisão da noite', body: 'Veja o que ficou pendente, marque hábitos e prepare amanhã.', schedule: { at, allowWhileIdle: true }, extra: { rotina: 'revisao' } }); } }
  if (config.domingoHora) { const [hh, mm] = config.domingoHora.split(':').map(Number); for (let k = 0; k < 3; k++) { const n = (7 - agora.getDay()) % 7 + k * 7, at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + n, hh, mm); if (at > agora) lista.push({ id: idNumerico('rotina#dom#' + k), title: '🗓️ Planejamento da semana', body: 'Vamos encaixar tarefas, estudos e treinos nos horários livres?', schedule: { at, allowWhileIdle: true }, extra: { rotina: 'plano' } }); } }
  if (config.retroAviso !== false) for (let k = 1; k <= 3; k++) { const at = new Date(agora.getFullYear(), agora.getMonth() + k, 1, 9, 0); lista.push({ id: idNumerico('rotina#retro#' + (k - 1)), title: '📊 Sua retrospectiva de ' + MESES_LONGO[new Date(agora.getFullYear(), agora.getMonth() + k - 1, 1).getMonth()], body: 'Seu mês em números: estudo, treinos, leitura, finanças e mais.', schedule: { at, allowWhileIdle: true }, extra: { rotina: 'retro' } }); }
  try { if (lista.length) await agendarNotif(lista); } catch {}
}

// ----- ditar o recado (microfone) -----
const Voz = Cap?.Plugins?.SpeechRecognition || null;
async function ditar(campo) {
  const alvo = $(campo);
  if (Voz) {
    try {
      const disp = await Voz.available(); if (!disp?.available) throw new Error('indisponível');
      let p = await Voz.checkPermissions?.(); if (p?.speechRecognition !== 'granted') p = await Voz.requestPermissions();
      if (p && p.speechRecognition && p.speechRecognition !== 'granted') { mostrarDialogo('Microfone bloqueado', '<p>Permita o microfone para o AZote em <b>Configurações do Android → Apps → AZote → Permissões</b>.</p>'); return; }
      const r = await Voz.start({ language: 'pt-BR', maxResults: 1, prompt: 'Fale a mensagem', partialResults: false, popup: true });
      const txt = r?.matches?.[0]; if (txt) { alvo.value = (alvo.value ? alvo.value + ' ' : '') + txt; alvo.focus(); }
      return;
    } catch (err) { if (!/cancel|no match|no_match|7|11/i.test(String(err?.message || err))) mostrarDialogo('Não deu para ouvir', '<p>' + esc(String(err?.message || err)) + '</p><p class="dica">Dica: o microfone do teclado do celular também funciona.</p>'); return; }
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) { const rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = false; rec.onresult = ev => { const txt = ev.results[0][0].transcript; alvo.value = (alvo.value ? alvo.value + ' ' : '') + txt; alvo.focus(); }; rec.onerror = () => {}; rec.start(); return; }
  mostrarDialogo('Ditar', '<p>Toque no campo de texto e use o <b>microfone do teclado</b> do celular para ditar.</p>');
  alvo.focus();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-mic]'); if (b) { e.preventDefault(); ditar(b.dataset.mic); } });
