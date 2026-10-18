
// =====================================================================
// 1.9 · Cronômetro de atividades
// =====================================================================
let crono = { ativo: null, sessoes: [] };
let cronoPer = 'semana', sessaoAberta = null;
const CRONO_NOTIF = 7777;
async function salvarCrono() { await guardar('az-crono', crono); }
function tempoDe(a, ate = Date.now()) { return Math.max(0, (ate - a.ini) - (a.pausas || []).reduce((t, p) => t + ((p.fim || ate) - p.ini), 0)); }
const pausado = a => !!a && (a.pausas || []).some(p => !p.fim);
const fmtCrono = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 3600) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); };
const minDe = ms => Math.round(ms / 60000);
function sessoesDe(evId, chave) { return crono.sessoes.filter(s => s.evId === evId && s.chave === chave); }

// ----- iniciar / pausar / parar -----
async function iniciarCrono(dados) {
  if (crono.ativo) await pararCrono(false);
  crono.ativo = { id: novoId(), pausas: [], ini: Date.now(), ...dados };
  segurarAvisosFoco(); avisoEstimativa();
  await salvarCrono(); atualizarCronoUI(); notifCrono(); atualizarTudo();
}
async function pausarCrono() {
  const a = crono.ativo; if (!a) return;
  if (pausado(a)) a.pausas.find(p => !p.fim).fim = Date.now(); else a.pausas.push({ ini: Date.now(), fim: null });
  await salvarCrono(); atualizarCronoUI(); notifCrono();
}
async function pararCrono(abrirFolha = true) {
  const a = crono.ativo; if (!a) return;
  const fim = Date.now(); (a.pausas || []).forEach(p => { if (!p.fim) p.fim = fim; });
  const s = { id: a.id, evId: a.evId || null, chave: a.chave || null, titulo: a.titulo, categoria: a.categoria || 'pessoal', ini: a.ini, fim,
    pausaMin: minDe((a.pausas || []).reduce((t, p) => t + (p.fim - p.ini), 0)), planIni: a.planIni || null, planFim: a.planFim || null, nota: '', habitoId: a.habitoId || undefined, tarefaId: a.tarefaId || undefined };
  crono.sessoes.push(s); crono.ativo = null;
  if (s.habitoId) { const hb = pes.habitos.find(x => x.id === s.habitoId); if (hb) { marcarHabito(hb, chaveDia(s.ini), realMin(s)); salvarPes(); } }
  liberarAvisosFoco(); if (Notif) { try { await Notif.cancel({ notifications: [{ id: idNumerico('estim#aviso') }] }); } catch {} }
  await salvarCrono(); atualizarCronoUI(); cancelarNotifCrono(); atualizarTudo();
  if (abrirFolha) abrirSessao(s.id);
}
// ----- faixa no topo e notificação fixa -----
function atualizarCronoUI() {
  const a = crono.ativo, f = $('cronoFaixa');
  $('app').dataset.crono = a ? '1' : '';
  f.hidden = !a; if (!a) return;
  $('cfxTit').textContent = a.titulo; $('cfxPausa').textContent = pausado(a) ? 'Continuar' : 'Pausar';
  f.classList.toggle('pausado', pausado(a)); tickCrono();
}
function tickCrono() {
  const a = crono.ativo; if (!a) return;
  const t = fmtCrono(tempoDe(a));
  $('cfxTempo').textContent = t + (pausado(a) ? ' · pausado' : '');
  document.querySelectorAll('[data-crono-tempo]').forEach(el => el.textContent = t);
}
setInterval(() => { if (crono.ativo && document.visibilityState === 'visible') tickCrono(); }, 1000);
$('cronoFaixa').addEventListener('click', async e => {
  if (e.target.closest('#cfxPausa')) { await pausarCrono(); return; }
  if (e.target.closest('#cfxParar')) { await pararCrono(); return; }
  agendaAba = 'prog'; agendaData = null; abrir('agenda');
});
let tiposCronoOk = false;
async function notifCrono() {
  const a = crono.ativo; if (!Notif || !a || !permissaoOk || config.cronoNotif === false) return;
  try {
    if (!tiposCronoOk) await registrarTiposNotif();
    await Notif.cancel({ notifications: [{ id: CRONO_NOTIF }] });
    await agendarNotif([{ id: CRONO_NOTIF, title: (pausado(a) ? '⏸ ' : '⏱ ') + a.titulo, body: pausado(a) ? 'Pausado · ' + fmtLivre(minDe(tempoDe(a))) + ' até agora' : 'Cronometrando desde ' + fmtHora(new Date(a.ini)) + (a.pausas.length ? ' (com pausas)' : ''),
      ongoing: true, autoCancel: false, actionTypeId: 'crono', extra: { crono: true }, schedule: { at: new Date(Date.now() + 400), allowWhileIdle: true } }]);
  } catch {}
}
async function cancelarNotifCrono() { if (Notif) { try { await Notif.cancel({ notifications: [{ id: CRONO_NOTIF }] }); } catch {} } }

