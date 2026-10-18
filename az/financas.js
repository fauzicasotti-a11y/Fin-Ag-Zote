
// =====================================================================
// 1.8 · Finanças: Saldos (contas bancárias e investimentos), Lançamentos (chat),
// Agenda › Contas (contas a pagar e a receber), valores no calendário e Resumo › Finanças.
// Cores: receitas verde, gastos vermelho, guardado/investido azul.
// =====================================================================
let fin = { contas: [], agendadas: [], movs: [], chat: [], avisos: [], metas: [], dividas: [], cartoes: [] };
let finAba = 'saldos', finConta = null, movSel = null;
// o histórico da conversa é gravado à parte e só quando muda (1.14)
let finChatGravado = null;
async function salvarFin() {
  cacheSaldo = null;
  const { chat, ...resto } = fin;
  await guardar('az-fin', resto);
  const txt = JSON.stringify(chat || []); if (txt !== finChatGravado) { finChatGravado = txt; await guardar('az-fin-chat', chat || []); }
}
const contaPorId = id => fin.contas.find(c => c.id === id) || null;
const ehInvest = c => c?.tipo === 'investimento';
const contaPadrao = () => fin.contas.find(c => c.padrao && !ehInvest(c)) || fin.contas.find(c => !ehInvest(c)) || null;
const TIPOS_CONTA = { corrente: 'Conta corrente', poupanca: 'Poupança', investimento: 'Investimento', dinheiro: 'Dinheiro' };
const valorBR = txt => { const r = finValor([...String(txt)].map(FIN_NORM).join('')); return r ? r.valor : NaN; };
const numBR = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const inicioMes = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const fimMes = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1; };

// ----- saldos e totais -----
function efeito(m, contaId) {
  if (m.tipo === 'transf') return (m.destinoId === contaId ? m.valor : 0) - (m.contaId === contaId ? m.valor : 0);
  if (m.contaId !== contaId) return 0;
  if (m.tipo === 'credito' || m.tipo === 'estorno' || m.tipo === 'rotativo') return 0;
  return m.tipo === 'gasto' || m.tipo === 'guardar' || m.tipo === 'pagfatura' ? -m.valor : m.valor; // receita, rend, resgatar, ajuste (com sinal)
}
// saldos com cache: cada conta guarda os efeitos em ordem de data e a soma acumulada;
// a busca é binária. O cache é refeito quando os lançamentos mudam (1.14).
let cacheSaldo = null, cacheMovs = null, cacheLen = -1;
function montarCacheSaldo() {
  cacheSaldo = new Map(); cacheMovs = fin.movs; cacheLen = fin.movs.length;
  for (const m of fin.movs) for (const id of [m.contaId, m.destinoId]) {
    if (!id) continue; const e = efeito(m, id); if (!e) continue;
    if (!cacheSaldo.has(id)) cacheSaldo.set(id, []); cacheSaldo.get(id).push([m.t, e]);
  }
  for (const l of cacheSaldo.values()) { l.sort((a, b) => a[0] - b[0]); let s = 0; for (const x of l) { s += x[1]; x[1] = s; } }
}
function saldoConta(c, ate = Infinity) {
  if (!cacheSaldo || cacheMovs !== fin.movs || cacheLen !== fin.movs.length) montarCacheSaldo();
  const l = cacheSaldo.get(c.id); let s = c.saldoInicial || 0;
  if (l && l.length) { let lo = 0, hi = l.length - 1, k = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (l[mid][0] <= ate) { k = mid; lo = mid + 1; } else hi = mid - 1; } if (k >= 0) s += l[k][1]; }
  return Math.round(s * 100) / 100;
}
// guardado: dinheiro que foi das contas para investimentos (resgate volta ao saldo)
function sinalGuardado(m) {
  if (m.tipo === 'guardar') return 1;
  if (m.tipo === 'resgatar') return -1;
  if (m.tipo !== 'transf') return 0;
  const o = ehInvest(contaPorId(m.contaId)), d = ehInvest(contaPorId(m.destinoId));
  return !o && d ? 1 : o && !d ? -1 : 0;
}
function totais(de, ate) {
  const r = { receitas: 0, gastos: 0, guardado: 0, rend: 0, porCat: {}, porDia: {} };
  for (const m of fin.movs) {
    if (m.t < de || m.t > ate) continue;
    if (m.tipo === 'receita' && !m.reemb) r.receitas += m.valor;
    if (m.tipo === 'gasto') { const g = valorGasto(m); r.gastos += g; r.porCat[m.categoria || 'pessoal'] = (r.porCat[m.categoria || 'pessoal'] || 0) + g; const k = inicioDoDia(m.t).getTime(); r.porDia[k] = (r.porDia[k] || 0) + g; }
    if (m.tipo === 'rend') r.rend += m.valor;
    if (m.tipo === 'pagfatura') { r.gastos += m.valor; for (const [c, v] of Object.entries(categoriasDoPagamento(m))) r.porCat[c] = (r.porCat[c] || 0) + v; const k = inicioDoDia(m.t).getTime(); r.porDia[k] = (r.porDia[k] || 0) + m.valor; }
    r.guardado += sinalGuardado(m) * m.valor;
  }
  r.saldo = r.receitas - r.gastos - r.guardado;
  return r;
}
function corMov(m) {
  if (m.tipo === 'gasto' || m.tipo === 'pagfatura' || m.tipo === 'credito') return 'gas';
  if (m.tipo === 'estorno') return 'rec';
  if (m.tipo === 'receita') return 'rec';
  if (m.tipo === 'rend' || sinalGuardado(m)) return 'inv';
  return 'neu';
}

// ----- contas programadas (a pagar / a receber) -----
function ocorrenciasConta(ag, de, ate) {
  return datasDaConta(ag, de, ate).map(t => { const chave = chaveDia(t); const movId = ag.baixas?.[chave]; const mov = movId && movId !== 'pre' ? fin.movs.find(m => m.id === movId) : null;
    return { ag, t, chave, paga: !!mov || movId === 'pre', mov }; });
}
const todasAgs = () => [...fin.agendadas, ...dividasComoAg(), ...cartoesComoAg()];
function todasOcorrencias(de, ate) { return todasAgs().flatMap(ag => ocorrenciasConta(ag, de, ate)).sort((a, b) => a.t - b.t); }
const pendentesDe = (ag, perto) => ocorrenciasConta(ag, perto - 60 * 86400000, perto + 25 * 86400000).filter(o => !o.paga);
function previsaoFimMes(c) {
  if (!c) return null;
  const agora = Date.now(), fim = fimMes(agora);
  let s = saldoConta(c);
  const pad = contaPadrao();
  for (const o of todasOcorrencias(inicioMes(agora) - 60 * 86400000, fim)) {
    if (o.paga) continue;
    const alvo = o.ag.contaId ? contaPorId(o.ag.contaId) : pad;
    if (alvo?.id !== c.id) continue;
    s += o.ag.tipo === 'receber' ? o.ag.valor : -o.ag.valor;
  }
  return s;
}
function statusOc(o) {
  if (o.paga) return o.ag.tipo === 'receber' ? 'recebida' : 'paga';
  const d = difDias(o.t);
  if (d < 0) return 'atrasada';
  if (d === 0) return 'vence hoje';
  if (d === 1) return 'vence amanhã';
  return 'vence em ' + d + ' dias';
}

