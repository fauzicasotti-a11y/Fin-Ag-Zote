
// =====================================================================
// 2.0 · FinZote: finanças com menu de cadastro (sem escrever)
// Início · Extrato · + · Relatórios · Contas
// =====================================================================
const CAT_FIN = [
  { id: 'casa', nome: 'Casa', em: '🏠', cor: '#2E6A50', subs: ['Aluguel', 'Supermercado', 'Contas da casa', 'Limpeza', 'Manutenção'] },
  { id: 'alimentacao', nome: 'Alimentação', em: '🍽️', cor: '#B35A1F', subs: ['Restaurante', 'Lanche', 'Delivery', 'Café', 'Padaria'] },
  { id: 'transporte', nome: 'Transporte', em: '🚗', cor: '#2D6FA8', subs: ['Combustível', 'App e táxi', 'Ônibus e metrô', 'Estacionamento', 'Manutenção do carro'] },
  { id: 'saude', nome: 'Saúde', em: '💊', cor: '#C8453B', subs: ['Farmácia', 'Consulta', 'Academia', 'Plano de saúde', 'Exames'] },
  { id: 'educacao', nome: 'Educação', em: '🎓', cor: '#6B4FA0', subs: ['Faculdade', 'Livros', 'Cursos', 'Material'] },
  { id: 'lazer', nome: 'Lazer', em: '🎉', cor: '#D9822B', subs: ['Streaming', 'Bares', 'Viagem', 'Eventos', 'Jogos'] },
  { id: 'compras', nome: 'Compras', em: '🛍️', cor: '#A33D6B', subs: ['Roupas', 'Eletrônicos', 'Presentes', 'Casa e decoração'] },
  { id: 'pessoal', nome: 'Pessoal', em: '🧴', cor: '#7A6A55', subs: ['Cuidados pessoais', 'Assinaturas', 'Outros'] },
  { id: 'financas', nome: 'Finanças', em: '🏦', cor: '#123524', subs: ['Tarifas', 'Juros', 'Impostos', 'Investimentos'] },
  { id: 'renda', nome: 'Renda', em: '💰', cor: '#1F8A55', subs: ['Salário', 'Freela', 'Reembolso', 'Rendimentos', 'Vendas', 'Outros'] },
];
const PALAVRAS_FIN = [
  ['casa', 'Aluguel', /aluguel/], ['casa', 'Supermercado', /mercado|supermercado|atacad|feira|hortifruti|sacolao|assai|carrefour|extra\b/], ['casa', 'Contas da casa', /\bluz\b|energia|cemig|\bagua\b|copasa|internet|\bgas\b|condominio|telefone|celular|iptu/],
  ['casa', 'Limpeza', /limpeza|faxina|diarista/], ['casa', 'Manutenção', /conserto|reforma|encanador|eletricista|ferragem/],
  ['alimentacao', 'Delivery', /ifood|delivery|rappi|aiqfome/], ['alimentacao', 'Restaurante', /restaurante|almoco|jantar|churrascaria|coco bambu|outback|self ?service|marmita/], ['alimentacao', 'Lanche', /lanche|hamburg|pizza|pastel|salgado|acai|sorvete/],
  ['alimentacao', 'Café', /\bcafe\b|cafeteria|starbucks/], ['alimentacao', 'Padaria', /padaria|\bpao\b/],
  ['transporte', 'Combustível', /gasolina|combustivel|posto|etanol|alcool|diesel|shell|ipiranga/], ['transporte', 'App e táxi', /\buber\b|\b99\b|taxi|cabify/], ['transporte', 'Ônibus e metrô', /onibus|metro|passagem|bilhete/],
  ['transporte', 'Estacionamento', /estacionamento|zona azul|pedagio/], ['transporte', 'Manutenção do carro', /mecanico|oficina|pneu|revisao|lava ?jato|ipva|seguro do carro/],
  ['saude', 'Farmácia', /farmacia|drogaria|remedio|droga raia|pacheco/], ['saude', 'Consulta', /medic|consulta|dentista|psicolog|terapia|fisio/], ['saude', 'Academia', /academia|smart ?fit|crossfit|pilates/], ['saude', 'Plano de saúde', /unimed|plano de saude|amil|hapvida/], ['saude', 'Exames', /exame|laboratorio/],
  ['educacao', 'Faculdade', /faculdade|mensalidade|ufjf|universidade/], ['educacao', 'Livros', /livro|livraria|kindle/], ['educacao', 'Cursos', /curso|udemy|alura|ingles/], ['educacao', 'Material', /caderno|papelaria|xerox|impressao/],
  ['lazer', 'Streaming', /netflix|spotify|disney|hbo|prime video|globoplay|youtube|deezer|max\b/], ['lazer', 'Bares', /\bbar\b|cerveja|chopp|boteco|balada/], ['lazer', 'Viagem', /viagem|hotel|airbnb|pousada|passagem aerea/], ['lazer', 'Eventos', /cinema|show|ingresso|teatro|festa/], ['lazer', 'Jogos', /jogo|steam|playstation|xbox/],
  ['compras', 'Roupas', /roupa|camisa|calca|tenis|sapato|renner|riachuelo|c&a|centauro|nike|adidas|shein/], ['compras', 'Eletrônicos', /notebook|fone|eletronic|carregador|mouse|teclado|smartphone/], ['compras', 'Presentes', /presente/], ['compras', 'Casa e decoração', /decoracao|movel|moveis|tok ?stok|ikea/],
  ['pessoal', 'Cuidados pessoais', /barbeiro|barbearia|cabelo|salao|perfume|manicure|cosmetic/],
  ['financas', 'Tarifas', /tarifa|anuidade/], ['financas', 'Juros', /juros|iof|multa/], ['financas', 'Impostos', /imposto|darf|\bir\b|inss/],
  ['renda', 'Salário', /salario|pagamento do mes|holerite/], ['renda', 'Freela', /freela|freelance|bico|servico/], ['renda', 'Reembolso', /reembolso|me pagou|devolveu/], ['renda', 'Rendimentos', /rendimento|juros recebidos|dividendo/], ['renda', 'Vendas', /venda|vendi/],
];
const subsDe = id => (config.subcats?.[id]) || CAT_FIN.find(c => c.id === id)?.subs || [];
const catFin = id => CAT_FIN.find(c => c.id === id) || CAT_FIN.find(c => c.id === 'pessoal');
const chaveAprende = t => finTxt(t || '').replace(/[\d.,]+/g, ' ').replace(/\s+/g, ' ').trim();
function categorizarFin(titulo, receita = false) {
  const k = chaveAprende(titulo), ap = config.aprende?.[k]; if (ap) return ap;
  const s = finTxt(titulo || '');
  for (const [cat, sub, re] of PALAVRAS_FIN) if (re.test(s) && (cat === 'renda') === receita) return { cat, sub };
  return receita ? { cat: 'renda', sub: 'Outros' } : null;
}
// categorias antigas do AZote → categorias do FinZote
function mapearCategoriasFin() {
  const MAPA = { estudo: 'educacao', trabalho: 'pessoal' };
  const ajusta = (x, receita) => {
    if (MAPA[x.categoria]) x.categoria = MAPA[x.categoria];
    if (receita && (x.categoria === 'financas' || !x.categoria)) x.categoria = 'renda';
    if (!x.categoria || !CAT_FIN.some(c => c.id === x.categoria)) x.categoria = receita ? 'renda' : 'pessoal';
    if (!x.sub) { const c = categorizarFin(x.titulo, receita); if (c && (c.cat === x.categoria || x.categoria === 'pessoal')) { x.categoria = c.cat; x.sub = c.sub; } }
  };
  for (const m of fin.movs) if (['gasto', 'receita', 'credito'].includes(m.tipo) && !m.dividaId && !m.metaId) ajusta(m, m.tipo === 'receita');
  for (const a of fin.agendadas) ajusta(a, a.tipo === 'receber');
  config.catsFin = 2;
}
const FORMAS = { debito: 'Débito', pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', credito: 'Crédito' };
function prepararFin() {
  CATEGORIAS.length = 0; CATEGORIAS.push(...CAT_FIN.map(c => ({ id: c.id, nome: c.nome, cor: c.cor })));
  Object.assign(ICONE_CAT, Object.fromEntries(CAT_FIN.map(c => [c.id, c.em])));
  if ((config.catsFin || 0) < 2 && fin.movs.length) { mapearCategoriasFin(); salvarFin(); guardar('az-config', config); }
  $('telaFin').insertBefore($('contas'), $('chatFin')); $('contas').classList.add('corpo');
  if (finAba === 'chat' || finAba === 'saldos') finAba = 'saldos';
}

// ----- navegação -----
const GRUPO_CONTAS = ['saldos', 'cartoes', 'metas', 'div', 'fixas', 'gastar'];
function navFinAtual() { return finAba === 'extrato' ? 'extrato' : finAba === 'rel' ? 'rel' : 'contas'; }
function navFin(n) {
  if (n === 'home') abrir('home');
  else if (n === 'extrato') { extRevisar = false; abrirFin('extrato'); }
  else if (n === 'cad') abrirCadastro();
  else if (n === 'rel') abrirFin('rel');
  else if (n === 'contas') abrirFin(GRUPO_CONTAS.includes(finAba) ? finAba : 'saldos');
}
function ajustarAbasFin() {
  const g = navFinAtual(), abas = $('telaFin').querySelector('.abas');
  abas.hidden = g !== 'contas';
  for (const [id, a] of [['abaSaldos', 'saldos'], ['abaGastar', 'gastar'], ['abaCartoes', 'cartoes'], ['abaMetas', 'metas'], ['abaDiv', 'div'], ['abaFixas', 'fixas']]) { $(id).hidden = false; $(id).classList.toggle('on', finAba === a); }
  $('abaLanc').hidden = true; $('abaExtrato').hidden = true;
  $('telaFin').querySelector('.ct b').textContent = g === 'extrato' ? 'Extrato' : g === 'rel' ? 'Relatórios' : 'Contas';
}
if (APP === 'fin') {
  const renderFinBase = renderFin;
  renderFin = function () {
    ajustarAbasFin();
    const extra = finAba === 'rel' || finAba === 'fixas';
    $('finRel').hidden = finAba !== 'rel'; $('contas').hidden = finAba !== 'fixas';
    if (!extra) { renderFinBase(); ajustarAbasFin(); atualizarBarra(); return; }
    for (const id of ['finSaldos', 'finGastar', 'finExtrato', 'finMetas', 'finDiv', 'finCartoes', 'chatFin', 'formFin']) $(id).hidden = true;
    $('btnOlho').hidden = !config.esconderValores;
    const h = new Date(); $('subFin').textContent = MESES_LONGO[h.getMonth()] + ' de ' + h.getFullYear();
    if (finAba === 'rel') renderRelFin(); else renderContasAgenda();
    atualizarBarra();
  };
  renderHome = renderHomeFin;
  const abrirEditMovBase = abrirEditMov;
  abrirEditMov = function (id) { const m = fin.movs.find(x => x.id === id); if (m && ['gasto', 'receita', 'transf', 'credito'].includes(m.tipo) && !m.dividaId && !m.metaId) abrirLanc({ editar: m }); else abrirEditMovBase(id); };
  dadosWidget = function () {
    const ant = OCULTAR; OCULTAR = false; const brl = v => config.esconderValores ? 'R$ ••' : fmtBRL(v).replace(/,\d\d$/, '');
    let t1 = '—', s1 = 'cadastre o salário', t2 = '—', s2 = 'nenhuma conta', t3 = '—', s3 = 'saldo nas contas';
    try { if (orcDisponivel()) { const c = calcOrcamento(); t1 = brl(Math.abs(c.hojeResta)); s1 = c.hojeResta >= 0 ? 'pode gastar hoje' : 'passou do dia'; } } catch {}
    try { const h0 = inicioDoDia(Date.now()).getTime(), o = todasOcorrencias(h0 - 30 * 86400000, h0 + 40 * 86400000).filter(x => !x.paga && x.ag.tipo === 'pagar')[0]; if (o) { t2 = brl(o.mov?.valor ?? o.ag.valor); s2 = o.ag.titulo + ' · ' + fmtDM(o.t); } } catch {}
    try { t3 = brl(fin.contas.filter(c => !ehInvest(c)).reduce((a, c) => a + saldoConta(c), 0)); } catch {}
    OCULTAR = ant; return { t1, s1, t2, s2, t3, s3 };
  };
}
$('abaFixas').onclick = () => { finAba = 'fixas'; renderFin(); };
// botões antigos que levavam ao chat de Lançamentos agora abrem o cadastro
document.addEventListener('click', e => {
  if (APP !== 'fin') return;
  const b = e.target.closest('[data-fs="lanc"], [data-og="lanc"], [data-co="ir-fin"]'); if (!b) return;
  e.stopImmediatePropagation(); e.preventDefault(); abrirCadastro();
}, true);

// ----- Início -----
function renderHomeFin() {
  atualizarBarra(); cacheSaldo = null; OCULTAR = !!config.esconderValores;
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), t = totais(inicioMes(agora), fimMes(agora));
  const tc = fin.contas.filter(c => !ehInvest(c)).reduce((a, c) => a + saldoConta(c), 0);
  let h = '<div class="fz-hero"><div class="rot">Saldo em contas</div><div class="v">' + fmtBRL(tc) + '</div><div class="ln">' + MESES_N[new Date().getMonth()] + ': <b class="rec">+' + fmtCurto(t.receitas) + '</b> <b class="gas">−' + fmtCurto(t.gastos) + '</b>' + (t.guardado ? ' <b class="inv">' + fmtCurto(t.guardado) + ' guardado</b>' : '') + '</div></div>';
  if (!fin.contas.length && !fin.movs.length) {
    h += '<div class="card fz-boas"><b>Bem-vindo ao FinZote</b><p>Traga o que você já tinha no AZOTE_ANTIGO ou comece cadastrando a sua conta.</p><div class="actions"><button type="button" class="btn primary" data-fz="importar">Importar do AZOTE_ANTIGO / AgZote</button><button type="button" class="btn" data-fz="conta">Cadastrar minha conta</button></div><p class="dica">No AgZote: Configurações › Backup › Levar minhas finanças para o FinZote. Aqui, escolha esse arquivo.</p></div>';
  }
  h += cartaoOrcHoje() || (fin.contas.length ? '<button type="button" class="card hj-rot" data-fz="fixa"><span class="em">💸</span><div><b>Pode gastar hoje</b><small>cadastre o salário como conta fixa a receber para calcular</small></div><span class="chip">Cadastrar</span></button>' : '');
  const ocs = todasOcorrencias(hoje0 - 60 * 86400000, hoje0 + 10 * 86400000).filter(o => !o.paga).slice(0, 5);
  if (ocs.length) h += '<div class="card"><div class="gh" style="margin:0"><span>Próximas contas</span><button type="button" class="lnk" data-fz="fixas">ver todas ›</button></div>' + ocs.map(o => { const d = new Date(o.t), st = statusOc(o), rec = o.ag.tipo === 'receber';
    return '<div class="fz-li"><span class="e">' + (o.ag.cartao ? '💳' : o.ag.divida ? '🏦' : catFin(o.ag.categoria).em) + '</span><b>' + esc(o.ag.titulo) + '</b><span class="v ' + (rec ? 'rec' : 'gas') + '">' + fmtBRL(o.mov?.valor ?? o.ag.valor) + '</span><small class="' + (st === 'atrasada' ? 'gas' : '') + '">' + st + ' · ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '</small>' + (o.ag.cartao || o.ag.divida ? '' : '<button type="button" class="chip" data-fz="pagar" data-k="' + esc(o.ag.id + '|' + o.chave) + '">' + (rec ? 'Recebi' : 'Paguei') + '</button>') + '</div>'; }).join('') + '</div>';
  for (const c of fin.cartoes || []) { const u = usoCartao(c); h += '<button type="button" class="card fz-cc" data-fz="cartao" data-id="' + esc(c.id) + '" style="--cc:' + (c.cor || '#123524') + '"><span><b>💳 ' + esc(c.nome) + '</b><small>fecha dia ' + c.fecha + ' · vence dia ' + c.vence + '</small></span><span class="v">' + fmtBRL(u.atual) + '<small>limite livre ' + fmtBRL(Math.max(0, (c.limite || 0) - u.atual)) + '</small></span></button>'; }
  const ult = fin.movs.filter(m => m.tipo !== 'rotativo').sort((a, b) => b.t - a.t).slice(0, 6);
  if (ult.length) h += '<div class="card"><div class="gh" style="margin:0"><span>Últimos lançamentos</span><button type="button" class="lnk" data-fz="extrato">extrato ›</button></div>' + ult.map(m => { const s = sinalMov(m); return '<button type="button" class="fz-li" data-em="' + esc(m.id) + '"><span class="e">' + iconeMov(m) + '</span><b>' + esc(m.titulo || 'Lançamento') + '</b><span class="v ' + (s < 0 ? 'gas' : s > 0 ? 'rec' : 'neu') + '">' + (s < 0 ? '− ' : s > 0 ? '+ ' : '') + fmtBRL(Math.abs(m.valor)) + '</span><small>' + esc(subMov(m)) + '</small></button>'; }).join('') + '</div>';
  const ab = (fin.receber || []).filter(r => !r.pago); if (ab.length) h += '<div class="card"><div class="gh" style="margin:0"><span>A receber</span><b class="rec">' + fmtBRL(ab.reduce((s, r) => s + r.valor, 0)) + '</b></div>' + ab.slice(0, 4).map(r => '<div class="fz-li"><span class="e">🧑</span><b>' + esc(r.nome) + '</b><span class="v rec">' + fmtBRL(r.valor) + '</span><small>' + esc(r.titulo || '') + ' · ' + fmtDM(r.t) + '</small></div>').join('') + '</div>';
  for (const mt of (fin.metas || []).slice(0, 2)) { const g = guardadoMeta(mt), p = mt.alvo ? Math.min(1, g / mt.alvo) : 0; h += '<button type="button" class="card fz-meta" data-fz="meta" data-id="' + esc(mt.id) + '"><div class="gh" style="margin:0"><span>Meta · ' + esc(mt.nome) + '</span><b class="inv">' + Math.round(p * 100) + '%</b></div><div class="bar2"><i style="width:' + (p * 100) + '%"></i></div><small>' + fmtBRL(g) + ' de ' + fmtBRL(mt.alvo) + (mt.prazo ? ' · até ' + fmtDM(mt.prazo) : '') + '</small></button>'; }
  $('hoje').innerHTML = h;
  const dB = config.ultimoBackup ? (Date.now() - config.ultimoBackup) / 86400000 : null;
  $('btnConfig').classList.toggle('alerta', (dB === null && fin.movs.length > 0) || dB >= 7);
}
function subMov(m) {
  if (m.tipo === 'transf') return nomeContaMov(m);
  const c = catFin(m.categoria);
  return [m.sub ? c.nome + ' › ' + m.sub : c.nome, m.tipo === 'credito' ? nomeContaMov(m) + (m.parcelas > 1 ? ' ' + m.parcelas + 'x' : '') : [contaPorId(m.contaId)?.nome, FORMAS[m.forma]].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}
$('hoje').addEventListener('click', async e => {
  if (APP !== 'fin') return;
  const em = e.target.closest('[data-em]'); if (em) { abrirEditMov(em.dataset.em); return; }
  const b = e.target.closest('[data-fz]'); if (!b) return; const a = b.dataset.fz;
  if (a === 'importar') $('arquivoBackup').click();
  if (a === 'conta') abrirContaForm(null);
  if (a === 'fixa') abrirAgForm(null);
  if (a === 'fixas') abrirFin('fixas');
  if (a === 'extrato') { extRevisar = false; abrirFin('extrato'); }
  if (a === 'cartao') { cartaoSel = b.dataset.id; abrirFin('cartoes'); }
  if (a === 'meta') { metaSel = b.dataset.id; abrirFin('metas'); }
  if (a === 'pagar') { const [id, ch] = b.dataset.k.split('|'); const ag = fin.agendadas.find(x => x.id === id); if (!ag) return; const o = ocorrenciasConta(ag, inicioDoDia(Date.now()).getTime() - 400 * 86400000, Date.now() + 60 * 86400000).find(x => x.chave === ch); if (o) abrirBaixa(o); }
});

// ----- menu de cadastro -----
const TIPOS_CAD = [['gasto', '➖', 'Gasto', 'débito, pix, dinheiro'], ['receita', '➕', 'Receita', 'salário, freela'], ['cartao', '💳', 'Compra no cartão', 'à vista ou parcelado'], ['transf', '↔️', 'Transferência', 'entre contas'], ['fixa', '🔁', 'Conta fixa', 'aluguel, internet, salário'],
  ['fatura', '🧾', 'Pagar fatura', 'total ou parcial'], ['meta', '🎯', 'Guardar em meta', 'ou resgatar'], ['divida', '🏦', 'Dívida', 'pagar parcela ou cadastrar'], ['dividido', '👥', 'Dividido', 'parte a receber']];
function abrirCadastro() {
  const vistos = new Set(), rec = [];
  for (const m of fin.movs.slice().sort((a, b) => b.t - a.t)) { if (!['gasto', 'credito', 'receita'].includes(m.tipo) || m.dividaId || m.metaId || m.agId) continue; const k = chaveAprende(m.titulo); if (!k || vistos.has(k)) continue; vistos.add(k); rec.push(m); if (rec.length >= 6) break; }
  $('cadCorpo').innerHTML = '<div class="cad-grade">' + TIPOS_CAD.map(([k, e, n, d]) => '<button type="button" data-cad="' + k + '"><i>' + e + '</i><b>' + n + '</b><small>' + d + '</small></button>').join('') + '</div>' +
    (rec.length ? '<div class="rot" style="margin-top:14px">Repetir um recente</div><div class="ex">' + rec.map(m => '<button type="button" class="chip" data-rep="' + esc(m.id) + '">' + iconeMov(m) + ' ' + esc(m.titulo) + ' · ' + fmtBRL(m.valor) + '</button>').join('') + '</div>' : '');
  $('cadOv').hidden = false;
}
$('cadOv').addEventListener('click', async e => {
  if (e.target === $('cadOv') || e.target.closest('[data-cad-x]')) { $('cadOv').hidden = true; return; }
  const r = e.target.closest('[data-rep]');
  if (r) { const m = fin.movs.find(x => x.id === r.dataset.rep); $('cadOv').hidden = true; if (m) abrirLanc({ tipo: m.tipo === 'credito' ? 'cartao' : m.tipo, base: m }); return; }
  const b = e.target.closest('[data-cad]'); if (!b) return; const k = b.dataset.cad; $('cadOv').hidden = true;
  if (['gasto', 'receita', 'cartao', 'transf'].includes(k)) abrirLanc({ tipo: k });
  if (k === 'dividido') abrirLanc({ tipo: 'gasto', dividir: true });
  if (k === 'fixa') abrirAgForm(null);
  if (k === 'fatura') {
    const cs = fin.cartoes || []; if (!cs.length) { mostrarDialogo('Pagar fatura', '<p>Você ainda não tem cartão cadastrado.</p>', [{ rotulo: 'Fechar' }, { rotulo: 'Cadastrar cartão', acao: () => abrirCartaoForm(null) }]); return; }
    const pagar = c => { const f = faturasRelevantes(c).filter(x => x.restante > 0.009 && x.status !== 'aberta')[0] || faturasRelevantes(c).filter(x => x.restante > 0.009)[0]; if (!f) { toast('Nenhuma fatura em aberto no ' + c.nome); return; } abrirPagarFatura(c, f.key); };
    if (cs.length === 1) pagar(cs[0]); else escolherOpcao('Qual cartão?', cs.map(c => [c.id, c.nome]), null, id => pagar(cartaoPorId(id)));
  }
  if (k === 'meta') {
    const ms = fin.metas || []; if (!ms.length) { abrirMetaForm(null); return; }
    abrirForm('Guardar em meta', [{ k: 'meta', rot: 'Meta', tipo: 'select', ops: ms.map(m => [m.id, m.nome]), v: ms[0].id }, { k: 'acao', rot: 'O que fazer', tipo: 'select', ops: [['guardar', 'Guardar'], ['resgatar', 'Resgatar']], v: 'guardar' }, { k: 'valor', rot: 'Valor', tipo: 'num', ph: '0,00' }],
      async d => { const v = valorBR(d.valor), mt = metaPorId(d.meta); if (!(v > 0) || !mt) { toast('Informe o valor'); return false; } const foto = fotoFin(); if (!fin.contas.some(c => !ehInvest(c))) fin.contas.push({ id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' }); guardarNaMeta(mt, v, d.acao === 'resgatar'); await salvarFin(); atualizarTudo(); toastDesfazer((d.acao === 'resgatar' ? 'Resgatei ' : 'Guardei ') + fmtBRL(v) + ' · ' + mt.nome, () => voltarFin(foto)); });
  }
  if (k === 'divida') {
    const ds = (fin.dividas || []).filter(d => saldoDevedor(d) > 0.009);
    const op = [...ds.map(d => [d.id, d.nome + ' · parcela ' + fmtBRL(proximaParcela(d)?.parcela || 0)]), ['__nova', '+ Cadastrar dívida ou empréstimo']];
    escolherOpcao('Dívida', op, null, id => { if (id === '__nova') abrirDivForm(null); else { const d = divPorId(id); if (d && proximaParcela(d)) abrirPagar(d, 'parcela'); } });
  }
});

// ----- formulário de lançamento (novo e editar) -----
let lanc = null;
const hojeInput = () => dataInput(Date.now());
function abrirLanc(o = {}) {
  const m = o.editar, b = o.base;
  const t = m ? m.tipo === 'credito' ? 'cartao' : m.tipo : o.tipo || 'gasto';
  const src = m || b || {};
  const d = new Date(m ? m.t : Date.now());
  lanc = { id: m?.id || null, tipo: t, valor: m ? numBR(m.valor) : b ? numBR(b.valor) : o.valor ? numBR(o.valor) : '', titulo: src.titulo || o.desc || '', cat: src.categoria || (t === 'receita' ? 'renda' : ''), sub: src.sub || '',
    contaId: src.contaId || contaPadrao()?.id || '', forma: src.forma || (t === 'gasto' ? 'debito' : ''), destinoId: src.destinoId || '', cartaoId: src.cartaoId || cartaoPadrao()?.id || '', parcelas: src.parcelas > 1 ? src.parcelas : 1,
    data: dataInput(d.getTime()), hora: fmtHora(d), tags: (src.tags || []).join(' '), nota: src.nota || '', dividir: !!o.dividir, partes: 2, nomes: '', repetir: false, catManual: !!(src.categoria), extras: !!(src.nota || src.tags?.length || o.dividir) };
  if (!lanc.cat && lanc.titulo) { const c = categorizarFin(lanc.titulo, t === 'receita'); if (c) { lanc.cat = c.cat; lanc.sub = c.sub; } }
  if (t === 'transf' && !lanc.destinoId) lanc.destinoId = fin.contas.find(c => c.id !== lanc.contaId)?.id || '';
  renderLanc(); $('lancOv').hidden = false; $('formLanc').scrollTop = 0;
  if (!m) setTimeout(() => $('lcValor')?.focus(), 150);
}
function lerLancDom() {
  if (!lanc) return; const v = id => $(id)?.value ?? '';
  lanc.valor = v('lcValor'); lanc.titulo = v('lcDesc').trim(); lanc.data = v('lcData') || lanc.data; lanc.hora = v('lcHora') || lanc.hora;
  if ($('lcTags')) lanc.tags = v('lcTags'); if ($('lcNota')) lanc.nota = v('lcNota');
  if ($('lcPartes')) lanc.partes = +v('lcPartes') || 2; if ($('lcNomes')) lanc.nomes = v('lcNomes'); if ($('lcRepetir')) lanc.repetir = $('lcRepetir').checked;
}
const chipsL = (campo, ops, atual) => '<div class="ex lc-chips">' + ops.map(([v, n]) => '<button type="button" class="chip' + (String(v) === String(atual) ? ' on' : '') + '" data-lc="' + campo + '" data-v="' + esc(v) + '">' + n + '</button>').join('') + '</div>';
function renderLanc() {
  const L = lanc, ed = !!L.id, contas = fin.contas.filter(c => !ehInvest(c)), todas = fin.contas;
  const tit = { gasto: 'gasto', receita: 'receita', transf: 'transferência', cartao: 'compra no cartão' }[L.tipo];
  let h = '<div class="lc-top"><button type="button" class="x" data-lca="fechar" aria-label="Fechar">✕</button><b>' + (ed ? 'Editar ' : 'Nova ') + tit + '</b><span></span></div>';
  h += '<div class="seg">' + [['gasto', 'Gasto'], ['receita', 'Receita'], ['cartao', 'Cartão'], ['transf', 'Transferir']].map(([k, n]) => '<button type="button" class="' + (L.tipo === k ? 'on' : '') + '" data-lc="tipo" data-v="' + k + '">' + n + '</button>').join('') + '</div>';
  h += '<div class="lc-valor ' + (L.tipo === 'receita' ? 'rec' : L.tipo === 'transf' ? 'neu' : 'gas') + '"><small>' + (L.tipo === 'cartao' ? 'Valor total' : 'Valor') + '</small><span>R$</span><input id="lcValor" inputmode="decimal" placeholder="0,00" value="' + esc(L.valor) + '" autocomplete="off"></div>';
  const titulos = [...new Set(fin.movs.slice(-300).map(m => m.titulo).filter(Boolean))].slice(-80);
  h += '<div class="field"><label for="lcDesc">' + (L.tipo === 'receita' ? 'Descrição' : L.tipo === 'transf' ? 'Descrição (opcional)' : 'Onde / descrição') + '</label><input id="lcDesc" list="lcLista" placeholder="' + (L.tipo === 'receita' ? 'Ex.: Salário' : L.tipo === 'transf' ? 'Ex.: Reserva' : 'Ex.: Mercado Extra') + '" value="' + esc(L.titulo) + '" autocomplete="off"><datalist id="lcLista">' + titulos.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist></div>';
  if (L.tipo !== 'transf') {
    const cats = L.tipo === 'receita' ? ['renda', ...CAT_FIN.map(c => c.id).filter(x => x !== 'renda')] : CAT_FIN.map(c => c.id).filter(x => x !== 'renda');
    h += '<div class="rot">Categoria</div>' + chipsL('cat', cats.map(id => [id, catFin(id).em + ' ' + catFin(id).nome]), L.cat);
    if (L.cat) h += '<div class="rot">Subcategoria</div>' + chipsL('sub', [...subsDe(L.cat).map(s => [s, s]), ['__nova', '＋ nova']], L.sub);
  }
  if (L.tipo === 'gasto') {
    h += '<div class="rot">Pago com</div>' + (contas.length ? chipsL('conta', contas.map(c => [c.id, (c.tipo === 'dinheiro' ? '💵 ' : '🏦 ') + esc(c.nome)]), L.contaId) : '<p class="dica">Sem conta cadastrada: crio a “Conta principal” ao salvar.</p>');
    h += chipsL('forma', [['debito', 'Débito'], ['pix', 'Pix'], ['dinheiro', 'Dinheiro'], ['boleto', 'Boleto']], L.forma);
  }
  if (L.tipo === 'receita') h += '<div class="rot">Entrou em</div>' + (contas.length ? chipsL('conta', contas.map(c => [c.id, '🏦 ' + esc(c.nome)]), L.contaId) : '<p class="dica">Crio a “Conta principal” ao salvar.</p>');
  if (L.tipo === 'transf') {
    if (todas.length < 2) h += '<p class="dica">Para transferir, cadastre pelo menos duas contas (Contas › + Nova conta).</p>';
    h += '<div class="rot">De</div>' + chipsL('conta', todas.map(c => [c.id, (ehInvest(c) ? '📈 ' : '🏦 ') + esc(c.nome)]), L.contaId) + '<div class="rot">Para</div>' + chipsL('destino', todas.filter(c => c.id !== L.contaId).map(c => [c.id, (ehInvest(c) ? '📈 ' : '🏦 ') + esc(c.nome)]), L.destinoId);
  }
  if (L.tipo === 'cartao') {
    const cs = fin.cartoes || [];
    if (!cs.length) h += '<div class="aviso a">Nenhum cartão cadastrado. <button type="button" class="lnk" data-lca="novo-cartao">Cadastrar cartão</button></div>';
    else {
      if (!cartaoPorId(L.cartaoId)) L.cartaoId = (cartaoPadrao() || cs[0]).id;
      h += '<div class="rot">Cartão</div>' + chipsL('cartao', cs.map(c => [c.id, '💳 ' + esc(c.nome)]), L.cartaoId);
      h += '<div class="rot">Parcelas</div>' + chipsL('parcelas', [1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => [n, n + 'x']), L.parcelas);
      const c = cartaoPorId(L.cartaoId), v = valorBR(L.valor);
      if (c && v > 0) { const t0 = lerDataInput(L.data, 12), k0 = faturaDaCompra(c, t0), n = L.parcelas;
        h += '<div class="lc-parc"><div><b>' + n + 'x de ' + fmtBRL(v / n) + '</b></div><div class="mm">' + [...Array(Math.min(n, 6))].map((_, i) => '<span><b>' + nomeMesKey(somaMes(k0, i)) + '</b>' + fmtBRL(v / n).replace(',00', '') + '</span>').join('') + (n > 6 ? '<span>+' + (n - 6) + '</span>' : '') + '</div><small>Primeira parcela na fatura de ' + nomeMesKey(k0) + '</small></div>'; }
    }
  }
  h += '<div class="row2"><div class="field"><label for="lcData">Data</label><input id="lcData" type="date" value="' + L.data + '"></div><div class="field"><label for="lcHora">Hora</label><input id="lcHora" type="time" value="' + L.hora + '"></div></div>';
  if (L.tipo !== 'transf') {
    h += '<button type="button" class="lc-mais" data-lca="extras">' + (L.extras ? '▾ Detalhes' : '▸ Mais detalhes: tags, nota' + (L.tipo !== 'receita' ? ', dividir' : '') + (ed ? '' : ', repetir')) + '</button>';
    if (L.extras) {
      h += '<div class="field"><label for="lcTags">Tags</label><input id="lcTags" placeholder="Ex.: viagem trabalho" value="' + esc(L.tags) + '"></div><div class="field"><label for="lcNota">Nota</label><textarea id="lcNota" rows="2" placeholder="Algo para lembrar">' + esc(L.nota) + '</textarea></div>';
      if (!ed && L.tipo !== 'receita') h += '<label class="check"><input type="checkbox" data-lca="dividir"' + (L.dividir ? ' checked' : '') + '><span>Dividir com outras pessoas<small>só a sua parte conta nos gastos; o resto fica a receber</small></span></label>' + (L.dividir ? '<div class="row2"><div class="field"><label for="lcPartes">Em quantas partes</label><select id="lcPartes">' + [2, 3, 4, 5, 6].map(n => '<option' + (n === L.partes ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="field"><label for="lcNomes">Com quem</label><input id="lcNomes" placeholder="Ana, Pedro" value="' + esc(L.nomes) + '"></div></div>' : '');
      if (!ed && L.tipo !== 'cartao') h += '<label class="check"><input type="checkbox" id="lcRepetir"' + (L.repetir ? ' checked' : '') + '><span>Repetir todo mês<small>vira conta fixa; avisa antes de vencer</small></span></label>';
    }
  }
  h += '<div class="actions lc-acoes"><button class="btn primary" type="submit">Salvar</button>' + (ed ? '<button type="button" class="btn" data-lca="duplicar">Duplicar</button><button type="button" class="btn danger" data-lca="excluir">Excluir</button>' : '<button type="button" class="btn" data-lca="fechar">Cancelar</button>') + '</div>';
  $('formLanc').innerHTML = h;
}
$('formLanc').addEventListener('click', async e => {
  const c = e.target.closest('[data-lc]'), a = e.target.closest('[data-lca]');
  if (c) {
    lerLancDom(); const k = c.dataset.lc, v = c.dataset.v;
    if (k === 'tipo') { lanc.tipo = v; if (v === 'receita') { const r = categorizarFin(lanc.titulo, true); lanc.cat = r.cat; lanc.sub = r.sub; } else if (lanc.cat === 'renda') { lanc.cat = ''; lanc.sub = ''; } if (v === 'transf' && !lanc.destinoId) lanc.destinoId = fin.contas.find(x => x.id !== lanc.contaId)?.id || ''; if (v === 'gasto' && !lanc.forma) lanc.forma = 'debito'; }
    if (k === 'cat') { lanc.cat = v; lanc.sub = ''; lanc.catManual = true; }
    if (k === 'sub') { if (v === '__nova') { abrirForm('Nova subcategoria · ' + catFin(lanc.cat).nome, [{ k: 'nome', rot: 'Nome', ph: 'Ex.: Pet shop' }], d => { if (!d.nome) return false; config.subcats = { ...(config.subcats || {}), [lanc.cat]: [...subsDe(lanc.cat), maiuscula(d.nome)] }; guardar('az-config', config); lanc.sub = maiuscula(d.nome); renderLanc(); }); return; } lanc.sub = lanc.sub === v ? '' : v; lanc.catManual = true; }
    if (k === 'conta') { lanc.contaId = v; if (lanc.destinoId === v) lanc.destinoId = fin.contas.find(x => x.id !== v)?.id || ''; }
    if (k === 'destino') lanc.destinoId = v;
    if (k === 'forma') lanc.forma = v;
    if (k === 'cartao') lanc.cartaoId = v;
    if (k === 'parcelas') lanc.parcelas = +v;
    renderLanc(); return;
  }
  if (!a) return;
  const k = a.dataset.lca;
  if (k === 'fechar') { $('lancOv').hidden = true; return; }
  if (k === 'extras') { lerLancDom(); lanc.extras = !lanc.extras; renderLanc(); return; }
  if (k === 'dividir') { lerLancDom(); lanc.dividir = a.checked; renderLanc(); return; }
  if (k === 'novo-cartao') { $('lancOv').hidden = true; abrirCartaoForm(null); return; }
  if (k === 'duplicar') { const m = fin.movs.find(x => x.id === lanc.id); if (!m) return; const foto = fotoFin(); const c2 = { ...clonar(m), id: novoId(), t: Date.now() }; for (const x of ['agId', 'chave', 'aReceber', 'partes', 'reemb', 'receberAntes']) delete c2[x]; fin.movs.push(c2); await salvarFin(); $('lancOv').hidden = true; atualizarTudo(); toastDesfazer('Duplicado para hoje', () => voltarFin(foto)); return; }
  if (k === 'excluir') {
    if (!a.classList.contains('armed')) { a.classList.add('armed'); a.textContent = 'Excluir mesmo?'; return; }
    const m = fin.movs.find(x => x.id === lanc.id); if (!m) return; const foto = fotoFin(); await apagarMov(m.id); $('lancOv').hidden = true; atualizarTudo(); toastDesfazer('“' + (m.titulo || 'Lançamento') + '” excluído', () => voltarFin(foto));
  }
});
$('formLanc').addEventListener('input', e => {
  if (e.target.id === 'lcDesc' && lanc && !lanc.catManual && lanc.tipo !== 'transf') {
    const r = categorizarFin(e.target.value, lanc.tipo === 'receita');
    if (r && (r.cat !== lanc.cat || r.sub !== lanc.sub)) { lerLancDom(); lanc.cat = r.cat; lanc.sub = r.sub; const pos = e.target.selectionStart; renderLanc(); const i = $('lcDesc'); i.focus(); try { i.setSelectionRange(pos, pos); } catch {} }
  }
  if ((e.target.id === 'lcValor' || e.target.id === 'lcData') && lanc?.tipo === 'cartao') { lerLancDom(); const id = e.target.id, pos = e.target.selectionStart; renderLanc(); const i = $(id); i.focus(); try { if (id === 'lcValor') i.setSelectionRange(pos, pos); } catch {} }
});
$('lancOv').addEventListener('click', e => { if (e.target === $('lancOv')) $('lancOv').hidden = true; });
$('formLanc').addEventListener('submit', async e => {
  e.preventDefault(); lerLancDom(); const L = lanc; if (!L) return;
  const v = valorBR(L.valor); if (!(v > 0)) { toast('Informe o valor'); $('lcValor').focus(); return; }
  if (L.tipo === 'transf' && (!L.contaId || !L.destinoId || L.contaId === L.destinoId)) { toast('Escolha as duas contas'); return; }
  if (L.tipo === 'cartao' && !cartaoPorId(L.cartaoId)) { toast('Escolha o cartão'); return; }
  const foto = fotoFin();
  if ((L.tipo === 'gasto' || L.tipo === 'receita') && !fin.contas.some(c => !ehInvest(c))) { const c = { id: novoId(), tipo: 'corrente', nome: 'Conta principal', instituicao: '', saldoInicial: 0, criado: Date.now(), padrao: true, lembrete: 'mes' }; fin.contas.push(c); L.contaId = c.id; }
  const [hh, mi] = (L.hora || '12:00').split(':').map(Number), [a, mm, d] = L.data.split('-').map(Number), t = new Date(a, mm - 1, d, hh, mi).getTime();
  const tit = L.titulo || (L.sub || (L.tipo === 'transf' ? 'Transferência' : catFin(L.cat).nome));
  const campos = { t, valor: round2(v), titulo: maiuscula(tit), tags: L.tags.split(/[\s,#]+/).filter(Boolean), nota: L.nota.trim() };
  if (L.tipo === 'gasto') Object.assign(campos, { tipo: 'gasto', contaId: L.contaId || contaPadrao()?.id, forma: L.forma || 'debito', categoria: L.cat || 'pessoal', sub: L.sub || '' });
  if (L.tipo === 'receita') Object.assign(campos, { tipo: 'receita', contaId: L.contaId || contaPadrao()?.id, categoria: L.cat || 'renda', sub: L.sub || '' });
  if (L.tipo === 'transf') Object.assign(campos, { tipo: 'transf', contaId: L.contaId, destinoId: L.destinoId, categoria: 'financas', titulo: L.titulo ? maiuscula(L.titulo) : sinalGuardado({ tipo: 'transf', contaId: L.contaId, destinoId: L.destinoId }) < 0 ? 'Resgate' : ehInvest(contaPorId(L.destinoId)) ? 'Aplicação' : 'Transferência' });
  if (L.tipo === 'cartao') Object.assign(campos, { tipo: 'credito', cartaoId: L.cartaoId, parcelas: L.parcelas, categoria: L.cat || 'pessoal', sub: L.sub || '', forma: 'credito' });
  let m;
  if (L.id) {
    m = fin.movs.find(x => x.id === L.id); if (!m) return;
    if (m.aReceber && Math.abs(campos.valor - m.valor) > 0.009) { const f = campos.valor / m.valor; m.aReceber = round2(m.aReceber * f); for (const r of fin.receber || []) if (r.movId === m.id && !r.pago) r.valor = round2(r.valor * f); }
    for (const x of ['contaId', 'destinoId', 'cartaoId', 'parcelas', 'forma', 'sub']) delete m[x];
    Object.assign(m, campos);
  } else {
    m = { id: novoId(), ...campos }; fin.movs.push(m);
    if (L.dividir && (m.tipo === 'gasto' || m.tipo === 'credito')) aplicarDivisao(m, { partes: L.partes, nomes: L.nomes.split(/\s*,\s*|\s+e\s+/).map(x => x.trim()).filter(Boolean).map(x => maiuscula(x)).slice(0, L.partes - 1) });
    if (L.repetir && (m.tipo === 'gasto' || m.tipo === 'receita')) { const ag = { id: novoId(), tipo: m.tipo === 'gasto' ? 'pagar' : 'receber', titulo: m.titulo, valor: m.valor, inicio: new Date(a, mm - 1, d, 9).getTime(), repetir: { tipo: 'mensal' }, categoria: m.categoria, contaId: m.contaId || null, baixas: { [chaveDia(t)]: m.id }, criado: Date.now() }; fin.agendadas.push(ag); m.agId = ag.id; m.chave = chaveDia(t); }
  }
  if (m.tipo !== 'transf' && m.titulo) config.aprende = { ...(config.aprende || {}), [chaveAprende(m.titulo)]: { cat: m.categoria, sub: m.sub || '' } };
  (fin.revOk = fin.revOk || {})['cat:' + m.id] = true;
  await Promise.all([salvarFin(), guardar('az-config', config)]); $('lancOv').hidden = true; agendarAvisosFinDepois(); atualizarTudo();
  const s = m.tipo === 'receita' ? '+ ' : m.tipo === 'transf' ? '↔ ' : '− ';
  toastDesfazer((L.id ? 'Corrigido · ' : 'Salvo · ') + s + fmtBRL(m.valor) + ' ' + m.titulo, () => voltarFin(foto));
});

// ----- relatórios -----
let relMes = null;
function renderRelFin() {
  if (!relMes) relMes = inicioMes(Date.now());
  const ini = relMes, fim = fimMes(relMes), dm = new Date(ini), atual = ini === inicioMes(Date.now()), t = totais(ini, fim);
  let h = '<div class="ext-nav"><button type="button" class="nav" data-rl="-" aria-label="Mês anterior">‹</button><b>' + maiuscula(MESES_LONGO[dm.getMonth()]) + (dm.getFullYear() !== new Date().getFullYear() ? ' ' + dm.getFullYear() : '') + '</b><button type="button" class="nav" data-rl="+"' + (atual ? ' disabled' : '') + ' aria-label="Próximo mês">›</button></div>';
  h += '<div class="kp kp4"><div><b class="rec">' + fmtBRL(t.receitas) + '</b><small>entradas</small></div><div><b class="gas">' + fmtBRL(t.gastos) + '</b><small>gastos</small></div><div><b class="inv">' + fmtBRL(t.guardado) + '</b><small>guardado</small></div><div><b class="' + (t.saldo < 0 ? 'gas' : '') + '">' + fmtBRL(t.saldo) + '</b><small>saldo do mês</small></div></div>';
  // por categoria × limite
  const lim = config.limites || {}, cats = CAT_FIN.filter(c => c.id !== 'renda').map(c => ({ c, v: t.porCat[c.id] || 0, l: lim[c.id] || 0 })).filter(x => x.v > 0 || x.l > 0).sort((a, b) => b.v - a.v);
  h += '<div class="card"><div class="gh" style="margin:0"><span>Gastos por categoria</span><small class="mut">toque para pôr limite</small></div>' + (cats.length ? cats.map(x => { const p = x.l ? x.v / x.l : 0; return '<button type="button" class="rl-cat" data-rlc="' + x.c.id + '"><span class="l"><b>' + x.c.em + ' ' + x.c.nome + '</b><span><b>' + fmtBRL(x.v) + '</b>' + (x.l ? ' <small class="mut">/ ' + fmtBRL(x.l).replace(',00', '') + '</small>' : '') + '</span></span><i><u style="width:' + Math.min(100, x.l ? p * 100 : x.v / Math.max(...cats.map(y => y.v), 1) * 100) + '%;background:' + (x.l && p > 1 ? 'var(--gas)' : x.l && p > 0.85 ? '#D9822B' : 'var(--accent)') + '"></u></i>' + (x.l && p > 1 ? '<small class="gas">passou ' + fmtBRL(x.v - x.l) + '</small>' : '') + '</button>'; }).join('') : '<p class="dica">Nenhum gasto neste mês.</p>') + '<p class="dica">Compras no cartão entram no mês em que a fatura é paga.</p></div>';
  // subcategorias e lugares (competência: data da compra)
  const doMes = fin.movs.filter(m => m.t >= ini && m.t <= fim && (m.tipo === 'gasto' || m.tipo === 'credito') && !m.dividaId);
  const agrupa = f => { const r = {}; for (const m of doMes) { const k = f(m); if (!k) continue; r[k] = (r[k] || 0) + (m.tipo === 'gasto' ? valorGasto(m) : m.valor - (m.aReceber || 0)); } return Object.entries(r).sort((a, b) => b[1] - a[1]); };
  const subs = agrupa(m => m.sub ? catFin(m.categoria).em + ' ' + m.sub : null).slice(0, 6), lugares = agrupa(m => m.titulo).slice(0, 6);
  const formas = agrupa(m => m.tipo === 'credito' ? 'Crédito' : FORMAS[m.forma] || 'Débito');
  const lista = (tit, l) => l.length ? '<div class="card"><div class="gh" style="margin:0"><span>' + tit + '</span></div>' + l.map(([k, v]) => '<div class="barh"><span>' + esc(k) + '</span><i><u style="width:' + (v / l[0][1] * 100) + '%;background:var(--accent)"></u></i><b>' + fmtCurto(v) + '</b></div>').join('') + '</div>' : '';
  h += lista('Subcategorias', subs) + lista('Onde mais gastou', lugares) + lista('Forma de pagamento', formas);
  // 6 meses
  const meses = [...Array(6)].map((_, k) => { const i0 = inicioMes(new Date(dm.getFullYear(), dm.getMonth() - 5 + k, 1).getTime()); return { i0, t: totais(i0, fimMes(i0)) }; });
  const mx = Math.max(1, ...meses.map(x => Math.max(x.t.receitas, x.t.gastos)));
  h += '<div class="card"><div class="gh" style="margin:0"><span>Últimos 6 meses</span><small class="mut"><b class="rec">■</b> entradas <b class="gas">■</b> gastos</small></div><div class="rl-6m">' + meses.map(x => '<div><span class="b"><i class="rec" style="height:' + (x.t.receitas / mx * 90) + 'px"></i><i class="gas" style="height:' + (x.t.gastos / mx * 90) + 'px"></i></span><small>' + MESES_N[new Date(x.i0).getMonth()] + '</small><em class="' + (x.t.saldo < 0 ? 'gas' : 'rec') + '">' + fmtCurto(x.t.saldo) + '</em></div>').join('') + '</div></div>';
  h += '<div class="actions"><button type="button" class="btn" data-rl="revisar">⚑ Revisar lançamentos</button><button type="button" class="btn" data-rl="gastar">Posso gastar</button><button type="button" class="btn" data-rl="csv">Exportar CSV</button></div>';
  $('finRel').innerHTML = h;
}
$('finRel').addEventListener('click', async e => {
  const b = e.target.closest('[data-rl]'), c = e.target.closest('[data-rlc]');
  if (c) { editarCategoriaFin(c.dataset.rlc); return; }
  if (!b) return; const a = b.dataset.rl;
  if (a === '-') { relMes = inicioMes(relMes - 86400000); renderRelFin(); }
  if (a === '+') { const n = inicioMes(fimMes(relMes) + 86400000); if (n <= Date.now()) { relMes = n; renderRelFin(); } }
  if (a === 'revisar') { extMes = relMes; extRevisar = true; abrirFin('extrato'); }
  if (a === 'gastar') abrirFin('gastar');
  if (a === 'csv') await exportarCSVFin();
});
function editarCategoriaFin(id) {
  const c = catFin(id), l = (config.limites || {})[id];
  abrirForm(c.em + ' ' + c.nome, [{ k: 'limite', rot: 'Limite por mês (vazio = sem limite)', tipo: 'num', v: l ? numBR(l) : '', ph: 'Ex.: 900,00' }, { k: 'subs', rot: 'Subcategorias (separe por vírgula)', v: subsDe(id).join(', ') }], async d => {
    const v = valorBR(d.limite); config.limites = { ...(config.limites || {}) }; if (v > 0) config.limites[id] = round2(v); else delete config.limites[id];
    const subs = d.subs.split(',').map(x => maiuscula(x.trim())).filter(Boolean); config.subcats = { ...(config.subcats || {}), [id]: subs.length ? subs : c.subs };
    await guardar('az-config', config); if (tela === 'fin') renderFin(); if (tela === 'config') renderConfig();
  });
}

// ----- configurações do FinZote -----
function paginasFin(P) {
  const contas = fin.contas.filter(c => !ehInvest(c)), nB = config.ultimoBackup ? Math.floor((Date.now() - config.ultimoBackup) / 86400000) : null;
  return {
    main: { titulo: 'Configurações', itens: [
      { t: 'app' },
      { t: 'acao', a: 'ir-saldos', ic: '🏦', titulo: 'Contas e investimentos', sub: fin.contas.length + (fin.contas.length === 1 ? ' cadastrada' : ' cadastradas') },
      { t: 'acao', a: 'ir-cartoes', titulo: '💳 Cartões de crédito', sub: 'o gasto conta no mês em que a fatura é paga', dir: String((fin.cartoes || []).length) },
      { t: 'esc', k: 'contaPadrao', titulo: 'Conta padrão', sub: 'vem marcada nos lançamentos', ops: contas.length ? contas.map(c => [c.id, c.nome]) : [['', 'Nenhuma conta cadastrada']], valor: contaPadrao()?.id || '' },
      { t: 'nav', p: 'categorias', ic: '🏷️', bg: '#1d2a0a', titulo: 'Categorias e limites', sub: 'subcategorias e limite por mês' },
      { t: 'nav', p: 'orc', ic: '💸', bg: '#1d2a0a', titulo: 'Posso gastar', sub: 'como o valor do dia é calculado' },
      { t: 'nav', p: 'av-contas', ic: '🔔', bg: '#3a2f12', titulo: 'Avisos de contas', sub: config.contasAviso === false ? 'desligado' : 'antes de vencer, Paguei/Adiar na notificação' },
      { t: 'acao', a: 'ativar', titulo: 'Permitir avisos', sub: !Notif ? 'funcionam só no app instalado' : permissaoOk ? '● ativos neste celular' : 'desligados · toque para ativar' },
      { t: 'esc', k: 'jurosRotativo', titulo: 'Juros do rotativo', sub: 'usado ao pagar só parte da fatura', ops: [0.08, 0.1, 0.12, 0.14, 0.16, 0.18].map(v => [v, (v * 100).toFixed(0) + '% ao mês']) },
      { t: 'sw', k: 'esconderValores', titulo: 'Esconder valores', sub: 'mostrar R$ •••• até tocar no olho' },
      { t: 'nav', p: 'aparencia', ic: '🎨', bg: '#3a1f2a', titulo: 'Aparência', sub: 'Seu nome, tamanho do texto' },
      { t: 'nav', p: 'backup', ic: '💾', bg: '#123a2a', titulo: 'Backup e dados', sub: nB === null ? 'Você ainda não fez backup' : 'Último backup ' + (nB === 0 ? 'hoje' : 'há ' + nB + (nB === 1 ? ' dia' : ' dias')), alerta: nB === null || nB >= 7 },
      { t: 'nav', p: 'sobre', ic: 'ℹ️', bg: '#262a36', titulo: 'Sobre', sub: 'Versão e como importar do AZOTE_ANTIGO' },
    ] },
    categorias: { titulo: 'Categorias e limites', itens: [
      { t: 'info', html: 'Toque numa categoria para mudar as subcategorias e o limite do mês. O limite aparece em Relatórios. Quando você muda a categoria de um lançamento, o FinZote aprende para os próximos com o mesmo nome.' },
      ...CAT_FIN.map(c => ({ t: 'acao', a: 'catfin:' + c.id, titulo: c.em + ' ' + c.nome, sub: subsDe(c.id).join(' · '), dir: (config.limites || {})[c.id] ? fmtBRL(config.limites[c.id]).replace(',00', '') : c.id === 'renda' ? '' : 'sem limite' })),
      { t: 'acao', a: 'aprende-limpar', titulo: 'Esquecer o que o app aprendeu', sub: Object.keys(config.aprende || {}).length + ' nomes guardados' },
    ] },
    backup: { titulo: 'Backup e dados', itens: [
      { t: 'info', html: '<span class="rot">ÚLTIMO BACKUP</span><b class="grande">' + (config.ultimoBackup ? fmtSeparador(config.ultimoBackup) + ' · ' + fmtHora(new Date(config.ultimoBackup)) : 'nunca') + '</b><span class="rot">' + fin.movs.length + ' lançamentos · ' + fin.contas.length + ' contas · ' + (fin.cartoes || []).length + ' cartões</span>' },
      { t: 'botao', a: 'exportar', titulo: 'Fazer backup agora', primario: true },
      { t: 'botao', a: 'importar', titulo: 'Importar (backup do FinZote, AgZote ou AZOTE_ANTIGO)' },
      { t: 'sw', k: 'backupAuto', titulo: 'Backup automático toda semana', sub: 'guarda as 4 últimas cópias no celular' },
      { t: 'acao', a: 'enviar-auto', titulo: 'Enviar o último automático', sub: 'para o Drive, e-mail ou WhatsApp' },
      { t: 'acao', a: 'restaurar-auto', titulo: 'Restaurar de um automático' },
      { t: 'acao', a: 'csv-fin', titulo: 'Exportar lançamentos (CSV)' },
      { t: 'sec', titulo: 'Zona de perigo' },
      { t: 'botao', a: 'apagar-tudo', titulo: 'Apagar todos os dados', perigo: true },
    ] },
    sobre: { titulo: 'Sobre', itens: [
      { t: 'info', html: '<b class="grande">FinZote · versão ' + VERSAO + '</b><span class="rot">Finanças pessoais com cadastro por formulário: gastos, receitas, cartão, contas fixas, metas e dívidas.</span>' },
      { t: 'info', html: '<b>Trazer os dados do AZOTE_ANTIGO/AgZote:</b> no AgZote, Configurações › Backup › Levar minhas finanças para o FinZote. Guarde o arquivo e aqui toque em Backup › Importar.' },
      { t: 'info', html: '<b>Atalhos:</b> segure o ícone do FinZote para lançar um gasto, uma receita ou uma compra no cartão direto.' },
    ] },
  };
}
CFG_ACOES['catfin'] = a => editarCategoriaFin(String(a).split(':')[1]);
CFG_ACOES['aprende-limpar'] = async () => { config.aprende = {}; await guardar('az-config', config); renderConfig(); toast('Pronto, esqueci'); };
// importar no FinZote: só a parte de finanças
if (APP === 'fin') aplicarImport = async function (modo) {
  const d = importPendente; importPendente = null; if (!d?.fin) { responderConfig('Importar', '<p>Esse arquivo não tem finanças.</p>'); return; }
  if (modo === 'trocar') fin = { contas: [], agendadas: [], movs: [], metas: [], dividas: [], cartoes: [], receber: [], revOk: {}, naoAssin: {}, ...d.fin, chat: [], avisos: fin.avisos || [] };
  else for (const k of ['contas', 'agendadas', 'movs', 'metas', 'dividas', 'cartoes', 'receber']) { fin[k] = fin[k] || []; const ids = new Set(fin[k].map(x => x.id)); fin[k] = [...fin[k], ...(d.fin[k] || []).filter(x => !ids.has(x.id))]; }
  fin.chat = [];
  for (const k of Object.keys(d.config || {})) if (/^(orc|contas|jurosRotativo|esconderValores|mostrarSaldoHome|nome|limites|subcats|aprende)/.test(k)) config[k] = d.config[k];
  config.catsFin = 0; mapearCategoriasFin();
  await Promise.all([salvarFin(), guardar('az-config', config)]); agendarAvisosFinDepois(); atualizarTudo();
  responderConfig('Importado ✓', '<p>Agora o FinZote tem <b>' + fin.movs.length + ' lançamentos</b>, ' + fin.contas.length + ' contas, ' + (fin.cartoes || []).length + ' cartões e ' + fin.agendadas.length + ' contas fixas. As categorias foram ajustadas para as do FinZote.</p>');
};