// ----- botões na Agenda -----
function cronoBotoesHTML(e) {
  if (e.pulado || difDias(e.quando) !== 0) return '';
  const a = crono.ativo;
  if (a && a.evId === e.id && a.chave === e.chave) return '<span class="crono-on">● <span data-crono-tempo>' + fmtCrono(tempoDe(a)) + '</span></span><button class="icon-btn crono-parar" data-a="crono-parar" type="button">■ Parar</button>';
  const ss = sessoesDe(e.id, e.chave);
  if (ss.length) { const tot = ss.reduce((t, s) => t + (s.fim - s.ini) - s.pausaMin * 60000, 0); return '<span class="crono-feito">✓ cronometrado: ' + fmtLivre(minDe(tot)) + ' (' + fmtHora(new Date(ss[0].ini)) + '–' + fmtHora(new Date(ss[ss.length - 1].fim)) + ')</span>'; }
  return '<button class="icon-btn crono-ini" data-a="crono-ini" type="button">▶ Iniciar</button>';
}
async function tratarCronoClique(b) {
  const a = b.dataset.a;
  if (a === 'crono-outra') { abrirOutra(); return true; }
  if (a === 'crono-parar') { await pararCrono(); return true; }
  if (a === 'crono-ini') {
    const linha = b.closest('.ev'), ev = eventos.find(x => x.id === linha.dataset.id); if (!ev) return true;
    const t = Number(linha.dataset.t), oc = ocorrenciasDet(ev, t - 1, t + 1, 3).find(o => o.chave === linha.dataset.chave);
    const dur = oc?.dur ?? ev.duracao ?? 60;
    await iniciarCrono({ evId: ev.id, chave: linha.dataset.chave, titulo: ev.titulo, categoria: ev.categoria || categorizar(ev.titulo, ev.trabalho), planIni: t, planFim: t + dur * 60000 });
    return true;
  }
  return false;
}
function botaoOutraHTML() { return '<div class="actions" style="margin-top:14px"><button class="btn" data-a="crono-outra" type="button">▶ Cronometrar outra atividade</button></div>'; }
// ----- outra atividade -----
function abrirOutra() {
  $('otTitulo').value = ''; $('otCategoria').innerHTML = CATEGORIAS.map(c => '<option value="' + c.id + '">' + c.nome + '</option>').join(''); $('otCategoria').value = 'pessoal';
  $('outraOv').hidden = false; setTimeout(() => $('otTitulo').focus(), 80);
}
$('otTitulo').addEventListener('input', () => { const c = categorizar($('otTitulo').value); if (c !== 'pessoal') $('otCategoria').value = c; });
$('otCancelar').onclick = () => { $('outraOv').hidden = true; };
$('outraOv').addEventListener('click', e => { if (e.target === $('outraOv')) $('outraOv').hidden = true; });
$('formOutra').addEventListener('submit', async e => {
  e.preventDefault(); $('outraOv').hidden = true;
  await iniciarCrono({ evId: null, chave: null, titulo: $('otTitulo').value.trim() || 'Atividade', categoria: $('otCategoria').value });
});
// ----- folha ao parar (corrigir início/fim, pausas, nota) -----
function abrirSessao(id) {
  const s = crono.sessoes.find(x => x.id === id); if (!s) return; sessaoAberta = s;
  $('csTit').textContent = s.titulo;
  $('csIni').value = fmtHora(new Date(s.ini)); $('csFim').value = fmtHora(new Date(s.fim)); $('csPausa').value = s.pausaMin || 0; $('csNota').value = s.nota || '';
  resumoSessao(); $('cronoOv').hidden = false;
}
function lerSessaoForm() {
  const s = sessaoAberta, d = new Date(s.ini);
  const [h1, m1] = $('csIni').value.split(':').map(Number), [h2, m2] = $('csFim').value.split(':').map(Number);
  const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h1, m1).getTime();
  let fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h2, m2).getTime(); if (fim < ini) fim += DIA_MS;
  return { ini, fim, pausaMin: Math.max(0, parseInt($('csPausa').value) || 0), nota: $('csNota').value.trim() };
}
function resumoSessao() {
  const s = sessaoAberta, f = lerSessaoForm(), real = minDe(f.fim - f.ini) - f.pausaMin;
  let h = 'Tempo real: <b>' + fmtLivre(Math.max(0, real)) + '</b>';
  if (s.planIni) { const plan = minDe(s.planFim - s.planIni); h += ' · planejado ' + fmtHora(new Date(s.planIni)) + '–' + fmtHora(new Date(s.planFim)) + ' (' + fmtLivre(plan) + ')<br>' + (real >= plan ? '<span class="rec">+' + fmtLivre(real - plan) + ' a mais</span>' : '<span class="gas">' + fmtLivre(plan - real) + ' a menos</span>') + ' · ' + Math.round(real / Math.max(plan, 1) * 100) + '% do planejado'; }
  $('csResumo').innerHTML = h;
}
['csIni', 'csFim', 'csPausa'].forEach(id => $(id).addEventListener('input', resumoSessao));
$('cronoOv').addEventListener('click', async e => {
  if (e.target === $('cronoOv')) { $('cronoOv').hidden = true; return; }
  const b = e.target.closest('[data-cs]'); if (!b) return;
  if (b.dataset.cs === 'descartar') {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Descartar mesmo?'; return; }
    crono.sessoes = crono.sessoes.filter(x => x !== sessaoAberta);
  }
  $('cronoOv').hidden = true; await salvarCrono(); atualizarTudo();
});
$('formCrono').addEventListener('submit', async e => {
  e.preventDefault(); Object.assign(sessaoAberta, lerSessaoForm());
  $('cronoOv').hidden = true; $('cronoOv').querySelector('[data-cs="descartar"]').classList.remove('armed'); $('cronoOv').querySelector('[data-cs="descartar"]').textContent = 'Descartar';
  await salvarCrono(); atualizarTudo();
});