// ----- tela Finanças -----
function abrirFin(aba) { if (aba) finAba = aba; OCULTAR = !!config.esconderValores; abrir('fin'); }
function renderFin() {
  cacheSaldo = null;
  [['abaSaldos', 'saldos'], ['abaGastar', 'gastar'], ['abaExtrato', 'extrato'], ['abaLanc', 'chat'], ['abaCartoes', 'cartoes'], ['abaMetas', 'metas'], ['abaDiv', 'div']].forEach(([id, a]) => $(id).classList.toggle('on', finAba === a));
  $('finSaldos').hidden = finAba !== 'saldos'; $('finGastar').hidden = finAba !== 'gastar'; $('finExtrato').hidden = finAba !== 'extrato'; $('chatFin').hidden = finAba !== 'chat'; $('formFin').hidden = finAba !== 'chat'; if (finAba !== 'chat') { $('finSug').hidden = true; $('finEdit').hidden = true; }
  $('finMetas').hidden = finAba !== 'metas'; $('finDiv').hidden = finAba !== 'div'; $('finCartoes').hidden = finAba !== 'cartoes';
  $('btnOlho').hidden = !config.esconderValores; $('btnOlho').classList.toggle('on', !OCULTAR);
  const h = new Date();
  $('subFin').textContent = finConta && finAba === 'saldos' ? (contaPorId(finConta)?.nome || '') : MESES_LONGO[h.getMonth()] + ' de ' + h.getFullYear();
  if (finAba === 'saldos') { if (finConta && contaPorId(finConta)) renderContaDet(); else { finConta = null; renderSaldos(); } }
  else if (finAba === 'gastar') renderGastar();
  else if (finAba === 'extrato') renderExtrato();
  else if (finAba === 'metas') renderMetas();
  else if (finAba === 'cartoes') renderCartoes();
  else if (finAba === 'div') renderDividas();
  else renderChatFin();
  setTimeout(() => { const on = document.querySelector('#telaFin .abas .on'); if (on) on.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }, 20);
}
function linhaConta(c) {
  const s = saldoConta(c), inv = ehInvest(c);
  const rend = inv ? fin.movs.filter(m => m.tipo === 'rend' && m.contaId === c.id && m.t >= inicioMes(Date.now())).reduce((a, m) => a + m.valor, 0) : 0;
  const mLig = inv ? (fin.metas || []).find(m => m.contaId === c.id) : null;
  const sub = inv ? [mLig ? 'meta ' + mLig.nome : '', c.aplicacao, c.rende, c.instituicao].filter(Boolean).join(' · ') : [TIPOS_CONTA[c.tipo], c.instituicao, c.padrao ? 'padrão dos lançamentos' : ''].filter(Boolean).join(' · ');
  return '<button type="button" class="cx" data-conta="' + esc(c.id) + '"><span class="ic ' + (inv ? 'inv' : '') + '">' + (inv ? '📈' : c.tipo === 'dinheiro' ? '💵' : c.tipo === 'poupanca' ? '🐷' : '🏦') + '</span>' +
    '<b>' + esc(c.nome) + '</b><span class="v ' + (inv ? 'inv' : s < 0 ? 'gas' : '') + '">' + fmtBRL(s) + (rend ? '<small class="rec">+ ' + fmtBRL(rend) + ' no mês</small>' : '') + '</span><small>' + esc(sub) + '</small></button>';
}
function renderSaldos() {
  const box = $('finSaldos');
  if (!fin.contas.length) {
    box.innerHTML = '<div class="empty"><b>Cadastre suas contas.</b><br>Coloque aqui a conta corrente, a poupança, o dinheiro da carteira e seus investimentos, com o saldo de hoje. Depois, cada lançamento atualiza o saldo sozinho.</div>' +
      '<div class="actions"><button type="button" class="btn primary" data-fs="nova">+ Cadastrar conta</button></div>';
    return;
  }
  const normais = fin.contas.filter(c => !ehInvest(c)), invs = fin.contas.filter(ehInvest);
  const tc = normais.reduce((a, c) => a + saldoConta(c), 0), ti = invs.reduce((a, c) => a + saldoConta(c), 0);
  const agora = Date.now(), t = totais(inicioMes(agora), fimMes(agora));
  const emMetas = (fin.metas || []).filter(m => !m.contaId || !contaPorId(m.contaId)).reduce((a, m) => a + guardadoMeta(m), 0);
  const devo = (fin.dividas || []).reduce((a, d) => a + saldoDevedor(d), 0), noCartao = devidoCartoes();
  let h = '<div class="pat"><small>Patrimônio hoje</small><span class="big' + (tc + ti + emMetas - devo - noCartao < 0 ? ' gas' : '') + '">' + fmtBRL(tc + ti + emMetas - devo - noCartao) + '</span><div class="eq"><span>contas <b>' + fmtBRL(tc) + '</b></span>' + (invs.length ? '<span class="inv">+ investido <b>' + fmtBRL(ti) + '</b></span>' : '') + (emMetas ? '<span class="inv">+ em metas <b>' + fmtBRL(emMetas) + '</b></span>' : '') + (devo ? '<span class="gas">− dívidas <b>' + fmtBRL(devo) + '</b></span>' : '') + (noCartao ? '<span class="gas">− cartões <b>' + fmtBRL(noCartao) + '</b></span>' : '') + '</div></div>';
  h += graficoPatrimonioHTML();
  h += '<div class="grp">' + maiuscula(MESES_LONGO[new Date().getMonth()]) + '</div><div class="kp kp4"><div><b class="rec">' + fmtBRL(t.receitas) + '</b><small>entradas</small></div><div><b class="gas">' + fmtBRL(t.gastos) + '</b><small>gastos</small></div><div><b class="inv">' + fmtBRL(t.guardado) + '</b><small>guardado</small></div><div><b class="' + (t.saldo < 0 ? 'gas' : '') + '">' + fmtBRL(t.saldo) + '</b><small>saldo do mês</small></div></div>';
  if (noCartao) h += '<div class="aviso a">💳 No cartão, a pagar: <b>' + fmtBRL(noCartao) + '</b>. Entra nos gastos do mês em que a fatura for paga.</div>';
  h += '<div class="gh"><span>Contas</span><b>' + fmtBRL(tc) + '</b></div>' + normais.map(linhaConta).join('');
  if (invs.length) h += '<div class="gh"><span>Investimentos</span><b class="inv">' + fmtBRL(ti) + '</b></div>' + invs.map(linhaConta).join('');
  const pad = contaPadrao(), prev = previsaoFimMes(pad);
  if (pad && prev !== null && Math.abs(prev - saldoConta(pad)) > 0.009) {
    const n = todasOcorrencias(inicioMes(agora) - 60 * 86400000, fimMes(agora)).filter(o => !o.paga && (o.ag.contaId ? o.ag.contaId === pad.id : true)).length;
    h += '<div class="aviso a">📅 Fim do mês previsto em ' + esc(pad.nome) + ': <b>' + fmtBRL(prev) + '</b>, depois de ' + n + (n === 1 ? ' conta programada.' : ' contas programadas.') + '</div>';
  }
  h += receberHTML();
  h += '<div class="actions"><button type="button" class="btn primary" data-fs="nova">+ Nova conta</button><button type="button" class="btn" data-fs="lanc">Lançar</button><button type="button" class="btn" data-fs="extrato">Extrato</button></div>';
  box.innerHTML = h;
}
function graficoConta(c) {
  const agora = Date.now(), ini = inicioMes(agora), fim = fimMes(agora);
  const dias = new Date(fim).getDate(), hoje = new Date().getDate();
  const desde = c.criado && c.criado > ini ? new Date(c.criado).getDate() : 1;
  const pts = []; for (let d = desde; d <= hoje; d++) pts.push([d, saldoConta(c, new Date(new Date(ini).getFullYear(), new Date(ini).getMonth(), d, 23, 59).getTime())]);
  let prev = [[hoje, saldoConta(c)]];
  if (c.id === contaPadrao()?.id || fin.agendadas.some(a => a.contaId === c.id)) {
    let s = saldoConta(c); const pad = contaPadrao();
    const ocs = todasOcorrencias(agora, fim).filter(o => !o.paga && (o.ag.contaId ? o.ag.contaId === c.id : pad?.id === c.id));
    for (let d = hoje + 1; d <= dias; d++) { for (const o of ocs) if (new Date(o.t).getDate() === d) s += o.ag.tipo === 'receber' ? o.ag.valor : -o.ag.valor; prev.push([d, s]); }
  }
  if (prev.length === 1) prev = [];
  const todos = [...pts, ...prev].map(p => p[1]);
  const mx = Math.max(...todos, 1), mn = Math.min(...todos, 0);
  const W = 320, H = 120, pl = 6, pb = 16;
  const X = d => pl + (d - 1) / Math.max(dias - 1, 1) * (W - pl * 2), Y = v => 6 + (mx - v) / (mx - mn || 1) * (H - pb - 6);
  const escada = l => l.map(([d, v], k) => (k ? X(d).toFixed(1) + ',' + Y(l[k - 1][1]).toFixed(1) + ' ' : '') + X(d).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
  return '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" width="100%"><line x1="' + pl + '" x2="' + (W - pl) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="#2e3344"/>' +
    '<polyline points="' + escada(pts) + '" fill="none" stroke="#ecebf2" stroke-width="2.2"/>' + (prev.length ? '<polyline points="' + escada(prev) + '" fill="none" stroke="#ffb627" stroke-width="2" stroke-dasharray="3 4"/>' : '') +
    '<circle cx="' + X(hoje).toFixed(1) + '" cy="' + Y(saldoConta(c)).toFixed(1) + '" r="4" fill="#ecebf2"/>' +
    [1, 10, 20, dias].map(d => '<text x="' + X(d).toFixed(1) + '" y="' + (H - 3) + '" fill="#9a9cae" font-size="9" text-anchor="' + (d === 1 ? 'start' : d === dias ? 'end' : 'middle') + '">' + d + '/' + (new Date().getMonth() + 1) + '</text>').join('') + '</svg>' +
    '<div class="leg"><span><b style="color:#ecebf2">━</b> saldo</span>' + (prev.length ? '<span><b style="color:#ffb627">┅</b> previsto (contas programadas)</span>' : '') + '</div>';
}
function movHTML(m, contaId) {
  const d = new Date(m.t), e = contaId ? efeito(m, contaId) : (m.tipo === 'gasto' ? -m.valor : m.valor);
  const outra = m.tipo === 'transf' ? contaPorId(m.contaId === contaId ? m.destinoId : m.contaId) : null;
  const sub = m.tipo === 'transf' ? (m.contaId === contaId ? 'para ' : 'de ') + (outra?.nome || 'outra conta') : m.tipo === 'ajuste' ? 'ajuste de saldo' : m.tipo === 'rend' ? 'rendimento' : categoriaPorId(m.categoria).nome + (m.agId ? ' · conta programada' : '');
  return '<div class="mov' + (movSel === m.id ? ' sel' : '') + '" data-mov="' + esc(m.id) + '"><div class="d"><b>' + pad(d.getDate()) + '</b><small>' + MESES_N[d.getMonth()] + '</small></div><span class="t">' + esc(m.titulo) + '</span>' +
    '<span class="v ' + corMov(m) + '">' + (e < 0 ? '− ' : '+ ') + fmtBRL(Math.abs(e)) + '</span><span class="s">' + esc(sub) + '</span>' +
    (movSel === m.id ? '<div class="mini"><button type="button" class="btn danger" data-fm="apagar">Excluir lançamento</button></div>' : '') + '</div>';
}
function renderContaDet() {
  const c = contaPorId(finConta), agora = Date.now(), ini = inicioMes(agora);
  const doMes = fin.movs.filter(m => m.t >= ini && (m.contaId === c.id || m.destinoId === c.id));
  let entrou = 0, saiu = 0, guard = 0;
  for (const m of doMes) { const e = efeito(m, c.id); if (sinalGuardado(m)) guard += -e; else if (e > 0) entrou += e; else saiu += -e; }
  const prev = !ehInvest(c) ? previsaoFimMes(c) : null;
  const movs = fin.movs.filter(m => m.contaId === c.id || m.destinoId === c.id).sort((a, b) => b.t - a.t).slice(0, 80);
  let h = '<button type="button" class="volta-lista" data-fs="lista">‹ Saldos</button>' +
    '<div class="rot">' + esc([TIPOS_CONTA[c.tipo], c.instituicao, c.padrao ? 'padrão dos lançamentos' : ''].filter(Boolean).join(' · ')) + '</div>' +
    '<span class="big ' + (ehInvest(c) ? 'inv' : '') + '">' + fmtBRL(saldoConta(c)) + '</span>' + graficoConta(c) +
    '<div class="info"><div><small>Entrou no mês</small><b class="rec">+ ' + fmtBRL(entrou) + '</b></div><div><small>Saiu no mês</small><b class="gas">− ' + fmtBRL(saiu) + '</b></div>' +
    '<div><small>' + (ehInvest(c) ? 'Aplicado no mês' : 'Guardado/investido') + '</small><b class="inv">' + (ehInvest(c) ? fmtBRL(-guard) : '− ' + fmtBRL(guard)) + '</b></div>' +
    (prev !== null ? '<div><small>Previsto no fim do mês</small><b class="am">' + fmtBRL(prev) + '</b></div>' : '<div><small>Rende</small><b>' + esc(c.rende || '—') + '</b></div>') + '</div>' +
    '<div class="actions"><button type="button" class="btn primary" data-fs="conferir">Conferir saldo</button><button type="button" class="btn" data-fs="editar">Editar</button>' +
    (!c.padrao && !ehInvest(c) ? '<button type="button" class="btn" data-fs="padrao">Tornar padrão</button>' : '') + '</div>' +
    '<div class="grp">Movimentações · toque para editar</div>' + (movs.length ? movs.map(m => movHTML(m, c.id)).join('') : '<p class="txt" style="color:var(--muted)">Nada lançado nesta conta ainda.</p>');
  $('finSaldos').innerHTML = h;
}
$('abaGastar').onclick = () => { finAba = 'gastar'; renderFin(); };
$('abaSaldos').onclick = () => { finAba = 'saldos'; renderFin(); };
$('abaCartoes').onclick = () => { finAba = 'cartoes'; renderFin(); };
$('btnOlho').onclick = () => { OCULTAR = !OCULTAR; renderFin(); };
$('abaLanc').onclick = () => { finAba = 'chat'; renderFin(); rolarChat(); };
$('finSaldos').addEventListener('click', async e => {
  const cx = e.target.closest('[data-conta]'); if (cx) { finConta = cx.dataset.conta; movSel = null; renderFin(); $('finSaldos').scrollTop = 0; return; }
  const mv = e.target.closest('[data-mov]'), bm = e.target.closest('[data-fm]');
  if (bm && mv) {
    if (!bm.classList.contains('armed')) { bm.classList.add('armed'); bm.textContent = 'Excluir mesmo?'; return; }
    await apagarMov(mv.dataset.mov); movSel = null; renderFin(); return;
  }
  if (mv) { abrirEditMov(mv.dataset.mov); return; }
  const b = e.target.closest('[data-fs]'); if (!b) return;
  const a = b.dataset.fs;
  if (a === 'nova') abrirContaForm(null);
  if (a === 'lanc') { finAba = 'chat'; renderFin(); setTimeout(() => $('entradaFin').focus(), 100); }
  if (a === 'lista') { finConta = null; renderFin(); }
  if (a === 'extrato') { finAba = 'extrato'; extRevisar = false; renderFin(); }
  if (a === 'editar') abrirContaForm(finConta);
  if (a === 'conferir') abrirConferir(finConta);
  if (a === 'padrao') { fin.contas.forEach(c => c.padrao = c.id === finConta); await salvarFin(); renderFin(); }
});

// ----- cadastro de conta -----
let contaEditando = null;
function abrirContaForm(id) {
  const c = id ? contaPorId(id) : null; contaEditando = c;
  $('ctTitulo').textContent = c ? 'Editar conta' : 'Nova conta';
  $('ctTipo').value = c?.tipo || (fin.contas.some(x => !ehInvest(x)) ? 'investimento' : 'corrente');
  $('ctNome').value = c?.nome || ''; $('ctInst').value = c?.instituicao || '';
  $('ctSaldo').value = c ? numBR(saldoConta(c)) : ''; $('ctSaldoRot').textContent = c ? 'Saldo de hoje' : 'Saldo de hoje';
  $('ctAplic').value = c?.aplicacao || 'CDB'; $('ctRende').value = c?.rende || ''; $('ctLiq').value = c?.liquidez || '';
  $('ctLembrete').value = c?.lembrete ?? 'mes';
  $('ctPadrao').checked = c ? !!c.padrao : !fin.contas.some(x => !ehInvest(x));
  $('ctExcluir').hidden = !c; $('ctExcluir').classList.remove('armed'); $('ctExcluir').textContent = 'Excluir conta';
  ajustarFormConta(); $('contaOv').hidden = false;
}
function ajustarFormConta() { const inv = $('ctTipo').value === 'investimento'; document.querySelectorAll('#formConta .so-inv').forEach(x => x.hidden = !inv); $('ctPadraoBox').hidden = inv; }
$('ctTipo').onchange = ajustarFormConta;
$('ctCancelar').onclick = () => { $('contaOv').hidden = true; };
$('contaOv').addEventListener('click', e => { if (e.target === $('contaOv')) $('contaOv').hidden = true; });
$('ctExcluir').onclick = async () => {
  const b = $('ctExcluir'), c = contaEditando; if (!c) return;
  const n = fin.movs.filter(m => m.contaId === c.id || m.destinoId === c.id).length;
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = n ? 'Excluir com ' + n + ' lançamentos?' : 'Excluir mesmo?'; return; }
  fin.movs = fin.movs.filter(m => m.contaId !== c.id && m.destinoId !== c.id);
  fin.contas = fin.contas.filter(x => x.id !== c.id);
  fin.agendadas.forEach(a => { if (a.contaId === c.id) a.contaId = null; });
  if (c.padrao) { const p = fin.contas.find(x => !ehInvest(x)); if (p) p.padrao = true; }
  await salvarFin(); $('contaOv').hidden = true; finConta = null; renderFin(); agendarAvisosFinDepois();
};
$('formConta').addEventListener('submit', async e => {
  e.preventDefault();
  const tipo = $('ctTipo').value, saldo = valorBR($('ctSaldo').value || '0');
  const dados = { tipo, nome: $('ctNome').value.trim() || TIPOS_CONTA[tipo], instituicao: $('ctInst').value.trim(),
    aplicacao: tipo === 'investimento' ? $('ctAplic').value : '', rende: tipo === 'investimento' ? $('ctRende').value.trim() : '', liquidez: tipo === 'investimento' ? $('ctLiq').value.trim() : '',
    lembrete: $('ctLembrete').value || null };
  let c = contaEditando;
  if (c) {
    Object.assign(c, dados);
    if (!isNaN(saldo) && Math.abs(saldo - saldoConta(c)) > 0.009) fin.movs.push({ id: novoId(), t: Date.now(), tipo: 'ajuste', valor: Math.round((saldo - saldoConta(c)) * 100) / 100, contaId: c.id, titulo: 'Ajuste de saldo', categoria: 'financas' });
  } else {
    c = { id: novoId(), ...dados, saldoInicial: isNaN(saldo) ? 0 : saldo, criado: Date.now(), padrao: false };
    fin.contas.push(c);
  }
  if (tipo !== 'investimento' && $('ctPadrao').checked) fin.contas.forEach(x => x.padrao = x.id === c.id);
  if (!fin.contas.some(x => x.padrao && !ehInvest(x))) { const p = contaPadrao(); if (p) p.padrao = true; }
  if (ehInvest(c)) c.padrao = false;
  await salvarFin(); $('contaOv').hidden = true; renderFin(); agendarAvisosFinDepois();
});

