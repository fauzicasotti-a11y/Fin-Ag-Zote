
// =====================================================================
// 1.8.1 · Finanças: Metas e Dívidas
// =====================================================================
const DIA_MS = 86400000;
let metaSel = null, metaPer = 'semana', divSel = null;
const metaPorId = id => (fin.metas || []).find(m => m.id === id) || null;
const divPorId = id => (fin.dividas || []).find(d => d.id === id) || null;
const fmtMesAno = t => { const d = new Date(t); return MESES_N[d.getMonth()] + '/' + d.getFullYear(); };
const fmtDM = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const fmtDMA = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const pct1 = v => (Math.round(v * 1000) / 10).toString().replace('.', ',');
const fmtTaxa = v => (Math.round(v * 10000) / 100).toString().replace('.', ',');
const inteiroBR = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dataInput = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const lerDataInput = (v, h = 9) => { const [a, m, d] = v.split('-').map(Number); return new Date(a, m - 1, d, h).getTime(); };

// ----- Metas: cálculo -----
function guardadoMeta(mt, ate = Infinity) {
  const inv = mt.contaId ? contaPorId(mt.contaId) : null;
  if (inv) return saldoConta(inv, ate);
  let g = mt.jaTinha || 0;
  for (const m of fin.movs) if (m.metaId === mt.id && m.t <= ate) g += m.tipo === 'guardar' ? m.valor : m.tipo === 'resgatar' ? -m.valor : 0;
  return Math.round(g * 100) / 100;
}
function statsMeta(mt) {
  const agora = Date.now(), hoje = inicioDoDia(agora).getTime();
  const g = guardadoMeta(mt), alvo = mt.alvo, base = mt.base ?? 0;
  const falta = Math.max(0, alvo - g);
  const dias = Math.max(1, Math.ceil((mt.prazo - hoje) / DIA_MS) + 1);
  const total = Math.max(1, mt.prazo - mt.criado);
  const frac = Math.max(0, Math.min(1, (agora - mt.criado) / total));
  const ideal = base + (alvo - base) * frac;
  const diasPassados = Math.max(1, (agora - mt.criado) / DIA_MS);
  const ritmoDia = (g - base) / diasPassados;
  const chega = g >= alvo ? agora : ritmoDia > 0.01 ? agora + falta / ritmoDia * DIA_MS : null;
  let status = 'no ritmo', cls = 'e-vence';
  if (g >= alvo) { status = 'concluída ✓'; cls = 'e-ok'; }
  else if (mt.prazo < hoje) { status = 'prazo vencido'; cls = 'e-atr'; }
  else if (g - ideal > alvo * 0.02) { status = 'adiantada'; cls = 'e-ok'; }
  else if (g - ideal < -alvo * 0.05) { status = 'atrasada'; cls = 'e-atr'; }
  return { g, alvo, base, falta, dias, ideal, frac, pDia: falta / dias, pSem: falta / Math.max(dias / 7, 1), pMes: falta / Math.max(dias / 30.44, 1), ritmoDia, chega, status, cls, pct: Math.min(100, g / alvo * 100) };
}
function movsDaMeta(mt) {
  return fin.movs.filter(m => m.metaId === mt.id || (mt.contaId && (m.contaId === mt.contaId || m.destinoId === mt.contaId))).sort((a, b) => b.t - a.t);
}
function guardadoNoPeriodo(mt, de, ate) { return guardadoMeta(mt, ate) - guardadoMeta(mt, de - 1); }

