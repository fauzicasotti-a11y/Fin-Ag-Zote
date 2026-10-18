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
var OCULTAR = false;
const fmtBRL = v => OCULTAR ? 'R$ ••••' : (v < 0 ? '− ' : '') + 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtCurto = v => { if (OCULTAR) return '•••'; const a = Math.abs(v); return a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '') + 'k' : String(Math.round(a)); };

// ===== Metas: "guardei 500 pra moto", "nova meta: viagem para o Chile 8 mil até julho", "tirei 200 da reserva" =====
const FIN_MESES = { janeiro: 0, jan: 0, fevereiro: 1, fev: 1, marco: 2, mar: 2, abril: 3, abr: 3, maio: 4, mai: 4, junho: 5, jun: 5, julho: 6, jul: 6, agosto: 7, ago: 7, setembro: 8, set: 8, outubro: 9, out: 9, novembro: 10, nov: 10, dezembro: 11, dez: 11 };
const finTxt = t => [...String(t)].map(FIN_NORM).join('');
const finPalavras = t => (finTxt(t).match(/[a-z0-9]{3,}/g) || []).filter(w => !FIN_GENERICAS.has(w) && !FIN_LIGA.has(w) && !FIN_TIRAR.has(w) && !['meta', 'metas', 'nova', 'novo', 'para'].includes(w));
function acharPorNome(texto, lista, campos) {
  const meus = new Set(finPalavras(texto)); let melhor = null;
  for (const x of lista) {
    const pal = new Set(campos.flatMap(c => finPalavras(x[c] || '')));
    const n = [...pal].filter(p => meus.has(p) || [...meus].some(m => m.length >= 4 && (p.startsWith(m) || m.startsWith(p)))).length;
    if (n && (!melhor || n > melhor.n)) melhor = { x, n };
  }
  return melhor?.x || null;
}
function finPrazo(s, agora) {
  // s normalizado; devolve { t, ini, fim } do prazo: "até julho", "até 31/01", "até janeiro de 2027", "em 6 meses", "até o fim do ano"
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  let m;
  if ((m = /\b(?:ate|para|pra|em)\s+(?:o\s+dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(s))) {
    let a = m[3] ? +m[3] : hoje.getFullYear(); if (a < 100) a += 2000;
    let t = new Date(a, +m[2] - 1, +m[1]).getTime(); if (!m[3] && t < hoje.getTime()) t = new Date(a + 1, +m[2] - 1, +m[1]).getTime();
    return { t, ini: m.index, fim: m.index + m[0].length };
  }
  if ((m = /\b(?:ate|para|pra|em)\s+(?:o\s+fim\s+de\s+|o\s+final\s+de\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b(?:\s*(?:de\s+)?(\d{4}))?/.exec(s))) {
    const mes = FIN_MESES[m[1]]; let a = m[2] ? +m[2] : hoje.getFullYear();
    if (!m[2] && new Date(a, mes + 1, 0) < hoje) a++;
    return { t: new Date(a, mes + 1, 0).getTime(), ini: m.index, fim: m.index + m[0].length };
  }
  if ((m = /\b(?:em|daqui\s+a)\s+(\d{1,2})\s+(mes|meses|ano|anos)\b/.exec(s))) {
    const n = +m[1] * (/ano/.test(m[2]) ? 12 : 1);
    return { t: new Date(hoje.getFullYear(), hoje.getMonth() + n, hoje.getDate()).getTime(), ini: m.index, fim: m.index + m[0].length };
  }
  if ((m = /\bate\s+o\s+fim\s+do\s+ano\b/.exec(s))) return { t: new Date(hoje.getFullYear(), 11, 31).getTime(), ini: m.index, fim: m.index + m[0].length };
  return null;
}
function interpretarMeta(texto, agora = new Date(), metas = []) {
  const s = finTxt(texto);
  let m;
  if ((m = /^\s*(?:nova\s+meta|criar\s+meta|meta\s+nova|quero\s+juntar|quero\s+guardar)\b[:\s-]*/.exec(s))) {
    let resto = s.slice(m[0].length), original = [...texto].slice(m[0].length).join('');
    const p = finPrazo(resto, agora);
    const rm = new Array(resto.length).fill(false); const tira = (a, b) => { for (let k = a; k < b; k++) rm[k] = true; };
    if (p) tira(p.ini, p.fim);
    const v = finValor(resto.split('').map((c, k) => rm[k] ? ' ' : c).join(''));
    if (v) tira(v.ini, v.fim);
    let nome = [...original].map((c, k) => rm[k] ? ' ' : c).join('').replace(/\b(reais|r\$)\b/gi, ' ').replace(/\s+/g, ' ').trim()
      .replace(/^(de|da|do|para|pra|uma?|o|a)\s+/i, '').replace(/\s+(de|da|do|para|pra|com|e|ate)$/i, '').replace(/[,.;:-]+$/, '').trim();
    nome = nome.replace(/^./, c => c.toUpperCase());
    return { acao: 'novaMeta', nome: nome || 'Meta', valor: v ? v.valor : null, prazo: p ? p.t : null };
  }
  if (!metas.length) return null;
  const verboG = /\b(guardei|juntei|separei|coloquei|depositei|poupei|guardar|aportei)\b/.test(s);
  const verboR = /\b(tirei|retirei|resgatei|usei|peguei|saquei)\b/.test(s);
  if (!verboG && !verboR) return null;
  const meta = acharPorNome(texto, metas, ['nome']); if (!meta) return null;
  const v = finValor(s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, m => ' '.repeat(m.length)));
  if (!v) return null;
  return { acao: verboG ? 'guardarMeta' : 'resgatarMeta', meta, valor: v.valor };
}

// ===== Dívidas: "financiamento moto 18 mil, 48x de 538,96, 1,59%, dia 10, desde jun/25" · "paguei a parcela da moto" · "antecipei 3 parcelas da moto, paguei 1.007" =====
function interpretarDivida(texto, agora = new Date(), dividas = []) {
  const s = finTxt(texto);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  let m;
  const ehCadastro = /\b(financiamento|financiei|emprestimo|peguei\s+emprestado|consorcio|divida|parcelei|parcelado)\b/.test(s) && /\b\d{1,3}\s*x\b|\b\d{1,3}\s+(parcelas|vezes|meses)\b/.test(s) && !/\b(paguei|antecipei|quitei)\b/.test(s);
  if (ehCadastro) {
    const tipo = /financ/.test(s) ? 'financiamento' : /cartao|parcel/.test(s) ? 'cartao' : /emprest/.test(s) ? 'emprestimo' : 'outro';
    m = /\b(\d{1,3})\s*(?:x|parcelas|vezes|meses)\b/.exec(s); const n = +m[1];
    let parcela = null, taxa = null, dia = null, inicio = null;
    let t2 = s;
    const apaga = mm => { t2 = t2.slice(0, mm.index) + ' '.repeat(mm[0].length) + t2.slice(mm.index + mm[0].length); };
    apaga(m);
    if ((m = /\bde\s+(r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?!\s*(?:mil|k|%))/.exec(t2.slice(0)))) { const idx = m.index; const vv = finValor(m[0]); if (vv && m.index > s.search(/\d{1,3}\s*(x|parcelas|vezes)/) - 3) { parcela = vv.valor; apaga(m); } }
    if ((m = /(\d+(?:[.,]\d{1,3})?)\s*%\s*(?:a\.?\s*m\.?|ao\s+mes|mes)?/.exec(t2))) { taxa = parseFloat(m[1].replace(',', '.')) / 100; apaga(m); }
    if ((m = /\b(?:todo\s+)?dia\s+(\d{1,2})\b/.exec(t2))) { dia = +m[1]; apaga(m); }
    if ((m = /\b(?:desde|comecei\s+em|comecou\s+em|primeira\s+(?:parcela\s+)?em|a\s+partir\s+de|inicio\s+em)\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*(?:\/|de\s+)?(\d{2,4})?/.exec(t2))) {
      let a = m[2] ? +m[2] : hoje.getFullYear(); if (a < 100) a += 2000; inicio = { mes: FIN_MESES[m[1]], ano: a }; apaga(m);
    } else if ((m = /\b(?:desde|comecei\s+em|primeira\s+em)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/.exec(t2))) { let a = +m[3]; if (a < 100) a += 2000; inicio = { mes: +m[2] - 1, ano: a, dia: +m[1] }; apaga(m); }
    const v = finValor(t2); if (v) apaga({ index: v.ini, 0: t2.slice(v.ini, v.fim) });
    const d = dia || inicio?.dia || hoje.getDate();
    let primeiro;
    if (inicio) primeiro = new Date(inicio.ano, inicio.mes, Math.min(d, new Date(inicio.ano, inicio.mes + 1, 0).getDate()), 9).getTime();
    else { primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), d, 9).getTime(); if (primeiro < hoje.getTime()) primeiro = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d, 9).getTime(); }
    // nome: o que sobra depois das palavras de cadastro
    let nome = t2.replace(/\b(financiamento|financiei|emprestimo|peguei|emprestado|consorcio|divida|parcelei|parcelado|do|da|de|no|na|em|com|a|o|e|reais|r\$|juros|ao|mes|am)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const orig = finTxt(texto); const idx = nome ? orig.indexOf(nome.split(' ')[0]) : -1;
    if (idx >= 0) nome = [...texto].slice(idx, idx + nome.split(' ')[0].length).join('');
    nome = (nome ? nome.replace(/^./, c => c.toUpperCase()) : '');
    const titulo = (tipo === 'financiamento' ? 'Financiamento' : tipo === 'emprestimo' ? 'Empréstimo' : tipo === 'cartao' ? 'Parcelado' : 'Dívida') + (nome ? ' ' + (tipo === 'financiamento' ? 'da ' : '') + nome.toLowerCase() : '');
    return { acao: 'novaDivida', tipo, nome: titulo.replace(/^./, c => c.toUpperCase()), valor: v ? v.valor : (parcela ? parcela * n : null), n, parcela, taxa, primeiro };
  }
  if (!dividas.length) return null;
  const div = acharPorNome(texto, dividas, ['nome', 'credor']);
  if (!div) return null;
  if ((m = /\b(antecipei|adiantei|quitei)\b/.exec(s))) {
    const q = /\bquitei\b/.test(s) ? 'tudo' : +((/\b(\d{1,3})\s+(?:ultimas\s+)?parcelas?\b/.exec(s) || [])[1] || 1);
    const sem = s.replace(/\b\d{1,3}\s+(?:ultimas\s+)?parcelas?\b/, m => ' '.repeat(m.length));
    const v = finValor(sem);
    return { acao: 'antecipar', divida: div, quantas: q, valor: v ? v.valor : null };
  }
  if (/\b(paguei|pago|quitei)\b/.test(s) && /\b(parcela|prestacao|boleto|emprestimo|financiamento|divida|carne)\b|\bparcela\b/.test(s) || /\bpaguei\b/.test(s)) {
    const atraso = /\b(\d{1,3})\s+dias?\s+de\s+atraso\b|\batrasad[ao]\s+(\d{1,3})\s+dias?\b/.exec(s);
    const sem = s.replace(/\b\d{1,3}\s+dias?\b/g, m => ' '.repeat(m.length)).replace(/\b\d{1,3}\s*\/\s*\d{1,3}\b/g, m => ' '.repeat(m.length));
    const v = finValor(sem);
    let desconto = null; const md = /\bcom\s+(?:r\$\s*)?(\d+(?:,\d{1,2})?)\s+(?:de\s+)?desconto\b/.exec(s);
    if (md) desconto = parseFloat(md[1].replace(',', '.'));
    return { acao: 'pagarParcela', divida: div, valor: v && !(md && v.valor === desconto) ? v.valor : null, atrasoDias: atraso ? +(atraso[1] || atraso[2]) : null, desconto };
  }
  return null;
}
// Tabela de parcelas de uma dívida (Price, SAC ou sem juros)
function tabelaDivida(d) {
  const n = Math.max(1, d.n | 0), i = d.sistema === 'sem' ? 0 : (d.taxa || 0), pv = d.valor || 0;
  const linhas = []; let s = pv;
  const pmt = d.parcela || (i > 0 ? pv * i / (1 - Math.pow(1 + i, -n)) : pv / n);
  const base = new Date(d.primeiro || Date.now());
  for (let k = 1; k <= n; k++) {
    const ult = new Date(base.getFullYear(), base.getMonth() + k, 0).getDate();
    const venc = new Date(base.getFullYear(), base.getMonth() + k - 1, Math.min(base.getDate(), ult), 9).getTime();
    let juros = s * i, amort, parcela;
    if (d.sistema === 'sac') { amort = pv / n; parcela = amort + juros; }
    else { parcela = k === n && !d.parcela && i === 0 ? s : pmt; amort = parcela - juros; }
    if (k === n) amort = s;
    s = Math.max(0, s - amort);
    linhas.push({ k, venc, parcela, juros, amort, saldo: s });
  }
  return linhas;
}