// ----- conferir saldo -----
let conferindo = null;
function abrirConferir(id, valor) {
  const c = contaPorId(id); if (!c) return; conferindo = c;
  $('cfTit').textContent = 'Conferir saldo · ' + c.nome;
  $('cfSub').textContent = 'O AZote calcula ' + fmtBRL(saldoConta(c)) + '. Quanto o app do banco mostra agora?';
  $('cfValor').value = valor != null ? numBR(valor) : ''; $('saldoOv').hidden = false; setTimeout(() => $('cfValor').focus(), 80);
}
$('saldoOv').addEventListener('click', async e => {
  if (e.target === $('saldoOv')) { $('saldoOv').hidden = true; return; }
  const b = e.target.closest('[data-cf]'); if (!b) return;
  if (b.dataset.cf === 'cancelar') { $('saldoOv').hidden = true; return; }
  const v = valorBR($('cfValor').value); if (isNaN(v) || !conferindo) return;
  await aplicarConferencia(conferindo, v, b.dataset.cf);
  $('saldoOv').hidden = true; renderFin();
});
async function aplicarConferencia(c, informado, modo) {
  const dif = Math.round((informado - saldoConta(c)) * 100) / 100;
  if (Math.abs(dif) < 0.01) return null;
  const tipo = modo === 'lancar' && !ehInvest(c) ? (dif < 0 ? 'gasto' : 'receita') : ehInvest(c) && dif > 0 && modo === 'lancar' ? 'rend' : 'ajuste';
  const m = { id: novoId(), t: Date.now(), tipo, valor: tipo === 'ajuste' ? dif : Math.abs(dif), contaId: c.id,
    titulo: tipo === 'ajuste' ? 'Ajuste de saldo' : tipo === 'rend' ? 'Rendimento' : 'Diferença na conferência', categoria: tipo === 'gasto' ? 'pessoal' : 'financas' };
  fin.movs.push(m); c.conferido = Date.now(); await salvarFin(); return m;
}

