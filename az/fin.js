// ===== Finanças: leitura das mensagens do chat de Lançamentos =====
// "paguei a luz 186,40", "salário 5.200 todo dia 5", "transferi 500 da conta pro tesouro", "saldo da conta corrente 2.310"
const FIN_NORM = c => c.length > 1 ? '#' : c.toLowerCase().normalize('NFD')[0];
const FIN_SEM = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const FIN_GENERICAS = new Set(['conta', 'contas', 'de', 'do', 'da', 'meu', 'minha', 'banco']);
const FIN_LIGA = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'com', 'pra', 'pro', 'para', 'em', 'a', 'o', 'as', 'os', 'e', 'que', 'um', 'uma', 'ao', 'pelo', 'pela', 'via', 'r']);
const FIN_TIRAR = new Set(['paguei', 'gastei', 'comprei', 'pago', 'gasto', 'torrei', 'debitou', 'cobraram', 'recebi', 'ganhei', 'caiu', 'entrou', 'vendi', 'reais', 'real', 'pix',
  'transferi', 'transfere', 'passei', 'mandei', 'movi', 'apliquei', 'investi', 'aportei', 'guardei', 'resgatei', 'saquei', 'tirei', 'rendeu', 'vence', 'vencimento',
  'todo', 'toda', 'todos', 'dia', 'mes', 'mensal', 'mensalmente', 'semana', 'semanal', 'ano', 'anual', 'hoje', 'ontem', 'anteontem', 'amanha', 'debito', 'credito', 'cartao', 'dinheiro', 'agendar', 'lembrar', 'receber', 'pagar']);
