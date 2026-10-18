
// =====================================================================
// 1.15 · Finanças › Extrato (editar lançamentos), Revisar lançamentos,
// assinaturas que se repetem, dividir gastos e “a receber de pessoas”
// =====================================================================
let extFiltro = 'tudo', extConta = '', extCat = '', extMes = null, extRevisar = false, revCatAberto = false, movEditando = null;
const round2 = v => Math.round(v * 100) / 100;
const valorGasto = m => round2(m.valor - (m.aReceber || 0)); // dividido: só a sua parte conta como gasto
const SINAL_MOV = { gasto: -1, pagfatura: -1, credito: -1, guardar: -1, receita: 1, rend: 1, estorno: 1, resgatar: 1, transf: 0 };
const sinalMov = m => m.tipo === 'ajuste' ? Math.sign(m.valor) : SINAL_MOV[m.tipo] ?? 0;
const ICONE_CAT = { trabalho: '💼', saude: '💊', estudo: '📚', financas: '🏦', casa: '🏠', lazer: '🎉', pessoal: '🛍️' };
function iconeMov(m) {
  const s = finTxt(m.titulo || '');
  for (const [re, ic] of [[/uber|99|taxi|onibus|metro|gasolina|combustivel|posto|estacionamento/, '🚗'], [/mercado|supermercado|feira|atacad/, '🛒'], [/padaria|pao/, '🥖'], [/cafe/, '☕'], [/ifood|lanche|pizza|hamburg/, '🍔'], [/jantar|almoco|restaurante|bar\b/, '🍽️'], [/farmacia|remedio/, '💊'], [/netflix|spotify|prime|disney|hbo|youtube|assinatura/, '🎬'], [/luz|energia|agua|internet|gas\b|telefone|celular/, '💡'], [/aluguel|condominio/, '🏠'], [/salario|freela|reembolso/, '💰']]) if (re.test(s)) return ic;
  if (m.tipo === 'transf') return '↔️'; if (m.tipo === 'rend') return '📈'; if (m.tipo === 'credito' || m.tipo === 'pagfatura') return '💳';
  return ICONE_CAT[m.categoria] || '•';
}
function nomeContaMov(m) {
  if (m.tipo === 'credito' || m.tipo === 'estorno') return (fin.cartoes || []).find(c => c.id === m.cartaoId)?.nome || 'Cartão';
  if (m.tipo === 'transf') return (contaPorId(m.contaId)?.nome || '?') + ' → ' + (contaPorId(m.destinoId)?.nome || '?');
  return contaPorId(m.contaId)?.nome || '';
}
// ----- lista -----
function movsDoExtrato() {
  const ini = extMes, fim = fimMes(extMes);
  return fin.movs.filter(m => m.t >= ini && m.t <= fim && m.tipo !== 'rotativo' &&
    (extFiltro === 'tudo' || (extFiltro === 'gastos' ? ['gasto', 'credito', 'pagfatura'].includes(m.tipo) : extFiltro === 'entradas' ? ['receita', 'rend', 'estorno', 'resgatar'].includes(m.tipo) : ['credito', 'estorno', 'pagfatura'].includes(m.tipo))) &&
    (!extConta || m.contaId === extConta || m.destinoId === extConta) && (!extCat || m.categoria === extCat)).sort((a, b) => b.t - a.t);
}
function linhaExtHTML(m) {
  const s = sinalMov(m), d = new Date(m.t), cor = s < 0 ? 'gas' : s > 0 ? (sinalGuardado(m) ? 'inv' : 'rec') : 'neu';
  const sub = APP === 'fin' ? [subMov(m), fmtHora(d)].filter(Boolean).join(' · ') : [m.tipo === 'transf' ? 'Transferência' : categoriaPorId(m.categoria).nome, nomeContaMov(m), fmtHora(d)].filter(Boolean).join(' · ');
  const extra = m.aReceber ? '<em class="tag">dividido · sua parte ' + fmtBRL(valorGasto(m)) + '</em>' : m.reemb ? '<em class="tag">reembolso</em>' : m.parcelas > 1 ? '<em class="tag">' + m.parcelas + 'x</em>' : '';
  const row = '<button type="button" class="ext-it" data-em="' + esc(m.id) + '"><span class="ic">' + iconeMov(m) + '</span><span class="tx"><b>' + esc(m.titulo || 'Lançamento') + '</b><small>' + esc(sub) + '</small>' + extra + '</span><span class="v ' + cor + '">' + (s < 0 ? '− ' : s > 0 ? '+ ' : '↔ ') + fmtBRL(Math.abs(m.valor)) + '</span></button>';
  return swHTML('mov', m.id, '🗑 Excluir', '✎ Editar', row);
}
function renderExtrato() {
  if (!extMes) extMes = inicioMes(Date.now());
  if (extRevisar) { renderRevisar(); return; }
  const box = $('finExtrato'), dm = new Date(extMes), atual = extMes === inicioMes(Date.now());
  const pend = pendenciasRevisao(extMes);
  let h = '<div class="ext-nav"><button type="button" class="nav" data-ex="mes-" aria-label="Mês anterior">‹</button><b>' + maiuscula(MESES_LONGO[dm.getMonth()]) + (dm.getFullYear() !== new Date().getFullYear() ? ' de ' + dm.getFullYear() : '') + '</b><button type="button" class="nav" data-ex="mes+"' + (atual ? ' disabled' : '') + ' aria-label="Próximo mês">›</button>' +
    '<button type="button" class="chip rev-bt' + (pend.total ? ' on' : '') + '" data-ex="revisar">' + (pend.total ? '⚑ Revisar · ' + pend.total : '✓ Revisar') + '</button></div>';
  h += '<div class="cf-bar">' + [['tudo', 'Tudo'], ['gastos', 'Gastos'], ['entradas', 'Entradas'], ['cartao', 'Cartão']].map(([k, n]) => '<button type="button" class="chip' + (extFiltro === k ? ' on' : '') + '" data-ef="' + k + '">' + n + '</button>').join('') + '</div>';
  const contas = fin.contas.filter(c => !ehInvest(c));
  h += '<div class="cf-bar">' + (contas.length > 1 ? '<select class="ext-sel" id="extConta"><option value="">Todas as contas</option>' + contas.map(c => '<option value="' + esc(c.id) + '"' + (c.id === extConta ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select>' : '') +
    (extCat ? '<button type="button" class="chip on" data-ex="tirar-cat">' + categoriaPorId(extCat).nome + ' ✕</button>' : '') + '</div>';
  const lista = movsDoExtrato();
  const tot = lista.reduce((a, m) => { const s = sinalMov(m); if (s < 0 && m.tipo !== 'pagfatura') a.g += m.tipo === 'gasto' ? valorGasto(m) : m.valor; if (s > 0 && !m.reemb) a.e += m.valor; return a; }, { g: 0, e: 0 });
  if (lista.length) h += '<div class="ext-tot"><span>' + lista.length + (lista.length === 1 ? ' lançamento' : ' lançamentos') + '</span>' + (tot.e ? '<b class="rec">+ ' + fmtBRL(tot.e) + '</b>' : '') + (tot.g ? '<b class="gas">− ' + fmtBRL(tot.g) + '</b>' : '') + '</div>';
  let dia = null;
  for (const m of lista) {
    const k = inicioDoDia(m.t).getTime();
    if (k !== dia) {
      dia = k; const d = new Date(k), dif = difDias(k);
      const g = lista.filter(x => inicioDoDia(x.t).getTime() === k && sinalMov(x) < 0).reduce((a, x) => a + (x.tipo === 'gasto' ? valorGasto(x) : x.valor), 0);
      h += '<div class="ext-dia"><span>' + (dif === 0 ? 'Hoje · ' : dif === -1 ? 'Ontem · ' : '') + DIAS[d.getDay()] + ', ' + d.getDate() + '</span>' + (g ? '<b class="gas">− ' + fmtBRL(g) + '</b>' : '') + '</div>';
    }
    h += linhaExtHTML(m);
  }
  if (!lista.length) h += '<div class="empty">' + (fin.movs.length ? 'Nada lançado com esses filtros em ' + MESES_LONGO[dm.getMonth()] + '.' : '<b>Nenhum lançamento ainda.</b><br>Escreva em Lançamentos, como <i>“mercado 312,45”</i>. Aqui você vê, corrige e revisa tudo.') + '</div>';
  else h += '<p class="dica">Toque para editar · deslize → para editar ou ← para excluir.</p>';
  box.innerHTML = h;
}
$('finExtrato').addEventListener('click', async e => {
  const b = e.target.closest('[data-ex],[data-ef],[data-em],[data-rv]'); if (!b) return;
  if (b.dataset.ef) { extFiltro = b.dataset.ef; renderExtrato(); return; }
  if (b.dataset.em) { abrirEditMov(b.dataset.em); return; }
  if (b.dataset.rv) { await acaoRevisar(b); return; }
  const a = b.dataset.ex;
  if (a === 'mes-') { extMes = inicioMes(extMes - 86400000); renderExtrato(); }
  if (a === 'mes+') { const n = inicioMes(fimMes(extMes) + 86400000); if (n <= Date.now()) { extMes = n; renderExtrato(); } }
  if (a === 'revisar') { extRevisar = true; revCatAberto = false; renderExtrato(); $('finExtrato').scrollTop = 0; }
  if (a === 'voltar') { extRevisar = false; renderExtrato(); }
  if (a === 'tirar-cat') { extCat = ''; renderExtrato(); }
});
$('finExtrato').addEventListener('change', e => { if (e.target.id === 'extConta') { extConta = e.target.value; renderExtrato(); } });
ACOES_SW.mov = {
  dir: id => abrirEditMov(id),
  esq: async id => { const m = fin.movs.find(x => x.id === id); if (!m) return; const foto = fotoFin(); await apagarMov(id); renderFin(); toastDesfazer('“' + (m.titulo || 'Lançamento') + '” excluído', () => voltarFin(foto)); },
};
// ----- editar um lançamento -----
const EDIT_TOTAL = ['gasto', 'receita'], EDIT_PARCIAL = ['credito', 'transf', 'rend', 'ajuste'];
function abrirEditMov(id) {
  const m = fin.movs.find(x => x.id === id); if (!m) return; movEditando = m;
  const total = EDIT_TOTAL.includes(m.tipo) && !m.dividaId && !m.metaId, parcial = EDIT_PARCIAL.includes(m.tipo) && !m.metaId && !m.dividaId, lim = !total && !parcial;
  const d = new Date(m.t);
  $('mvTit').textContent = 'Editar ' + ({ gasto: 'gasto', receita: 'receita', credito: 'compra no cartão', transf: 'transferência', rend: 'rendimento', ajuste: 'ajuste' }[m.tipo] || 'lançamento');
  $('mvValor').value = numBR(Math.abs(m.valor)); $('mvValor').disabled = lim;
  $('mvData').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); $('mvHora').value = fmtHora(d);
  $('mvCat').innerHTML = CATEGORIAS.map(c => '<option value="' + c.id + '">' + ICONE_CAT[c.id] + ' ' + c.nome + '</option>').join(''); $('mvCat').value = m.categoria || 'pessoal';
  $('mvCatBox').hidden = !(total || m.tipo === 'credito');
  const credito = m.tipo === 'credito';
  $('mvContaRot').textContent = credito ? 'Cartão' : m.tipo === 'transf' ? 'Saiu de' : m.tipo === 'receita' || m.tipo === 'rend' ? 'Entrou em' : 'Conta';
  $('mvConta').innerHTML = credito ? (fin.cartoes || []).map(c => '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>').join('') : opcoesContas(m.contaId, m.tipo === 'rend' || m.tipo === 'transf' || m.tipo === 'ajuste');
  $('mvConta').value = credito ? m.cartaoId : m.contaId || '';
  $('mvContaBox').hidden = lim; $('mvDestBox').hidden = m.tipo !== 'transf';
  if (m.tipo === 'transf') { $('mvDest').innerHTML = opcoesContas(m.destinoId, true); $('mvDest').value = m.destinoId; }
  $('mvDesc').value = m.titulo || '';
  $('mvDica').hidden = !lim && !m.aReceber && !m.agId;
  $('mvDica').textContent = lim ? 'Este lançamento faz parte de uma fatura, meta ou dívida: dá para mudar a data e a descrição. Para mudar o valor, exclua e lance de novo.' : m.aReceber ? 'Dividido em ' + m.partes + ': ao mudar o valor, as partes a receber mudam junto.' : m.agId ? 'É a baixa de uma conta programada.' : '';
  $('mvDuplicar').hidden = lim; const x = $('mvExcluir'); x.classList.remove('armed'); x.textContent = 'Excluir';
  $('movOv').hidden = false;
}
$('mvCancelar').onclick = () => { $('movOv').hidden = true; };
$('movOv').addEventListener('click', e => { if (e.target === $('movOv')) $('movOv').hidden = true; });
$('formMov').addEventListener('submit', async e => {
  e.preventDefault(); const m = movEditando; if (!m) return;
  const foto = fotoFin();
  const [a, mm, d] = $('mvData').value.split('-').map(Number), [hh, mi] = ($('mvHora').value || '12:00').split(':').map(Number);
  if (a) m.t = new Date(a, mm - 1, d, hh, mi).getTime();
  m.titulo = $('mvDesc').value.trim() || m.titulo;
  if (!$('mvValor').disabled) {
    const v = valorBR($('mvValor').value); if (isNaN(v) || v <= 0) { toast('Valor inválido'); return; }
    const novo = m.tipo === 'ajuste' ? (m.valor < 0 ? -v : v) : v;
    if (m.aReceber && Math.abs(novo - m.valor) > 0.009) { const f = novo / m.valor; m.aReceber = round2(m.aReceber * f); for (const r of fin.receber || []) if (r.movId === m.id && !r.pago) r.valor = round2(r.valor * f); }
    m.valor = round2(novo);
  }
  if (!$('mvCatBox').hidden) m.categoria = $('mvCat').value;
  if (!$('mvContaBox').hidden && $('mvConta').value) { if (m.tipo === 'credito') m.cartaoId = $('mvConta').value; else m.contaId = $('mvConta').value; }
  if (m.tipo === 'transf' && $('mvDest').value && $('mvDest').value !== m.contaId) m.destinoId = $('mvDest').value;
  (fin.revOk = fin.revOk || {})['cat:' + m.id] = true;
  await salvarFin(); $('movOv').hidden = true; agendarAvisosFinDepois(); atualizarTudo();
  toastDesfazer('Lançamento corrigido ✓', () => voltarFin(foto));
});
$('mvDuplicar').onclick = async () => {
  const m = movEditando; if (!m) return; const foto = fotoFin();
  const c = { ...clonar(m), id: novoId(), t: Date.now() }; for (const k of ['agId', 'chave', 'dividaId', 'metaId', 'aReceber', 'partes', 'reemb', 'receberAntes', 'ligadoA']) delete c[k];
  fin.movs.push(c); await salvarFin(); $('movOv').hidden = true; atualizarTudo();
  toastDesfazer('Duplicado para hoje', () => voltarFin(foto));
};
$('mvExcluir').onclick = async () => {
  const b = $('mvExcluir'), m = movEditando; if (!m) return;
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Excluir mesmo?'; return; }
  const foto = fotoFin(); await apagarMov(m.id); $('movOv').hidden = true; atualizarTudo();
  toastDesfazer('“' + (m.titulo || 'Lançamento') + '” excluído', () => voltarFin(foto));
};

// ----- revisar lançamentos -----
function medianaDe(l) { const s = [...l].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }
function pendenciasRevisao(mes) {
  const ok = fin.revOk || {}, ini = mes, fim = fimMes(mes), agora = Date.now();
  const doMes = fin.movs.filter(m => m.t >= ini && m.t <= fim && m.tipo !== 'rotativo');
  const gastos = doMes.filter(m => m.tipo === 'gasto' || m.tipo === 'credito' || m.tipo === 'receita');
  // possíveis repetidos: mesmo tipo e valor, mesmo nome no mesmo dia ou com até 10 min de diferença
  const rep = [];
  for (let i = 0; i < gastos.length; i++) for (let j = i + 1; j < gastos.length; j++) {
    const a = gastos[i], b = gastos[j]; if (a.tipo !== b.tipo || Math.abs(a.valor - b.valor) > 0.009) continue;
    const [p, s] = a.t <= b.t ? [a, b] : [b, a];
    if (ok['rep:' + p.id + ':' + s.id]) continue;
    if (s.t - p.t <= 10 * 60000 || (chaveDia(p.t) === chaveDia(s.t) && finTxt(p.titulo) === finTxt(s.titulo))) rep.push([p, s]);
  }
  // valor fora do comum: muito acima do que costuma ser com o mesmo nome (ou na categoria)
  const val = [];
  const hist = fin.movs.filter(m => (m.tipo === 'gasto' || m.tipo === 'credito') && m.t > agora - 400 * 86400000);
  for (const m of gastos.filter(x => x.tipo !== 'receita')) {
    if (ok['val:' + m.id]) continue;
    const k = finPalavras(m.titulo)[0];
    let base = k ? hist.filter(x => x.id !== m.id && finPalavras(x.titulo)[0] === k).map(x => x.valor) : [], min = 4, dif = 50;
    if (base.length < 3) { base = hist.filter(x => x.id !== m.id && x.categoria === m.categoria).map(x => x.valor); min = 6; dif = 200; if (base.length < 8) continue; }
    const md = medianaDe(base); if (!(md > 0) || m.valor < md * min || m.valor - md < dif) continue;
    const sug = [m.valor / 100, m.valor / 10].find(v => v >= md / 2.5 && v <= md * 2.5);
    val.push({ m, md, sug: sug ? round2(sug) : null });
  }
  const semCat = gastos.filter(m => m.tipo !== 'receita' && (m.categoria || 'pessoal') === 'pessoal' && !ok['cat:' + m.id]);
  const hoje0 = inicioDoDia(agora).getTime();
  const contas = todasOcorrencias(ini, Math.min(fim, hoje0 - 1)).filter(o => !o.paga && o.ag.tipo === 'pagar' && !o.ag.divida && !o.ag.cartao && !ok['ag:' + o.ag.id + ':' + o.chave]);
  const assin = mes === inicioMes(agora) ? detectarAssinaturas(agora) : [];
  const envolvidos = new Set([...rep.flat().map(m => m.id), ...val.map(x => x.m.id), ...semCat.map(m => m.id)]);
  return { rep, val, semCat, contas, assin, doMes, envolvidos, total: rep.length + val.length + (semCat.length ? 1 : 0) + contas.length + assin.length };
}
function renderRevisar() {
  const p = pendenciasRevisao(extMes), dm = new Date(extMes), n = p.doMes.length, okN = n - p.envolvidos.size;
  let h = '<button type="button" class="volta-lista" data-ex="voltar">‹ Extrato</button>';
  h += '<div class="rev-top">' + anelHTML(n ? okN / n : 1, 58, 'var(--accent)', 6, '<b style="font-size:0.85rem">' + (n ? Math.round(okN / n * 100) : 100) + '%</b>') + '<div><small>Sem pendências em ' + MESES_LONGO[dm.getMonth()] + '</small><b>' + okN + ' de ' + n + ' lançamentos</b></div></div>';
  const card = (ic, tit, txt, bts) => '<div class="rev-card"><span class="ic">' + ic + '</span><div><b>' + tit + '</b><small>' + txt + '</small><div class="bts">' + bts + '</div></div></div>';
  const bt = (rot, a, dados, prim) => '<button type="button" class="' + (prim ? 'p' : '') + '" data-rv="' + a + '" ' + Object.entries(dados).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + rot + '</button>';
  for (const [a, b] of p.rep) h += card('👯', 'Possível repetido', esc(b.titulo) + ' ' + fmtBRL(b.valor) + ' · ' + fmtDM(a.t) + (b.t - a.t < 3600000 ? ', ' + Math.max(1, Math.round((b.t - a.t) / 60000)) + ' min de diferença' : ', duas vezes no dia'), bt('Apagar o segundo', 'rep-apagar', { id: b.id }, true) + bt('São dois mesmo', 'rep-ok', { k: 'rep:' + a.id + ':' + b.id }));
  for (const x of p.val) h += card('⚠️', 'Valor fora do comum', esc(x.m.titulo) + ' ' + fmtBRL(x.m.valor) + ' · costuma ser ' + fmtBRL(x.md) + (x.sug ? '. Faltou a vírgula?' : '.'), (x.sug ? bt('Era ' + fmtBRL(x.sug), 'val-corrigir', { id: x.m.id, v: x.sug }, true) : bt('Corrigir', 'editar', { id: x.m.id }, true)) + bt('Está certo', 'ok', { k: 'val:' + x.m.id }));
  if (p.semCat.length) {
    h += card('🏷️', 'Sem categoria definida', p.semCat.length + (p.semCat.length === 1 ? ' lançamento ficou' : ' lançamentos ficaram') + ' como “Pessoal”: ' + esc(p.semCat.slice(0, 4).map(m => m.titulo).join(', ')) + (p.semCat.length > 4 ? '…' : ''), revCatAberto ? bt('Fechar', 'cat-abrir', {}) : bt('Escolher categorias', 'cat-abrir', {}, true));
    if (revCatAberto) h += '<div class="rev-cats">' + p.semCat.slice(0, 20).map(m => '<div class="rc"><b>' + iconeMov(m) + ' ' + esc(m.titulo) + ' <span class="gas">' + fmtBRL(m.valor) + '</span></b><div class="ex">' + CATEGORIAS.filter(c => c.id !== 'trabalho' && c.id !== 'pessoal').map(c => '<button type="button" class="chip" data-rv="cat" data-id="' + esc(m.id) + '" data-cat="' + c.id + '">' + ICONE_CAT[c.id] + ' ' + c.nome + '</button>').join('') + '<button type="button" class="chip" data-rv="ok" data-k="cat:' + esc(m.id) + '">É pessoal</button></div></div>').join('') + '</div>';
  }
  for (const o of p.contas) { const d = new Date(o.t); h += card('📅', 'Conta paga fora do app?', esc(o.ag.titulo) + ' ' + fmtBRL(o.ag.valor) + ' venceu dia ' + d.getDate() + ' e não tem baixa', bt('Paguei dia ' + d.getDate(), 'pagar', { ag: o.ag.id, chave: o.chave, t: o.t }, true) + bt('Outro valor', 'pagar-outro', { ag: o.ag.id, chave: o.chave, t: o.t }) + bt('Ainda não', 'ok', { k: 'ag:' + o.ag.id + ':' + o.chave })); }
  for (const s of p.assin) h += card('🔁', 'Parece uma assinatura', esc(maiuscula(s.titulo)) + ' ' + fmtBRL(s.valor) + ' por volta do dia ' + s.dia + ' · ' + s.meses + ' meses seguidos', bt('Programar todo mês', 'assin', { key: s.key }, true) + bt('Não é', 'assin-nao', { key: s.key }));
  if (!p.total) h += '<div class="empty" style="margin-top:12px">Tudo certo por aqui ✓<br>Nenhum repetido, valor estranho ou conta sem baixa em ' + MESES_LONGO[dm.getMonth()] + '.</div>';
  // conferir com o banco
  const contasB = fin.contas.filter(c => !ehInvest(c));
  if (contasB.length) h += '<div class="grp">Conferir com o banco</div>' + contasB.map(c => { const dd = c.conferido ? Math.floor((Date.now() - c.conferido) / 86400000) : null; return '<div class="rev-banco"><div><small>' + esc(c.nome) + (dd === null ? ' · nunca conferida' : ' · conferida ' + (dd === 0 ? 'hoje' : 'há ' + dd + (dd === 1 ? ' dia' : ' dias'))) + '</small><b>' + fmtBRL(saldoConta(c)) + '</b></div><button type="button" class="chip on" data-rv="conferir" data-id="' + esc(c.id) + '">Conferir saldo</button></div>'; }).join('');
  // contas fixas e assinaturas
  const fixas = fin.agendadas.filter(a => a.tipo === 'pagar' && a.repetir?.tipo === 'mensal' && (!a.ate || a.ate > Date.now()));
  if (fixas.length) h += '<div class="grp">Contas fixas e assinaturas · ' + fmtBRL(fixas.reduce((s, a) => s + a.valor, 0)) + '/mês</div>' + fixas.sort((a, b) => b.valor - a.valor).map(a => '<div class="ext-it fixa"><span class="ic">' + iconeMov(a) + '</span><span class="tx"><b>' + esc(a.titulo) + '</b><small>todo dia ' + new Date(a.inicio).getDate() + (a.assinatura ? ' · assinatura' : '') + '</small></span><span class="v gas">' + fmtBRL(a.valor) + '</span></div>').join('');
  $('finExtrato').innerHTML = h;
}
async function acaoRevisar(b) {
  const a = b.dataset.rv, d = b.dataset;
  if (a === 'editar') { abrirEditMov(d.id); return; }
  if (a === 'conferir') { abrirConferir(d.id); return; }
  if (a === 'cat-abrir') { revCatAberto = !revCatAberto; renderExtrato(); return; }
  const foto = fotoFin(); fin.revOk = fin.revOk || {};
  let msg = 'Feito ✓';
  if (a === 'rep-apagar') { await apagarMov(d.id); msg = 'Repetido apagado'; }
  if (a === 'rep-ok' || a === 'ok') { fin.revOk[d.k] = true; msg = 'Marcado como certo'; }
  if (a === 'val-corrigir') { const m = fin.movs.find(x => x.id === d.id); if (m) { m.valor = Number(d.v); fin.revOk['val:' + m.id] = true; msg = 'Valor corrigido para ' + fmtBRL(m.valor); } }
  if (a === 'cat') { const m = fin.movs.find(x => x.id === d.id); if (m) { m.categoria = d.cat; fin.revOk['cat:' + m.id] = true; msg = m.titulo + ' → ' + categoriaPorId(d.cat).nome; } }
  if (a === 'pagar' || a === 'pagar-outro') {
    const ag = fin.agendadas.find(x => x.id === d.ag); if (!ag) return;
    const o = ocorrenciasConta(ag, Number(d.t) - 1, Number(d.t) + 1).find(x => x.chave === d.chave);
    if (o && a === 'pagar-outro') { abrirBaixa(o); return; }
    if (o && !o.paga) { const m = { id: novoId(), t: o.t, tipo: 'gasto', valor: ag.valor, contaId: ag.contaId || contaPadrao()?.id, titulo: ag.titulo, categoria: ag.categoria, agId: ag.id, chave: o.chave }; ag.baixas = { ...(ag.baixas || {}), [o.chave]: m.id }; fin.movs.push(m); msg = 'Baixa de ' + ag.titulo + ' lançada'; }
  }
  if (a === 'assin') { const ag = programarAssinatura(d.key); if (ag) msg = ag.titulo + ' programada todo dia ' + new Date(ag.inicio).getDate(); }
  if (a === 'assin-nao') { (fin.naoAssin = fin.naoAssin || {})[d.key] = true; msg = 'Combinado, não é assinatura'; }
  await salvarFin(); agendarAvisosFinDepois(); renderExtrato();
  toastDesfazer(msg, () => voltarFin(foto));
}

// ----- assinaturas: o mesmo gasto, com valor parecido, em meses seguidos -----
const chaveAssin = x => finPalavras(x.titulo || '').slice(0, 2).join(' ') || finTxt(x.titulo || '').trim();
function detectarAssinaturas(agora = Date.now()) {
  const d = new Date(agora), m0 = d.getFullYear() * 12 + d.getMonth(), grupos = new Map(), nao = fin.naoAssin || {};
  for (const m of fin.movs) {
    if (m.tipo !== 'gasto' || m.agId || m.dividaId || m.metaId || m.aReceber) continue;
    const dm = new Date(m.t), mi = dm.getFullYear() * 12 + dm.getMonth(); if (mi > m0 || m0 - mi > 3) continue;
    const k = chaveAssin(m); if (!k || nao[k]) continue;
    if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push({ m, mi });
  }
  const progs = new Set(fin.agendadas.map(chaveAssin)), out = [];
  for (const [k, l] of grupos) {
    const meses = new Set(l.map(x => x.mi)); if (meses.size < 2 || l.length > meses.size + 1 || progs.has(k)) continue;
    const vals = l.map(x => x.m.valor); if (Math.max(...vals) > Math.min(...vals) * 1.15) continue;
    const ult = l.sort((a, b) => b.m.t - a.m.t)[0]; if (m0 - ult.mi > 1) continue;
    out.push({ key: k, titulo: ult.m.titulo, valor: ult.m.valor, dia: new Date(ult.m.t).getDate(), meses: meses.size, mov: ult.m });
  }
  return out;
}
function programarAssinatura(key) {
  const s = detectarAssinaturas().find(x => x.key === key); if (!s) return null;
  const dm = new Date(s.mov.t), ini = new Date(dm.getFullYear(), dm.getMonth(), dm.getDate(), 12).getTime(), ch = chaveDia(ini);
  const ag = { id: novoId(), tipo: 'pagar', titulo: maiuscula(s.titulo), valor: s.valor, inicio: ini, repetir: { tipo: 'mensal' }, categoria: s.mov.categoria, contaId: s.mov.contaId || null, baixas: { [ch]: s.mov.id }, criado: Date.now(), assinatura: true };
  s.mov.agId = ag.id; s.mov.chave = ch; fin.agendadas.push(ag); return ag;
}
function assinNoChatHTML(m) {
  if (!m || m.tipo !== 'gasto' || m.agId) return '';
  const k = chaveAssin(m), s = detectarAssinaturas().find(x => x.key === k); if (!s) return '';
  return '<div class="campo-sug"><small>Parece uma assinatura</small><b>' + esc(maiuscula(s.titulo)) + ' ' + fmtBRL(s.valor) + ' todo dia ' + s.dia + ' · ' + s.meses + 'º mês seguido</b></div><div class="actions"><button type="button" class="btn primary" data-fa="assin-prog" data-key="' + esc(k) + '">Programar todo mês</button><button type="button" class="btn" data-fa="assin-nao" data-key="' + esc(k) + '">Não é</button></div>';
}

// ----- dividir gastos: “jantar 180 dividido com Ana e Pedro” -----
const RE_DIV = /\b(dividid[oa]s?|dividi|dividimos|dividir|rachad[oa]s?|rachei|rachamos|rachar)\b/i;
function lerDivisao(texto) {
  if (!RE_DIV.test(texto)) return null;
  let s = ' ' + texto.replace(RE_DIV, ' ') + ' ', partes = null, nomes = [];
  const mp = /\b(?:por|em|entre)\s+(\d{1,2})(?!\s*(?:x|vezes|parcelas?)\b)(?:\s+pessoas?)?\b/i.exec(s);
  if (mp) { partes = +mp[1]; s = s.slice(0, mp.index) + ' ' + s.slice(mp.index + mp[0].length); }
  const mn = /\b(?:com|entre)\s+(.+)$/i.exec(s);
  if (mn) {
    nomes = mn[1].split(/\s*,\s*|\s+e\s+/).map(x => x.replace(/^(a|o|as|os|minha|meu|minhas|meus)\s+/i, '').trim()).filter(x => x && !/^(eu|mim|comigo)$/i.test(x) && !/\d/.test(x)).map(x => maiuscula(x));
    s = s.slice(0, mn.index);
  }
  partes = partes || (nomes.length ? nomes.length + 1 : 2);
  if (partes < 2 || partes > 20) return null;
  const base = s.replace(/^\s*(o|a|os|as)\s+/i, '').replace(/\s{2,}/g, ' ').trim();
  return base ? { base, partes, nomes } : null;
}
function aplicarDivisao(m, dv) {
  const parte = round2(m.valor / dv.partes); m.aReceber = round2(m.valor - parte); m.partes = dv.partes;
  fin.receber = fin.receber || [];
  const nomes = dv.nomes.length ? dv.nomes : [dv.partes - 1 === 1 ? 'Outra pessoa' : (dv.partes - 1) + ' pessoas'];
  let resto = m.aReceber;
  nomes.forEach((n, i) => { const v = i === nomes.length - 1 ? round2(resto) : (dv.nomes.length ? parte : m.aReceber); resto -= v; fin.receber.push({ id: novoId(), nome: n, valor: v, movId: m.id, titulo: m.titulo, t: m.t, pago: false }); });
}
function divisaoHTML(m) {
  const rs = (fin.receber || []).filter(r => r.movId === m.id);
  return '<dl class="ticket"><dt>Sua parte</dt><dd>' + fmtBRL(valorGasto(m)) + ' (só ela conta no Posso gastar)</dd>' + rs.map(r => '<dt>' + esc(r.nome) + '</dt><dd class="' + (r.pago ? '' : 'rec') + '">' + (r.pago ? 'pagou ✓' : 'deve ' + fmtBRL(r.valor)) + '</dd>').join('') + '</dl>' +
    (rs.some(r => !r.pago) ? '<div class="actions"><button type="button" class="btn" data-fa="cobrar" data-id="' + esc(m.id) + '">Lembrar de cobrar sexta</button><button type="button" class="btn" data-fa="copiar-cobranca" data-id="' + esc(m.id) + '">Copiar cobrança</button></div>' : '');
}
// “Ana me pagou”, “recebi 60 do Pedro”
function lerRecebimentoPessoa(texto) {
  const abertos = (fin.receber || []).filter(r => !r.pago); if (!abertos.length) return null;
  const s = finTxt(texto);
  if (!/\b(pagou|pagaram|devolveu|transferiu|mandou|pix|acertou|recebi|depositou)\b/.test(s)) return null;
  const nomes = [...new Set(abertos.map(r => r.nome))].filter(n => !/pessoa/.test(n) && new RegExp('(^|[^a-z])' + finTxt(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(s));
  if (nomes.length !== 1) return null;
  const v = finValor(s);
  return { nome: nomes[0], valor: v ? v.valor : null };
}
function registrarRecebimento(nome, valor, t = Date.now(), ids = null) {
  const abertos = (fin.receber || []).filter(r => !r.pago && (ids ? ids.includes(r.id) : r.nome === nome)).sort((a, b) => a.t - b.t); if (!abertos.length) return null;
  let resto = valor ?? abertos.reduce((s, r) => s + r.valor, 0); const total = resto;
  if (!fin.contas.some(c => !ehInvest(c))) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: t, padrao: true, lembrete: 'mes' });
  const m = { id: novoId(), t, tipo: 'receita', valor: round2(total), contaId: contaPadrao()?.id, titulo: 'Reembolso · ' + nome, categoria: 'financas', reemb: true, receberAntes: clonar(abertos) };
  for (const r of abertos) { if (resto <= 0.009) break; const x = Math.min(resto, r.valor); resto = round2(resto - x); if (x >= r.valor - 0.009) { r.pago = true; r.pagoEm = t; r.movRec = m.id; } else r.valor = round2(r.valor - x); }
  fin.movs.push(m); return m;
}
function respReembHTML(m) {
  const nome = m.titulo.replace('Reembolso · ', ''), falta = (fin.receber || []).filter(r => !r.pago && r.movId && (m.receberAntes || []).some(a => a.movId === r.movId));
  return '<p>✓ <b class="rec">+ ' + fmtBRL(m.valor) + '</b> de ' + esc(nome) + (falta.length ? ' · falta ' + falta.map(r => esc(r.nome) + ' (' + fmtBRL(r.valor) + ')').join(', ') : ' · tudo acertado') + '</p><p class="dica">Reembolso: entra no saldo da conta, mas não conta como receita do mês.</p><div class="actions"><button type="button" class="btn" data-fa="desfazer" data-id="' + esc(m.id) + '">Desfazer</button></div>';
}
function receberHTML() {
  const abertos = (fin.receber || []).filter(r => !r.pago); if (!abertos.length) return '';
  return '<div class="gh"><span>A receber de pessoas</span><b class="rec">' + fmtBRL(abertos.reduce((s, r) => s + r.valor, 0)) + '</b></div>' + abertos.sort((a, b) => a.t - b.t).map(r => '<div class="ext-it"><span class="ic">🧑</span><span class="tx"><b>' + esc(r.nome) + '</b><small>' + esc(r.titulo || '') + ' de ' + fmtDM(r.t) + '</small></span><span class="v rec">' + fmtBRL(r.valor) + '</span><button type="button" class="chip" data-rc="' + esc(r.id) + '">Recebi</button></div>').join('');
}
$('finSaldos').addEventListener('click', async e => {
  const b = e.target.closest('[data-rc]'); if (!b) return; e.stopPropagation();
  const r = (fin.receber || []).find(x => x.id === b.dataset.rc); if (!r) return;
  const foto = fotoFin(); registrarRecebimento(r.nome, r.valor, Date.now(), [r.id]); await salvarFin(); renderFin();
  toastDesfazer(r.nome + ' pagou ' + fmtBRL(r.valor) + ' ✓', () => voltarFin(foto));
});
function proximaSexta() { const d = inicioDoDia(Date.now()); do d.setDate(d.getDate() + 1); while (d.getDay() !== 5); return d.getTime(); }
async function acaoDivisaoChat(a, id) {
  const m = fin.movs.find(x => x.id === id); if (!m) return;
  const rs = (fin.receber || []).filter(r => r.movId === m.id && !r.pago); if (!rs.length) return;
  if (a === 'cobrar') {
    const t = { id: novoId(), titulo: 'Cobrar ' + rs.map(r => r.nome).join(' e ') + ' · ' + m.titulo + ' (' + fmtBRL(rs.reduce((s, r) => s + r.valor, 0)) + ')', prazo: proximaSexta(), categoria: 'financas', feita: false, feitaEm: null, criado: Date.now() };
    tarefas.push(t); await salvarTarefas(); await agendarAvisoTarefa(t); toast('Tarefa para sexta ✓');
  }
  if (a === 'copiar-cobranca') toast(await copiarTexto(rs.map(r => 'Oi, ' + r.nome + '! Sua parte do ' + m.titulo.toLowerCase() + ' de ' + fmtDM(m.t) + ' ficou ' + fmtBRL(r.valor) + '.').join('\n')) ? 'Cobrança copiada ✓' : 'Não deu para copiar');
}
$('abaExtrato').onclick = () => { finAba = 'extrato'; extRevisar = false; renderFin(); $('finExtrato').scrollTop = 0; };