// ----- chat de Lançamentos -----
const EXEMPLOS_FIN = ['mercado 312,45', 'paguei a luz 186,40', 'internet 119,90 todo dia 15', 'salário 5.200 todo dia 5', 'transferi 500 da conta pro tesouro', 'saldo da conta corrente 2.310', 'nova meta: moto 10 mil até janeiro', 'guardei 500 pra moto', 'financiamento moto 18 mil, 48x de 538,96, 1,59%, dia 10, desde jun/25', 'paguei a parcela da moto'];
function respMovHTML(m, it) {
  if (['credito', 'estorno', 'pagfatura'].includes(m.tipo)) return respCartaoHTML(m);
  if (m.metaId && (m.tipo === 'guardar' || m.tipo === 'resgatar' || m.tipo === 'transf')) return respMetaMovHTML(m);
  if (m.dividaId) return respDivMovHTML(m);
  if (m.reemb) return respReembHTML(m);
  const c = contaPorId(m.contaId), d = contaPorId(m.destinoId);
  let h;
  if (m.tipo === 'transf') h = '<p><b class="' + corMov(m) + '">↔ ' + fmtBRL(m.valor) + '</b> · ' + esc(c?.nome || '?') + ' → ' + esc(d?.nome || '?') + '</p>' +
    (sinalGuardado(m) > 0 ? '<p class="dica">Conta como dinheiro guardado: sai do saldo do mês, em azul.</p>' : sinalGuardado(m) < 0 ? '<p class="dica">Resgate: volta para o saldo do mês.</p>' : '<p class="dica">Entre suas contas: não é gasto nem receita.</p>');
  else if (m.tipo === 'rend') h = '<p><b class="inv">+ ' + fmtBRL(m.valor) + '</b> de rendimento em <b>' + esc(c?.nome || '?') + '</b>. Saldo: <b class="inv">' + fmtBRL(c ? saldoConta(c) : 0) + '</b>.</p>';
  else {
    const ag = m.agId ? fin.agendadas.find(a => a.id === m.agId) : null;
    h = '<p><b class="' + corMov(m) + '">' + (m.tipo === 'gasto' ? '− ' : '+ ') + fmtBRL(m.valor) + '</b> · ' + esc(m.titulo) + '</p><dl class="ticket">' +
      '<dt>' + (m.tipo === 'gasto' ? 'Saiu de' : 'Entrou em') + '</dt><dd>' + esc(c?.nome || '?') + ' · ' + fmtBRL(c ? saldoConta(c) : 0) + '</dd>' +
      '<dt>Categoria</dt><dd>' + categoriaPorId(m.categoria).nome + '</dd>' + (m.aReceber ? '</dl>' + divisaoHTML(m) + '<dl class="ticket">' : '') +
      (difDias(m.t) !== 0 ? '<dt>Data</dt><dd>' + esc(fmtData(new Date(m.t))) + '</dd>' : '') +
      (ag ? '<dt>Baixa</dt><dd>' + esc(ag.titulo) + ', vencimento ' + new Date(m.chave + 'T12:00').toLocaleDateString('pt-BR') + (Math.abs(ag.valor - m.valor) > 0.009 ? ' (programado ' + fmtBRL(ag.valor) + ')' : '') + '</dd>' : '') + '</dl>';
    const outras = fin.contas.filter(x => !ehInvest(x) && x.id !== m.contaId);
    if (outras.length && it.trocar !== false) h += '<p class="dica">Outra conta?</p><div class="ex">' + outras.slice(0, 4).map(x => '<button type="button" class="chip" data-fa="conta" data-conta="' + esc(x.id) + '" data-id="' + esc(m.id) + '">' + esc(x.nome) + '</button>').join('') + '</div>';
    h += '<div class="actions"><button type="button" class="btn" data-fa="inverter" data-id="' + esc(m.id) + '">' + (m.tipo === 'gasto' ? 'Era receita' : 'Era gasto') + '</button>';
  }
  if (m.tipo === 'transf' || m.tipo === 'rend') h += '<div class="actions">';
  return h + '<button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
}
function respAgHTML(ag) {
  const prox = ocorrenciasConta(ag, inicioDoDia(Date.now()).getTime(), Date.now() + 400 * 86400000).find(o => !o.paga);
  return '<p>✓ ' + (ag.tipo === 'receber' ? 'Conta a receber' : 'Conta a pagar') + ' programada</p><dl class="ticket">' +
    '<dt>O quê</dt><dd>' + esc(ag.titulo) + '</dd><dt>Valor</dt><dd class="' + (ag.tipo === 'receber' ? 'rec' : 'gas') + '">' + fmtBRL(ag.valor) + '</dd>' +
    '<dt>' + (ag.repetir ? 'Próxima' : 'Vence') + '</dt><dd>' + (prox ? esc(fmtData(new Date(prox.t))) : '—') + '</dd>' +
    (ag.repetir ? '<dt>Repete</dt><dd>' + esc(fmtRepetir(ag.repetir)) + '</dd>' : '') +
    '<dt>Conta</dt><dd>' + esc(contaPorId(ag.contaId)?.nome || contaPadrao()?.nome || 'a padrão') + '</dd></dl>' +
    '<p class="dica">Aparece em Agenda › Contas e no calendário. Aviso 2 dias antes e no dia, às 9h.</p>' +
    '<div class="actions"><button type="button" class="btn" data-fa="editar-ag" data-id="' + esc(ag.id) + '">Editar</button><button type="button" class="btn" data-fa="desfazer-ag" data-id="' + esc(ag.id) + '">Desfazer</button></div>';
}
function respConfHTML(it) {
  const c = contaPorId(it.contaId); if (!c) return '<p>Conta excluída.</p>';
  if (it.feito) return '<p>' + esc(c.nome) + ': saldo <b>' + fmtBRL(it.informado) + '</b> ✓' + (it.feito === 'igual' ? ' Já estava certinho.' : it.feito === 'lancar' ? ' Lancei a diferença de ' + fmtBRL(it.informado - it.antes) + '.' : ' Ajustei a diferença de ' + fmtBRL(it.informado - it.antes) + '.') + '</p>';
  const dif = it.informado - it.antes;
  return '<p>' + esc(c.nome) + ' · AZote: ' + fmtBRL(it.antes) + ' · banco: <b>' + fmtBRL(it.informado) + '</b>. Diferença de <b class="' + (dif < 0 ? 'gas' : 'rec') + '">' + fmtBRL(dif) + '</b>.</p>' +
    '<div class="actions"><button type="button" class="btn primary" data-fa="conf-lancar" data-id="' + esc(it.id) + '">' + (ehInvest(c) ? (dif > 0 ? 'Lançar como rendimento' : 'Só ajustar') : dif < 0 ? 'Lançar como gasto' : 'Lançar como receita') + '</button>' +
    '<button type="button" class="btn" data-fa="conf-ajustar" data-id="' + esc(it.id) + '">Só ajustar</button></div>';
}
function renderChatFin() {
  const boas = bolhaHTML('app', '<p>Escreva seus gastos, recebimentos e contas como mensagem. Eu separo o <b>valor</b>, a <b>conta</b>, a <b>categoria</b> e a <b>data</b>. Cores: <b class="rec">receitas</b>, <b class="gas">gastos</b> e <b class="inv">guardado/investido</b>.</p><div class="ex">' +
    EXEMPLOS_FIN.map(t => '<button type="button" class="chip" data-ex="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
    (!fin.contas.length ? '<div class="actions"><button type="button" class="btn primary" data-fa="nova-conta">Cadastrar minha conta</button></div>' : ''), null);
  $('chatFin').innerHTML = boas + comSeparadores(fin.chat, it => it.k === 'me' ? '<div class="msg me" data-fin-t="' + it.t + '"><p>' + esc(it.texto) + '</p><div class="meta">' + (it.editada ? 'editada · ' : '') + fmtHora(new Date(it.t)) + '</div></div>' : bolhaHTML('app', htmlItemFin(it), it.t));
  renderSug('fin'); mostrarFaixaEdicao();
  rolarChat();
}
function htmlItemFin(it) {
  if (it.k === 'mov') { const m = fin.movs.find(x => x.id === it.id); return m ? respMovHTML(m, it) + orcNoChatHTML(it) + assinNoChatHTML(m) : '<p>Lançamento desfeito.</p>'; }
  if (it.k === 'ag') { const a = fin.agendadas.find(x => x.id === it.id); return a ? respAgHTML(a) : '<p>Conta programada desfeita.</p>'; }
  if (it.k === 'conf') return respConfHTML(it);
  if (it.k === 'meta') { const mt = metaPorId(it.id); return mt ? respMetaHTML(mt) : '<p>Meta desfeita.</p>'; }
  if (it.k === 'div') { const d = divPorId(it.id); return d ? respDivHTML(d) : '<p>Dívida desfeita.</p>'; }
  return it.html;
}
function textoFin(html) { fin.chat.push({ k: 'txt', html, t: Date.now() }); }
$('chatFin').addEventListener('click', e => cliqueChatFin(e));
async function cliqueChatFin(e) {
  const ex = e.target.closest('[data-ex]'); if (ex) { $('entradaFin').value = ex.dataset.ex; $('entradaFin').focus(); return; }
  const b = e.target.closest('[data-fa]'); if (!b) return;
  const a = b.dataset.fa, id = b.dataset.id;
  if (a === 'nova-conta') { abrirContaForm(null); return; }
  if (a === 'cobrar' || a === 'copiar-cobranca') { await acaoDivisaoChat(a, id); return; }
  if (a === 'assin-prog') { const ag = programarAssinatura(b.dataset.key); if (ag) { agendarAvisosFinDepois(); toast(ag.titulo + ' programada ✓'); } }
  if (a === 'assin-nao') (fin.naoAssin = fin.naoAssin || {})[b.dataset.key] = true;
  if (a === 'desfazer') await apagarMov(id);
  if (a === 'conta') { const m = fin.movs.find(x => x.id === id); if (m) m.contaId = b.dataset.conta; }
  if (a === 'inverter') { const m = fin.movs.find(x => x.id === id); if (m) { if (m.agId) desfazerBaixa(m); m.tipo = m.tipo === 'gasto' ? 'receita' : 'gasto'; } }
  if (a === 'desfazer-ag') { fin.agendadas = fin.agendadas.filter(x => x.id !== id); agendarAvisosFinDepois(); }
  if (a === 'editar-ag') { abrirAgForm(id); return; }
  if (a === 'trocar-cartao') { const m = fin.movs.find(x => x.id === id); if (m) m.cartaoId = b.dataset.cartao; }
  if (a === 'abrir-meta') { metaSel = id; finAba = 'metas'; renderFin(); return; }
  if (a === 'editar-meta') { abrirMetaForm(id); return; }
  if (a === 'abrir-div') { divSel = id; finAba = 'div'; renderFin(); return; }
  if (a === 'editar-div') { abrirDivForm(id); return; }
  if (a === 'desfazer-div') { fin.movs.forEach(m => { if (m.dividaId === id) { delete m.dividaId; delete m.parcelas; } }); fin.dividas = fin.dividas.filter(x => x.id !== id); agendarAvisosFinDepois(); }
  if (a === 'conf-lancar' || a === 'conf-ajustar') {
    const it = fin.chat.find(x => x.id === id && x.k === 'conf'); const c = it && contaPorId(it.contaId); if (!c) return;
    it.antes = saldoConta(c); const m = await aplicarConferencia(c, it.informado, a === 'conf-lancar' ? 'lancar' : 'ajustar');
    it.feito = m ? (a === 'conf-lancar' ? 'lancar' : 'ajustar') : 'igual';
  }
  await salvarFin(); renderChatFin();
}
async function apagarMov(id) {
  const m = fin.movs.find(x => x.id === id); if (!m) return;
  if (m.agId) desfazerBaixa(m);
  if (m.tipo === 'pagfatura') fin.movs = fin.movs.filter(x => !(x.tipo === 'rotativo' && x.ligadoA === m.id));
  if (m.dividaId) { const d = divPorId(m.dividaId); if (d?.pagas) for (const k of Object.keys(d.pagas)) if (d.pagas[k] === m.id) delete d.pagas[k]; }
  if (m.reemb && m.receberAntes) for (const a of m.receberAntes) { const i = (fin.receber || []).findIndex(r => r.id === a.id); if (i >= 0) fin.receber[i] = clonar(a); else (fin.receber = fin.receber || []).push(clonar(a)); }
  if (fin.receber) fin.receber = fin.receber.filter(r => r.movId !== id || r.pago);
  fin.movs = fin.movs.filter(x => x.id !== id);
  await salvarFin(); agendarAvisosFinDepois();
}
function desfazerBaixa(m) {
  const ag = fin.agendadas.find(a => a.id === m.agId);
  if (ag?.baixas && ag.baixas[m.chave] === m.id) delete ag.baixas[m.chave];
  delete m.agId; delete m.chave;
}
$('formFin').addEventListener('submit', async e => {
  e.preventDefault();
  const texto = $('entradaFin').value.trim(); if (!texto) return;
  $('entradaFin').value = '';
  if (await enviarEdicao('fin', texto)) { $('entradaFin').focus(); return; }
  await processarFin(texto); $('entradaFin').focus();
});
async function processarFin(texto) {
  const t = Date.now();
  fin.chat.push({ k: 'me', texto, t });
  const rp = lerRecebimentoPessoa(texto); // "Ana me pagou"
  if (rp) { const m = registrarRecebimento(rp.nome, rp.valor, t); if (m) { fin.chat.push({ k: 'mov', id: m.id, t }); await salvarFin(); renderChatFin(); return; } }
  const dv = lerDivisao(texto); if (dv) texto = dv.base; // "jantar 180 dividido com Ana e Pedro"
  const dividir = () => { if (!dv) return; const it = fin.chat[fin.chat.length - 1], m = it?.k === 'mov' && fin.movs.find(x => x.id === it.id); if (m && (m.tipo === 'gasto' || m.tipo === 'credito') && !m.aReceber) aplicarDivisao(m, dv); };
  if (await lancamentoEspecial(texto, t)) { dividir(); marcarOrcNoChat(); if (fin.chat.length > 400) fin.chat = fin.chat.slice(-400); await salvarFin(); renderChatFin(); return; }
  const r = interpretarFin(texto, new Date(), { contas: fin.contas, agendadas: fin.agendadas, pendentes: pendentesDe });
  const precisaConta = ['gasto', 'receita', 'transf', 'rend', 'saldo'].includes(r.acao);
  if (precisaConta && !fin.contas.length) {
    const c = { id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: t, padrao: true, lembrete: 'mes' };
    fin.contas.push(c); r.conta = r.conta || c; r.origem = r.origem || (r.acao === 'saldo' ? c : null);
    textoFin('<p>Criei a <b>Conta principal</b> com saldo zero para começar. Toque em Saldos para mudar o nome ou informar o saldo de hoje.</p>');
    if (r.acao === 'transf' || r.acao === 'rend') r.acao = 'faltaInvest';
  }
  if (r.acao === 'gasto' || r.acao === 'receita') {
    const m = { id: novoId(), t: r.quando, tipo: r.acao, valor: r.valor, contaId: (r.conta || contaPadrao())?.id, titulo: r.titulo, categoria: r.categoria };
    if (r.baixa) { const ag = fin.agendadas.find(a => a.id === r.baixa.id); if (ag) { ag.baixas = { ...(ag.baixas || {}), [r.baixa.chave]: m.id }; m.agId = ag.id; m.chave = r.baixa.chave; } }
    fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t, trocar: !r.contaDita }); if (r.acao === 'gasto') dividir();
  } else if (r.acao === 'transf') {
    const m = { id: novoId(), t: r.quando, tipo: 'transf', valor: r.valor, contaId: r.origem.id, destinoId: r.destino.id, titulo: sinalGuardado({ tipo: 'transf', contaId: r.origem.id, destinoId: r.destino.id }) < 0 ? 'Resgate' : ehInvest(r.destino) ? 'Aplicação' : 'Transferência', categoria: 'financas' };
    fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t });
  } else if (r.acao === 'rend') {
    const m = { id: novoId(), t: r.quando, tipo: 'rend', valor: r.valor, contaId: r.destino.id, titulo: 'Rendimento', categoria: 'financas' };
    fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t });
  } else if (r.acao === 'agendar') {
    const ag = { id: novoId(), tipo: r.tipoAg, titulo: r.titulo, valor: r.valor, inicio: r.quando, repetir: r.repetir, categoria: r.categoria, contaId: r.conta?.id || null, baixas: {}, criado: t };
    fin.agendadas.push(ag); fin.chat.push({ k: 'ag', id: ag.id, t }); agendarAvisosFinDepois();
  } else if (r.acao === 'saldo') {
    const c = r.origem; const antes = saldoConta(c);
    const it = { k: 'conf', id: novoId(), contaId: c.id, informado: r.valor, antes, t, feito: Math.abs(r.valor - antes) < 0.01 ? 'igual' : null };
    fin.chat.push(it);
  } else if (r.acao === 'faltaInvest') {
    textoFin('<p>Para guardar, aplicar ou lançar rendimento, cadastre primeiro o investimento (CDB, Tesouro, ações…) em <b>Saldos › + Nova conta</b>, com o tipo <b>Investimento</b>.</p><div class="actions"><button type="button" class="btn primary" data-fa="nova-conta">Cadastrar investimento</button></div>');
  } else {
    textoFin('<p>Não achei um valor nessa mensagem. Escreva com o valor, como <i>“padaria 18,50”</i>, <i>“recebi 300 do freela”</i> ou <i>“condomínio 650 todo dia 10”</i>.</p>');
  }
  marcarOrcNoChat();
  if (fin.chat.length > 400) fin.chat = fin.chat.slice(-400);
  await salvarFin(); renderChatFin();
}