// ----- Metas: telas -----
function cartaoMeta(mt) {
  const s = statsMeta(mt);
  return '<button type="button" class="metac" data-meta-id="' + esc(mt.id) + '"><div class="tp"><b>' + esc(mt.nome) + '</b><em class="' + s.cls + '">' + s.status + '</em></div>' +
    '<div class="prog"><div style="width:' + s.pct + '%"></div><i style="left:' + Math.min(100, s.ideal / s.alvo * 100) + '%"></i></div>' +
    '<div class="vals"><span><b class="inv">' + fmtBRL(s.g) + '</b> de ' + fmtBRL(s.alvo) + '</span><span>até ' + fmtDMA(mt.prazo) + '</span></div>' +
    (s.falta > 0 && mt.prazo >= inicioDoDia(Date.now()).getTime() ? '<div class="ritmo"><div><b>' + fmtBRL(s.pDia) + '</b><small>por dia</small></div><div><b>' + fmtBRL(s.pSem) + '</b><small>por semana</small></div><div><b>' + fmtBRL(s.pMes) + '</b><small>por mês</small></div></div>' : '') + '</button>';
}
function renderMetas() {
  const box = $('finMetas');
  if (metaSel && metaPorId(metaSel)) { renderMetaDet(); return; }
  metaSel = null;
  const metas = fin.metas || [];
  if (!metas.length) {
    box.innerHTML = '<div class="empty"><b>Nenhuma meta ainda.</b><br>Crie uma meta, como <i>“moto nova, R$ 10.000 até janeiro”</i>. Eu calculo quanto guardar por dia, semana e mês e aviso se você estiver atrasado. Também dá para escrever em Lançamentos: <i>“nova meta: viagem 8 mil até julho”</i>.</div>' +
      '<div class="actions"><button type="button" class="btn primary" data-fmt="nova">+ Nova meta</button></div>';
    return;
  }
  const ini = inicioMes(Date.now());
  const tot = metas.reduce((a, m) => a + guardadoMeta(m), 0);
  const mes = metas.reduce((a, m) => a + guardadoNoPeriodo(m, ini, Date.now()), 0);
  let h = '<div class="kp kpv"><div><b class="inv">' + fmtBRL(tot) + '</b><small>guardado em metas</small></div><div><b>' + metas.filter(m => guardadoMeta(m) < m.alvo).length + '</b><small>metas ativas</small></div><div><b class="inv">' + fmtBRL(mes) + '</b><small>guardado neste mês</small></div></div>';
  h += metas.slice().sort((a, b) => a.prazo - b.prazo).map(cartaoMeta).join('');
  h += '<p class="dica">A linha branca na barra mostra onde você deveria estar hoje para chegar no prazo.</p><div class="actions"><button type="button" class="btn primary" data-fmt="nova">+ Nova meta</button></div>';
  box.innerHTML = h;
}
function graficoMeta(mt, s) {
  const W = 320, H = 140, pl = 30, pb = 18;
  const ini = mt.criado, fimT = Math.max(mt.prazo, s.chega && s.chega < mt.prazo + 400 * DIA_MS ? s.chega : mt.prazo);
  const X = t => pl + (t - ini) / Math.max(1, fimT - ini) * (W - pl - 8), maxV = Math.max(mt.alvo, s.g) * 1.05;
  const Y = v => H - pb - v / maxV * (H - pb - 8);
  const pts = []; const passo = Math.max(DIA_MS, (Date.now() - ini) / 40);
  for (let t = ini; t < Date.now(); t += passo) pts.push([t, guardadoMeta(mt, t)]);
  pts.push([Date.now(), s.g]);
  const grade = [0, mt.alvo / 2, mt.alvo].map(v => '<line x1="' + pl + '" x2="' + (W - 8) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#2e3344"/><text x="' + (pl - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" fill="#9a9cae" font-size="9" text-anchor="end">' + fmtCurto(v) + '</text>').join('');
  const meses = []; const d0 = new Date(ini); for (let k = 0; k < 40; k++) { const t = new Date(d0.getFullYear(), d0.getMonth() + k, 1).getTime(); if (t > fimT) break; if (t >= ini) meses.push(t); }
  const passoM = Math.ceil(meses.length / 6);
  return '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" width="100%">' + grade +
    '<line x1="' + X(ini).toFixed(1) + '" y1="' + Y(s.base).toFixed(1) + '" x2="' + X(mt.prazo).toFixed(1) + '" y2="' + Y(mt.alvo).toFixed(1) + '" stroke="#9a9cae" stroke-width="1.5" stroke-dasharray="4 4"/>' +
    (s.chega && s.g < mt.alvo ? '<polyline points="' + X(Date.now()).toFixed(1) + ',' + Y(s.g).toFixed(1) + ' ' + X(Math.min(s.chega, fimT)).toFixed(1) + ',' + Y(s.chega <= fimT ? mt.alvo : s.g + s.ritmoDia * (fimT - Date.now()) / DIA_MS).toFixed(1) + '" fill="none" stroke="#5fd39b" stroke-width="2" stroke-dasharray="2 4"/>' : '') +
    '<polyline points="' + pts.map(([t, v]) => X(t).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') + '" fill="none" stroke="#5fa8ff" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="' + X(Date.now()).toFixed(1) + '" cy="' + Y(s.g).toFixed(1) + '" r="4" fill="#5fa8ff"/><circle cx="' + X(mt.prazo).toFixed(1) + '" cy="' + Y(mt.alvo).toFixed(1) + '" r="3.5" fill="#9a9cae"/>' +
    meses.filter((_, k) => k % passoM === 0).map(t => '<text x="' + X(t).toFixed(1) + '" y="' + (H - 4) + '" fill="#9a9cae" font-size="9" text-anchor="middle">' + MESES_N[new Date(t).getMonth()] + '</text>').join('') + '</svg>' +
    '<div class="leg"><span><b class="inv">━</b> guardado</span><span><b style="color:#9a9cae">┅</b> ritmo ideal</span><span><b class="rec">┅</b> previsão</span></div>';
}
function renderMetaDet() {
  const mt = metaPorId(metaSel), s = statsMeta(mt), agora = Date.now();
  let prev;
  if (s.g >= mt.alvo) prev = '<div class="aviso v">✓ Meta concluída! Você juntou ' + fmtBRL(s.g) + '.</div>';
  else if (!s.chega) prev = '<div class="aviso a">Ainda não há ritmo para prever. Para chegar no prazo: <b>' + fmtBRL(s.pSem) + '/semana</b>.</div>';
  else {
    const d = new Date(s.chega), antes = Math.round((mt.prazo - s.chega) / DIA_MS), dif = s.g - s.ideal;
    prev = '<div class="aviso ' + (antes >= 0 ? 'v' : 'a') + '">' + (dif >= 0 ? '✓ Você está <b>' + fmtBRL(dif) + ' adiantado</b>. ' : -dif <= mt.alvo * 0.05 ? 'Quase no ritmo: <b>' + fmtBRL(-dif) + '</b> abaixo do ideal. ' : 'Você está <b>' + fmtBRL(-dif) + ' atrasado</b>. ') +
      'No ritmo atual (' + fmtBRL(s.ritmoDia * 7) + '/semana), chega aos ' + fmtBRL(mt.alvo) + ' em <b>' + d.getDate() + ' de ' + MESES_LONGO[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : '') + '</b>, ' +
      (antes >= 0 ? antes + ' dias antes do prazo.' : (-antes) + ' dias depois do prazo.') + '</div>';
  }
  const hoje0 = inicioDoDia(agora).getTime();
  const per = metaPer === 'dia' ? [hoje0, hoje0 + DIA_MS - 1, s.pDia, s.dias, 'dias'] : metaPer === 'mes' ? [inicioMes(agora), fimMes(agora), s.pMes, Math.max(1, Math.ceil(s.dias / 30.44)), 'meses'] : [inicioSemana(agora), maisDias(inicioSemana(agora), 7) - 1, s.pSem, Math.max(1, Math.ceil(s.dias / 7)), 'semanas'];
  const noPer = guardadoNoPeriodo(mt, per[0], per[1]);
  const inv = mt.contaId ? contaPorId(mt.contaId) : null;
  const movs = movsDaMeta(mt).slice(0, 30);
  let h = '<button type="button" class="volta-lista" data-fmt="lista">‹ Metas</button>' +
    '<div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap"><span class="big inv">' + fmtBRL(s.g) + '</span><span style="color:var(--muted);font-size:.85rem;padding-bottom:8px">de ' + fmtBRL(mt.alvo) + ' · ' + pct1(s.g / mt.alvo) + '%</span></div>' +
    '<div class="prog"><div style="width:' + s.pct + '%"></div><i style="left:' + Math.min(100, s.ideal / mt.alvo * 100) + '%"></i></div>' +
    '<div class="vals"><span>até ' + fmtDMA(mt.prazo) + '</span><span>' + (inv ? 'ligada a ' + esc(inv.nome) : 'falta ' + fmtBRL(s.falta)) + '</span></div>' +
    graficoMeta(mt, s) + prev +
    '<div class="per">' + [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, l]) => '<button type="button" data-per="' + k + '" class="' + (metaPer === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
    '<div class="ritmo"><div><b>' + fmtBRL(per[2]) + '</b><small>precisa por ' + (metaPer === 'mes' ? 'mês' : metaPer) + '</small></div><div><b class="' + (noPer >= per[2] ? 'rec' : 'inv') + '">' + fmtBRL(noPer) + '</b><small>guardado ' + (metaPer === 'dia' ? 'hoje' : metaPer === 'mes' ? 'neste mês' : 'nesta semana') + '</small></div><div><b>' + per[3] + '</b><small>' + per[4] + ' restantes</small></div></div>' +
    '<div class="actions"><button type="button" class="btn primary" data-fmt="guardar">Guardar</button><button type="button" class="btn" data-fmt="editar">Editar</button><button type="button" class="btn danger" data-fmt="excluir">Excluir</button></div>' +
    '<div class="grp">Movimentações</div>' + (movs.length ? movs.map(m => {
      const d = new Date(m.t), e = m.metaId === mt.id && !inv ? (m.tipo === 'guardar' ? m.valor : -m.valor) : efeito(m, mt.contaId);
      return '<div class="mov"><div class="d"><b>' + pad(d.getDate()) + '</b><small>' + MESES_N[d.getMonth()] + '</small></div><span class="t">' + (e >= 0 ? 'Guardei' : 'Tirei') + '</span><span class="v inv">' + (e >= 0 ? '+ ' : '− ') + fmtBRL(Math.abs(e)) + '</span><span class="s">' + esc(m.tipo === 'rend' ? 'rendimento' : m.titulo || '') + '</span></div>';
    }).join('') : '<p class="txt" style="color:var(--muted)">Nada guardado ainda. Escreva em Lançamentos: “guardei 200 pra ' + esc(mt.nome.replace(/^\W+/, '').split(' ')[0].toLowerCase()) + '”.</p>');
  $('finMetas').innerHTML = h;
  $('subFin').textContent = 'meta · até ' + fmtDMA(mt.prazo);
}
$('finMetas').addEventListener('click', async e => {
  const c = e.target.closest('[data-meta-id]'); if (c) { metaSel = c.dataset.metaId; renderFin(); $('finMetas').scrollTop = 0; return; }
  const p = e.target.closest('[data-per]'); if (p) { metaPer = p.dataset.per; renderMetaDet(); return; }
  const b = e.target.closest('[data-fmt]'); if (!b) return;
  const a = b.dataset.fmt, mt = metaPorId(metaSel);
  if (a === 'nova') abrirMetaForm(null);
  if (a === 'lista') { metaSel = null; renderFin(); }
  if (a === 'editar' && mt) abrirMetaForm(mt.id);
  if (a === 'guardar' && mt) { finAba = 'chat'; renderFin(); $('entradaFin').value = 'guardei  pra ' + mt.nome.replace(/^\W+/, '').split(' ')[0].toLowerCase(); setTimeout(() => { $('entradaFin').focus(); $('entradaFin').setSelectionRange(8, 8); }, 120); }
  if (a === 'excluir' && mt) {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = mt.contaId ? 'Excluir a meta? (o investimento continua)' : 'Excluir? O guardado volta para a conta'; return; }
    fin.movs = fin.movs.filter(m => !(m.metaId === mt.id && (m.tipo === 'guardar' || m.tipo === 'resgatar')));
    fin.movs.forEach(m => { if (m.metaId === mt.id) delete m.metaId; });
    if (!mt.contaId && mt.jaTinha) { /* o que já existia antes da meta não estava em conta nenhuma */ }
    fin.metas = fin.metas.filter(x => x.id !== mt.id); metaSel = null; await salvarFin(); agendarAvisosFinDepois(); renderFin();
  }
});
// formulário de meta
let metaEditando = null;
function abrirMetaForm(id) {
  const mt = id ? metaPorId(id) : null; metaEditando = mt;
  $('mfTit').textContent = mt ? 'Editar meta' : 'Nova meta';
  $('mfNome').value = mt?.nome || ''; $('mfAlvo').value = mt ? numBR(mt.alvo) : '';
  $('mfPrazo').value = dataInput(mt?.prazo || new Date(new Date().getFullYear() + 1, new Date().getMonth(), 0).getTime());
  $('mfJa').value = mt ? numBR(mt.jaTinha || 0) : '';
  $('mfConta').innerHTML = '<option value="">Não ligar (guardar na conta)</option>' + fin.contas.filter(ehInvest).map(c => '<option value="' + esc(c.id) + '">' + esc(c.nome) + ' · ' + fmtBRL(saldoConta(c)) + '</option>').join('');
  $('mfConta').value = mt?.contaId || ''; $('mfLembrete').value = mt?.lembrete ?? 'semana';
  previaMeta(); $('metaFinOv').hidden = false;
}
function previaMeta() {
  const alvo = valorBR($('mfAlvo').value), prazo = $('mfPrazo').value ? lerDataInput($('mfPrazo').value) : null;
  const inv = $('mfConta').value ? contaPorId($('mfConta').value) : null;
  $('mfJaBox').hidden = !!inv;
  const ja = inv ? saldoConta(inv) : (valorBR($('mfJa').value || '0') || 0);
  if (isNaN(alvo) || !prazo) { $('mfPrevia').textContent = 'Preencha o valor e o prazo.'; return; }
  const dias = Math.max(1, (prazo - Date.now()) / DIA_MS), falta = Math.max(0, alvo - ja);
  const l = $('mfLembrete').value;
  $('mfPrevia').innerHTML = 'Para chegar no prazo: <b>' + fmtBRL(falta / Math.max(dias / 7, 1)) + '/semana</b> (' + fmtBRL(falta / Math.max(dias / 30.44, 1)) + '/mês).' +
    (l === 'semana' ? ' Toda segunda às 9h eu aviso quanto falta guardar na semana.' : l === 'mes' ? ' Todo dia 1º às 9h eu aviso quanto falta no mês.' : l === 'dia' ? ' Todo dia às 20h eu lembro de guardar.' : '');
}
['mfAlvo', 'mfPrazo', 'mfJa', 'mfConta', 'mfLembrete'].forEach(id => $(id).addEventListener('input', previaMeta));
$('mfCancelar').onclick = () => { $('metaFinOv').hidden = true; };
$('metaFinOv').addEventListener('click', e => { if (e.target === $('metaFinOv')) $('metaFinOv').hidden = true; });
$('formMetaFin').addEventListener('submit', async e => {
  e.preventDefault();
  const alvo = valorBR($('mfAlvo').value); if (isNaN(alvo) || alvo <= 0) { $('mfAlvo').focus(); return; }
  const dados = { nome: $('mfNome').value.trim() || 'Meta', alvo, prazo: lerDataInput($('mfPrazo').value, 23), contaId: $('mfConta').value || null, lembrete: $('mfLembrete').value || null,
    jaTinha: $('mfConta').value ? 0 : (valorBR($('mfJa').value || '0') || 0) };
  if (metaEditando) Object.assign(metaEditando, dados);
  else { const mt = { id: novoId(), ...dados, criado: Date.now() }; mt.base = guardadoMeta(mt); fin.metas.push(mt); }
  if (metaEditando && metaEditando.base === undefined) metaEditando.base = guardadoMeta(metaEditando);
  await salvarFin(); $('metaFinOv').hidden = true; agendarAvisosFinDepois(); renderFin();
});
function novaMetaDoChat(r) {
  const prazo = r.prazo || new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate(), 23).getTime();
  const mt = { id: novoId(), nome: r.nome, alvo: r.valor, prazo, contaId: null, lembrete: 'semana', jaTinha: 0, criado: Date.now(), base: 0, semPrazo: !r.prazo };
  fin.metas.push(mt); return mt;
}
function guardarNaMeta(mt, valor, resgate) {
  const inv = mt.contaId ? contaPorId(mt.contaId) : null, pad = contaPadrao();
  let m;
  if (inv && pad) m = resgate ? { id: novoId(), t: Date.now(), tipo: 'transf', valor, contaId: inv.id, destinoId: pad.id, titulo: 'Resgate · ' + mt.nome, categoria: 'financas', metaId: mt.id }
    : { id: novoId(), t: Date.now(), tipo: 'transf', valor, contaId: pad.id, destinoId: inv.id, titulo: 'Guardei · ' + mt.nome, categoria: 'financas', metaId: mt.id };
  else m = { id: novoId(), t: Date.now(), tipo: resgate ? 'resgatar' : 'guardar', valor, contaId: pad?.id, titulo: (resgate ? 'Tirei · ' : 'Guardei · ') + mt.nome, categoria: 'financas', metaId: mt.id };
  fin.movs.push(m); return m;
}
function respMetaHTML(mt) {
  if (!mt) return '<p>Meta excluída.</p>';
  const s = statsMeta(mt);
  return '<p>✓ Meta criada: <b>' + esc(mt.nome) + '</b></p><dl class="ticket"><dt>Valor</dt><dd>' + fmtBRL(mt.alvo) + '</dd><dt>Prazo</dt><dd>' + fmtDMA(mt.prazo) + (mt.semPrazo ? ' (coloquei 1 ano)' : '') + '</dd>' +
    '<dt>Precisa</dt><dd>' + fmtBRL(s.pMes) + '/mês · ' + fmtBRL(s.pSem) + '/semana</dd></dl><p class="dica">Lembrete: ' + ({ semana: 'toda segunda às 9h', mes: 'todo dia 1º às 9h', dia: 'todo dia às 20h' }[mt.lembrete] || 'desligado') + '.</p>' +
    '<div class="actions"><button type="button" class="btn" data-fa="abrir-meta" data-id="' + esc(mt.id) + '">Ver meta</button><button type="button" class="btn" data-fa="editar-meta" data-id="' + esc(mt.id) + '">Editar</button></div>';
}
function respMetaMovHTML(m) {
  const mt = metaPorId(m.metaId); if (!mt) return '<p>' + esc(m.titulo) + '</p>';
  const resg = m.tipo === 'resgatar' || (m.tipo === 'transf' && m.contaId === mt.contaId);
  const s = statsMeta(mt);
  return '<p>' + (resg ? '↩ <b class="inv">− ' : '✓ <b class="inv">+ ') + fmtBRL(m.valor) + '</b> ' + (resg ? 'da' : 'na') + ' meta <b>' + esc(mt.nome) + '</b>.</p>' +
    '<div class="prog" style="margin:7px 0 4px"><div style="width:' + s.pct + '%"></div></div><span style="font-size:.8rem">' + fmtBRL(s.g) + ' de ' + fmtBRL(mt.alvo) + (s.falta ? ' · faltam ' + fmtBRL(s.falta) + ' (' + fmtBRL(s.pSem) + '/semana até ' + fmtDM(mt.prazo) + ')' : ' · meta concluída 🎉') + '</span>' +
    '<p class="dica">' + (resg ? 'Volta para o saldo do mês.' : 'Sai do saldo do mês como dinheiro guardado (azul).') + '</p>' +
    '<div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
}

