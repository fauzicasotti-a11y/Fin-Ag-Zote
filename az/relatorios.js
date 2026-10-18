
// =====================================================================
// 1.14 · Relatórios: automáticos, resumo da manhã montável e relatórios personalizados
// =====================================================================
const BLOCOS_RESUMO = { comp: ['📅', 'Compromissos de hoje', 'até 3, com horário'], livre: ['⏳', 'Horas livres', 'fora do trabalho'], contas: ['💳', 'Contas e faturas', 'que vencem hoje e amanhã'], remedios: ['💊', 'Remédios do dia', 'horários'], tarefas: ['✅', 'Tarefas com prazo', 'hoje e atrasadas'], orc: ['💸', 'Posso gastar', 'valor do dia'], habitos: ['🔥', 'Hábitos', 'quantos para hoje'], estudo: ['📚', 'Meta de estudo', 'quanto falta na semana'], saldo: ['💰', 'Saldo das contas', 'aparece como R$ •••• se escondido'] };
function blocosResumo() { const L = (config.resumoBlocos || CFG_PADRAO.resumoBlocos).filter(b => BLOCOS_RESUMO[b[0]]); for (const k of Object.keys(BLOCOS_RESUMO)) if (!L.some(b => b[0] === k)) L.push([k, false]); return L; }
// resumo da manhã (notificação), montado com os blocos escolhidos
function textoResumo(dia) {
  const ini = dia.getTime(), fim = ini + 86400000, ch = chaveDia(ini);
  const iv = intervalosNoPeriodo(eventos, ini, fim).filter(i => i.ini >= ini && i.ini < fim || i.ev.trabalho);
  const info = livreNoDia(iv, dia), outros = iv.filter(i => !i.ev.trabalho && i.ini >= ini), trab = iv.find(i => i.ev.trabalho);
  const partes = {}, det = config.resumoFormato === 'detalhado';
  partes.comp = outros.length ? outros.slice(0, det ? 6 : 3).map(i => fmtHora(new Date(i.ini)) + ' ' + i.ev.titulo).join(' · ') + (outros.length > (det ? 6 : 3) ? ' · +' + (outros.length - (det ? 6 : 3)) : '') : trab ? trab.ev.titulo + ' ' + fmtHora(new Date(trab.ini)) + '–' + fmtHora(new Date(trab.fim)) : 'nada marcado';
  partes.livre = fmtLivre(info.livreMin) + ' livres' + (info.trabalhoMin ? ' fora do trabalho' : '');
  const cs = todasOcorrencias(ini, fim + 86400000 - 1).filter(o => !o.paga && o.ag.tipo === 'pagar'); if (cs.length) partes.contas = cs.slice(0, 3).map(o => o.ag.titulo + ' ' + fmtBRL(o.ag.valor) + (o.t >= fim ? ' amanhã' : ' hoje')).join(' · ');
  const ds = dosesDoDia(ch); if (ds.length) partes.remedios = '💊 ' + ds.map(x => x.r.nome + ' ' + x.h).join(', ');
  const tf = tarefas.filter(t => !t.feita && t.prazo !== null && t.prazo < fim); if (tf.length) partes.tarefas = '✅ ' + tf.length + (tf.length === 1 ? ' tarefa: ' : ' tarefas: ') + tf.slice(0, 2).map(t => t.titulo).join(', ');
  if (orcDisponivel()) { try { const c = calcOrcamento(ini + 12 * 3600000); partes.orc = '💸 pode gastar ' + fmtBRL(c.hojeLimite); } catch {} }
  const hb = pes.habitos.filter(x => (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(dia.getDay()) && tipoHab(x) !== 'evitar'); if (hb.length) partes.habitos = '🔥 ' + hb.length + ' hábitos: ' + hb.slice(0, 3).map(x => x.nome).join(', ');
  const mt = pes.materias.filter(m => m.metaMin); if (mt.length) { const s = inicioSemana(ini), falta = mt.reduce((t, m) => t + Math.max(0, m.metaMin - minEstudo(m, s, ini)), 0); if (falta > 0) partes.estudo = '📚 faltam ' + fmtLivre(falta) + ' de estudo na semana'; }
  const tc = fin.contas.filter(c => !ehInvest(c)); if (tc.length) partes.saldo = 'saldo ' + (config.esconderValores ? 'R$ ••••' : fmtBRL(tc.reduce((a, c) => a + saldoConta(c), 0)));
  const usados = blocosResumo().filter(b => b[1] && partes[b[0]]).map(b => partes[b[0]]);
  const nC = outros.length;
  const titulo = (config.resumoBlocos ? '' : '') + (nC ? 'Bom dia! ' + nC + (nC === 1 ? ' compromisso' : ' compromissos') + ' · ' + partes.livre : trab ? 'Bom dia! Hoje: só o trabalho · ' + partes.livre : 'Bom dia! Dia livre hoje · ' + partes.livre);
  const corpo = usados.filter(p => p !== partes.livre).join(det ? '\n' : ' · ') || 'Nada marcado.';
  return { titulo, corpo };
}
// ----- relatórios personalizados -----
const SECOES_REL = { fin: '💰 Finanças', estudo: '✍️ Estudos', treino: '🏋️ Treinos', leitura: '📖 Leitura', crono: '⏱ Cronômetro', humor: '😊 Humor', remedios: '💊 Remédios', tarefas: '✅ Tarefas', habitos: '🔥 Hábitos' };
const REL_FECHAMENTO = { id: 'fechamento', nome: 'Fechamento financeiro', periodo: 'mes', quando: 'dia1', hora: '09:30', secoes: ['fin'], comparar: 'anterior', notif: true, fixo: true };
let relAtual = null, relRef = null, relVoltar = 'home';
const todosRelatorios = () => [...(config.fechamentoFin ? [REL_FECHAMENTO] : []), ...(config.relatorios || [])];
function periodoRel(rel, ref) {
  const t = ref ?? Date.now();
  if (rel.periodo === 'dia') { const i = inicioDoDia(t).getTime(); return [i, maisDias(i, 1) - 1]; }
  if (rel.periodo === 'mes') { const d = new Date(t); const i = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return [i, new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1]; }
  const i = inicioSemana(t); return [i, maisDias(i, 7) - 1];
}
const passoRel = (rel, t, n) => rel.periodo === 'dia' ? maisDias(t, n) : rel.periodo === 'mes' ? new Date(new Date(t).getFullYear(), new Date(t).getMonth() + n, 1).getTime() : maisDias(t, 7 * n);
function abrirRelatorio(id, ref, voltarPara) {
  const rel = todosRelatorios().find(r => r.id === id); if (!rel) return;
  relAtual = rel; relVoltar = voltarPara || (tela === 'relatorio' ? relVoltar : tela) || 'home';
  // relatórios mensais do dia 1º mostram o mês que terminou
  relRef = ref ?? (rel.periodo === 'mes' && rel.quando === 'dia1' && new Date().getDate() <= 7 ? passoRel(rel, Date.now(), -1) : Date.now());
  abrir('relatorio');
}
function numerosRel(secs, ini, fim) {
  const n = {};
  if (secs.includes('fin')) { const t = totais(ini, fim); n.fin = t; }
  if (secs.includes('estudo')) n.estudo = pes.materias.map(m => [m.nome, minEstudo(m, ini, fim), m.cor]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (secs.includes('treino')) n.treino = treinosEntre(ini, fim);
  if (secs.includes('leitura')) n.leitura = { pag: paginasEntre(ini, fim), lidos: pes.livros.filter(l => l.status === 'lido' && l.fim >= ini && l.fim <= fim).length };
  if (secs.includes('crono')) { const ss = crono.sessoes.filter(s => s.ini >= ini && s.ini <= fim), cat = {}; for (const s of ss) { const c = (cat[s.categoria || 'pessoal'] = cat[s.categoria || 'pessoal'] || { real: 0, plan: 0 }); c.real += realMin(s); if (s.planIni) c.plan += planMin(s); } n.crono = { cat, total: ss.reduce((t, s) => t + realMin(s), 0) }; }
  if (secs.includes('humor')) { const ds = pes.diario.filter(x => { const t = new Date(x.chave + 'T12:00').getTime(); return t >= ini && t <= fim; }), med = k => { const v = ds.map(x => x[k]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }; n.humor = { energia: med('energia'), humor: med('humor'), dias: ds.length }; }
  if (secs.includes('remedios')) n.remedios = pes.remedios.length ? emDia(ini, Math.min(fim, Date.now())) : null;
  if (secs.includes('tarefas')) { const l = tarefas.filter(t => (t.prazo !== null && t.prazo >= ini && t.prazo <= fim) || (t.feita && t.feitaEm >= ini && t.feitaEm <= fim)); n.tarefas = { total: l.length, feitas: l.filter(t => t.feita).length }; }
  if (secs.includes('habitos')) { let prev = 0, ok = 0; for (const h of pes.habitos) for (let t = inicioDoDia(ini).getTime(); t <= Math.min(fim, Date.now()); t = maisDias(t, 1)) { if (!(h.dias || [0, 1, 2, 3, 4, 5, 6]).includes(new Date(t).getDay()) || (h.criado && t < inicioDoDia(h.criado).getTime())) continue; prev++; if (feitoHab(h, chaveDia(t))) ok++; } n.habitos = prev ? ok / prev : null; }
  return n;
}
function variacao(a, b, inverso, fmt) { if (b == null || a == null || (!a && !b)) return ''; const d = a - b; if (Math.abs(d) < 0.005) return '<em class="neu">igual</em>'; const bom = inverso ? d < 0 : d > 0; return '<em class="' + (bom ? 'rec' : 'gas') + '">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + '</em>'; }
function renderRelatorio() {
  const rel = relAtual, box = $('relCorpo'); if (!rel) { box.innerHTML = '<div class="empty">Relatório não encontrado.</div>'; return; }
  const [ini, fim] = periodoRel(rel, relRef), [pi, pf] = periodoRel(rel, passoRel(rel, ini, -1)), secs = rel.secoes || [];
  const N = numerosRel(secs, ini, fim), A = rel.comparar === 'anterior' ? numerosRel(secs, pi, pf) : {};
  const dI = new Date(ini), dF = new Date(fim);
  $('relTit').textContent = rel.nome;
  $('relSub').textContent = rel.periodo === 'dia' ? fmtSeparador(ini) : rel.periodo === 'mes' ? maiuscula(MESES_LONGO[dI.getMonth()]) + ' de ' + dI.getFullYear() : dI.getDate() + (dI.getMonth() !== dF.getMonth() ? ' ' + MESES_N[dI.getMonth()] : '') + ' a ' + dF.getDate() + ' de ' + MESES_LONGO[dF.getMonth()];
  const kp = [];
  if (N.fin) kp.push([fmtBRL(N.fin.gastos).replace(/,\d\d$/, ''), 'gastos', variacao(N.fin.gastos, A.fin?.gastos, true, v => fmtBRL(v).replace(/,\d\d$/, '')), 'gas']);
  if (N.estudo) { const tot = N.estudo.reduce((s, x) => s + x[1], 0), tA = A.estudo ? A.estudo.reduce((s, x) => s + x[1], 0) : null; kp.push([fmtLivre(tot), 'estudo', variacao(tot, tA, false, fmtLivre), 'am']); }
  if (N.treino != null) kp.push([String(N.treino), N.treino === 1 ? 'treino' : 'treinos', variacao(N.treino, A.treino, false, String), '']);
  if (N.crono) kp.push([fmtLivre(N.crono.total), 'cronometrado', variacao(N.crono.total, A.crono?.total, false, fmtLivre), '']);
  if (N.leitura) kp.push([N.leitura.pag + ' pág.', 'lidas', variacao(N.leitura.pag, A.leitura?.pag, false, String), '']);
  if (N.habitos != null) kp.push([Math.round(N.habitos * 100) + '%', 'hábitos feitos', variacao(N.habitos * 100, A.habitos != null ? A.habitos * 100 : null, false, v => Math.round(v) + ' p.p.'), '']);
  let h = '<div class="rel-nav"><button type="button" class="nav" data-rl="ant">‹</button><span>' + (rel.comparar === 'anterior' ? 'comparado com o período anterior' : '') + '</span><button type="button" class="nav" data-rl="prox"' + (fim >= Date.now() ? ' disabled' : '') + '>›</button></div>';
  if (kp.length) h += '<div class="kp">' + kp.slice(0, 3).map(([v, l, d, c]) => '<div><b class="' + c + '">' + v + '</b><small>' + l + ' ' + d + '</small></div>').join('') + '</div>';
  const barras = (lista, fmt, cor) => { const mx = Math.max(...lista.map(x => x[1]), 1); return lista.map(x => '<div class="barh"><span>' + esc(x[0]) + '</span><i><u style="width:' + (x[1] / mx * 100).toFixed(0) + '%;background:' + (x[2] || cor) + '"></u></i><b>' + fmt(x[1]) + '</b></div>').join(''); };
  if (N.fin) { const cats = Object.entries(N.fin.porCat).map(([k, v]) => [categoriaPorId(k)?.nome || k, v]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    h += '<div class="grp">Finanças</div><div class="kp kp4"><div><b class="rec">' + fmtBRL(N.fin.receitas) + '</b><small>entradas</small></div><div><b class="gas">' + fmtBRL(N.fin.gastos) + '</b><small>gastos</small></div><div><b class="inv">' + fmtBRL(N.fin.guardado) + '</b><small>guardado</small></div><div><b class="' + (N.fin.saldo < 0 ? 'gas' : '') + '">' + fmtBRL(N.fin.saldo) + '</b><small>saldo</small></div></div>' + (cats.length && !OCULTAR ? '<div class="rot" style="margin-top:10px">Gastos por categoria</div>' + barras(cats, v => fmtBRL(v).replace(/,\d\d$/, ''), '#ff5a5a') : ''); }
  if (N.estudo) h += '<div class="grp">Estudos</div>' + (N.estudo.length ? barras(N.estudo, fmtLivre, '#5fd39b') : '<p class="txt mut">Nenhum estudo registrado.</p>');
  if (N.crono) { const l = Object.entries(N.crono.cat).map(([k, c]) => [categoriaPorId(k)?.nome || k, c.real, categoriaPorId(k)?.cor, c.plan]); h += '<div class="grp">Cronômetro · real × planejado</div>' + (l.length ? l.map(x => '<div class="barh"><span>' + esc(x[0]) + '</span><i><u style="width:' + (x[3] ? Math.min(100, x[1] / x[3] * 100) : 100).toFixed(0) + '%;background:' + x[2] + '"></u></i><b>' + fmtLivre(x[1]) + (x[3] ? '<small> ' + (x[1] >= x[3] ? '+' : '−') + fmtLivre(Math.abs(x[1] - x[3])) + '</small>' : '') + '</b></div>').join('') : '<p class="txt mut">Nenhuma sessão.</p>'); }
  const linhas = [];
  if (N.treino != null) linhas.push(['🏋️', 'Treinos', N.treino + (rel.periodo === 'semana' ? ' de ' + (config.treinosSemana || 3) : '')]);
  if (N.leitura) linhas.push(['📖', 'Leitura', N.leitura.pag + ' páginas' + (N.leitura.lidos ? ' · ' + N.leitura.lidos + ' livro(s) terminado(s)' : '')]);
  if (N.humor) linhas.push(['😊', 'Energia e humor', N.humor.dias ? '⚡' + (N.humor.energia ? N.humor.energia.toFixed(1).replace('.', ',') : '—') + ' · ' + (N.humor.humor ? HUMOR[Math.round(N.humor.humor)] + ' ' + N.humor.humor.toFixed(1).replace('.', ',') : '—') : 'sem registros']);
  if (N.remedios !== undefined) linhas.push(['💊', 'Remédios em dia', N.remedios === null ? '—' : Math.round(N.remedios * 100) + '%']);
  if (N.tarefas) linhas.push(['✅', 'Tarefas', N.tarefas.feitas + ' de ' + N.tarefas.total + ' feitas']);
  if (N.habitos !== undefined) linhas.push(['🔥', 'Hábitos', N.habitos === null ? '—' : Math.round(N.habitos * 100) + '% dos dias']);
  if (linhas.length) h += '<div class="grp">Resumo</div>' + linhas.map(([i, t, v]) => '<div class="md-onde"><span>' + i + '</span><b>' + t + '</b><small>' + v + '</small></div>').join('');
  // destaques
  const dest = []; if (N.crono && N.crono.total) { const porDia = {}; for (const s of crono.sessoes.filter(s => s.ini >= ini && s.ini <= fim && s.categoria !== 'trabalho')) { const k = inicioDoDia(s.ini).getTime(); porDia[k] = (porDia[k] || 0) + realMin(s); } const melhor = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0]; if (melhor) dest.push(['⭐', 'Melhor dia: ' + DIAS[new Date(+melhor[0]).getDay()] + ', ' + new Date(+melhor[0]).getDate(), fmtLivre(melhor[1]) + ' de foco fora do trabalho']); }
  if (secs.includes('fin')) { const prox = todasOcorrencias(Date.now(), Date.now() + 7 * 86400000).find(o => !o.paga && o.ag.tipo === 'pagar'); if (prox) dest.push(['⚠️', 'Atenção: ' + prox.ag.titulo + ' vence ' + fmtData(new Date(prox.t)).replace(/ \(.*/, ''), fmtBRL(prox.ag.valor)]); }
  if (dest.length) h += '<div class="grp">Destaques</div>' + dest.map(([i, t, v]) => '<div class="md-onde"><span>' + i + '</span><b>' + esc(t) + '</b><small>' + v + '</small></div>').join('');
  h += '<div class="actions" style="margin-top:14px"><button type="button" class="btn primary" data-rl="img">🖼️ Compartilhar imagem</button><button type="button" class="btn" data-rl="csv">📄 CSV</button>' + (rel.fixo ? '' : '<button type="button" class="btn" data-rl="editar">Editar</button>') + '</div>';
  box.innerHTML = h; relUltimo = { rel, ini, fim, kp, linhas, N };
}
let relUltimo = null;
$('relCorpo').addEventListener('click', async e => {
  const b = e.target.closest('[data-rl]'); if (!b || !relAtual) return;
  const a = b.dataset.rl;
  if (a === 'ant' || a === 'prox') { relRef = passoRel(relAtual, periodoRel(relAtual, relRef)[0], a === 'ant' ? -1 : 1); renderRelatorio(); }
  if (a === 'editar') formRelatorio(relAtual);
  if (a === 'csv') { const u = relUltimo, l = [['metrica', 'valor'].join(';')]; for (const [v, k] of u.kp) l.push([k, v].join(';')); for (const [, t, v] of u.linhas) l.push([csvQ(t), csvQ(v)].join(';')); if (u.N.fin) for (const [c, v] of Object.entries(u.N.fin.porCat)) l.push(['gasto ' + c, String(v.toFixed(2)).replace('.', ',')].join(';')); await baixarTexto('azote-' + finTxt(relAtual.nome).replace(/[^a-z0-9]+/g, '-') + '.csv', '﻿' + l.join('\n'), relAtual.nome); }
  if (a === 'img') await compartilharRelatorio();
});
async function compartilharRelatorio() {
  const u = relUltimo; if (!u) return;
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 1350); grad.addColorStop(0, '#18200a'); grad.addColorStop(0.5, '#000'); g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#c6f432'; g.font = '900 60px "Inter Display", Inter, sans-serif'; g.fillText('AZote.', 80, 120);
  g.fillStyle = '#f5f5f5'; g.font = '900 72px "Inter Display", Inter, sans-serif'; g.fillText(u.rel.nome, 80, 230);
  g.fillStyle = '#8a8a8a'; g.font = '600 34px Inter, sans-serif'; g.fillText($('relSub').textContent, 80, 290);
  u.kp.slice(0, 4).forEach(([v, l], i) => { const x = 80 + (i % 2) * 470, y = 350 + Math.floor(i / 2) * 210; g.fillStyle = '#111'; g.fillRect(x, y, 440, 180); g.fillStyle = '#c6f432'; g.font = '900 64px "Inter Display", Inter, sans-serif'; g.fillText(v, x + 30, y + 95); g.fillStyle = '#8a8a8a'; g.font = '600 30px Inter, sans-serif'; g.fillText(l, x + 30, y + 145); });
  g.font = '600 32px Inter, sans-serif'; u.linhas.slice(0, 6).forEach(([i, t, v], k) => { g.fillStyle = '#f5f5f5'; g.fillText(i + ' ' + t, 80, 860 + k * 64); g.fillStyle = '#8a8a8a'; g.fillText(String(v).slice(0, 34), 560, 860 + k * 64); });
  g.fillStyle = '#555'; g.font = '500 26px Inter, sans-serif'; g.fillText('feito com o AZote', 80, 1290);
  const dataUrl = cv.toDataURL('image/png'), nome = 'azote-relatorio.png';
  try { if (Arquivos && Compartilhar) { const r = await Arquivos.writeFile({ path: nome, data: dataUrl.split(',')[1], directory: 'CACHE' }); await Compartilhar.share({ title: u.rel.nome, files: [r.uri], dialogTitle: 'Compartilhar com…' }); } else { const l = document.createElement('a'); l.href = dataUrl; l.download = nome; l.click(); } } catch {}
}
function formRelatorio(rel) {
  const s = rel?.secoes || ['fin', 'estudo', 'treino', 'crono'];
  abrirForm(rel ? 'Editar relatório' : 'Novo relatório', [
    { k: 'nome', rot: 'Nome', v: rel?.nome, ph: 'Ex.: Fechamento de sexta' },
    { k: 'periodo', rot: 'Período', tipo: 'select', v: rel?.periodo || 'semana', ops: [['dia', 'Dia'], ['semana', 'Semana (seg a dom)'], ['mes', 'Mês']] },
    { k: 'quando', rot: 'Quando chega', tipo: 'select', v: rel?.quando || 'sex', ops: [['abrir', 'Só quando eu abrir'], ['diario', 'Todo dia'], ['sex', 'Toda sexta'], ['dom', 'Todo domingo'], ['seg', 'Toda segunda'], ['dia1', 'Todo dia 1º']] },
    { k: 'hora', rot: 'Horário', tipo: 'time', v: rel?.hora || '18:00' },
    ...Object.entries(SECOES_REL).map(([k, n]) => ({ k: 's_' + k, rot: n, tipo: 'check', v: s.includes(k) })),
    { k: 'comparar', rot: 'Comparar com', tipo: 'select', v: rel?.comparar || 'anterior', ops: [['anterior', 'Período anterior'], ['nenhum', 'Não comparar']] },
    { k: 'notif', rot: 'Avisar com notificação quando ficar pronto', tipo: 'check', v: rel ? rel.notif !== false : true },
  ], async d => {
    if (!d.nome) return false;
    const dados = { nome: d.nome, periodo: d.periodo, quando: d.quando, hora: d.hora || '18:00', secoes: Object.keys(SECOES_REL).filter(k => d['s_' + k]), comparar: d.comparar, notif: !!d.notif };
    if (!dados.secoes.length) { mostrarDialogo('Escolha o que entra', '<p>Marque pelo menos uma parte (finanças, estudos…).</p>'); return false; }
    config.relatorios = config.relatorios || [];
    if (rel && !rel.fixo) Object.assign(rel, dados); else config.relatorios.push({ id: novoId(), ...dados });
    await guardar('az-config', config); agendarRelatorios(); if (tela === 'relatorio') renderRelatorio(); else renderConfig();
  }, { excluir: rel && !rel.fixo ? async () => { config.relatorios = config.relatorios.filter(r => r.id !== rel.id); await guardar('az-config', config); agendarRelatorios(); if (tela === 'relatorio') abrir('config'); else renderConfig(); } : null });
}
// avisos dos relatórios e das rotinas novas (Meu dia, resumo da semana)
const MAX_REL = 3;
async function agendarRelatorios() {
  if (!Notif) return;
  const ids = []; for (const r of [...todosRelatorios(), { id: 'fechamento' }]) for (let k = 0; k < MAX_REL; k++) ids.push({ id: idNumerico('rel#' + r.id + '#' + k) });
  for (let k = 0; k < 7; k++) ids.push({ id: idNumerico('rotina#meudia#' + k) }); for (let k = 0; k < 3; k++) ids.push({ id: idNumerico('rotina#semana#' + k) });
  try { await Notif.cancel({ notifications: ids }); } catch {}
  if (!permissaoOk) return;
  const agora = new Date(), lista = [];
  for (const r of todosRelatorios()) {
    if (r.quando === 'abrir' || r.notif === false) continue;
    const [hh, mm] = (r.hora || '18:00').split(':').map(Number), datas = [];
    for (let k = 0; datas.length < MAX_REL && k < 70; k++) { const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k, hh, mm); if (d <= agora) continue; const w = d.getDay(); if (r.quando === 'diario' || (r.quando === 'sex' && w === 5) || (r.quando === 'dom' && w === 0) || (r.quando === 'seg' && w === 1) || (r.quando === 'dia1' && d.getDate() === 1)) datas.push(d); }
    datas.forEach((at, k) => lista.push({ id: idNumerico('rel#' + r.id + '#' + k), title: '📊 ' + r.nome + ' está pronto', body: 'Toque para ver ' + r.secoes.map(s => SECOES_REL[s].split(' ').slice(1).join(' ').toLowerCase()).join(', ') + '.', schedule: { at, allowWhileIdle: true }, extra: { relatorio: r.id } }));
  }
  if (config.meuDiaHora) { const [hh, mm] = config.meuDiaHora.split(':').map(Number); for (let k = 0; k < 7; k++) { const at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k, hh, mm); if (at > agora && !(k === 0 && (pes.relatos || []).some(r => r.chave === hojeChave() && r.fase === 'salvo'))) lista.push({ id: idNumerico('rotina#meudia#' + k), title: '🌙 Como foi seu dia?', body: 'Conte em um texto e eu registro os horários.', schedule: { at, allowWhileIdle: true }, extra: { rotina: 'meudia' } }); } }
  if (config.semanaAviso !== false) for (let k = 0; k < 3; k++) { const n = (7 - agora.getDay()) % 7 + k * 7, at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + n, 19, 0); if (at > agora) lista.push({ id: idNumerico('rotina#semana#' + k), title: '🗓️ Resumo da semana', body: 'Tempo, cronômetro, finanças e bem-estar da semana.', schedule: { at, allowWhileIdle: true }, extra: { rotina: 'semana' } }); }
  try { if (lista.length) await agendarNotif(lista); } catch {}
}
// Configurações › Relatórios
PAGINAS_EXTRA.push(() => ({
  relatorios: { titulo: 'Relatórios', itens: [
    { t: 'sec', titulo: 'Automáticos' },
    { t: 'esc', k: 'resumoHora', titulo: '☀️ Resumo da manhã', sub: 'notificação com os blocos que você escolher', ops: [[null, 'Desligado'], ...horas(6, 9, 30)] },
    { t: 'nav', p: 'resumo-blocos', ic: '🧩', bg: '#1a1a1a', titulo: 'Montar o resumo da manhã', sub: blocosResumo().filter(b => b[1]).map(b => BLOCOS_RESUMO[b[0]][1].toLowerCase()).join(', ') },
    { t: 'esc', k: 'revisaoHora', titulo: '🌙 Revisão da noite', sub: 'feito, pendente e amanhã', ops: [[null, 'Desligada'], ...horas(19, 23, 30)] },
    { t: 'esc', k: 'meuDiaHora', titulo: '📋 Meu dia', sub: 'pergunta como foi o dia', ops: [[null, 'Desligado'], ...horas(19, 23, 30)] },
    { t: 'sw', k: 'semanaAviso', titulo: '🗓️ Resumo da semana', sub: 'domingo às 19h: tempo, cronômetro, finanças e bem-estar' },
    { t: 'sw', k: 'retroAviso', titulo: '📊 Retrospectiva do mês', sub: 'dia 1º às 9h, com imagem para compartilhar' },
    { t: 'sw', k: 'fechamentoFin', titulo: '💰 Fechamento financeiro', sub: 'dia 1º às 9h30: entradas, gastos e categorias do mês' },
    { t: 'sec', titulo: 'Personalizados' },
    ...(config.relatorios || []).map(r => ({ t: 'acao', a: 'rel-abrir:' + r.id, titulo: '✨ ' + r.nome, sub: ({ abrir: 'quando abrir', diario: 'todo dia', sex: 'sexta', dom: 'domingo', seg: 'segunda', dia1: 'dia 1º' })[r.quando] + (r.quando !== 'abrir' ? ' ' + r.hora : '') + ' · ' + r.secoes.map(s => SECOES_REL[s].split(' ')[0]).join(' '), dir: 'ver' })),
    { t: 'botao', a: 'rel-novo', titulo: '+ Novo relatório', primario: true },
    ...(config.fechamentoFin ? [{ t: 'acao', a: 'rel-abrir:fechamento', titulo: 'Ver o fechamento financeiro', dir: 'ver' }] : []),
    { t: 'acao', a: 'abrir-retro', titulo: 'Ver a retrospectiva do mês', dir: 'ver' },
    { t: 'acao', a: 'rel-semana', titulo: 'Ver o resumo da semana', dir: 'ver' },
  ] },
  'resumo-blocos': { titulo: 'Resumo da manhã', itens: [
    { t: 'esc', k: 'resumoFormato', titulo: 'Formato', ops: [['curto', 'Curto (uma linha)'], ['detalhado', 'Detalhado (uma linha por bloco)']] },
    { t: 'sec', titulo: 'Blocos · toque para ligar, setas para mudar a ordem' },
    ...blocosResumo().map(([id, on]) => ({ t: 'bloco', id, on, ic: BLOCOS_RESUMO[id][0], titulo: BLOCOS_RESUMO[id][1], sub: BLOCOS_RESUMO[id][2] })),
    { t: 'sec', titulo: 'Prévia de hoje' },
    { t: 'html', html: (() => { const h = new Date(), r = textoResumo(new Date(h.getFullYear(), h.getMonth(), h.getDate())); return '<div class="notif-prev"><div class="t"><i>Z</i>AZote · ' + (config.resumoHora || 'desligado') + '</div><b>' + esc(r.titulo) + '</b><p>' + esc(r.corpo).replace(/\n/g, '<br>') + '</p></div>'; })() },
  ] },
}));
CFG_ACOES['rel-novo'] = () => formRelatorio(null);
CFG_ACOES['rel-abrir'] = a => abrirRelatorio(a.split(':')[1], undefined, 'config');
CFG_ACOES['rel-semana'] = () => abrir('resumo');