async function lancamentoEspecial(texto, t) {
  if (lancamentoCartao(texto, t)) return true;
  const rm = interpretarMeta(texto, new Date(), fin.metas || []);
  if (rm?.acao === 'novaMeta') {
    if (!rm.valor) { textoFin('<p>Qual o valor da meta? Escreva, por exemplo, <i>“nova meta: ' + esc(rm.nome.toLowerCase()) + ' 5 mil até dezembro”</i>.</p>'); return true; }
    const mt = novaMetaDoChat(rm); fin.chat.push({ k: 'meta', id: mt.id, t }); agendarAvisosFinDepois(); return true;
  }
  if (rm && (rm.acao === 'guardarMeta' || rm.acao === 'resgatarMeta')) {
    if (!fin.contas.some(c => !ehInvest(c))) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: t, padrao: true, lembrete: 'mes' });
    const m = guardarNaMeta(rm.meta, rm.valor, rm.acao === 'resgatarMeta'); fin.chat.push({ k: 'mov', id: m.id, t }); return true;
  }
  const rd = interpretarDivida(texto, new Date(), fin.dividas || []);
  if (!rd) return false;
  if (rd.acao === 'novaDivida') {
    if (!rd.valor) { textoFin('<p>Faltou o valor emprestado. Escreva, por exemplo, <i>“empréstimo 6 mil em 12x de 610, dia 20”</i>.</p>'); return true; }
    const d = novaDividaDoChat(rd); fin.chat.push({ k: 'div', id: d.id, t }); agendarAvisosFinDepois(); return true;
  }
  const d = rd.divida, L = linhasDiv(d);
  if (rd.acao === 'pagarParcela') {
    const p = proximaParcela(d, L); if (!p) { textoFin('<p><b>' + esc(d.nome) + '</b> já está quitada. 🎉</p>'); return true; }
    const at = valorComAtraso(d, p, rd.atrasoDias);
    let valor = rd.valor ?? at.total; let desconto = 0;
    if (rd.desconto) { desconto = rd.desconto; valor = (rd.valor ?? p.parcela) - (rd.valor ? 0 : rd.desconto); }
    const m = registrarPagamentoDiv(d, [p], valor, Date.now(), null, at.dias && !rd.desconto ? { atraso: { parcela: p.parcela, multa: at.multa, mora: at.mora, dias: at.dias } } : desconto ? { desconto } : {});
    fin.chat.push({ k: 'mov', id: m.id, t }); agendarAvisosFinDepois(); return true;
  }
  if (rd.acao === 'antecipar') {
    const rows = ultimasAbertas(d, rd.quantas, L); if (!rows.length) { textoFin('<p><b>' + esc(d.nome) + '</b> já está quitada. 🎉</p>'); return true; }
    const a = valorAntecipacao(d, rows), valor = rd.valor ?? a.vp;
    const m = registrarPagamentoDiv(d, rows, valor, Date.now(), null, { antecipacao: true, desconto: Math.max(0, a.nominal - valor) });
    fin.chat.push({ k: 'mov', id: m.id, t }); agendarAvisosFinDepois(); return true;
  }
  return false;
}