function finValor(txt) {
  // txt já normalizado; devolve { valor, ini, fim } do primeiro valor em dinheiro
  const re = /(r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*(?:mil|k)\b)?/g;
  let m, melhor = null;
  while ((m = re.exec(txt))) {
    const antes = txt.slice(Math.max(0, m.index - 1), m.index), depois = txt.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (/[\d\/:]/.test(antes) || /[\/:x%h\d]/.test(depois) && !m[3]) continue;
    let num = m[2];
    if (/^\d{1,3}(\.\d{3})+/.test(num)) num = num.replace(/\./g, '').replace(',', '.');
    else num = num.replace(',', '.');
    let v = parseFloat(num); if (m[3]) v *= 1000;
    const forte = !!(m[1] || m[3] || /,\d/.test(m[2]));
    const c = { valor: Math.round(v * 100) / 100, ini: m.index, fim: m.index + m[0].length, forte };
    if (!melhor || (c.forte && !melhor.forte)) melhor = c;
    if (melhor.forte) break;
  }
  return melhor;
}
function interpretarFin(texto, agora = new Date(), ctx = {}) {
  const contas = ctx.contas || [], agendadas = ctx.agendadas || [];
  const orig = [...texto];
  let s = orig.map(FIN_NORM).join('');
  const rm = new Array(orig.length).fill(false);
  const tirar = (i, f) => { for (let k = i; k < f; k++) rm[k] = true; };
  const visivel = () => s.split('').map((c, k) => rm[k] ? ' ' : c).join('');
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dia = (a, m, d) => new Date(a, m, d, 9, 0).getTime();
  let m, repetir = null, data = null, dataPassada = null, diaN = null;
  // repetição
  if ((m = /\btod[oa]s?\s+(?:o\s+)?(?:dia\s+)?(\d{1,2})(?:\s+de\s+cada\s+mes)?\b/.exec(s)) && +m[1] >= 1 && +m[1] <= 31) { repetir = { tipo: 'mensal' }; diaN = +m[1]; tirar(m.index, m.index + m[0].length); }
  else if ((m = /\btodo\s+mes\b|\bmensal(?:mente)?\b|\bpor\s+mes\b/.exec(s))) { repetir = { tipo: 'mensal' }; tirar(m.index, m.index + m[0].length); }
  else if ((m = /\btoda\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?\b|\btodo\s+(sabado|domingo)\b/.exec(s))) { repetir = { tipo: 'semanal', dias: [FIN_SEM[m[1] || m[2]]] }; tirar(m.index, m.index + m[0].length); }
  else if ((m = /\btoda\s+semana\b|\bsemanal(?:mente)?\b/.exec(s))) { repetir = { tipo: 'semanal', dias: [hoje.getDay()] }; tirar(m.index, m.index + m[0].length); }
  else if ((m = /\btodo\s+ano\b|\banual(?:mente)?\b/.exec(s))) { repetir = { tipo: 'anual' }; tirar(m.index, m.index + m[0].length); }
  // datas
  if ((m = /\b(?:(?:no\s+)?dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(s))) {
    let a = m[3] ? +m[3] : hoje.getFullYear(); if (a < 100) a += 2000;
    data = dia(a, +m[2] - 1, +m[1]); tirar(m.index, m.index + m[0].length);
  } else if (diaN === null && (m = /\b(?:(?:no|ate|para|pra)\s+)?(?:o\s+)?dia\s+(\d{1,2})\b/.exec(s)) && +m[1] >= 1 && +m[1] <= 31) {
    diaN = +m[1]; tirar(m.index, m.index + m[0].length);
  }
  if ((m = /\b(hoje|ontem|anteontem|amanha|depois de amanha)\b/.exec(s))) {
    const n = { hoje: 0, ontem: -1, anteontem: -2, amanha: 1, 'depois de amanha': 2 }[m[1]];
    data = dia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n); tirar(m.index, m.index + m[0].length);
  }
  if (!repetir && !data && (m = /\b(?:(?:na|ate|para|pra)\s+)?(?:proxima\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?\b/.exec(s))) {
    let n = (FIN_SEM[m[1]] - hoje.getDay() + 7) % 7; if (n === 0) n = 7;
    data = dia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n); tirar(m.index, m.index + m[0].length);
  }
  // valor
  const v = finValor(visivel());
  if (v) tirar(v.ini, v.fim);
  const valor = v ? v.valor : null;
  // contas mencionadas (com posição)
  const t0 = visivel();
  const mencoes = [];
  for (const c of contas) {
    const palavras = [...new Set((c.nome + ' ' + (c.instituicao || '')).split(/\s+/).map(p => [...p].map(FIN_NORM).join('').replace(/[^a-z0-9]/g, '')).filter(p => p.length >= 3 && !FIN_GENERICAS.has(p)))];
    let pos = -1, len = 0;
    for (const p of palavras) { const r = new RegExp('\\b' + p + '\\b').exec(t0); if (r && (pos < 0 || r.index < pos)) { pos = r.index; len = p.length; } }
    if (pos < 0 && c.tipo === 'dinheiro') { const r = /\b(carteira|dinheiro|especie)\b/.exec(t0); if (r) { pos = r.index; len = r[0].length; } }
    if (pos < 0 && c.tipo === 'investimento') { const r = /\b(investimento|aplicacao)\b/.exec(t0); if (r && contas.filter(x => x.tipo === 'investimento').length === 1) { pos = r.index; len = r[0].length; } }
    if (pos >= 0) {
      const antes = t0.slice(0, pos).trimEnd().split(/\s+/).pop() || '';
      mencoes.push({ conta: c, pos, len, ligada: /^(pro|pra|para|no|na|em|pros|pras|da|do|de|dos|das|conta)$/.test(antes), destino: /^(pro|pra|para|no|na|em|pros|pras)$/.test(antes), origem: /^(da|do|de|dos|das)$/.test(antes) });
    }
  }
  mencoes.sort((a, b) => a.pos - b.pos);
  const padrao = contas.find(c => c.padrao && c.tipo !== 'investimento') || contas.find(c => c.tipo !== 'investimento') || null;
  const invest = contas.filter(c => c.tipo === 'investimento');
  // intenção
  let acao = 'nada', origem = null, destino = null, tipoAg = null;
  const temVerbo = re => re.test(s);
  if (valor !== null && /^\s*saldo\b|\bsaldo\s+(?:d[aoe]|n[ao]|atual)\b|\btenho\b.*\bn[ao]\b/.test(s)) {
    acao = 'saldo'; origem = mencoes[0]?.conta || (/carteira|dinheiro/.test(s) ? contas.find(c => c.tipo === 'dinheiro') : null) || padrao;
  } else if (valor !== null && temVerbo(/\b(rendeu|rendimentos?|dividendos?|proventos?|juros\s+de)\b/)) {
    acao = 'rend'; destino = mencoes.find(x => x.conta.tipo === 'investimento')?.conta || (invest.length === 1 ? invest[0] : null);
    if (!destino) acao = 'faltaInvest';
  } else if (valor !== null && (m = /\b(transferi|transfere|transferencia|passei|mandei|movi|apliquei|investi|aportei|guardei|coloquei|resgatei|saquei|tirei)\b/.exec(s))) {
    const verbo = m[1];
    const md = mencoes.find(x => x.destino), mo = mencoes.find(x => x.origem);
    if (/apliquei|investi|aportei|guardei|coloquei/.test(verbo)) {
      destino = (md || mencoes.find(x => x.conta.tipo === 'investimento'))?.conta || (invest.length === 1 ? invest[0] : null);
      origem = (mo && mo.conta !== destino ? mo.conta : null) || padrao;
      acao = destino ? 'transf' : 'faltaInvest';
    } else if (/resgatei|tirei/.test(verbo)) {
      origem = (mo || mencoes.find(x => x.conta.tipo === 'investimento'))?.conta || (invest.length === 1 ? invest[0] : null);
      destino = (md && md.conta !== origem ? md.conta : null) || padrao;
      acao = origem && origem.tipo === 'investimento' ? 'transf' : verbo === 'tirei' ? 'gasto' : 'faltaInvest';
    } else if (verbo === 'saquei') {
      origem = (mo || mencoes.find(x => x.conta.tipo !== 'dinheiro'))?.conta || padrao;
      destino = contas.find(c => c.tipo === 'dinheiro') || null;
      acao = destino && origem ? 'transf' : 'gasto';
    } else {
      if (mencoes.length >= 2) { origem = (mo || mencoes[0]).conta; destino = (md || mencoes.find(x => x.conta !== origem)).conta; }
      else if (md) { destino = md.conta; origem = padrao; }
      acao = destino && origem && destino !== origem ? 'transf' : 'gasto';
    }
    if (acao === 'gasto') { origem = null; destino = null; }
  }
  const realizadoGasto = /\b(paguei|gastei|comprei|torrei|debitou|cobraram|gasto|mandei|passei|transferi|tirei)\b/.test(s);
  const realizadoReceita = /\b(recebi|ganhei|caiu|entrou|vendi|me\s+pagaram|me\s+pagou|reembolsaram|depositaram)\b/.test(s);
  if (acao === 'nada' && valor !== null) {
    const futuro = repetir || (data && data > hoje.getTime() + 86399999) || (diaN !== null && !realizadoGasto && !realizadoReceita) || /\b(vence|vencimento|a\s+pagar|a\s+receber|boleto|agendar|lembrar|pagar|receber)\b/.test(s);
    if (futuro && !realizadoGasto && !realizadoReceita) {
      acao = 'agendar';
      tipoAg = /\b(receber|recebo|a\s+receber|salario|aluguel\s+recebido|reembolso|freela|freelance|13o|decimo|ferias|bonus|plr|comissao|dividendos?)\b/.test(s) && !/\b(pagar|a\s+pagar)\b/.test(s) ? 'receber' : 'pagar';
    } else acao = realizadoReceita ? 'receita' : 'gasto';
  }
  // contas citadas: em gastos e receitas só vale "no/na/da conta X" (ex.: "salário 5.200" não é a Conta salário)
  if (acao === 'gasto' || acao === 'receita' || acao === 'agendar' || acao === 'nada') mencoes.splice(0, mencoes.length, ...mencoes.filter(x => x.ligada));
  for (const mc of mencoes) tirar(mc.pos, mc.pos + mc.len);
  // data efetiva
  let quando = null;
  if (acao === 'agendar') {
    if (data) quando = data;
    else if (diaN !== null) {
      quando = dia(hoje.getFullYear(), hoje.getMonth(), Math.min(diaN, new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()));
      if (quando < hoje.getTime()) quando = dia(hoje.getFullYear(), hoje.getMonth() + 1, Math.min(diaN, new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0).getDate()));
    } else if (repetir?.tipo === 'semanal') { const n = (repetir.dias[0] - hoje.getDay() + 7) % 7; quando = dia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n); }
    else quando = dia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  } else {
    if (data && data <= agora.getTime() + 86400000) quando = Math.min(data, agora.getTime());
    else if (diaN !== null) { let t = dia(hoje.getFullYear(), hoje.getMonth(), diaN); if (t > agora.getTime()) t = dia(hoje.getFullYear(), hoje.getMonth() - 1, diaN); quando = t; }
    else quando = agora.getTime();
    if (data && acao === 'saldo') quando = agora.getTime();
  }
  // título: o que sobrou, sem verbos e conectivos
  const fin = visivel();
  const tokens = [];
  const reTok = /[a-z0-9#ç]+/g; let tk;
  while ((tk = reTok.exec(fin))) tokens.push({ n: tk[0], i: tk.index, f: tk.index + tk[0].length });
  let lista = tokens.filter(t => !FIN_TIRAR.has(t.n) && !/^\d+$/.test(t.n));
  while (lista.length && FIN_LIGA.has(lista[0].n)) lista.shift();
  while (lista.length && FIN_LIGA.has(lista[lista.length - 1].n)) lista.pop();
  let titulo = lista.length ? orig.slice(lista[0].i, lista[lista.length - 1].f).join('') : '';
  titulo = titulo.replace(/\s+/g, ' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
  // remove do meio palavras de verbo que ficaram (ex.: "luz paguei")
  titulo = titulo.split(' ').filter(w => !FIN_TIRAR.has([...w].map(FIN_NORM).join('').replace(/[^a-z0-9]/g, '')) || /^conta/i.test(w)).join(' ');
  titulo = titulo.replace(/^./, c => c.toUpperCase());
  // conta usada no lançamento
  let conta = null;
  if (acao === 'gasto' || acao === 'receita' || acao === 'agendar') conta = mencoes.find(x => x.conta.tipo !== 'investimento')?.conta || (acao === 'agendar' ? null : padrao);
  // conta programada correspondente ("paguei a luz" → baixa na conta de luz)
  let baixa = null;
  if (acao === 'gasto' || acao === 'receita') {
    const tipo = acao === 'gasto' ? 'pagar' : 'receber';
    const meus = new Set([...[...texto].map(FIN_NORM).join('').matchAll(/[a-z0-9]{3,}/g)].map(x => x[0]).filter(w => !FIN_TIRAR.has(w) && !FIN_LIGA.has(w)));
    let melhor = null;
    for (const ag of agendadas.filter(a => a.tipo === tipo)) {
      const pal = [...ag.titulo].map(FIN_NORM).join('').match(/[a-z0-9]{3,}/g) || [];
      const comum = pal.filter(p => !FIN_GENERICAS.has(p) && meus.has(p)).length;
      if (!comum) continue;
      const ocs = (ctx.pendentes ? ctx.pendentes(ag, quando) : []);
      if (!ocs.length) continue;
      const oc = ocs.sort((a, b) => Math.abs(a.t - quando) - Math.abs(b.t - quando))[0];
      const nota = comum * 10 - Math.abs(oc.t - quando) / 86400000 / 100;
      if (!melhor || nota > melhor.nota) melhor = { id: ag.id, chave: oc.chave, t: oc.t, nota, titulo: ag.titulo, categoria: ag.categoria, contaId: ag.contaId };
    }
    if (melhor) { baixa = melhor; if (!titulo || titulo.length < 3) titulo = melhor.titulo; else titulo = melhor.titulo; }
  }
  if (acao === 'transf') titulo = 'Transferência'; if (acao === 'rend') titulo = 'Rendimento'; if (acao === 'saldo') titulo = 'Saldo';
  if (!titulo) titulo = { gasto: 'Gasto', receita: 'Receita', agendar: tipoAg === 'receber' ? 'Conta a receber' : 'Conta a pagar', transf: 'Transferência', rend: 'Rendimento', saldo: 'Saldo' }[acao] || '';
  let categoria = baixa?.categoria || (typeof categorizar === 'function' ? categorizar(titulo) : 'pessoal');
  if ((acao === 'receita' || tipoAg === 'receber') && categoria === 'pessoal') categoria = 'financas';
  if (baixa?.contaId && !mencoes.some(x => x.conta.tipo !== 'investimento')) conta = contas.find(c => c.id === baixa.contaId) || conta;
  return { acao, valor, titulo, quando, repetir, tipoAg, conta, origem, destino, baixa, categoria, contaDita: mencoes.length > 0 };
}
// Datas de uma conta programada (mensal no dia 31 cai no último dia do mês)
function datasDaConta(ag, de, ate, max = 60) {
  const base = new Date(ag.inicio), r = ag.repetir, out = [];
  const H = base.getHours(), M = base.getMinutes();
  if (!r) return ag.inicio >= de && ag.inicio <= ate ? [ag.inicio] : [];
  if (r.tipo === 'mensal' || r.tipo === 'anual') {
    const passo = r.tipo === 'mensal' ? 1 : 12;
    for (let k = 0; out.length < max && k < 1200; k += passo) {
      const ult = new Date(base.getFullYear(), base.getMonth() + k + 1, 0).getDate();
      const t = new Date(base.getFullYear(), base.getMonth() + k, Math.min(base.getDate(), ult), H, M).getTime();
      if (t > ate) break; if (t >= de) out.push(t);
    }
  } else {
    for (let k = 0; out.length < max && k < 3000; k++) {
      const t = new Date(base.getFullYear(), base.getMonth(), base.getDate() + k, H, M).getTime();
      if (t > ate) break;
      if (r.tipo === 'semanal' && !(r.dias || [base.getDay()]).includes(new Date(t).getDay())) continue;
      if (t >= de) out.push(t);
    }
  }
  if (ag.ate) return out.filter(t => t <= ag.ate);
  return out;
}
const fmtBRL = v => (v < 0 ? '− ' : '') + 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtCurto = v => { const a = Math.abs(v); return a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '') + 'k' : String(Math.round(a)); };