// ----- relatório: Resumo da semana › Cronômetro -----
const realMin = s => Math.max(0, minDe(s.fim - s.ini) - (s.pausaMin || 0));
const planMin = s => s.planIni ? minDe(s.planFim - s.planIni) : 0;
function periodoCrono() {
  const ref = resumoRef || inicioSemana(Date.now()), d = new Date(ref);
  if (cronoPer === 'mes') { const mRef = new Date(maisDias(ref, 3)); return [new Date(mRef.getFullYear(), mRef.getMonth(), 1).getTime(), new Date(mRef.getFullYear(), mRef.getMonth() + 1, 1).getTime() - 1, MESES_LONGO[mRef.getMonth()] + ' de ' + mRef.getFullYear()]; }
  if (cronoPer === 'ano') { const a = new Date(maisDias(ref, 3)).getFullYear(); return [new Date(a, 0, 1).getTime(), new Date(a + 1, 0, 1).getTime() - 1, String(a)]; }
  return [ref, maisDias(ref, 7) - 1, 'semana de ' + d.getDate() + '/' + (d.getMonth() + 1)];
}
function renderResumoCrono() {
  const [de, ate, nome] = periodoCrono();
  const ss = crono.sessoes.filter(s => s.ini >= de && s.ini <= ate).sort((a, b) => b.ini - a.ini);
  let h = '<div class="per">' + [['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']].map(([k, l]) => '<button type="button" data-cper="' + k + '" class="' + (cronoPer === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  if (!ss.length) {
    $('resumoCrono').innerHTML = h + '<div class="empty"><b>Nada cronometrado na ' + esc(nome) + '.</b><br>Na Agenda, toque em <b>▶ Iniciar</b> num compromisso de hoje, ou em “Cronometrar outra atividade”. Aqui aparece o tempo real × o planejado.</div>' +
      (crono.sessoes.length ? '<div class="actions"><button type="button" class="btn" data-cx="csv">Exportar CSV</button></div>' : '');
    return;
  }
  const total = ss.reduce((t, s) => t + realMin(s), 0), comPlan = ss.filter(s => s.planIni);
  const pr = comPlan.reduce((t, s) => t + realMin(s), 0), pp = comPlan.reduce((t, s) => t + planMin(s), 0);
  h += '<div class="kp"><div><b>' + fmtLivre(total) + '</b><small>cronometrado</small></div><div><b class="' + (pp && pr / pp < 0.9 ? 'gas' : pp ? 'rec' : '') + '">' + (pp ? Math.round(pr / pp * 100) + '%' : '—') + '</b><small>do planejado</small></div><div><b>' + ss.length + '</b><small>' + (ss.length === 1 ? 'sessão' : 'sessões') + '</small></div></div>';
  const grupos = {};
  for (const s of ss) { const g = grupos[s.titulo] || (grupos[s.titulo] = { titulo: s.titulo, cat: s.categoria, real: 0, plan: 0, n: 0, inis: [], planInis: [] }); g.real += realMin(s); g.plan += planMin(s); g.n++; if (s.planIni) { g.inis.push(s.ini); g.planInis.push(s.planIni); } }
  const lista = Object.values(grupos).sort((a, b) => b.real - a.real), mx = Math.max(...lista.map(g => Math.max(g.real, g.plan)), 1);
  h += '<div class="grp">Real × planejado por atividade</div>';
  for (const g of lista) {
    const c = categoriaPorId(g.cat);
    h += '<div class="barra"><div class="bl"><span class="sq" style="background:' + c.cor + '"></span>' + esc(g.titulo) + '<b>' + fmtLivre(g.real) + (g.plan ? '<small> / ' + fmtLivre(g.plan) + '</small>' : '') + '</b></div>' +
      '<div class="bt duplo"><div style="width:' + (g.real / mx * 100) + '%;background:' + c.cor + '"></div>' + (g.plan ? '<i style="left:' + Math.min(100, g.plan / mx * 100) + '%"></i>' : '') + '</div>' +
      '<small>' + g.n + (g.n === 1 ? ' sessão' : ' sessões') + (g.plan ? ' · ' + Math.round(g.real / g.plan * 100) + '% do planejado' : ' · sem horário planejado') + '</small></div>';
  }
  const comInis = lista.filter(g => g.inis.length >= 2).sort((a, b) => b.inis.length - a.inis.length)[0];
  if (comInis) {
    const media = arr => { const m = arr.reduce((t, x) => { const d = new Date(x); return t + d.getHours() * 60 + d.getMinutes(); }, 0) / arr.length; return pad(Math.floor(m / 60)) + ':' + pad(Math.round(m % 60)); };
    const atrasos = comInis.inis.map((t, k) => (t - comInis.planInis[k]) / 60000), mAtr = Math.round(atrasos.reduce((a, b) => a + b, 0) / atrasos.length);
    h += '<div class="grp">Média de chegada</div><p class="txt">' + esc(comInis.titulo) + ': começa em média às <b>' + media(comInis.inis) + '</b> (planejado ' + media(comInis.planInis) + ') · ' + (mAtr > 0 ? '<span class="gas">' + mAtr + ' min depois</span>' : mAtr < 0 ? '<span class="rec">' + (-mAtr) + ' min antes</span>' : 'na hora') + '.</p>';
  }
  h += '<div class="grp">Últimas sessões · toque para corrigir</div>' + ss.slice(0, 12).map(s => { const d = new Date(s.ini);
    return '<button type="button" class="sessao" data-sess="' + esc(s.id) + '"><span class="d"><b>' + pad(d.getDate()) + '</b><small>' + MESES_N[d.getMonth()] + '</small></span><span class="t">' + esc(s.titulo) + '<small>' + fmtHora(d) + '–' + fmtHora(new Date(s.fim)) + (s.pausaMin ? ' · pausas ' + s.pausaMin + ' min' : '') + (s.nota ? ' · ' + esc(s.nota) : '') + '</small></span><span class="v">' + fmtLivre(realMin(s)) + (s.planIni ? '<small>de ' + fmtLivre(planMin(s)) + '</small>' : '') + '</span></button>'; }).join('');
  h += '<div class="actions" style="margin-top:12px"><button type="button" class="btn" data-cx="csv">Exportar CSV</button></div>';
  $('resumoCrono').innerHTML = h;
}
$('resumoCrono').addEventListener('click', async e => {
  const p = e.target.closest('[data-cper]'); if (p) { cronoPer = p.dataset.cper; renderResumoCrono(); return; }
  const s = e.target.closest('[data-sess]'); if (s) { abrirSessao(s.dataset.sess); return; }
  if (e.target.closest('[data-cx="csv"]')) await exportarCSV();
});
async function exportarCSV() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const dt = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const linhas = [['data', 'atividade', 'categoria', 'inicio', 'fim', 'pausas_min', 'real_min', 'planejado_inicio', 'planejado_fim', 'planejado_min', 'nota'].join(';')];
  for (const s of crono.sessoes.slice().sort((a, b) => a.ini - b.ini)) linhas.push([dt(s.ini), q(s.titulo), categoriaPorId(s.categoria).nome, fmtHora(new Date(s.ini)), fmtHora(new Date(s.fim)), s.pausaMin || 0, realMin(s), s.planIni ? fmtHora(new Date(s.planIni)) : '', s.planFim ? fmtHora(new Date(s.planFim)) : '', planMin(s) || '', q(s.nota)].join(';'));
  const texto = '﻿' + linhas.join('\n'), h = new Date(), nome = 'azote-cronometro-' + pad(h.getDate()) + '-' + pad(h.getMonth() + 1) + '-' + h.getFullYear() + '.csv';
  try {
    if (Arquivos && Compartilhar) { const r = await Arquivos.writeFile({ path: nome, data: texto, directory: 'CACHE', encoding: 'utf8' }); await Compartilhar.share({ title: 'Cronômetro do AZote', files: [r.uri], dialogTitle: 'Enviar o CSV para…' }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv' })); a.download = nome; a.click(); }
  } catch {}
}
// 1.15: tarefa com estimativa avisa quando o tempo passa
async function avisoEstimativa() {
  const a = crono.ativo, t = a?.tarefaId && tarefas.find(x => x.id === a.tarefaId); if (!Notif || !permissaoOk || !t?.estimativa) return;
  const falta = t.estimativa - minTarefa(t); if (falta <= 1) return;
  try { await agendarNotif([{ id: idNumerico('estim#aviso'), title: '⏱ Passou da estimativa', body: t.titulo + ': ' + fmtLivre(t.estimativa) + ' estimadas', schedule: { at: new Date(Date.now() + falta * 60000), allowWhileIdle: true }, extra: { tarefa: t.id } }]); } catch {}
}