// ----- Agenda › Contas -----
let ocSel = null;
function itemContaHTML(o) {
  const d = new Date(o.t), st = statusOc(o), rec = o.ag.tipo === 'receber';
  const conta = contaPorId(o.mov?.contaId || o.ag.contaId) || contaPadrao();
  const k = o.ag.id + '|' + o.chave;
  return '<div class="it' + (o.paga ? ' paga' : st === 'atrasada' ? ' atr' : '') + '" data-oc="' + esc(k) + '"><div class="d"><b>' + pad(d.getDate()) + '</b><small>' + MESES_N[d.getMonth()] + '</small></div>' +
    '<button type="button" class="t" data-co="abrir">' + esc(o.ag.titulo) + '</button><span class="v ' + (rec ? 'rec' : 'gas') + '">' + (rec ? '+ ' : '− ') + fmtBRL(o.mov?.valor ?? o.ag.valor) + '</span>' +
    '<span class="s"><span class="pill st">' + st + '</span>' + (o.ag.repetir ? '<span class="pill rep">↻ ' + esc(fmtRepetir(o.ag.repetir)) + '</span>' : '') + (conta ? '<span class="pill">' + esc(conta.nome) + '</span>' : '') + '</span>' +
    (ocSel === k ? '<div class="mini">' + (o.paga ? (o.mov ? '<button type="button" class="btn" data-co="desfazer">Desfazer ' + (rec ? 'recebimento' : 'pagamento') + '</button>' : '')
      : '<button type="button" class="btn primary" data-co="baixa">' + (rec ? 'Recebi' : 'Paguei') + '</button>') +
      (o.ag.cartao ? '<button type="button" class="btn" data-co="ver-cc">Ver fatura</button>' : o.ag.divida ? '<button type="button" class="btn" data-co="ver-div">Ver dívida</button>' : '<button type="button" class="btn" data-co="editar">Editar</button><button type="button" class="btn danger" data-co="excluir">Excluir</button>') + '</div>' : '') + '</div>';
}
function renderContasAgenda() {
  const box = $('contas'), agora = Date.now(), hoje0 = inicioDoDia(agora).getTime();
  if (!fin.agendadas.length && !(fin.dividas || []).some(d => !d.semData) && !cartoesComoAg().length) {
    box.innerHTML = '<div class="empty"><b>Nenhuma conta programada.</b><br>Escreva na conversa de Finanças, como <i>“internet 119,90 todo dia 15”</i> ou <i>“salário 5.200 todo dia 5”</i>. Aqui ficam as contas a pagar e a receber, com baixa e edição.</div>' +
      '<div class="actions"><button type="button" class="btn primary" data-co="nova">+ Nova conta a pagar ou receber</button><button type="button" class="btn" data-co="ir-fin">Abrir Finanças</button></div>';
    return;
  }
  const filtroH = filtroContasHTML(hoje0);
  if (cfModo !== 'tudo') { box.innerHTML = filtroH + contasDoPeriodoHTML(hoje0); return; }
  const ini = inicioMes(agora), fim = fimMes(agora);
  const atras = todasOcorrencias(hoje0 - 120 * 86400000, hoje0 - 1).filter(o => !o.paga);
  const prox = todasOcorrencias(hoje0, hoje0 + 31 * 86400000).filter(o => !o.paga);
  const pagas = todasOcorrencias(ini, fim).filter(o => o.paga).sort((a, b) => b.t - a.t);
  const doMes = todasOcorrencias(ini, fim).filter(o => !o.paga);
  const aPagar = doMes.filter(o => o.ag.tipo === 'pagar').reduce((s, o) => s + o.ag.valor, 0) + atras.filter(o => o.ag.tipo === 'pagar' && o.t < ini).reduce((s, o) => s + o.ag.valor, 0);
  const aReceber = doMes.filter(o => o.ag.tipo === 'receber').reduce((s, o) => s + o.ag.valor, 0);
  let h = filtroH + '<div class="kp kpv"><div><b class="gas">' + fmtBRL(aPagar) + '</b><small>a pagar no mês</small></div><div><b class="rec">' + fmtBRL(aReceber) + '</b><small>a receber no mês</small></div><div><b class="' + (atras.length ? 'gas' : '') + '">' + atras.length + '</b><small>' + (atras.length === 1 ? 'atrasada' : 'atrasadas') + '</small></div></div>';
  if (atras.length) h += '<div class="grp">Atrasadas</div>' + atras.map(itemContaHTML).join('');
  h += '<div class="grp">Próximos 30 dias</div>' + (prox.length ? prox.map(itemContaHTML).join('') : '<p class="txt" style="color:var(--muted)">Nada vencendo nos próximos 30 dias.</p>');
  if (pagas.length) h += '<div class="grp">Pagas e recebidas em ' + MESES_LONGO[new Date().getMonth()] + '</div>' + pagas.map(itemContaHTML).join('');
  h += '<div class="actions" style="margin-top:14px"><button type="button" class="btn primary" data-co="nova">+ Nova conta a pagar ou receber</button></div><p class="dica">Toque numa conta para dar baixa, editar ou excluir.</p>';
  box.innerHTML = h;
}
// filtro por semana e por dia (1.13.1)
let cfModo = 'tudo', cfSem = null, cfDia = null;
const valorOc = o => o.mov?.valor ?? o.ag.valor;
function filtroContasHTML(hoje0) {
  if (!cfSem) cfSem = inicioSemana(hoje0);
  const fimS = maisDias(cfSem, 7), dI = new Date(cfSem), dF = new Date(fimS - 1);
  const ocs = todasOcorrencias(cfSem, fimS - 1);
  let h = '<div class="cf-bar"><button type="button" class="chip' + (cfModo === 'tudo' ? ' on' : '') + '" data-cf="tudo">Tudo</button><span class="cf-sem"><button type="button" class="nav" data-cf="ant" aria-label="Semana anterior">‹</button>' +
    '<button type="button" class="chip' + (cfModo === 'semana' ? ' on' : '') + '" data-cf="semana">' + dI.getDate() + (dI.getMonth() !== dF.getMonth() ? ' ' + MESES_N[dI.getMonth()] : '') + '–' + dF.getDate() + ' ' + MESES_N[dF.getMonth()] + (cfSem === inicioSemana(hoje0) ? ' · esta semana' : '') + '</button>' +
    '<button type="button" class="nav" data-cf="prox" aria-label="Próxima semana">›</button></span></div><div class="dias cf-dias">';
  for (let k = 0; k < 7; k++) {
    const t = maisDias(cfSem, k), d = new Date(t), doDia = ocs.filter(o => o.t >= t && o.t < maisDias(t, 1));
    const saldo = doDia.reduce((s, o) => s + (o.ag.tipo === 'receber' ? 1 : -1) * valorOc(o), 0), aberto = doDia.some(o => !o.paga);
    h += '<button type="button" data-cf="dia" data-t="' + t + '" class="' + (cfModo === 'dia' && cfDia === t ? 'on' : '') + (t === hoje0 ? ' hj' : '') + '">' + (t === hoje0 ? 'hoje' : DIAS_CURTO[d.getDay()]) + '<b>' + d.getDate() + '</b>' +
      (doDia.length ? '<em class="' + (saldo < 0 ? 'gas' : 'rec') + (aberto ? '' : ' pg') + '">' + (saldo < 0 ? '−' : '+') + fmtCurto(Math.abs(saldo)) + '</em>' : '<em class="vz">·</em>') + '</button>';
  }
  return h + '</div>';
}
function contasDoPeriodoHTML(hoje0) {
  const de = cfModo === 'dia' ? cfDia : cfSem, ate = cfModo === 'dia' ? maisDias(cfDia, 1) - 1 : maisDias(cfSem, 7) - 1;
  const ocs = todasOcorrencias(de, ate);
  const soma = (f) => ocs.filter(f).reduce((s, o) => s + valorOc(o), 0);
  const aPagar = soma(o => !o.paga && o.ag.tipo === 'pagar'), aReceber = soma(o => !o.paga && o.ag.tipo === 'receber'), pago = soma(o => o.paga && o.ag.tipo === 'pagar');
  const nome = cfModo === 'dia' ? (cfDia === hoje0 ? 'hoje' : DIAS[new Date(cfDia).getDay()] + ', ' + new Date(cfDia).getDate()) : 'na semana';
  let h = '<div class="kp kpv"><div><b class="gas">' + fmtBRL(aPagar) + '</b><small>a pagar ' + nome + '</small></div><div><b class="rec">' + fmtBRL(aReceber) + '</b><small>a receber ' + nome + '</small></div><div><b>' + fmtBRL(pago) + '</b><small>já pago ' + nome + '</small></div></div>';
  const atras = todasOcorrencias(hoje0 - 120 * 86400000, Math.min(de, hoje0) - 1).filter(o => !o.paga);
  if (atras.length) h += '<div class="aviso r cf-atr">⚠ ' + atras.length + (atras.length === 1 ? ' conta atrasada' : ' contas atrasadas') + ' antes deste período · <button type="button" data-cf="tudo">ver todas</button></div>';
  if (!ocs.length) h += '<div class="empty">Nenhuma conta ' + (cfModo === 'dia' ? 'neste dia' : 'nesta semana') + '.</div>';
  else if (cfModo === 'dia') h += '<div class="grp">' + maiuscula(DIAS[new Date(cfDia).getDay()]) + ', ' + new Date(cfDia).getDate() + ' de ' + MESES_LONGO[new Date(cfDia).getMonth()] + '</div>' + ocs.map(itemContaHTML).join('');
  else for (let k = 0; k < 7; k++) { const t = maisDias(cfSem, k), doDia = ocs.filter(o => o.t >= t && o.t < maisDias(t, 1)); if (doDia.length) h += '<div class="grp">' + maiuscula(t === hoje0 ? 'hoje' : DIAS[new Date(t).getDay()]) + ', ' + new Date(t).getDate() + ' ' + MESES_N[new Date(t).getMonth()] + '</div>' + doDia.map(itemContaHTML).join(''); }
  h += '<div class="actions" style="margin-top:14px"><button type="button" class="btn primary" data-co="nova">+ Nova conta a pagar ou receber</button></div><p class="dica">Toque num dia para ver só as contas dele; toque de novo para voltar à semana.</p>';
  return h;
}
$('contas').addEventListener('click', e => {
  const b = e.target.closest('[data-cf]'); if (!b) return;
  const a = b.dataset.cf;
  if (a === 'tudo') cfModo = 'tudo';
  if (a === 'semana') cfModo = 'semana';
  if (a === 'ant' || a === 'prox') { cfSem = maisDias(cfSem, a === 'ant' ? -7 : 7); if (cfModo === 'tudo' || cfModo === 'dia') cfModo = 'semana'; }
  if (a === 'dia') { const t = Number(b.dataset.t); if (cfModo === 'dia' && cfDia === t) cfModo = 'semana'; else { cfModo = 'dia'; cfDia = t; } }
  ocSel = null; renderContasAgenda(); $('contas').scrollTop = 0;
});
function acharOc(k) {
  const [id, chave] = k.split('|'); const ag = todasAgs().find(a => a.id === id); if (!ag) return null;
  const t = new Date(chave + 'T00:00').getTime();
  return ocorrenciasConta(ag, t, t + 86400000 - 1).find(o => o.chave === chave) || null;
}
$('contas').addEventListener('click', async e => {
  const b = e.target.closest('[data-co]'); if (!b) return;
  const a = b.dataset.co, el = b.closest('[data-oc]');
  if (a === 'nova') { abrirAgForm(null); return; }
  if (a === 'ir-fin') { abrirFin('chat'); return; }
  if (!el) return;
  const k = el.dataset.oc, o = acharOc(k); if (!o) return;
  if (a === 'abrir') { ocSel = ocSel === k ? null : k; renderContasAgenda(); return; }
  if (a === 'ver-div') { divSel = o.ag.divida.id; abrirFin('div'); return; }
  if (a === 'ver-cc') { cartaoSel = o.ag.cartao.id; faturaSel = o.ag.fkey; abrirFin('cartoes'); return; }
  if (a === 'baixa' && o.ag.cartao) { abrirPagarFatura(o.ag.cartao, o.ag.fkey); return; }
  if (a === 'baixa' && o.ag.divida) { const p = proximaParcela(o.ag.divida); if (p && p.k === o.ag.k) abrirPagar(o.ag.divida, 'parcela'); else { divSel = o.ag.divida.id; abrirFin('div'); } return; }
  if (a === 'baixa') { abrirBaixa(o); return; }
  if (a === 'editar') { abrirAgForm(o.ag.id); return; }
  if (a === 'desfazer') { await apagarMov(o.mov.id); renderContasAgenda(); return; }
  if (a === 'excluir') {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = o.ag.repetir ? 'Excluir todas as datas?' : 'Excluir mesmo?'; return; }
    fin.agendadas = fin.agendadas.filter(x => x.id !== o.ag.id); fin.movs.forEach(m => { if (m.agId === o.ag.id) { delete m.agId; delete m.chave; } });
    ocSel = null; await salvarFin(); agendarAvisosFinDepois(); renderContasAgenda();
  }
});
// baixa manual
let baixaAlvo = null;
function opcoesContas(sel, incluirInvest = false, vazio = null) {
  return (vazio ? '<option value="">' + vazio + '</option>' : '') + fin.contas.filter(c => incluirInvest || !ehInvest(c)).map(c => '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');
}
function abrirBaixa(o) {
  baixaAlvo = o; const rec = o.ag.tipo === 'receber';
  $('bxTit').textContent = (rec ? 'Recebi · ' : 'Paguei · ') + o.ag.titulo;
  $('bxValor').value = numBR(o.ag.valor);
  const d = new Date(Math.min(Date.now(), Math.max(o.t, Date.now() - 400 * 86400000)));
  $('bxData').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  $('bxConta').innerHTML = opcoesContas(o.ag.contaId || contaPadrao()?.id);
  $('bxContaRot').textContent = rec ? 'Entrou em' : 'Saiu de';
  $('baixaOv').hidden = false;
}
$('bxCancelar').onclick = () => { $('baixaOv').hidden = true; };
$('baixaOv').addEventListener('click', e => { if (e.target === $('baixaOv')) $('baixaOv').hidden = true; });
$('formBaixa').addEventListener('submit', async e => {
  e.preventDefault();
  const o = baixaAlvo; if (!o) return;
  const v = valorBR($('bxValor').value); if (isNaN(v)) return;
  if (!fin.contas.length) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' });
  const [a, mm, d] = $('bxData').value.split('-').map(Number);
  const agora = new Date(); let t = new Date(a, mm - 1, d, agora.getHours(), agora.getMinutes()).getTime(); if (t > Date.now()) t = new Date(a, mm - 1, d, 9).getTime();
  const m = { id: novoId(), t, tipo: o.ag.tipo === 'receber' ? 'receita' : 'gasto', valor: v, contaId: $('bxConta').value || contaPadrao()?.id, titulo: o.ag.titulo, categoria: o.ag.categoria, agId: o.ag.id, chave: o.chave };
  o.ag.baixas = { ...(o.ag.baixas || {}), [o.chave]: m.id }; fin.movs.push(m);
  await salvarFin(); $('baixaOv').hidden = true; ocSel = null; agendarAvisosFinDepois(); atualizarTudo();
});
// cadastro/edição de conta programada
let agEditando = null;
function abrirAgForm(id) {
  const ag = id ? fin.agendadas.find(a => a.id === id) : null; agEditando = ag;
  $('agTit').textContent = ag ? 'Editar conta programada' : 'Nova conta a pagar ou receber';
  $('agTipo').value = ag?.tipo || 'pagar'; $('agTitulo').value = ag?.titulo || ''; $('agValor').value = ag ? numBR(ag.valor) : '';
  const d = new Date(ag?.inicio || Date.now());
  $('agData').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  $('agRepetir').value = !ag?.repetir ? '' : ag.repetir.tipo;
  $('agCategoria').innerHTML = CATEGORIAS.map(c => '<option value="' + c.id + '">' + c.nome + '</option>').join('');
  $('agCategoria').value = ag?.categoria || 'casa';
  $('agConta').innerHTML = opcoesContas(ag?.contaId, false, 'Conta padrão');
  $('agOv').hidden = false;
}
$('agCancelar').onclick = () => { $('agOv').hidden = true; };
$('agOv').addEventListener('click', e => { if (e.target === $('agOv')) $('agOv').hidden = true; });
$('formAg').addEventListener('submit', async e => {
  e.preventDefault();
  const v = valorBR($('agValor').value); if (isNaN(v)) { $('agValor').focus(); return; }
  const [a, m, d] = $('agData').value.split('-').map(Number);
  const inicio = new Date(a, m - 1, d, 9, 0).getTime(), rv = $('agRepetir').value;
  const dados = { tipo: $('agTipo').value, titulo: $('agTitulo').value.trim() || ($('agTipo').value === 'receber' ? 'Conta a receber' : 'Conta a pagar'), valor: v, inicio,
    repetir: rv === '' ? null : rv === 'semanal' ? { tipo: 'semanal', dias: [new Date(inicio).getDay()] } : { tipo: rv }, categoria: $('agCategoria').value, contaId: $('agConta').value || null };
  if (agEditando) {
    // datas que já tiveram baixa continuam valendo; as baixas que não batem com a nova regra ficam como lançamentos avulsos
    Object.assign(agEditando, dados);
    const validas = new Set(datasDaConta(agEditando, agEditando.inicio - 1, Date.now() + 800 * 86400000, 2000).map(chaveDia));
    for (const [ch, mid] of Object.entries(agEditando.baixas || {})) if (!validas.has(ch)) { const mv = fin.movs.find(x => x.id === mid); if (mv) { delete mv.agId; delete mv.chave; } delete agEditando.baixas[ch]; }
  } else fin.agendadas.push({ id: novoId(), ...dados, baixas: {}, criado: Date.now() });
  await salvarFin(); $('agOv').hidden = true; agendarAvisosFinDepois(); atualizarTudo();
});