// ----- Dívidas: cálculo -----
const linhasDiv = d => tabelaDivida(d);
const pagaK = (d, k) => !!d.pagas?.[k];
function saldoDevedor(d, linhas = linhasDiv(d)) { return Math.max(0, Math.round((d.valor - linhas.filter(r => pagaK(d, r.k)).reduce((a, r) => a + r.amort, 0)) * 100) / 100); }
function proximaParcela(d, linhas = linhasDiv(d)) { return linhas.find(r => !pagaK(d, r.k)) || null; }
function movDaParcela(d, k) { const id = d.pagas?.[k]; return id && id !== 'pre' ? fin.movs.find(m => m.id === id) : null; }
function jurosPagosAno(d, ano, linhas = linhasDiv(d)) {
  return linhas.filter(r => pagaK(d, r.k)).filter(r => { const m = movDaParcela(d, r.k); return new Date(m ? m.t : r.venc).getFullYear() === ano; }).reduce((a, r) => a + r.juros, 0);
}
function valorComAtraso(d, r, diasAtraso) {
  const dias = diasAtraso ?? Math.max(0, Math.floor((inicioDoDia(Date.now()) - inicioDoDia(r.venc)) / DIA_MS));
  if (dias <= 0 || d.semData) return { total: r.parcela, multa: 0, mora: 0, dias: 0 };
  const multa = r.parcela * (d.multa ?? 0.02), mora = r.parcela * (d.mora ?? 0.01) * dias / 30;
  return { total: r.parcela + multa + mora, multa, mora, dias };
}
function valorAntecipacao(d, rows) {
  const nominal = rows.reduce((a, r) => a + r.parcela, 0);
  let vp = nominal;
  if (d.desconto === 'juros' && d.sistema !== 'sem' && d.taxa > 0) vp = rows.reduce((a, r) => a + r.parcela / Math.pow(1 + d.taxa, Math.max(0, (r.venc - Date.now()) / DIA_MS / 30.44)), 0);
  else if (d.desconto === 'fixo') vp = Math.max(0, nominal - (d.descontoFixo || 0) * rows.length);
  return { nominal, vp: Math.round(vp * 100) / 100, desconto: Math.round((nominal - vp) * 100) / 100 };
}
function ultimasAbertas(d, q, linhas = linhasDiv(d)) { const ab = linhas.filter(r => !pagaK(d, r.k)); return q === 'tudo' ? ab : ab.slice(-q); }
function situacaoDiv(d, linhas) {
  if (d.semData) return ['sem data fixa', 'e-zero'];
  const p = proximaParcela(d, linhas); if (!p) return ['quitada ✓', 'e-ok'];
  const dd = difDias(p.venc);
  if (dd < 0) return ['atrasada', 'e-atr'];
  const mesAtual = linhas.find(r => inicioMes(r.venc) === inicioMes(Date.now()));
  if (mesAtual && pagaK(d, mesAtual.k) && dd > 0) return ['paga ✓', 'e-ok'];
  return [dd === 0 ? 'vence hoje' : 'vence em ' + dd + (dd === 1 ? ' dia' : ' dias'), dd <= 7 ? 'e-vence' : 'e-ok'];
}
// parcelas como "contas" para a Agenda, o calendário e os avisos
function dividasComoAg() {
  const out = [];
  for (const d of fin.dividas || []) {
    if (d.semData) continue;
    for (const r of linhasDiv(d)) {
      const id = d.pagas?.[r.k];
      out.push({ id: 'div:' + d.id + ':' + r.k, divida: d, k: r.k, tipo: 'pagar', titulo: d.nome + ' · ' + r.k + '/' + d.n, valor: Math.round(r.parcela * 100) / 100, inicio: r.venc, repetir: null,
        categoria: 'financas', contaId: d.contaId || null, baixas: id ? { [chaveDia(r.venc)]: id } : {} });
    }
  }
  return out;
}

