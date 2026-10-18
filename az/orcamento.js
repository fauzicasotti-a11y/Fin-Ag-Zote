
// =====================================================================
// 1.14 · Finanças › Posso gastar: quanto dá para gastar por dia, semana e mês
// =====================================================================
// livre = receitas − contas fixas − parcelas de dívidas − parcelas do cartão − metas − reserva
// restante = livre − gasto do dia a dia até ontem; por dia = restante ÷ dias que faltam (com peso do fim de semana)
let orcComo = false;
function diaSalario() {
  const r = fin.agendadas.filter(a => a.tipo === 'receber' && a.repetir?.tipo === 'mensal').sort((a, b) => b.valor - a.valor)[0];
  return r ? new Date(r.inicio).getDate() : 1;
}
function periodoOrc(agora = Date.now()) {
  const dia = config.orcInicio === 'salario' ? diaSalario() : 1, d = new Date(agora);
  const lim = (a, m) => Math.min(dia, new Date(a, m + 1, 0).getDate());
  let a = d.getFullYear(), m = d.getMonth(); if (d.getDate() < lim(a, m)) m--;
  const ini = new Date(a, m, lim(a, m)).getTime(), prox = new Date(a, m + 1, lim(new Date(a, m + 1, 1).getFullYear(), new Date(a, m + 1, 1).getMonth())).getTime();
  return { ini, fim: prox - 1, dia };
}
const pesoDia = t => { const w = new Date(t).getDay(), fds = w === 0 || w === 6; return config.orcDistrib === 'fds' ? (fds ? 1.5 : 1) : config.orcDistrib === 'uteis' ? (fds ? 0 : 1) : 1; };
const ignoraCat = c => !!config['orcIgn_' + (c || 'pessoal')];
// gasto do dia a dia de um lançamento (compras no crédito contam na hora; parcelado conta a parcela)
function gastoDiaADia(m) {
  if (m.tipo === 'gasto' && !m.agId && !m.dividaId && !ignoraCat(m.categoria)) return valorGasto(m);
  if (m.tipo === 'credito' && !ignoraCat(m.categoria)) return (m.valor - (m.aReceber || 0)) / (m.parcelas > 1 ? m.parcelas : 1);
  if (m.tipo === 'estorno') return -m.valor;
  return 0;
}
function calcOrcamento(agora = Date.now()) {
  const P = periodoOrc(agora), hoje0 = inicioDoDia(agora).getTime();
  const ocs = todasOcorrencias(P.ini, P.fim), v = o => o.mov?.valor ?? o.ag.valor;
  const itens = { receitas: [], fixas: [], dividas: [], cartao: [], metas: [] };
  for (const o of ocs) {
    if (o.ag.tipo === 'receber') itens.receitas.push([o.ag.titulo, v(o), o.paga ? 'recebido' : 'dia ' + new Date(o.t).getDate()]);
    else if (o.ag.divida) itens.dividas.push([o.ag.titulo, v(o), o.paga ? 'paga' : 'dia ' + new Date(o.t).getDate()]);
    else if (!o.ag.cartao) itens.fixas.push([o.ag.titulo, v(o), o.paga ? 'paga' : 'dia ' + new Date(o.t).getDate()]);
  }
  if (config.orcEventuais) for (const m of fin.movs) if (m.tipo === 'receita' && !m.agId && !m.reemb && m.t >= P.ini && m.t <= P.fim) itens.receitas.push([m.titulo || 'Receita', m.valor, 'eventual']);
  if (config.orcCartao !== false) {
    const mesP = new Date(P.ini).getFullYear() * 12 + new Date(P.ini).getMonth();
    for (const m of fin.movs) if (m.tipo === 'credito' && m.parcelas > 1 && m.t < P.ini) { const i = mesP - (new Date(m.t).getFullYear() * 12 + new Date(m.t).getMonth()); if (i >= 1 && i <= m.parcelas - 1) itens.cartao.push([m.titulo || 'Compra parcelada', m.valor / m.parcelas, 'parcela ' + (i + 1) + ' de ' + m.parcelas]); }
  }
  if (config.orcMetas !== false) for (const mt of fin.metas || []) {
    if (mt.semPrazo) continue; const falta = mt.alvo - guardadoMeta(mt); if (falta <= 0.01 || mt.prazo < agora) continue;
    const meses = Math.max(1, Math.ceil((mt.prazo - agora) / (30.44 * 86400000))); itens.metas.push([mt.nome, falta / meses, 'para chegar em ' + fmtDM(mt.prazo)]);
  }
  const soma = l => l.reduce((s, x) => s + x[1], 0);
  const receitas = soma(itens.receitas), reserva = receitas * (Number(config.orcReserva) || 0) / 100;
  const livre = receitas - soma(itens.fixas) - soma(itens.dividas) - soma(itens.cartao) - soma(itens.metas) - reserva;
  const porDia = {}; let gastoTotal = 0, gastoHoje = 0;
  for (const m of fin.movs) { if (m.t < P.ini || m.t > Math.min(P.fim, agora + 86400000)) continue; const g = gastoDiaADia(m); if (!g) continue; const k = inicioDoDia(m.t).getTime(); porDia[k] = (porDia[k] || 0) + g; gastoTotal += g; if (k === hoje0) gastoHoje += g; }
  const dias = []; for (let t = inicioDoDia(P.ini).getTime(); t <= P.fim; t = maisDias(t, 1)) dias.push(t);
  const pesoTotal = dias.reduce((s, t) => s + pesoDia(t), 0), pesoRest = dias.filter(t => t >= hoje0).reduce((s, t) => s + pesoDia(t), 0);
  const gastoAteOntem = gastoTotal - gastoHoje;
  const base = config.orcModo === 'fixo' ? livre / Math.max(1, pesoTotal) : (livre - gastoAteOntem) / Math.max(1, pesoRest);
  const porPeso = Math.max(0, base), hojeLimite = porPeso * pesoDia(hoje0), hojeResta = hojeLimite - gastoHoje;
  const domingo = maisDias(hoje0, (7 - new Date(hoje0).getDay()) % 7);
  const semana = dias.filter(t => t >= hoje0 && t <= Math.min(domingo, P.fim)).reduce((s, t) => s + pesoDia(t) * porPeso, 0) - gastoHoje;
  const pesoPassado = dias.filter(t => t < hoje0).reduce((s, t) => s + pesoDia(t), 0) + pesoDia(hoje0);
  const esperado = livre * pesoPassado / Math.max(1, pesoTotal);
  const status = livre - gastoTotal < 0 ? ['passou do mês', 'e-atr'] : gastoTotal > esperado * 1.08 ? ['acima do ritmo', 'e-vence'] : ['no ritmo ✓', 'e-ok'];
  return { P, itens, receitas, reserva, livre, porDia, gastoTotal, gastoHoje, gastoAteOntem, dias, porPeso, hojeLimite, hojeResta, semana, mesResta: livre - gastoTotal, diasRest: dias.filter(t => t >= hoje0).length, status, hoje0, domingo };
}
const orcDisponivel = () => fin.agendadas.some(a => a.tipo === 'receber') || (config.orcEventuais && fin.movs.some(m => m.tipo === 'receita'));
function renderGastar() {
  const box = $('finGastar');
  if (!orcDisponivel()) { box.innerHTML = '<div class="empty"><b>Cadastre suas receitas do mês.</b><br>O “Posso gastar” usa o salário e as outras entradas programadas, menos as contas fixas, parcelas e metas. Escreva em Lançamentos, por exemplo <i>“salário 5.200 todo dia 5”</i> e <i>“aluguel 1.500 todo dia 10”</i>.</div><div class="actions"><button type="button" class="btn primary" data-og="lanc">Ir para Lançamentos</button><button type="button" class="btn" data-og="ajustes">Ajustes</button></div>'; return; }
  const c = calcOrcamento(), r = c.hojeResta, pct = c.hojeLimite > 0 ? Math.min(1, Math.max(0, c.gastoHoje / c.hojeLimite)) : 1;
  const dI = new Date(c.P.ini), dF = new Date(c.P.fim);
  let h = '<div class="pg-hero' + (r < 0 ? ' neg' : '') + '"><div class="rot">' + (r >= 0 ? 'Hoje você ainda pode gastar' : 'Hoje você passou do limite em') + '</div><div class="v">' + fmtBRL(Math.abs(r)) + '</div><small>de ' + fmtBRL(c.hojeLimite) + ' do dia' + (c.gastoHoje ? ' · já foram ' + fmtBRL(c.gastoHoje) : '') + '</small><div class="pg-bar"><i style="width:' + (pct * 100).toFixed(0) + '%;background:' + (r < 0 ? 'var(--gas)' : '#ff8a6a') + '"></i><i style="width:' + ((1 - pct) * 100).toFixed(0) + '%;background:var(--accent)"></i></div></div>';
  h += '<div class="t3"><div><small>Por dia</small><b>' + fmtBRL(c.porPeso).replace(/,\d\d$/, '') + '</b><span>até ' + dF.getDate() + '/' + (dF.getMonth() + 1) + '</span></div><div><small>Esta semana</small><b class="' + (c.semana < 0 ? 'gas' : '') + '">' + fmtBRL(c.semana).replace(/,\d\d$/, '') + '</b><span>até ' + (c.domingo <= c.P.fim ? 'domingo' : 'o fim do período') + '</span></div><div><small>No período</small><b class="' + (c.mesResta < 0 ? 'gas' : '') + '">' + fmtBRL(c.mesResta).replace(/,\d\d$/, '') + '</b><span>restam de ' + fmtBRL(c.livre).replace(/,\d\d$/, '') + '</span></div></div>';
  // gráfico: gasto de cada dia × limite diário
  const W = 320, H = 92, n = c.dias.length, bw = W / n, lim = c.porPeso, mx = Math.max(lim * 2.2, ...c.dias.map(t => c.porDia[t] || 0), 1);
  let svg = '<svg class="graf" viewBox="0 0 ' + W + ' ' + (H + 16) + '" width="100%">';
  c.dias.forEach((t, i) => { const v = c.porDia[t] || 0, hh = Math.min(v, mx) / mx * H, lt = lim * pesoDia(t); if (t > c.hoje0) { if (lt > 0) svg += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (H - lt / mx * H).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + (lt / mx * H).toFixed(1) + '" rx="2" fill="none" stroke="#2c2c2c" stroke-dasharray="2 2"/>'; } else if (v > 0) svg += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (H - hh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + (v > lt + 0.01 ? '#ff5a5a' : t === c.hoje0 ? '#c6f432' : '#3d4d14') + '"/>'; });
  const y = H - lim / mx * H, iH = c.dias.indexOf(c.hoje0);
  svg += '<line x1="0" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#c6f432" stroke-width="1.2" stroke-dasharray="4 3"/><text x="' + W + '" y="' + (y - 4).toFixed(1) + '" fill="#c6f432" font-size="9" text-anchor="end">' + fmtBRL(lim).replace(/,\d\d$/, '') + '/dia</text>';
  svg += '<text x="0" y="' + (H + 13) + '" fill="#8a8a8a" font-size="9">' + dI.getDate() + '/' + (dI.getMonth() + 1) + '</text>' + (iH >= 0 ? '<text x="' + ((iH + 0.5) * bw).toFixed(0) + '" y="' + (H + 13) + '" fill="#c6f432" font-size="9" text-anchor="middle">hoje</text>' : '') + '<text x="' + W + '" y="' + (H + 13) + '" fill="#8a8a8a" font-size="9" text-anchor="end">' + dF.getDate() + '/' + (dF.getMonth() + 1) + '</text></svg>';
  h += '<div class="card"><div class="gh" style="margin:0"><span>Gastos do dia a dia</span><em class="' + c.status[1] + ' pg-st">' + c.status[0] + '</em></div>' + (OCULTAR ? '<p class="dica">Valores escondidos.</p>' : svg) + '<p class="dica">Dias em vermelho passaram do limite; ' + (config.orcModo === 'fixo' ? 'o valor do dia é fixo.' : 'o excesso é dividido pelos dias que faltam.') + '</p></div>';
  // como calculei
  const lin = (tit, val, cls, l) => '<div class="wf"><b>' + tit + '</b><b class="' + cls + '">' + (val >= 0 && cls === 'rec' ? '+ ' : '− ') + fmtBRL(Math.abs(val)) + '</b>' + (l && l.length ? '<small>' + l.slice(0, 6).map(x => esc(x[0]) + ' ' + fmtCurto(x[1])).join(' · ') + (l.length > 6 ? ' · +' + (l.length - 6) : '') + '</small>' : '') + '</div>';
  const S = k => c.itens[k].reduce((s, x) => s + x[1], 0);
  h += '<button type="button" class="card pg-como" data-og="como"><div class="gh" style="margin:0"><span>Livre no período: ' + fmtBRL(c.livre) + '</span><b class="am">' + (orcComo ? 'Fechar' : 'Como calculei ›') + '</b></div></button>';
  if (orcComo) {
    h += '<div class="card pg-calc"><div class="rot">' + dI.getDate() + '/' + (dI.getMonth() + 1) + ' a ' + dF.getDate() + '/' + (dF.getMonth() + 1) + (config.orcInicio === 'salario' ? ' · do dia do salário' : '') + '</div>' + lin('Receitas', c.receitas, 'rec', c.itens.receitas) + lin('Contas fixas', S('fixas'), 'gas', c.itens.fixas);
    if (c.itens.dividas.length) h += lin('Parcelas e dívidas', S('dividas'), 'gas', c.itens.dividas);
    if (c.itens.cartao.length) h += lin('Cartão · parcelas já compradas', S('cartao'), 'gas', c.itens.cartao);
    if (c.itens.metas.length) h += lin('Guardar para metas', S('metas'), 'inv', c.itens.metas);
    if (c.reserva) h += lin('Reserva de segurança (' + config.orcReserva + '%)', c.reserva, 'inv');
    h += '<div class="wf tot"><b>Livre para o dia a dia</b><b>' + fmtBRL(c.livre) + '</b></div>' + lin('Já gasto no período', c.gastoTotal, 'gas') +
      '<div class="wf tot hl"><b>Restam ' + fmtBRL(c.livre - c.gastoAteOntem) + ' ÷ ' + c.diasRest + (c.diasRest === 1 ? ' dia' : ' dias') + '</b><b class="am">= ' + fmtBRL(c.porPeso) + ' por dia</b></div><p class="dica">Conta do jeito ' + (config.orcModo === 'fixo' ? 'fixo: o valor do dia não muda.' : 'recalculado: se sobrar hoje, amanhã fica maior; se passar, os próximos dias diminuem.') + ' Gastos do dia a dia são os lançamentos que não são contas programadas' + (Object.keys(config).some(k => k.startsWith('orcIgn_') && config[k]) ? ', fora as categorias ' + CATEGORIAS.filter(x => config['orcIgn_' + x.id]).map(x => x.nome.toLowerCase()).join(', ') : '') + '.</p></div>';
  }
  h += '<div class="actions"><button type="button" class="btn" data-og="ajustes">Ajustes do cálculo</button><button type="button" class="btn" data-og="lanc">Lançar um gasto</button></div>';
  box.innerHTML = h;
}
$('finGastar').addEventListener('click', e => {
  const b = e.target.closest('[data-og]'); if (!b) return;
  if (b.dataset.og === 'como') { orcComo = !orcComo; renderGastar(); }
  if (b.dataset.og === 'lanc') { finAba = 'chat'; renderFin(); setTimeout(() => $('entradaFin').focus(), 80); }
  if (b.dataset.og === 'ajustes') { cfgPag = 'orc'; cfgBusca = ''; abrir('config'); }
});
// resposta do chat: depois de um gasto, mostra quanto sobra no dia
function marcarOrcNoChat() {
  if (!orcDisponivel()) return;
  const it = fin.chat[fin.chat.length - 1]; if (!it || it.k !== 'mov' || it.orc) return;
  const m = fin.movs.find(x => x.id === it.id); if (!m || !gastoDiaADia(m) || inicioDoDia(m.t).getTime() !== inicioDoDia(Date.now()).getTime()) return;
  const c = calcOrcamento(); it.orc = { resta: Math.round(c.hojeResta * 100) / 100, lim: Math.round(c.hojeLimite * 100) / 100, prox: c.hojeResta < 0 ? Math.max(0, (c.livre - c.gastoTotal) / Math.max(1, c.diasRest - 1)) : null, dias: c.diasRest - 1 };
}
function orcNoChatHTML(it) {
  const o = it.orc; if (!o) return '';
  return o.resta >= 0 ? '<div class="orc-msg"><small>Posso gastar hoje</small><b>restam ' + fmtBRL(o.resta) + ' de ' + fmtBRL(o.lim) + '</b></div>'
    : '<div class="orc-msg neg"><small>Passou ' + fmtBRL(-o.resta) + ' do dia</small><b>' + (o.dias > 0 ? 'os próximos ' + o.dias + ' dias ficam em ' + fmtBRL(o.prox) : 'último dia do período') + '</b></div>';
}
function cartaoOrcHoje() {
  if (!orcDisponivel() || config.mostrarSaldoHome === false) return '';
  const c = calcOrcamento();
  return '<button type="button" class="card hj-rot" data-h="orc">' + anelHTML(c.hojeLimite > 0 ? Math.max(0, c.hojeResta) / c.hojeLimite : 0, 44, c.hojeResta < 0 ? 'var(--gas)' : 'var(--accent)', 6, '<span style="font-size:14px">💸</span>') + '<div><b>' + (c.hojeResta >= 0 ? 'Pode gastar hoje: ' + fmtBRL(c.hojeResta) : 'Passou ' + fmtBRL(-c.hojeResta) + ' do dia') + '</b><small>de ' + fmtBRL(c.hojeLimite) + ' · semana ' + fmtBRL(c.semana) + '</small></div></button>';
}
// ajustes (Configurações › Finanças › Posso gastar)
PAGINAS_EXTRA.push(() => ({ orc: { titulo: 'Posso gastar', itens: [
  { t: 'info', html: 'O valor do dia = (receitas − contas fixas − parcelas − metas − reserva − o que já gastou) ÷ dias que faltam.' },
  { t: 'esc', k: 'orcInicio', titulo: 'Meu mês começa', sub: 'período usado no cálculo', ops: [[1, 'Dia 1º'], ['salario', 'No dia do salário (' + diaSalario() + ')']] },
  { t: 'sw', k: 'orcEventuais', titulo: 'Contar receitas eventuais', sub: 'além das programadas, o que já entrou no período' },
  { t: 'sec', titulo: 'Separar antes de calcular' },
  { t: 'sw', k: 'orcMetas', titulo: 'Metas', sub: 'o quanto falta ÷ meses até o prazo' },
  { t: 'esc', k: 'orcReserva', titulo: 'Reserva de segurança', sub: 'parte das receitas fica de fora', ops: [[0, 'Não usar'], [5, '5%'], [10, '10%'], [15, '15%'], [20, '20%']] },
  { t: 'sw', k: 'orcCartao', titulo: 'Parcelas do cartão', sub: 'parcelas de compras de meses anteriores' },
  { t: 'sec', titulo: 'Distribuir' },
  { t: 'esc', k: 'orcDistrib', titulo: 'Pelos dias', ops: [['igual', 'Igual todo dia'], ['fds', 'Fim de semana vale 1,5×'], ['uteis', 'Só dias úteis']] },
  { t: 'esc', k: 'orcModo', titulo: 'Se sobrar ou passar', ops: [['recalc', 'Recalcular os próximos dias'], ['fixo', 'Manter o valor fixo']] },
  { t: 'sec', titulo: 'Não contam como dia a dia' },
  ...CATEGORIAS.filter(c => c.id !== 'trabalho').map(c => ({ t: 'sw', k: 'orcIgn_' + c.id, titulo: c.nome, sub: 'gastos sem conta programada nessa categoria' })),
] } }));