// ----- valores no calendário -----
function contasNoDia(t0) {
  const ocs = todasOcorrencias(t0, t0 + 86400000 - 1);
  return { ocs, pagar: ocs.filter(o => o.ag.tipo === 'pagar').reduce((s, o) => s + (o.mov?.valor ?? o.ag.valor), 0), receber: ocs.filter(o => o.ag.tipo === 'receber').reduce((s, o) => s + (o.mov?.valor ?? o.ag.valor), 0) };
}
function etiquetaValorDia(t0) {
  try { return etiquetaValorDia_(t0); } catch (e) { console.warn(e); return ''; }
}
function etiquetaValorDia_(t0) {
  if (config.valoresCalendario === false || !todasAgs().length) return '';
  const c = contasNoDia(t0);
  if (c.pagar) return '<em class="v gas">−' + fmtCurto(c.pagar) + '</em>';
  if (c.receber) return '<em class="v rec">+' + fmtCurto(c.receber) + '</em>';
  return '';
}
function contasDoDiaHTML(t0) {
  try { return contasDoDiaHTML_(t0); } catch (e) { console.warn(e); return ''; }
}
function contasDoDiaHTML_(t0) {
  const c = contasNoDia(t0); if (!c.ocs.length) return '';
  return '<div class="grp">Contas do dia</div>' + c.ocs.map(o => '<div class="slot"><span class="t ' + (o.ag.tipo === 'receber' ? 'rec' : 'gas') + '">' + (o.ag.tipo === 'receber' ? '+ ' : '− ') + fmtBRL(o.mov?.valor ?? o.ag.valor) + '</span><span class="d">' + esc(o.ag.titulo) + ' <span class="pill">' + statusOc(o) + '</span></span></div>').join('');
}