// ===== Cartão de crédito: "tênis 600 em 3x no cartão roxo", "mercado 230 no crédito", "paguei a fatura do cartão verde", "estornaram 59,90 da loja" =====
function interpretarCartao(texto, agora = new Date(), cartoes = []) {
  if (!cartoes.length) return null;
  const s = finTxt(texto);
  const cartao = acharPorNome(texto.replace(/cart[aã]o/gi, ' '), cartoes, ['nome', 'final']);
  const falaCredito = /\b(credito|cartao)\b/.test(s) || !!cartao;
  if (/\bfatura\b/.test(s) && /\b(paguei|pago|quitei|pagar)\b/.test(s)) {
    const v = finValor(s.replace(/\b\d{4}\b/g, m => ' '.repeat(m.length)));
    return { acao: 'pagarFatura', cartao, valor: v && v.forte ? v.valor : (v && !/\d{4}/.test(String(v.valor)) ? v.valor : null) };
  }
  if (!falaCredito) return null;
  if (/\b(estorno|estornaram|estornou|estornado|devolveram|devolucao|reembolsaram)\b/.test(s)) {
    const v = finValor(s); if (!v) return null;
    let titulo = texto.replace(/\b(estorno|estornaram|estornou|estornado|devolveram|devolução|devolucao|reembolsaram)\b/gi, ' ').replace(/(no|na)?\s*(cart[aã]o|cr[eé]dito)\s*\w*/gi, ' ').replace(/r?\$?\s*\d[\d.,]*/g, ' ').replace(/\b(de|da|do|o|a)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    return { acao: 'estorno', cartao, valor: v.valor, titulo: 'Estorno' + (titulo ? ' · ' + titulo : '') };
  }
  const mp = /\b(\d{1,2})\s*x\b|\bem\s+(\d{1,2})\s+(?:vezes|parcelas)\b/.exec(s);
  const parcelas = mp ? Math.max(1, +(mp[1] || mp[2])) : 1;
  let limpo = texto;
  if (mp) { const arr = [...texto]; for (let k = mp.index; k < mp.index + mp[0].length; k++) arr[k] = ' '; limpo = arr.join(''); }
  limpo = limpo.replace(/\b(no|na|pelo|pela|com\s+o|com\s+a)?\s*(cart[aã]o\s+de\s+cr[eé]dito|cr[eé]dito|cart[aã]o)\b/gi, ' ');
  if (cartao) for (const p of finPalavras(cartao.nome)) limpo = limpo.replace(new RegExp('\\b' + p + '\\b', 'i'), ' ').replace(new RegExp('\\b' + [...p].join('') + '\\b', 'gi'), ' ');
  const r = interpretarFin(limpo, agora, {});
  if (r.valor == null) return null;
  return { acao: 'compraCredito', cartao, valor: r.valor, parcelas, titulo: r.titulo && r.titulo !== 'Gasto' ? r.titulo : 'Compra no cartão', categoria: r.categoria, quando: r.acao === 'agendar' ? agora.getTime() : r.quando };
}

// ===== Pessoal: treino, corrida, peso, remédio, estudo, leitura, hábito, diário =====
function finDuracao(s) {
  let m = /\b(\d{1,2})\s*h(?:oras?)?\s*(?:e\s*)?(\d{1,2})?\s*(?:min(?:utos)?)?\b/.exec(s);
  if (m) return { min: +m[1] * 60 + (+m[2] || 0), ini: m.index, fim: m.index + m[0].length };
  m = /\b(\d{1,3})\s*(?:min|mins|minutos)\b/.exec(s); if (m) return { min: +m[1], ini: m.index, fim: m.index + m[0].length };
  m = /\bmeia\s+hora\b/.exec(s); if (m) return { min: 30, ini: m.index, fim: m.index + m[0].length };
  m = /\buma\s+hora\b/.exec(s); if (m) return { min: 60, ini: m.index, fim: m.index + m[0].length };
  return null;
}
function interpretarPessoal(texto, agora = new Date(), ctx = {}) {
  const s = finTxt(texto).trim();
  const num = x => parseFloat(String(x).replace(',', '.'));
  let m;
  // diário: "energia 4 humor 3", "humor 5", "diário: hoje foi ótimo"
  const en = /\benergia\s*(?:[:=]\s*)?([1-5])\b/.exec(s), hu = /\bhumor\s*(?:[:=]\s*)?([1-5])\b/.exec(s);
  if (en || hu || /^diario\b/.test(s)) {
    const nota = /^diario\s*[:\-]?\s*/.test(s) ? texto.replace(/^\s*di[aá]rio\s*[:\-]?\s*/i, '').trim() : '';
    return { acao: 'diario', energia: en ? +en[1] : null, humor: hu ? +hu[1] : null, nota };
  }
  // peso e medidas
  if ((m = /^(peso|cintura|quadril|braco|braço|gordura)\s*(?:de\s*)?(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|cm|%)?/.exec(s))) return { acao: 'medida', tipo: m[1].replace('braço', 'braco'), valor: num(m[2]) };
  if ((m = /\b(?:pesei|estou\s+com|to\s+com|tô\s+com)\s*(\d{2,3}(?:[.,]\d{1,2})?)\s*kg\b/.exec(s))) return { acao: 'medida', tipo: 'peso', valor: num(m[1]) };
  // corrida / caminhada
  if ((m = /\b(corri|caminhei|pedalei|nadei)\s+(\d+(?:[.,]\d+)?)\s*(km|k|m)\b(?:\s+em\s+(\d+)\s*(?:min|minutos)?(?:\s*(?:e\s*)?(\d+)\s*s)?)?/.exec(s))) {
    let km = num(m[2]); if (m[3] === 'm') km /= 1000;
    return { acao: 'corrida', tipo: { corri: 'corrida', caminhei: 'caminhada', pedalei: 'bike', nadei: 'natação' }[m[1]], km, min: m[4] ? +m[4] + (m[5] ? +m[5] / 60 : 0) : null };
  }
  // treino: "supino 4x10 40kg, agachamento 4x8 60kg"
  const reEx = /([a-z][a-z\s]{1,30}?)\s+(\d{1,2})\s*x\s*(\d{1,3})(?:\s*(?:com|de)?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*kg)?/g;
  const exs = []; while ((m = reEx.exec(s))) {
    const nomeN = m[1].replace(/^(e|fiz|treino|treinei|hoje|de)\s+/g, '').trim(); if (!nomeN) continue;
    const ini = m.index + m[0].indexOf(m[1]) + m[1].indexOf(nomeN);
    exs.push({ nome: [...texto].slice(ini, ini + nomeN.length).join('').replace(/^./, c => c.toUpperCase()), series: +m[2], reps: +m[3], carga: m[4] ? num(m[4]) : 0 });
  }
  if (exs.length) return { acao: 'treino', exercicios: exs };
  if (/^(treinei|fui\s+na\s+academia|academia\s+feita|treino\s+feito)\b/.test(s)) return { acao: 'treino', exercicios: [] };
  // remédios
  if ((m = /\b(tomei|tomado|tomada)\b/.exec(s))) {
    const rem = acharPorNome(texto.replace(/tomei|tomad[oa]/gi, ' '), ctx.remedios || [], ['nome']);
    if (rem) return { acao: 'tomei', remedio: rem };
  }
  if ((m = /\bcomprei\b.*?(\d{1,3})\s*(comprimidos|capsulas|unidades|doses)?/.exec(s)) && ctx.remedios?.length) {
    const rem = acharPorNome(texto.replace(/comprei/gi, ' '), ctx.remedios, ['nome']); if (rem) return { acao: 'estoque', remedio: rem, qtd: +m[1] };
  }
  // estudo: "estudei 1h30 de python", "terminei o módulo 7 de python", "revisei groupby"
  if (/\b(estudei|estudo\s+de|assisti|fiz\s+exercicios|terminei\s+o|terminei\s+a|conclui|revisei)\b/.test(s) && ctx.materias?.length) {
    const mat = acharPorNome(texto, ctx.materias, ['nome']);
    const d = finDuracao(s);
    const mu = /\b(?:terminei|conclui)\s+(?:o|a)?\s*(modulo|capitulo|aula|unidade|lista|licao|semana|parte)\s*(\d{1,3})\b/.exec(s);
    const rev = /\brevisei\b/.test(s);
    if (mat && (d || mu || rev)) {
      let assunto = null;
      const ma = /\b(?:sobre|assunto|topico|conteudo)\s*[:\-]?\s*(.+)$/.exec(s); if (ma) assunto = [...texto].slice(ma.index + ma[0].length - ma[1].length).join('').trim();
      if (rev && !assunto) { const mr = /\brevisei\s+(.+)$/.exec(s); if (mr) { assunto = mr[1]; for (const p of finPalavras(mat.nome)) assunto = assunto.replace(new RegExp('\\b(de|da|do)?\\s*' + p + '\\b'), ' '); assunto = assunto.replace(/\s+/g, ' ').trim() || null; } }
      return { acao: 'estudo', materia: mat, min: d ? d.min : 0, unidade: mu ? +mu[2] : null, nomeUnidade: mu ? mu[1] : null, revisao: rev, assunto };
    }
  }
  // leitura
  if ((m = /\b(?:li|lendo|parei|estou)\s+(?:ate\s+)?(?:a\s+|na\s+)?(?:pagina|pag\.?|p\.)\s*(\d{1,4})\b/.exec(s))) {
    const livro = acharPorNome(texto, (ctx.livros || []).filter(l => l.status !== 'quero'), ['titulo']) || (ctx.livros || []).find(l => l.status === 'lendo') || null;
    return { acao: 'pagina', livro, pagina: +m[1] };
  }
  if ((m = /\b(?:li)\s+(\d{1,4})\s+paginas\b/.exec(s))) { const livro = acharPorNome(texto, ctx.livros || [], ['titulo']) || (ctx.livros || []).find(l => l.status === 'lendo') || null; return { acao: 'paginasLidas', livro, qtd: +m[1] }; }
  if ((m = /^(?:comecei\s+(?:a\s+ler\s+)?|vou\s+ler\s+|lendo\s+)(.+?)(?:,?\s*(?:com\s+)?(\d{2,4})\s*(?:paginas|pags|p))?\s*$/.exec(s))) {
    const ini = m.index + m[0].indexOf(m[1]); const titulo = [...texto].slice(ini, ini + m[1].length).join('').trim();
    return { acao: 'novoLivro', titulo: titulo.replace(/^./, c => c.toUpperCase()), paginas: m[2] ? +m[2] : null };
  }
  if ((m = /^(?:terminei\s+(?:de\s+ler\s+|o\s+livro\s+)?|acabei\s+(?:de\s+ler\s+)?)(.+?)(?:\s+nota\s+([1-5]))?\s*$/.exec(s)) && ctx.livros?.length) {
    const livro = acharPorNome(m[1], ctx.livros, ['titulo']); if (livro) return { acao: 'terminei', livro, nota: m[2] ? +m[2] : null };
  }
  if ((m = /^quero\s+ler\s+(.+)$/.exec(s))) { const ini = m.index + m[0].length - m[1].length; return { acao: 'queroLer', titulo: [...texto].slice(ini).join('').trim().replace(/^./, c => c.toUpperCase()) }; }
  // hábitos: "fiz meditação", "bebi água", "li 10 páginas" (já tratado), "meditação feita"
  if (ctx.habitos?.length) {
    const hab = acharPorNome(texto, ctx.habitos, ['nome']);
    if (hab && (/\b(fiz|feito|feita|bebi|tomei|cumpri|pratiquei|ok|check|✓)\b/.test(s) || s.split(' ').length <= 3)) return { acao: 'habito', habito: hab };
  }
  return null;
}
