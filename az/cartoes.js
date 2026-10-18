
// =====================================================================
// 1.10 · Cartão de crédito. Compras no crédito vão para a fatura; o gasto entra
// no mês em que a fatura é paga, separado pelas categorias das compras.
// =====================================================================
let cartaoSel = null, faturaSel = null;
const CORES_CARTAO = ['#6b3fd1', '#1f7a5c', '#c2410c', '#334155', '#be185d', '#0e7490'];
const cartaoPorId = id => (fin.cartoes || []).find(c => c.id === id) || null;
const cartaoPadrao = () => (fin.cartoes || []).find(c => c.padrao) || (fin.cartoes || [])[0] || null;
const diaNoMes = (a, m, d) => new Date(a, m, Math.min(d, new Date(a, m + 1, 0).getDate()), 9).getTime();
const chaveMes = (a, m) => { const d = new Date(a, m, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const somaMes = (key, n) => { const [a, m] = key.split('-').map(Number); return chaveMes(a, m - 1 + n); };
const nomeMesKey = key => { const [a, m] = key.split('-').map(Number); return MESES_N[m - 1] + (a !== new Date().getFullYear() ? '/' + String(a).slice(2) : ''); };
// datas de fechamento e vencimento da fatura identificada pelo mês do vencimento
function datasFatura(c, key) {
  const [a, m] = key.split('-').map(Number);
  const venc = diaNoMes(a, m - 1, c.vence);
  const fech = c.vence > c.fecha ? diaNoMes(a, m - 1, c.fecha) : diaNoMes(a, m - 2, c.fecha);
  return { venc, fech, ini: c.vence > c.fecha ? diaNoMes(a, m - 2, c.fecha) + 1 : diaNoMes(a, m - 3, c.fecha) + 1 };
}
// em qual fatura cai uma compra feita em t (compras no dia do fechamento vão para a próxima)
function faturaDaCompra(c, t) {
  const d = new Date(t); let a = d.getFullYear(), m = d.getMonth();
  if (d.getDate() >= c.fecha) m++;
  return c.vence > c.fecha ? chaveMes(a, m) : chaveMes(a, m + 1);
}
const faturaAberta = c => faturaDaCompra(c, Date.now());
function itensFatura(c, key) {
  const out = [];
  for (const m of fin.movs) {
    if (m.cartaoId !== c.id) continue;
    if (m.tipo === 'credito') {
      const k0 = faturaDaCompra(c, m.t), n = m.parcelas || 1;
      for (let k = 0; k < n; k++) if (somaMes(k0, k) === key) {
        const base = Math.floor(m.valor / n * 100) / 100, v = k === n - 1 ? Math.round((m.valor - base * (n - 1)) * 100) / 100 : base;
        out.push({ mov: m, valor: v, parcela: n > 1 ? (k + 1) + '/' + n : '', titulo: m.titulo, categoria: m.categoria, t: m.t });
      }
    }
    if (m.tipo === 'estorno' && faturaDaCompra(c, m.t) === key) out.push({ mov: m, valor: -m.valor, titulo: m.titulo, categoria: m.categoria || 'pessoal', t: m.t, estorno: true });
    if (m.tipo === 'rotativo' && m.key === key) out.push({ mov: m, valor: m.valor, titulo: 'Saldo da fatura anterior + juros', categoria: 'financas', t: m.t, rotativo: true });
  }
  return out.sort((a, b) => b.t - a.t);
}
function infoFatura(c, key) {
  const itens = itensFatura(c, key), total = Math.round(itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
  const pagos = fin.movs.filter(m => m.tipo === 'pagfatura' && m.cartaoId === c.id && m.key === key);
  const pago = pagos.reduce((s, m) => s + m.valor, 0);
  const rolado = fin.movs.filter(m => m.tipo === 'rotativo' && m.cartaoId === c.id && m.origem === key).reduce((s, m) => s + (m.base || 0), 0);
  const restante = Math.max(0, Math.round((total - pago - rolado) * 100) / 100);
  const { venc, fech, ini } = datasFatura(c, key), agora = Date.now();
  let status = agora < fech ? 'aberta' : restante <= 0.009 ? (total > 0 ? 'paga' : 'sem compras') : agora > venc + DIA_MS ? 'vencida' : 'fechada';
  if (agora < fech && total > 0 && restante <= 0.009 && pago > 0) status = 'paga';
  return { key, itens, total, pago, restante, rolado, venc, fech, ini, status, pagos };
}
const minimoFatura = f => Math.min(f.restante, Math.max(50, Math.round(f.restante * 0.15 * 100) / 100));
function faturasRelevantes(c) { const ab = faturaAberta(c); const out = []; for (let k = -3; k <= 0; k++) { const f = infoFatura(c, somaMes(ab, k)); if (f.total > 0 || k === 0) out.push(f); } return out; }
function usoCartao(c) {
  const ab = faturaAberta(c); let atual = 0, futuro = 0;
  for (let k = -3; k <= 0; k++) atual += infoFatura(c, somaMes(ab, k)).restante;
  for (let k = 1; k <= 48; k++) { const f = infoFatura(c, somaMes(ab, k)); futuro += f.restante; }
  return { atual: Math.round(atual * 100) / 100, futuro: Math.round(futuro * 100) / 100, livre: Math.round((c.limite - atual - futuro) * 100) / 100 };
}
function devidoCartoes() { return (fin.cartoes || []).reduce((s, c) => s + usoCartao(c).atual, 0); }
// gastos por categoria de um pagamento de fatura (proporcional às compras da fatura)
function categoriasDoPagamento(m) {
  const c = cartaoPorId(m.cartaoId); if (!c) return { financas: m.valor };
  const f = infoFatura(c, m.key), tot = f.itens.filter(i => !i.estorno).reduce((s, i) => s + i.valor, 0) || 1;
  const r = {}; for (const i of f.itens) r[i.categoria || 'pessoal'] = (r[i.categoria || 'pessoal'] || 0) + i.valor / tot * m.valor;
  return r;
}
// faturas como contas a pagar (Agenda › Contas, calendário, avisos, previsão)
function cartoesComoAg() {
  const out = [];
  for (const c of fin.cartoes || []) for (const f of faturasRelevantes(c)) {
    if (f.total <= 0) continue;
    const ult = f.pagos[f.pagos.length - 1];
    out.push({ id: 'cc:' + c.id + ':' + f.key, cartao: c, fkey: f.key, tipo: 'pagar', titulo: 'Fatura ' + c.nome + (f.status === 'aberta' ? ' (aberta)' : ''), valor: f.restante > 0 ? f.restante : f.total,
      inicio: f.venc, repetir: null, categoria: 'financas', contaId: c.contaId || null, baixas: f.restante <= 0.009 ? { [chaveDia(f.venc)]: ult ? ult.id : 'pre' } : {} });
  }
  return out;
}
// ----- telas -----
function cartaoVisual(c) {
  const ab = infoFatura(c, faturaAberta(c)), u = usoCartao(c);
  const fechada = faturasRelevantes(c).find(f => f.status === 'fechada' || f.status === 'vencida');
  const em = fechada ? (fechada.status === 'vencida' ? 'fatura vencida' : 'fatura fechada') : difDias(ab.fech) <= 7 ? 'fecha em ' + difDias(ab.fech) + (difDias(ab.fech) === 1 ? ' dia' : ' dias') : 'aberta';
  return '<button type="button" class="cc" data-cartao="' + esc(c.id) + '" style="background:linear-gradient(135deg,' + c.cor + ',' + c.cor + '99)"><span class="em">' + em + '</span><div class="nm">' + esc(c.nome) + '</div><div class="fn">•••• ' + esc(c.final || '') + '</div>' +
    '<div class="vl">' + fmtBRL(ab.restante) + '</div><small>fatura de ' + nomeMesKey(ab.key) + ' · fecha ' + fmtDM(ab.fech) + ' · vence ' + fmtDM(ab.venc) + '</small>' +
    '<div class="lim"><div style="width:' + Math.min(100, u.atual / c.limite * 100) + '%;background:#fff"></div><div style="width:' + Math.min(100, u.futuro / c.limite * 100) + '%;background:rgba(255,255,255,.45)"></div></div>' +
    '<div class="rod"><span>' + fmtBRL(u.atual) + ' + ' + fmtBRL(u.futuro) + ' parcelado</span><span>livre ' + fmtBRL(u.livre) + '</span></div>' +
    (fechada ? '<div class="rod" style="margin-top:4px"><span>Fatura de ' + nomeMesKey(fechada.key) + ': ' + fmtBRL(fechada.restante) + '</span><span>vence ' + fmtDM(fechada.venc) + '</span></div>' : '') + '</button>';
}
function renderCartoes() {
  const box = $('finCartoes');
  if (cartaoSel && cartaoPorId(cartaoSel)) { renderCartaoDet(); return; }
  cartaoSel = null;
  const cs = fin.cartoes || [];
  if (!cs.length) { box.innerHTML = '<div class="empty"><b>Nenhum cartão cadastrado.</b><br>Cadastre o cartão com o limite e os dias de fechamento e vencimento. Depois, lance as compras pelo chat: <i>“tênis 600 em 3x no cartão”</i>, <i>“mercado 230 no crédito”</i>. O gasto conta no mês em que a fatura é paga.</div><div class="actions"><button type="button" class="btn primary" data-fc="novo">+ Novo cartão</button></div>'; return; }
  let ab = 0, fut = 0, livre = 0; for (const c of cs) { const u = usoCartao(c); ab += u.atual; fut += u.futuro; livre += u.livre; }
  let h = '<div class="kp kpv"><div><b class="gas">' + fmtBRL(ab) + '</b><small>faturas em aberto</small></div><div><b>' + fmtBRL(fut) + '</b><small>parcelas futuras</small></div><div><b class="rec">' + fmtBRL(livre) + '</b><small>limite livre</small></div></div>';
  h += cs.map(cartaoVisual).join('');
  const pagas = cs.flatMap(c => faturasRelevantes(c).filter(f => f.status === 'paga').map(f => ({ c, f }))).sort((a, b) => b.f.venc - a.f.venc).slice(0, 4);
  if (pagas.length) h += '<div class="grp">Faturas pagas</div>' + pagas.map(({ c, f }) => '<div class="fat"><span><b>' + esc(c.nome) + ' · ' + nomeMesKey(f.key) + '</b><small>' + fmtBRL(f.pago) + ' pago</small></span><b class="rec">paga ✓</b></div>').join('');
  const c0 = cs[0], prox = datasFatura(c0, somaMes(faturaAberta(c0), 1));
  h += '<div class="aviso a">💡 Melhor dia de compra no ' + esc(c0.nome) + ': <b>' + fmtDM(infoFatura(c0, faturaAberta(c0)).fech) + '</b> (a compra cai na fatura que vence em ' + fmtDM(prox.venc) + ').</div>';
  h += '<div class="actions"><button type="button" class="btn primary" data-fc="novo">+ Novo cartão</button></div>';
  box.innerHTML = h;
}
function renderCartaoDet() {
  const c = cartaoPorId(cartaoSel), ab = faturaAberta(c);
  if (!faturaSel) { const fc = faturasRelevantes(c).find(f => f.status === 'fechada' || f.status === 'vencida'); faturaSel = fc ? fc.key : ab; }
  const f = infoFatura(c, faturaSel), u = usoCartao(c);
  const meses = [-2, -1, 0, 1, 2].map(k => somaMes(ab, k));
  const lbl = { aberta: 'aberta', fechada: 'fechada', vencida: 'vencida', paga: 'paga ✓', 'sem compras': 'sem compras' };
  const prog = Math.max(0, Math.min(1, (Date.now() - f.ini) / (f.fech - f.ini)));
  let h = '<button type="button" class="volta-lista" data-fc="lista">‹ Cartões</button>' +
    '<div class="mesnav">' + meses.map(k => { const s = infoFatura(c, k).status; return '<button type="button" data-fk="' + k + '" class="' + (k === faturaSel ? 'on' : '') + '">' + nomeMesKey(k) + '<small>' + (k > ab ? 'futura' : lbl[s]) + '</small></button>'; }).join('') + '</div>' +
    '<div class="rot">FATURA DE ' + nomeMesKey(f.key).toUpperCase() + ' · ' + (faturaSel > ab ? 'futura' : lbl[f.status]) + '</div><span class="big gas">' + fmtBRL(f.restante > 0 || f.status !== 'paga' ? f.restante : f.total) + '</span>' +
    '<div class="vals"><span>fecha <b>' + fmtDM(f.fech) + '</b> · vence <b>' + fmtDM(f.venc) + '</b></span><span>' + (f.pago ? 'pago ' + fmtBRL(f.pago) : f.total !== f.restante ? 'total ' + fmtBRL(f.total) : '') + '</span></div>' +
    (f.status === 'aberta' ? '<div class="prog"><div style="width:' + prog * 100 + '%;background:var(--accent)"></div></div><div class="vals"><span>ciclo ' + fmtDM(f.ini) + ' → ' + fmtDM(f.fech) + '</span><span>' + Math.round(prog * 100) + '% do ciclo</span></div>' : '') +
    '<div class="actions">' + (f.restante > 0.009 && faturaSel <= ab ? '<button type="button" class="btn primary" data-fc="pagar">Pagar fatura</button>' : '') + '<button type="button" class="btn" data-fc="editar">Editar cartão</button></div>' +
    '<div class="grp">Compras · ' + f.itens.length + '</div>' + (f.itens.length ? f.itens.map(i => { const d = new Date(i.t);
      return '<div class="mov" data-mov="' + esc(i.mov.id) + '"><div class="d"><b>' + pad(d.getDate()) + '</b><small>' + MESES_N[d.getMonth()] + '</small></div><span class="t">' + esc(i.titulo) + '</span><span class="v ' + (i.valor < 0 ? 'rec' : 'gas') + '">' + (i.valor < 0 ? '+ ' : '− ') + fmtBRL(Math.abs(i.valor)) + (i.parcela ? '<small>de ' + fmtBRL(i.mov.valor) + '</small>' : '') + '</span><span class="s">' + esc(i.rotativo ? 'rotativo' : categoriaPorId(i.categoria).nome + (i.parcela ? ' · parcela ' + i.parcela : '')) + '</span>' +
        (movSel === i.mov.id && !i.rotativo ? '<div class="mini"><button type="button" class="btn danger" data-fm="apagar">Excluir ' + (i.parcela ? 'a compra (todas as parcelas)' : 'lançamento') + '</button></div>' : '') + '</div>'; }).join('') : '<p class="txt" style="color:var(--muted)">Nenhuma compra nesta fatura.</p>');
  // por categoria
  const porCat = {}; for (const i of f.itens) if (!i.estorno && !i.rotativo) porCat[i.categoria] = (porCat[i.categoria] || 0) + i.valor;
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  if (cats.length) { h += '<div class="grp">Por categoria</div>'; for (const [id, v] of cats) { const cc = categoriaPorId(id); h += '<div class="barra"><div class="bl"><span class="sq" style="background:' + cc.cor + '"></span>' + cc.nome + '<b>' + fmtBRL(v) + '</b></div><div class="bt"><div style="width:' + v / cats[0][1] * 100 + '%;background:' + cc.cor + '"></div></div></div>'; } }
  // próximas faturas e limite
  const prox = []; for (let k = 0; k <= 5; k++) prox.push(infoFatura(c, somaMes(ab, k)));
  const mx = Math.max(...prox.map(p => p.total), 1);
  h += '<div class="grp">Próximas faturas (já comprometido)</div><div class="barras6">' + prox.map(p => '<div><span class="vv">' + (p.total ? fmtCurto(p.total) : '') + '</span><i style="height:' + Math.max(2, p.total / mx * 100) + '%;background:' + c.cor + '"></i><small>' + nomeMesKey(p.key) + '</small></div>').join('') + '</div>';
  h += '<div class="grp">Limite · ' + fmtBRL(c.limite) + '</div><div class="prog" style="height:12px;display:flex"><div style="width:' + Math.min(100, u.atual / c.limite * 100) + '%;background:var(--gas);border-radius:0"></div><div style="width:' + Math.min(100, u.futuro / c.limite * 100) + '%;background:#8a5a5a;border-radius:0"></div></div>' +
    '<div class="vals"><span><b class="gas">' + fmtBRL(u.atual) + '</b> em aberto · <b>' + fmtBRL(u.futuro) + '</b> parcelado</span><span>livre <b class="rec">' + fmtBRL(u.livre) + '</b></span></div>';
  const parc = fin.movs.filter(m => m.tipo === 'credito' && m.cartaoId === c.id && (m.parcelas || 1) > 1).map(m => { const k0 = faturaDaCompra(c, m.t); const fim = somaMes(k0, m.parcelas - 1); return { m, k0, fim }; }).filter(x => x.fim >= ab);
  if (parc.length) h += '<div class="grp">Compras parceladas ativas</div>' + parc.map(({ m, k0, fim }) => { const atual = Math.min(m.parcelas, Math.max(1, (Number(ab.slice(0, 4)) - Number(k0.slice(0, 4))) * 12 + Number(ab.slice(5)) - Number(k0.slice(5)) + 1)); return '<div class="slot"><span class="t">' + atual + '/' + m.parcelas + '</span><span class="d">' + esc(m.titulo) + ' · <b>' + fmtBRL(m.valor / m.parcelas) + '</b> até ' + nomeMesKey(fim) + '</span></div>'; }).join('');
  $('finCartoes').innerHTML = h;
  $('subFin').textContent = c.nome + ' · •••• ' + (c.final || '');
}
$('finCartoes').addEventListener('click', async e => {
  const cc = e.target.closest('[data-cartao]'); if (cc) { cartaoSel = cc.dataset.cartao; faturaSel = null; movSel = null; renderFin(); $('finCartoes').scrollTop = 0; return; }
  const fk = e.target.closest('[data-fk]'); if (fk) { faturaSel = fk.dataset.fk; renderCartaoDet(); return; }
  const mv = e.target.closest('[data-mov]'), bm = e.target.closest('[data-fm]');
  if (bm && mv) { if (!bm.classList.contains('armed')) { bm.classList.add('armed'); bm.textContent = 'Excluir mesmo?'; return; } await apagarMov(mv.dataset.mov); movSel = null; renderFin(); return; }
  if (mv) { movSel = movSel === mv.dataset.mov ? null : mv.dataset.mov; renderCartaoDet(); return; }
  const b = e.target.closest('[data-fc]'); if (!b) return;
  const a = b.dataset.fc;
  if (a === 'novo') abrirCartaoForm(null);
  if (a === 'lista') { cartaoSel = null; faturaSel = null; renderFin(); }
  if (a === 'editar') abrirCartaoForm(cartaoSel);
  if (a === 'pagar') abrirPagarFatura(cartaoPorId(cartaoSel), faturaSel);
});
// cadastro
let cartaoEditando = null;
function abrirCartaoForm(id) {
  const c = id ? cartaoPorId(id) : null; cartaoEditando = c;
  $('crTit').textContent = c ? 'Editar cartão' : 'Novo cartão';
  $('crNome').value = c?.nome || ''; $('crFinal').value = c?.final || ''; $('crLimite').value = c ? numBR(c.limite) : '';
  $('crFecha').value = c?.fecha || ''; $('crVence').value = c?.vence || '';
  $('crConta').innerHTML = opcoesContas(c?.contaId || contaPadrao()?.id, false, 'Conta padrão');
  $('crCores').innerHTML = CORES_CARTAO.map(k => '<button type="button" data-cor="' + k + '" style="background:' + k + '" class="' + ((c?.cor || CORES_CARTAO[(fin.cartoes || []).length % CORES_CARTAO.length]) === k ? 'on' : '') + '"></button>').join('');
  $('crAtual').value = ''; $('crAtualBox').hidden = !!c; $('crExcluir').hidden = !c; $('crExcluir').classList.remove('armed'); $('crExcluir').textContent = 'Excluir cartão';
  $('cartaoOv').hidden = false;
}
$('crCores').addEventListener('click', e => { const b = e.target.closest('[data-cor]'); if (!b) return; $('crCores').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
$('crCancelar').onclick = () => { $('cartaoOv').hidden = true; };
$('cartaoOv').addEventListener('click', e => { if (e.target === $('cartaoOv')) $('cartaoOv').hidden = true; });
$('crExcluir').onclick = async () => {
  const b = $('crExcluir'), c = cartaoEditando; if (!c) return;
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Excluir com as compras?'; return; }
  fin.movs = fin.movs.filter(m => m.cartaoId !== c.id || m.tipo === 'pagfatura');
  fin.cartoes = fin.cartoes.filter(x => x.id !== c.id); cartaoSel = null;
  await salvarFin(); $('cartaoOv').hidden = true; agendarAvisosFinDepois(); renderFin();
};
$('formCartao').addEventListener('submit', async e => {
  e.preventDefault();
  const limite = valorBR($('crLimite').value), fecha = parseInt($('crFecha').value), vence = parseInt($('crVence').value);
  if (isNaN(limite) || !(fecha >= 1 && fecha <= 31) || !(vence >= 1 && vence <= 31)) { mostrarDialogo('Faltou informação', '<p>Preencha o limite e os dias de fechamento e vencimento (1 a 31).</p>'); return; }
  const dados = { nome: $('crNome').value.trim() || 'Cartão', final: $('crFinal').value.trim().slice(-4), limite, fecha, vence, contaId: $('crConta').value || null, cor: $('crCores').querySelector('.on')?.dataset.cor || CORES_CARTAO[0] };
  fin.cartoes = fin.cartoes || [];
  if (cartaoEditando) Object.assign(cartaoEditando, dados);
  else {
    const c = { id: novoId(), ...dados, criado: Date.now(), padrao: !fin.cartoes.length }; fin.cartoes.push(c);
    const atual = valorBR($('crAtual').value || '0');
    if (atual > 0) fin.movs.push({ id: novoId(), t: Date.now(), tipo: 'credito', valor: atual, parcelas: 1, cartaoId: c.id, titulo: 'Compras anteriores ao AZote', categoria: 'pessoal' });
  }
  await salvarFin(); $('cartaoOv').hidden = true; agendarAvisosFinDepois(); renderFin();
});
// pagar fatura (total, mínimo ou outro valor)
let pagFat = null;
function abrirPagarFatura(c, key) {
  if (!c) return; const f = infoFatura(c, key); pagFat = { c, key };
  $('pfTit').textContent = 'Pagar fatura de ' + nomeMesKey(key) + ' · ' + c.nome;
  $('pfTotal').textContent = fmtBRL(f.restante); $('pfMinimo').textContent = fmtBRL(minimoFatura(f));
  $('pagFatOv').querySelector('input[value="total"]').checked = true; $('pfOutro').value = '';
  $('pfConta').innerHTML = opcoesContas(c.contaId || contaPadrao()?.id); $('pfData').value = dataInput(Date.now());
  avisoRotativo(); $('pagFatOv').hidden = false;
}
function valorPagFat() {
  const f = infoFatura(pagFat.c, pagFat.key), op = $('pagFatOv').querySelector('input[name="pfOp"]:checked').value;
  return op === 'total' ? f.restante : op === 'minimo' ? minimoFatura(f) : Math.min(f.restante, valorBR($('pfOutro').value) || 0);
}
function avisoRotativo() {
  const f = infoFatura(pagFat.c, pagFat.key), v = valorPagFat(), resto = f.restante - v, j = config.jurosRotativo ?? 0.14;
  $('pfAviso').hidden = resto <= 0.009;
  $('pfAviso').innerHTML = 'Sobram <b>' + fmtBRL(resto) + '</b> para a próxima fatura com juros do rotativo (' + Math.round(j * 100) + '% a.m.): cerca de <b>' + fmtBRL(resto * j) + ' de juros</b>.';
  $('pfPagar').textContent = 'Pagar ' + fmtBRL(v);
}
$('pagFatOv').addEventListener('input', avisoRotativo);
$('pfCancelar').onclick = () => { $('pagFatOv').hidden = true; };
$('pagFatOv').addEventListener('click', e => { if (e.target === $('pagFatOv')) $('pagFatOv').hidden = true; });
function registrarPagamentoFatura(c, key, valor, t, contaId) {
  const f = infoFatura(c, key);
  if (!fin.contas.some(x => !ehInvest(x))) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' });
  const m = { id: novoId(), t, tipo: 'pagfatura', valor: Math.round(valor * 100) / 100, cartaoId: c.id, key, contaId: contaId || c.contaId || contaPadrao()?.id, titulo: 'Fatura ' + c.nome + ' · ' + nomeMesKey(key), categoria: 'financas' };
  fin.movs.push(m);
  const resto = Math.round((f.restante - m.valor) * 100) / 100;
  if (resto > 0.009) fin.movs.push({ id: novoId(), t, tipo: 'rotativo', cartaoId: c.id, key: somaMes(key, 1), origem: key, base: resto, valor: Math.round(resto * (1 + (config.jurosRotativo ?? 0.14)) * 100) / 100, titulo: 'Rotativo', ligadoA: m.id });
  return m;
}
$('formPagFat').addEventListener('submit', async e => {
  e.preventDefault();
  const v = valorPagFat(); if (!(v > 0)) return;
  const ag = new Date(); let t = lerDataInput($('pfData').value, ag.getHours()); if (t > Date.now()) t = lerDataInput($('pfData').value, 9);
  registrarPagamentoFatura(pagFat.c, pagFat.key, v, t, $('pfConta').value);
  await salvarFin(); $('pagFatOv').hidden = true; agendarAvisosFinDepois(); atualizarTudo();
});
// chat
function respCartaoHTML(m) {
  const c = cartaoPorId(m.cartaoId);
  if (m.tipo === 'credito') {
    const k0 = c ? faturaDaCompra(c, m.t) : null, n = m.parcelas || 1, u = c ? usoCartao(c) : null;
    let h = '<p>💳 <b class="gas">− ' + fmtBRL(m.valor) + '</b> · ' + esc(m.titulo) + (n > 1 ? ' em <b>' + n + '× ' + fmtBRL(m.valor / n) + '</b>' : '') + '</p><dl class="ticket"><dt>Cartão</dt><dd>' + esc(c?.nome || '?') + (c?.final ? ' •••• ' + esc(c.final) : '') + '</dd>' +
      (c ? '<dt>' + (n > 1 ? 'Faturas' : 'Fatura') + '</dt><dd>' + (n > 1 ? 'vencem de ' + nomeMesKey(k0) + ' a ' + nomeMesKey(somaMes(k0, n - 1)) : 'vence ' + fmtDMA(datasFatura(c, k0).venc)) + '</dd><dt>Limite</dt><dd class="' + (u.livre < 0 ? 'gas' : '') + '">' + fmtBRL(u.livre) + ' livres</dd>' : '') + '<dt>Categoria</dt><dd>' + categoriaPorId(m.categoria).nome + '</dd></dl>' +
      '<p class="dica">Vira gasto ' + (n > 1 ? 'em cada mês em que a fatura for paga' : 'de ' + (c ? MESES_LONGO[new Date(datasFatura(c, k0).venc).getMonth()] : '') + ', quando a fatura for paga') + '.</p>';
    if (c && u.atual + u.futuro > c.limite * 0.8) h += '<p class="alerta">⚠ ' + esc(c.nome) + ' passou de 80% do limite.</p>';
    const outros = (fin.cartoes || []).filter(x => x.id !== m.cartaoId);
    if (outros.length) h += '<div class="ex">' + outros.map(x => '<button type="button" class="chip" data-fa="trocar-cartao" data-cartao="' + esc(x.id) + '" data-id="' + esc(m.id) + '">Era o ' + esc(x.nome) + '</button>').join('') + '</div>';
    return h + '<div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
  }
  if (m.tipo === 'estorno') return '<p>💳 <b class="rec">+ ' + fmtBRL(m.valor) + '</b> · ' + esc(m.titulo) + ' no ' + esc(c?.nome || 'cartão') + '. Desconta da fatura de ' + (c ? nomeMesKey(faturaDaCompra(c, m.t)) : '') + '.</p><div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
  if (m.tipo === 'pagfatura') {
    const rot = fin.movs.find(x => x.tipo === 'rotativo' && x.ligadoA === m.id);
    return '<p>✓ Fatura de ' + nomeMesKey(m.key) + ' do <b>' + esc(c?.nome || 'cartão') + '</b> paga: <b class="gas">' + fmtBRL(m.valor) + '</b> saiu de ' + esc(contaPorId(m.contaId)?.nome || 'conta') + '.</p><p class="dica">Entra como gasto de ' + MESES_LONGO[new Date(m.t).getMonth()] + ', separado pelas categorias das compras da fatura.</p>' +
      (rot ? '<p class="alerta">Ficaram ' + fmtBRL(rot.base) + ' no rotativo: ' + fmtBRL(rot.valor) + ' na próxima fatura.</p>' : '') + '<div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
  }
  return '<p>' + esc(m.titulo) + '</p>';
}
function lancamentoCartao(texto, t) {
  const r = interpretarCartao(texto, new Date(), fin.cartoes || []);
  if (!r) return false;
  const c = r.cartao || cartaoPadrao();
  if (r.acao === 'pagarFatura') {
    const alvo = faturasRelevantes(c).filter(f => f.restante > 0.009 && f.status !== 'aberta')[0] || faturasRelevantes(c).filter(f => f.restante > 0.009)[0];
    if (!alvo) { textoFin('<p>Não há fatura em aberto no <b>' + esc(c.nome) + '</b>.</p>'); return true; }
    const m = registrarPagamentoFatura(c, alvo.key, r.valor ? Math.min(r.valor, alvo.restante) : alvo.restante, Date.now(), null);
    fin.chat.push({ k: 'mov', id: m.id, t }); agendarAvisosFinDepois(); return true;
  }
  if (r.acao === 'estorno') { const m = { id: novoId(), t: Date.now(), tipo: 'estorno', valor: r.valor, cartaoId: c.id, titulo: r.titulo, categoria: 'pessoal' }; fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t }); return true; }
  if (r.acao === 'compraCredito') { const m = { id: novoId(), t: r.quando || Date.now(), tipo: 'credito', valor: r.valor, parcelas: r.parcelas, cartaoId: c.id, titulo: r.titulo, categoria: r.categoria }; fin.movs.push(m); fin.chat.push({ k: 'mov', id: m.id, t }); agendarAvisosFinDepois(); return true; }
  return false;
}