// ----- Dívidas: telas -----
const NOME_SIS = { price: 'Price', sac: 'SAC', sem: 'sem juros' };
function cartaoDiv(d) {
  const L = linhasDiv(d), [st, cls] = situacaoDiv(d, L), p = proximaParcela(d, L), pagas = L.filter(r => pagaK(d, r.k)).length;
  const sd = saldoDevedor(d, L);
  return '<button type="button" class="dv" data-div-id="' + esc(d.id) + '"><div class="tp"><div><b>' + esc(d.nome) + '</b><small>' + esc([d.credor, d.sistema !== 'sem' && d.taxa ? fmtTaxa(d.taxa) + '% a.m.' : '', NOME_SIS[d.sistema]].filter(Boolean).join(' · ')) + '</small></div><em class="' + cls + '">' + st + '</em></div>' +
    '<div class="prog red"><div style="width:' + (pagas / d.n * 100) + '%"></div></div><div class="vals"><span><b>' + pagas + '</b> de ' + d.n + ' parcelas</span><span>' + (d.semData ? fmtBRL(L[0].parcela) + ' por mês' : (p ? 'termina em ' + fmtMesAno(L.filter(r => !pagaK(d, r.k)).pop().venc) : 'quitada')) + '</span></div>' +
    '<div class="l3"><div><b>' + fmtBRL(p ? p.parcela : L[0].parcela) + '</b><small>parcela' + (d.semData ? '' : ' · dia ' + new Date(d.primeiro).getDate()) + '</small></div><div><b class="gas">' + fmtBRL(sd) + '</b><small>saldo devedor</small></div><div><b class="' + (cls === 'e-atr' ? 'gas' : cls === 'e-vence' ? 'am' : '') + '">' + (p && !d.semData ? fmtDM(p.venc) : '—') + '</b><small>próxima</small></div></div></button>';
}
function renderDividas() {
  const box = $('finDiv');
  if (divSel && divPorId(divSel)) { renderDivDet(); return; }
  divSel = null;
  const ds = fin.dividas || [];
  if (!ds.length) {
    box.innerHTML = '<div class="empty"><b>Nenhuma dívida cadastrada.</b><br>Cadastre empréstimos, financiamentos e parcelados, com juros, prazo e vencimento. Ou escreva em Lançamentos: <i>“financiamento moto 18 mil, 48x de 538,96, 1,59%, dia 10, desde jun/25”</i>.</div>' +
      '<div class="actions"><button type="button" class="btn primary" data-fdv="nova">+ Nova dívida</button></div>';
    return;
  }
  const agora = Date.now(), ano = new Date().getFullYear();
  let total = 0, mes = 0, juros = 0;
  for (const d of ds) { const L = linhasDiv(d); total += saldoDevedor(d, L); juros += jurosPagosAno(d, ano, L); mes += L.filter(r => !d.semData && inicioMes(r.venc) === inicioMes(agora)).reduce((a, r) => a + r.parcela, 0); }
  let h = '<div class="kp kpv"><div><b class="gas">' + fmtBRL(total) + '</b><small>devo no total</small></div><div><b>' + fmtBRL(mes) + '</b><small>parcelas de ' + MESES_LONGO[new Date().getMonth()] + '</small></div><div><b class="gas">' + fmtBRL(juros) + '</b><small>juros pagos em ' + ano + '</small></div></div>';
  h += ds.map(cartaoDiv).join('') + '<div class="actions"><button type="button" class="btn primary" data-fdv="nova">+ Nova dívida</button></div>';
  box.innerHTML = h;
}
function renderDivDet() {
  const d = divPorId(divSel), L = linhasDiv(d), sd = saldoDevedor(d, L), p = proximaParcela(d, L);
  const abertas = L.filter(r => !pagaK(d, r.k));
  const pagas = L.filter(r => pagaK(d, r.k)).length, totalPagar = L.reduce((a, r) => a + r.parcela, 0), jurosTot = L.reduce((a, r) => a + r.juros, 0);
  const taxaAno = d.taxa ? (Math.pow(1 + d.taxa, 12) - 1) : 0;
  const linha = (r, cls = '') => '<tr class="' + cls + '"><td>' + pad(r.k) + (d.semData ? '' : ' · ' + pad(new Date(r.venc).getDate()) + '/' + MESES_N[new Date(r.venc).getMonth()]) + '</td><td>' + numBR(r.parcela) + '</td><td class="gas">' + numBR(r.juros) + '</td><td>' + numBR(r.amort) + '</td><td>' + inteiroBR(r.saldo) + '</td></tr>';
  const iP = p ? p.k - 1 : L.length;
  const mostrar = new Set(); for (let k = Math.max(0, iP - 2); k < Math.min(L.length, iP + 3); k++) mostrar.add(k); mostrar.add(L.length - 1);
  let rows = '', ult = -1;
  [...mostrar].sort((a, b) => a - b).forEach(k => { if (ult >= 0 && k > ult + 1) rows += '<tr><td colspan="5" class="mais">⋯ mais ' + (k - ult - 1) + ' parcelas</td></tr>'; rows += linha(L[k], pagaK(d, L[k].k) ? 'pg' : p && L[k].k === p.k ? 'px' : ''); ult = k; });
  let sugestao = '';
  if (abertas.length >= 3 && d.desconto !== 'nao' && (d.taxa > 0 || d.desconto === 'fixo')) { const a = valorAntecipacao(d, abertas.slice(-3)); if (a.desconto > 0.5) sugestao = '<div class="aviso v">💡 Antecipando as <b>3 últimas</b> hoje você paga <b>' + fmtBRL(a.vp) + '</b> em vez de ' + fmtBRL(a.nominal) + ': <b>desconto de ' + fmtBRL(a.desconto) + '</b>.</div>'; }
  const h = '<button type="button" class="volta-lista" data-fdv="lista">‹ Dívidas</button>' +
    '<div class="rot">SALDO DEVEDOR HOJE</div><span class="big gas">' + fmtBRL(sd) + '</span>' +
    '<div class="prog red"><div style="width:' + (pagas / d.n * 100) + '%"></div></div><div class="vals"><span><b>' + pagas + '</b> de ' + d.n + ' pagas</span><span>' + (p ? 'faltam ' + (d.n - pagas) + (d.semData ? '' : ' · até ' + fmtDMA(abertas[abertas.length - 1].venc)) : 'quitada ✓') + '</span></div>' +
    '<div class="info"><div><small>Valor emprestado</small><b>' + fmtBRL(d.valor) + '</b></div><div><small>Juros</small><b>' + (d.sistema === 'sem' || !d.taxa ? 'sem juros' : fmtTaxa(d.taxa) + '% a.m. · ' + pct1(taxaAno) + '% a.a.') + '</b></div>' +
    '<div><small>Total a pagar</small><b>' + fmtBRL(totalPagar) + '</b></div><div><small>Juros no contrato</small><b class="gas">' + fmtBRL(jurosTot) + '</b></div></div>' +
    '<div class="actions">' + (p ? '<button type="button" class="btn primary" data-fdv="pagar">Pagar parcela ' + p.k + '</button><button type="button" class="btn" data-fdv="antecipar">Antecipar</button>' : '') + '<button type="button" class="btn" data-fdv="editar">Editar</button><button type="button" class="btn danger" data-fdv="excluir">Excluir</button></div>' +
    sugestao + '<div class="grp">Parcelas</div><table class="tab"><tr><th>Nº' + (d.semData ? '' : ' · venc.') + '</th><th>Parcela</th><th>Juros</th><th>Amortiza</th><th>Saldo</th></tr>' + rows + '</table>';
  $('finDiv').innerHTML = h;
  $('subFin').textContent = 'dívida' + (d.credor ? ' · ' + d.credor : '');
}
$('finDiv').addEventListener('click', async e => {
  const c = e.target.closest('[data-div-id]'); if (c) { divSel = c.dataset.divId; renderFin(); $('finDiv').scrollTop = 0; return; }
  const b = e.target.closest('[data-fdv]'); if (!b) return;
  const a = b.dataset.fdv, d = divPorId(divSel);
  if (a === 'nova') abrirDivForm(null);
  if (a === 'lista') { divSel = null; renderFin(); }
  if (a === 'editar' && d) abrirDivForm(d.id);
  if (a === 'pagar' && d) abrirPagar(d, 'parcela');
  if (a === 'antecipar' && d) abrirPagar(d, 'antecipar');
  if (a === 'excluir' && d) {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Excluir a dívida? (os pagamentos continuam como gastos)'; return; }
    fin.movs.forEach(m => { if (m.dividaId === d.id) { delete m.dividaId; delete m.parcelas; } });
    fin.dividas = fin.dividas.filter(x => x.id !== d.id); divSel = null; await salvarFin(); agendarAvisosFinDepois(); renderFin();
  }
});
// formulário de dívida
let divEditando = null;
function abrirDivForm(id) {
  const d = id ? divPorId(id) : null; divEditando = d;
  $('dvTit').textContent = d ? 'Editar dívida' : 'Nova dívida';
  $('dvTipo').value = d?.tipo || 'emprestimo'; $('dvNome').value = d?.nome || ''; $('dvCredor').value = d?.credor || '';
  $('dvValor').value = d ? numBR(d.valor) : ''; $('dvTaxa').value = d?.taxa ? numBR(d.taxa * 100) : '';
  $('dvN').value = d?.n || ''; $('dvParcela').value = d?.parcela ? numBR(d.parcela) : '';
  $('dvPrimeiro').value = dataInput(d?.primeiro || Date.now()); $('dvSistema').value = d?.sistema || 'price';
  $('dvJa').value = d ? Object.keys(d.pagas || {}).length : 0;
  $('dvMulta').value = numBR(((d?.multa ?? 0.02) * 100)); $('dvMora').value = numBR(((d?.mora ?? 0.01) * 100));
  $('dvDesconto').value = d?.desconto || 'juros'; $('dvDescFixo').value = d?.descontoFixo ? numBR(d.descontoFixo) : '';
  $('dvSemData').checked = !!d?.semData;
  $('dvConta').innerHTML = opcoesContas(d?.contaId, false, 'Conta padrão');
  previaDiv(); $('divOv').hidden = false;
}
function dadosDivForm() {
  const taxa = valorBR($('dvTaxa').value || '0');
  return { tipo: $('dvTipo').value, nome: $('dvNome').value.trim() || ({ emprestimo: 'Empréstimo', financiamento: 'Financiamento', cartao: 'Parcelado', outro: 'Dívida' }[$('dvTipo').value]), credor: $('dvCredor').value.trim(),
    valor: valorBR($('dvValor').value), taxa: isNaN(taxa) ? 0 : taxa / 100, n: Math.max(1, parseInt($('dvN').value) || 1), parcela: $('dvParcela').value.trim() ? valorBR($('dvParcela').value) : null,
    primeiro: lerDataInput($('dvPrimeiro').value), sistema: $('dvSistema').value, multa: (valorBR($('dvMulta').value || '0') || 0) / 100, mora: (valorBR($('dvMora').value || '0') || 0) / 100,
    desconto: $('dvDesconto').value, descontoFixo: valorBR($('dvDescFixo').value || '0') || 0, semData: $('dvSemData').checked, contaId: $('dvConta').value || null };
}
function previaDiv() {
  const d = dadosDivForm(); $('dvDescFixoBox').hidden = d.desconto !== 'fixo';
  if (isNaN(d.valor) || !d.valor) { $('dvPrevia').textContent = 'Preencha o valor emprestado e o número de parcelas.'; return; }
  if (d.parcela !== null && isNaN(d.parcela)) d.parcela = null;
  const L = tabelaDivida(d), tot = L.reduce((a, r) => a + r.parcela, 0);
  $('dvPrevia').innerHTML = (d.parcela ? '' : 'Parcela calculada: <b>' + fmtBRL(L[0].parcela) + '</b>' + (d.sistema === 'sac' ? ' (diminui todo mês)' : '') + '. ') + 'Total a pagar <b>' + fmtBRL(tot) + '</b>, sendo <b>' + fmtBRL(tot - d.valor) + '</b> de juros.' + (d.semData ? '' : ' Aviso 2 dias antes e no dia.');
}
['dvValor', 'dvTaxa', 'dvN', 'dvParcela', 'dvSistema', 'dvDesconto', 'dvSemData'].forEach(id => $(id).addEventListener('input', previaDiv));
$('dvCancelar').onclick = () => { $('divOv').hidden = true; };
$('divOv').addEventListener('click', e => { if (e.target === $('divOv')) $('divOv').hidden = true; });
$('formDiv').addEventListener('submit', async e => {
  e.preventDefault();
  const dados = dadosDivForm(); if (isNaN(dados.valor) || dados.valor <= 0) { $('dvValor').focus(); return; }
  if (dados.parcela !== null && isNaN(dados.parcela)) dados.parcela = null;
  if (dados.sistema === 'sem') dados.taxa = 0;
  const ja = Math.max(0, Math.min(dados.n, parseInt($('dvJa').value) || 0));
  let d = divEditando;
  if (d) Object.assign(d, dados); else { d = { id: novoId(), ...dados, pagas: {}, criado: Date.now() }; fin.dividas.push(d); }
  d.pagas = d.pagas || {};
  for (const k of Object.keys(d.pagas)) if (d.pagas[k] === 'pre' && (+k > ja || +k > d.n)) delete d.pagas[k];
  for (let k = 1; k <= ja; k++) if (!d.pagas[k]) d.pagas[k] = 'pre';
  await salvarFin(); $('divOv').hidden = true; agendarAvisosFinDepois(); renderFin(); if (tela === 'agenda') renderAgenda();
});
function novaDividaDoChat(r) {
  const d = { id: novoId(), tipo: r.tipo, nome: r.nome, credor: '', valor: r.valor, taxa: r.taxa || 0, n: r.n, parcela: r.parcela, primeiro: r.primeiro,
    sistema: r.taxa ? 'price' : (r.parcela && Math.abs(r.parcela * r.n - r.valor) > 1 ? 'price' : 'sem'), multa: 0.02, mora: 0.01, desconto: 'juros', descontoFixo: 0, semData: false, contaId: null, pagas: {}, criado: Date.now() };
  if (!r.taxa && r.parcela && r.parcela * r.n > r.valor + 1) { // descobre a taxa pela parcela (Price)
    let lo = 0, hi = 0.2; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; const pmt = r.valor * mid / (1 - Math.pow(1 + mid, -r.n)); if (pmt > r.parcela) hi = mid; else lo = mid; }
    d.taxa = Math.round((lo + hi) / 2 * 10000) / 10000; d.sistema = 'price';
  }
  const hoje0 = inicioDoDia(Date.now()).getTime();
  for (const row of tabelaDivida(d)) if (row.venc < hoje0 + DIA_MS) d.pagas[row.k] = 'pre';
  fin.dividas.push(d); return d;
}
// pagar parcela / antecipar
let pagarAlvo = null;
function abrirPagar(d, modo, q = 3) {
  pagarAlvo = { d, modo };
  $('pgConta').innerHTML = opcoesContas(d.contaId || contaPadrao()?.id);
  $('pgData').value = dataInput(Date.now());
  $('pgQuantasBox').hidden = modo !== 'antecipar';
  if (modo === 'antecipar') { const ab = linhasDiv(d).filter(r => !pagaK(d, r.k)).length; $('pgQuantas').innerHTML = Array.from({ length: ab }, (_, i) => '<option value="' + (i + 1) + '">' + (i + 1 === ab ? 'Todas (' + ab + ') · quitar' : (i + 1) + (i ? ' últimas' : ' (a última)')) + '</option>').join(''); $('pgQuantas').value = String(Math.min(q, ab)); }
  calcPagar(); $('pagarOv').hidden = false;
}
function calcPagar() {
  const { d, modo } = pagarAlvo, L = linhasDiv(d);
  if (modo === 'parcela') {
    const p = proximaParcela(d, L), at = valorComAtraso(d, p);
    $('pgTit').textContent = 'Pagar parcela ' + p.k + '/' + d.n + ' · ' + d.nome;
    $('pgInfo').innerHTML = 'Parcela ' + fmtBRL(p.parcela) + (d.semData ? '' : ', vence ' + fmtDMA(p.venc)) + (at.dias ? '<br><span class="gas">' + at.dias + ' dias de atraso: multa ' + fmtBRL(at.multa) + ' + mora ' + fmtBRL(at.mora) + '</span>' : '');
    $('pgValor').value = numBR(at.total);
  } else {
    const q = +$('pgQuantas').value || 1, rows = ultimasAbertas(d, q, L), a = valorAntecipacao(d, rows);
    $('pgTit').textContent = 'Antecipar · ' + d.nome;
    $('pgInfo').innerHTML = 'Parcelas ' + rows[0].k + (rows.length > 1 ? ' a ' + rows[rows.length - 1].k : '') + ': ' + fmtBRL(a.nominal) + (a.desconto > 0 ? '<br><span class="rec">Desconto de ' + fmtBRL(a.desconto) + (d.desconto === 'juros' ? ' (juros futuros tirados)' : '') + '</span>' : '') + '<br><span class="dica">Confira o valor no boleto do banco e corrija se precisar.</span>';
    $('pgValor').value = numBR(a.vp);
  }
}
$('pgQuantas').addEventListener('input', calcPagar);
$('pgCancelar').onclick = () => { $('pagarOv').hidden = true; };
$('pagarOv').addEventListener('click', e => { if (e.target === $('pagarOv')) $('pagarOv').hidden = true; });
function registrarPagamentoDiv(d, rows, valor, t, contaId, extra = {}) {
  if (!fin.contas.length) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' });
  const m = { id: novoId(), t, tipo: 'gasto', valor: Math.round(valor * 100) / 100, contaId: contaId || d.contaId || contaPadrao()?.id,
    titulo: d.nome + (rows.length === 1 ? ' · parcela ' + rows[0].k + '/' + d.n : ' · parcelas ' + rows[0].k + ' a ' + rows[rows.length - 1].k), categoria: 'financas', dividaId: d.id, parcelas: rows.map(r => r.k), ...extra };
  d.pagas = d.pagas || {}; for (const r of rows) d.pagas[r.k] = m.id;
  fin.movs.push(m); return m;
}
$('formPagar').addEventListener('submit', async e => {
  e.preventDefault();
  const { d, modo } = pagarAlvo, v = valorBR($('pgValor').value); if (isNaN(v)) return;
  const L = linhasDiv(d), rows = modo === 'parcela' ? [proximaParcela(d, L)] : ultimasAbertas(d, +$('pgQuantas').value || 1, L);
  const ag = new Date(); let t = lerDataInput($('pgData').value, ag.getHours()); if (t > Date.now()) t = lerDataInput($('pgData').value, 9);
  const nominal = rows.reduce((a, r) => a + r.parcela, 0);
  registrarPagamentoDiv(d, rows, v, t, $('pgConta').value, modo === 'antecipar' ? { antecipacao: true, desconto: Math.max(0, nominal - v) } : {});
  await salvarFin(); $('pagarOv').hidden = true; agendarAvisosFinDepois(); atualizarTudo();
});
function respDivHTML(d) {
  if (!d) return '<p>Dívida excluída.</p>';
  const L = linhasDiv(d), pagas = L.filter(r => pagaK(d, r.k)).length, jt = L.reduce((a, r) => a + r.juros, 0);
  return '<p>✓ Dívida criada: <b>' + esc(d.nome) + '</b></p><dl class="ticket"><dt>Parcelas</dt><dd>' + d.n + ' × ' + fmtBRL(L[0].parcela) + ' · dia ' + new Date(d.primeiro).getDate() + '</dd>' +
    '<dt>Juros</dt><dd>' + (d.taxa ? fmtTaxa(d.taxa) + '% a.m. (' + NOME_SIS[d.sistema] + ')' : 'sem juros') + '</dd>' +
    (pagas ? '<dt>Já pagas</dt><dd>' + pagas + ' de ' + d.n + '</dd>' : '') + '<dt>Saldo</dt><dd class="gas">' + fmtBRL(saldoDevedor(d, L)) + '</dd><dt>Juros total</dt><dd class="gas">' + fmtBRL(jt) + '</dd></dl>' +
    (pagas ? '<p class="dica">Considerei pagas as parcelas que já venceram. Corrija em Editar se precisar.</p>' : '') +
    '<div class="actions"><button type="button" class="btn" data-fa="abrir-div" data-id="' + esc(d.id) + '">Ver dívida</button><button type="button" class="btn" data-fa="editar-div" data-id="' + esc(d.id) + '">Editar</button><button type="button" class="btn" data-fa="desfazer-div" data-id="' + esc(d.id) + '">Desfazer</button></div>';
}
function respDivMovHTML(m) {
  const d = divPorId(m.dividaId);
  let h = '<p><b class="gas">− ' + fmtBRL(m.valor) + '</b> · ' + esc(m.titulo) + '</p>';
  if (m.atraso) h += '<dl class="ticket"><dt>Parcela</dt><dd>' + fmtBRL(m.atraso.parcela) + '</dd><dt>Multa</dt><dd class="gas">+ ' + fmtBRL(m.atraso.multa) + '</dd><dt>Mora ' + m.atraso.dias + ' dias</dt><dd class="gas">+ ' + fmtBRL(m.atraso.mora) + '</dd></dl>';
  if (m.desconto > 0.009) h += '<p><span class="rec">desconto de ' + fmtBRL(m.desconto) + '</span>' + (m.antecipacao ? ' 🎉' : '') + '</p>';
  if (d) { const L = linhasDiv(d), ab = L.filter(r => !pagaK(d, r.k)); h += '<p class="dica">' + (ab.length ? 'Saldo devedor: ' + fmtBRL(saldoDevedor(d, L)) + (m.antecipacao && !d.semData ? '. Agora termina em ' + fmtMesAno(ab[ab.length - 1].venc) + '.' : '. Próxima: ' + (d.semData ? 'parcela ' + ab[0].k : fmtDM(ab[0].venc)) + '.') : 'Dívida quitada! 🎉') + '</p>'; }
  return h + '<div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
}