// ----- Resumo da semana › Finanças -----
function renderResumoFin() {
  const ini = resumoRef, fim = maisDias(ini, 7) - 1;
  if (!fin.movs.length && !fin.agendadas.length) {
    $('resumoFin').innerHTML = '<div class="empty"><b>Nada lançado ainda.</b><br>Use a conversa de Finanças para lançar gastos, recebimentos e contas. Aqui aparecem as entradas, os gastos, o guardado e o saldo de cada semana.</div><div class="actions"><button type="button" class="btn primary" data-rf="ir">Abrir Finanças</button></div>';
    return;
  }
  const t = totais(ini, fim), ant = totais(maisDias(ini, -7), ini - 1);
  let h = '<div class="kp kp4"><div><b class="rec">' + fmtBRL(t.receitas) + '</b><small>entradas</small></div><div><b class="gas">' + fmtBRL(t.gastos) + '</b><small>gastos</small></div><div><b class="inv">' + fmtBRL(t.guardado) + '</b><small>guardado</small></div><div><b class="' + (t.saldo < 0 ? 'gas' : '') + '">' + fmtBRL(t.saldo) + '</b><small>saldo da semana</small></div></div>';
  if (ant.gastos > 0 || t.gastos > 0) { const dif = t.gastos - ant.gastos; h += '<p class="txt" style="margin-top:8px">Gastos ' + (Math.abs(dif) < 0.01 ? 'iguais aos' : dif > 0 ? '<b class="gas">' + fmtBRL(dif) + ' acima</b> da' : '<b class="rec">' + fmtBRL(-dif) + ' abaixo</b> da') + ' semana anterior (' + fmtBRL(ant.gastos) + ').</p>'; }
  // gastos por dia
  const vals = []; for (let k = 0; k < 7; k++) vals.push(t.porDia[maisDias(ini, k)] || 0);
  const mx = Math.max(...vals, 1);
  h += '<div class="grp">Gastos por dia</div><div class="barras7">' + vals.map((v, k) => { const d = new Date(maisDias(ini, k)); return '<div><span class="vv">' + (v ? fmtCurto(v) : '') + '</span><i style="height:' + Math.max(v / mx * 100, v ? 6 : 2) + '%"></i><small>' + DIAS_CURTO[d.getDay()] + '</small></div>'; }).join('') + '</div>';
  const cats = Object.entries(t.porCat).sort((a, b) => b[1] - a[1]);
  if (cats.length) {
    h += '<div class="grp">Gastos por categoria</div>';
    for (const [id, v] of cats) { const c = categoriaPorId(id); h += '<div class="barra"><div class="bl"><span class="sq" style="background:' + c.cor + '"></span>' + c.nome + '<b>' + fmtBRL(v) + '</b></div><div class="bt"><div style="width:' + (v / cats[0][1] * 100) + '%;background:' + c.cor + '"></div></div></div>'; }
  }
  if (t.rend) h += '<p class="txt">Rendimentos na semana: <b class="inv">+ ' + fmtBRL(t.rend) + '</b></p>';
  const proxOc = todasOcorrencias(fim + 1, maisDias(ini, 14) - 1).filter(o => !o.paga);
  h += '<div class="grp">Contas da semana seguinte</div>' + (proxOc.length ? proxOc.map(o => { const d = new Date(o.t); return '<div class="slot"><span class="t">' + DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '</span><span class="d">' + esc(o.ag.titulo) + ' · <b class="' + (o.ag.tipo === 'receber' ? 'rec' : 'gas') + '">' + fmtBRL(o.ag.valor) + '</b></span></div>'; }).join('') : '<p class="txt" style="color:var(--muted)">Nenhuma conta programada.</p>');
  $('resumoFin').innerHTML = h;
}
$('resumoFin').addEventListener('click', e => { if (e.target.closest('[data-rf]')) abrirFin('chat'); });

// ----- avisos das contas e lembretes de conferir saldo -----
async function agendarAvisosFin() {
  if (!Notif) return;
  try { if (fin.avisos?.length) await Notif.cancel({ notifications: fin.avisos.map(id => ({ id })) }); } catch {}
  fin.avisos = [];
  if (!permissaoOk) { await salvarFin(); return; }
  const agora = Date.now(), lista = [];
  const [ch, cm] = String(config.contasHora || '09:00').split(':').map(Number);
  const diasAntes = [3, 2, 1, 0].filter(d => config['contasD' + d] ?? (d === 2 || d === 0));
  for (const ag of (config.contasAviso === false ? [] : todasAgs())) {
    const rec = ag.tipo === 'receber';
    if (rec && config.contasReceber === false) continue;
    if (!rec && (config.contasMin || 0) > 0 && ag.valor < config.contasMin) continue;
    const botoes = !rec && !ag.cartao && !ag.divida && config.contasBotoes !== false;
    const ocs = ocorrenciasConta(ag, inicioDoDia(agora).getTime() - (config.contasInsistir ? 30 * 86400000 : 0), agora + 60 * 86400000).filter(o => !o.paga).slice(0, 5);
    for (const o of ocs) {
      const d = new Date(o.t), extra = { fin: 'contas', conta: botoes ? ag.id : undefined, chave: o.chave };
      for (const antes of diasAntes) {
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - antes, ch, cm);
        if (at.getTime() <= agora) continue;
        const tit = rec ? (antes ? 'A receber em ' + antes + (antes === 1 ? ' dia: ' : ' dias: ') : 'A receber hoje: ') : (antes ? 'Conta vence em ' + antes + (antes === 1 ? ' dia: ' : ' dias: ') : 'Vence hoje: ');
        lista.push({ id: idNumerico('fin#' + ag.id + '#' + o.chave + '#' + antes), title: tit + ag.titulo, body: fmtBRL(ag.valor) + ' · ' + fmtData(d) + (botoes ? '' : '. Toque para dar baixa.'), actionTypeId: botoes ? 'conta' : undefined, schedule: { at, allowWhileIdle: true }, extra });
      }
      // insistir: conta atrasada avisa todo dia por até 7 dias
      if (config.contasInsistir && !rec) for (let k = 1; k <= 7; k++) {
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, ch, cm); if (at.getTime() <= agora) continue;
        lista.push({ id: idNumerico('fin#atr#' + ag.id + '#' + o.chave + '#' + k), title: 'Conta atrasada: ' + ag.titulo, body: fmtBRL(ag.valor) + ' · venceu ' + fmtData(d) + '. ' + (botoes ? '' : 'Toque para dar baixa.'), actionTypeId: botoes ? 'conta' : undefined, schedule: { at, allowWhileIdle: true }, extra });
      }
    }
  }
  // fatura fechou: 1 dia depois do fechamento
  if (config.contasAviso !== false && config.contasFatFecha !== false) for (const c of fin.cartoes || []) {
    const key = faturaAberta(c), dts = datasFatura(c, key), fech = new Date(dts.fech);
    const at = new Date(fech.getFullYear(), fech.getMonth(), fech.getDate() + 1, ch, cm);
    if (at.getTime() > agora) { const tot = infoFatura(c, key).total; if (tot > 0) lista.push({ id: idNumerico('fin#fech#' + c.id + '#' + key), title: '💳 Fatura do ' + c.nome + ' fechou', body: 'Total ' + fmtBRL(tot) + ' até agora · vence ' + fmtData(new Date(dts.venc)) + '.', schedule: { at, allowWhileIdle: true }, extra: { fin: 'cartoes' } }); }
  }
  for (const c of fin.contas) {
    if (!c.lembrete) continue;
    const h = new Date(); const datas = [];
    if (c.lembrete === 'mes') for (let k = 1; k <= 2; k++) datas.push(new Date(h.getFullYear(), h.getMonth() + k, 1, 10, 0));
    else for (let k = 1; k <= 3; k++) { const n = ((8 - h.getDay()) % 7 || 7) + (k - 1) * 7; datas.push(new Date(h.getFullYear(), h.getMonth(), h.getDate() + n, 10, 0)); }
    datas.forEach((at, k) => { const id = idNumerico('fin#conf#' + c.id + '#' + k); lista.push({ id, title: 'Conferir saldo: ' + c.nome, body: 'O AZote calcula ' + fmtBRL(saldoConta(c)) + '. Confere com o app do banco?', schedule: { at, allowWhileIdle: true }, extra: { fin: 'saldos' } }); });
  }
  if (config.metasLembrete !== false) lista.push(...avisosMetas());
  try { if (lista.length) await agendarNotif(lista); fin.avisos = lista.map(n => n.id); } catch {}
  await salvarFin();
}
let timerFin = null;
function agendarAvisosFinDepois() { clearTimeout(timerFin); timerFin = setTimeout(agendarAvisosFin, 1500); }