// ----- lembretes de metas -----
function avisosMetas() {
  const lista = [], h = new Date();
  for (const mt of fin.metas || []) {
    if (!mt.lembrete) continue; const s = statsMeta(mt); if (s.falta <= 0) continue;
    const datas = [];
    if (mt.lembrete === 'dia') for (let k = 0; k < 7; k++) datas.push([new Date(h.getFullYear(), h.getMonth(), h.getDate() + k, 20, 0), s.pDia, 'hoje']);
    else if (mt.lembrete === 'mes') for (let k = 1; k <= 2; k++) datas.push([new Date(h.getFullYear(), h.getMonth() + k, 1, 9, 0), s.pMes, 'este mês']);
    else for (let k = 1; k <= 4; k++) { const n = ((8 - h.getDay()) % 7 || 7) + (k - 1) * 7; datas.push([new Date(h.getFullYear(), h.getMonth(), h.getDate() + n, 9, 0), s.pSem, 'esta semana']); }
    datas.filter(([at]) => at > h).forEach(([at, v, quando], k) => lista.push({ id: idNumerico('meta#' + mt.id + '#' + k), title: 'Meta ' + mt.nome, body: 'Guarde ' + fmtBRL(v) + ' ' + quando + ' para chegar a ' + fmtBRL(mt.alvo) + ' até ' + fmtDM(mt.prazo) + '.', schedule: { at, allowWhileIdle: true }, extra: { fin: 'metas' } }));
  }
  return lista;
}
$('abaMetas').onclick = () => { finAba = 'metas'; renderFin(); };
$('abaDiv').onclick = () => { finAba = 'div'; renderFin(); };
