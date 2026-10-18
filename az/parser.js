// ===== Interpretador de mensagens (português) =====
// Recebe um texto livre e devolve {titulo, inicio (Date), avisoMin, faltouData, faltouHora}
const MESES = { jan:0, janeiro:0, fev:1, fevereiro:1, mar:2, marco:2, abr:3, abril:3, mai:4, maio:4, jun:5, junho:5,
  jul:6, julho:6, ago:7, agosto:7, set:8, setembro:8, out:9, outubro:9, nov:10, novembro:10, dez:11, dezembro:11 };
const SEMANA = { domingo:0, segunda:1, terca:2, quarta:3, quinta:4, sexta:5, sabado:6 };
const NUM_PALAVRA = { um:1, uma:1, dois:2, duas:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10, onze:11, doze:12, quinze:15, vinte:20, trinta:30, quarenta:40 };
const NUM = '(\\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|meia)';

function paraNumero(s) {
  if (s === 'meia') return 0.5;
  return /^\d+$/.test(s) ? parseInt(s, 10) : (NUM_PALAVRA[s] ?? NaN);
}
function minutosDe(qtd, unidade) {
  const n = paraNumero(qtd);
  if (/^min/.test(unidade)) return n;
  if (/^h/.test(unidade)) return n * 60;
  if (/^dia/.test(unidade)) return n * 1440;
  if (/^semana/.test(unidade)) return n * 10080;
  return NaN;
}

function interpretar(textoOriginal, agora = new Date(), opcoes = {}) {
  // Versão minúscula e sem acentos, com o MESMO comprimento do original,
  // para sabermos quais trechos foram "usados" e sobrarem só as palavras da descrição.
  let s = [...textoOriginal].map(c => c.toLowerCase().normalize('NFD')[0]).join('');
  const usado = new Array(s.length).fill(false);

  function consumir(re, fn) {
    const m = re.exec(s);
    if (!m) return false;
    if (fn(m) === false) return false;
    for (let i = m.index; i < m.index + m[0].length; i++) usado[i] = true;
    s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length);
    return true;
  }

  let data = null;          // Date (só dia)
  let hora = null, minuto = 0;
  let avisoMin = 'avisoPadrao' in opcoes ? opcoes.avisoPadrao : 15; // padrão das Configurações
  let absoluto = null;      // "daqui a 2 horas"

  // 1) Aviso / lembrete
  consumir(/\bsem (aviso|lembrete|alerta|notificacao)\b/, () => { avisoMin = null; });
  consumir(/\b(avisa|lembra|alerta|notifica)\w*(-me)?( me)? na hora\b/, () => { avisoMin = 0; });
  consumir(new RegExp('\\b(?:(?:me|e)\\s+)?(?:avis|lembr|alert|notific)\\w*(?:-me)?(?:\\s+me)?\\s+(?:com\\s+)?' + NUM + '\\s*(minutos?|mins?|m|horas?|hs?|dias?|semanas?)\\s+antes\\b'),
    m => { const v = minutosDe(m[1], m[2]); if (isNaN(v)) return false; avisoMin = v; });
  consumir(new RegExp('\\b' + NUM + '\\s*(minutos?|mins?|horas?|hs?|dias?)\\s+antes\\b'),
    m => { const v = minutosDe(m[1], m[2]); if (isNaN(v)) return false; avisoMin = v; });

  // 2) Tempo relativo: "daqui a 2 horas", "em 30 minutos", "daqui 3 dias"
  consumir(new RegExp('\\b(?:daqui(?:\\s+a)?|em|dentro de)\\s+' + NUM + '\\s*(minutos?|mins?|horas?|dias?|semanas?)\\b'), m => {
    const v = minutosDe(m[1], m[2]); if (isNaN(v)) return false;
    absoluto = new Date(agora.getTime() + v * 60000);
    if (v >= 1440) { data = new Date(absoluto); absoluto = null; }
  });

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const maisDias = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n);

  // 2b) Repetição: "toda segunda", "todo dia", "dias úteis", "todo dia 10", "todo ano"
  let repetir = null;
  const DIA_RE = '(segunda|terca|quarta|quinta|sexta|sabado|domingo)s?(?:[- ]feiras?)?';
  consumir(/\b(?:de|da)\s+segunda\s+a\s+sexta(?:[- ]feira)?\b|\b(?:em\s+|nos\s+)?(?:tod[oa]s\s+os\s+|[tfr]od[oa]\s+)?dias?\s+ute?is\b|\b(?:em\s+|nos\s+)?(?:[tfr]od[oa]\s+)?dias?\s+util\b/,
    () => { repetir = { tipo: 'semanal', dias: [1, 2, 3, 4, 5] }; });
  if (!repetir) consumir(/\btodo(?:\s+mes,?)?(?:\s+no)?\s+dia\s+(\d{1,2})\b/, m => {
    const d = +m[1]; if (d < 1 || d > 31) return false;
    repetir = { tipo: 'mensal' };
    data = new Date(hoje.getFullYear(), hoje.getMonth(), d);
    if (data < hoje) data = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d);
  });
  if (!repetir) consumir(new RegExp('\\btod[ao]s?\\s+(?:as\\s+|os\\s+)?' + DIA_RE + '((?:\\s*(?:,|e)\\s*(?:as\\s+|os\\s+|a\\s+|o\\s+)?' + DIA_RE + ')*)'), m => {
    const nomes = m[0].match(/segunda|terca|quarta|quinta|sexta|sabado|domingo/g);
    repetir = { tipo: 'semanal', dias: [...new Set(nomes.map(n => SEMANA[n]))].sort() };
  });
  if (!repetir) consumir(/\b(?:todos os dias|todo dia|diariamente)\b/, () => { repetir = { tipo: 'diario' }; });
  if (!repetir) consumir(/\b(?:toda semana|todas as semanas|semanalmente)\b/, () => { repetir = { tipo: 'semanal' }; });
  if (!repetir) consumir(/\b(?:todo mes|todos os meses|mensalmente)\b/, () => { repetir = { tipo: 'mensal' }; });
  if (!repetir) consumir(/\b(?:todo ano|todos os anos|anualmente)\b/, () => { repetir = { tipo: 'anual' }; });

  // 3) Datas
  if (!data) consumir(/\bdepois de amanha\b/, () => { data = maisDias(2); });
  if (!data) consumir(/\bamanha\b(?! de manha\b)|\bamanha(?= de manha\b)/, () => { data = maisDias(1); });
  if (!data) consumir(/\bhoje\b/, () => { data = maisDias(0); });
  if (!data) consumir(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, m => {
    const d = +m[1], me = +m[2] - 1; let a = m[3] ? +m[3] : hoje.getFullYear();
    if (a < 100) a += 2000;
    if (me < 0 || me > 11 || d < 1 || d > 31) return false;
    data = new Date(a, me, d);
    if (!m[3] && data < hoje) data = new Date(a + 1, me, d);
  });
  if (!data) consumir(/\b(?:dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b(?:\s+de\s+(\d{4}))?/, m => {
    const d = +m[1], me = MESES[m[2]]; const a = m[3] ? +m[3] : hoje.getFullYear();
    data = new Date(a, me, d);
    if (!m[3] && data < hoje) data = new Date(a + 1, me, d);
  });
  if (!data) consumir(/\b(?:(?:na|no|nessa|nesse|esta|este|essa|esse)\s+)?(proxim[ao]\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?(\s+que\s+vem)?\b/, m => {
    const alvo = SEMANA[m[2]];
    let dif = (alvo - hoje.getDay() + 7) % 7;
    if (dif === 0) dif = 7;
    data = maisDias(dif);
  });
  if (!data) consumir(/\bdia\s+(\d{1,2})\b/, m => {
    const d = +m[1]; if (d < 1 || d > 31) return false;
    data = new Date(hoje.getFullYear(), hoje.getMonth(), d);
    if (data < hoje) data = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d);
  });
  if (!data) consumir(/\b(?:na\s+)?semana que vem\b|\bproxima semana\b/, () => { data = maisDias(7); });

  // 3b) Duração: "por 2 horas", "durante 1h30", "por meia hora", "o dia todo"
  let duracao = null; // minutos
  consumir(/\b(?:o\s+)?dia (?:todo|inteiro)\b/, () => { duracao = 15 * 60; hora = 7; minuto = 0; });
  if (duracao === null) consumir(/\b(?:por|durante|duracao de|dura)\s+(\d{1,2}|uma|um|duas|meia)\s*(?:h|hs|horas?)(?:\s*(?:e\s*)?(\d{1,2}|meia)\s*(?:min(?:utos)?)?)?(?:\s+de\s+duracao)?\b/, m => {
    const h = paraNumero(m[1]); if (isNaN(h)) return false;
    const mi = m[2] ? (m[2] === 'meia' ? 30 : +m[2]) : 0;
    duracao = Math.round(h * 60 + mi);
  });
  if (duracao === null) consumir(/\b(?:por|durante|duracao de|dura)\s+(\d{1,3})\s*(?:min|minutos)\b/, m => { duracao = +m[1]; });

  // 4) Horários
  const PER = '(?:\\s+(?:da|de|a|à)\\s+(manha|tarde|noite|madrugada))?';
  let periodo = null;
  // Intervalo: "das 14h às 16h", "de 9 a 11 da manhã", "14h-16h"
  if (hora === null) consumir(new RegExp('\\b(?:das|de)\\s+(\\d{1,2})(?:\\s*(?:h|hs|:)\\s*(\\d{2})?)?\\s+(?:as|a|ate(?:\\s+as?)?)\\s+(\\d{1,2})(?:\\s*(?:h|hs|:)\\s*(\\d{2})?)?(?:\\s*horas)?' + PER + '\\b|\\b(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?\\s*(?:-|–|ate)\\s*(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?\\b'), m => {
    let h1 = +(m[1] ?? m[6]), m1 = +(m[2] ?? m[7] ?? 0), h2 = +(m[3] ?? m[8]), m2 = +(m[4] ?? m[9] ?? 0);
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59) return false;
    const per = m[5];
    if ((per === 'tarde' || per === 'noite') && h2 < 12) { h2 += 12; if (h1 < 12 && h1 + 12 <= h2) h1 += 12; }
    let d = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (d <= 0) d += 24 * 60;
    hora = h1; minuto = m1; duracao = d;
  });
  if (hora === null) consumir(/\b(?:ao\s+|as\s+|a\s+)?meio[- ]dia(\s+e\s+meia)?\b/, m => { hora = 12; minuto = m[1] ? 30 : 0; });
  if (hora === null) consumir(/\b(?:a\s+|as\s+)?meia[- ]noite\b/, () => { hora = 0; minuto = 0; });
  if (hora === null) consumir(new RegExp('\\b(?:as\\s+|a\\s+|pelas\\s+)?(\\d{1,2})\\s*(?:h|hs|:)\\s*(\\d{2})?(?:\\s*min)?\\b' + PER), m => {
    const h = +m[1], mi = m[2] ? +m[2] : 0; if (h > 23 || mi > 59) return false;
    hora = h; minuto = mi; periodo = m[3] || null;
  });
  if (hora === null) consumir(new RegExp('\\b(?:as|pelas)\\s+(\\d{1,2})(?:\\s+e\\s+(meia|\\d{1,2}))?(?:\\s+horas?)?' + PER + '\\b'), m => {
    const h = +m[1]; if (h > 23) return false;
    hora = h; minuto = m[2] ? (m[2] === 'meia' ? 30 : +m[2]) : 0; periodo = m[3] || null;
  });
  if (hora === null) consumir(/\b(\d{1,2})(?:\s+e\s+(meia|\d{1,2}))?\s+(?:da|de)\s+(manha|tarde|noite|madrugada)\b/, m => {
    hora = +m[1]; minuto = m[2] ? (m[2] === 'meia' ? 30 : +m[2]) : 0; periodo = m[3];
  });
  if (hora === null) consumir(/\b(?:de|a|à|pela|na|da|nesta|esta|hoje a)\s+(manha|tarde|noite)\b/, m => {
    hora = { manha: 9, tarde: 14, noite: 19 }[m[1]]; minuto = 0;
  });
  if (periodo && (periodo === 'tarde' || periodo === 'noite') && hora < 12) hora += 12;

  // 5) Monta data/hora final
  let inicio, faltouData = false, faltouHora = false;
  if (absoluto) {
    inicio = absoluto;
  } else {
    // Semanal com dias definidos: primeiro desses dias a partir de hoje (hoje vale se o horário ainda não passou)
    if (!data && repetir?.dias) {
      const h0 = hora ?? 9, m0 = hora === null ? 0 : minuto;
      for (let k = 0; k < 8; k++) {
        const d = maisDias(k);
        if (!repetir.dias.includes(d.getDay())) continue;
        if (new Date(d.getFullYear(), d.getMonth(), d.getDate(), h0, m0) > agora) { data = d; break; }
      }
    }
    if (!data && repetir && hora === null) data = maisDias(1);
    if (!data && hora !== null) {
      data = maisDias(0);
      const t = new Date(data); t.setHours(hora, minuto, 0, 0);
      if (t <= agora) data = maisDias(1);
    }
    if (!data) { data = maisDias(1); faltouData = true; }
    if (hora === null) { hora = 9; minuto = 0; faltouHora = true; }
    inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), hora, minuto);
  }

  // 6) Descrição = o que sobrou do texto original
  let titulo = [...textoOriginal].map((c, i) => (usado[i] ? ' ' : c)).join('');
  titulo = titulo.replace(/\s+/g, ' ').replace(/\s+([,.!?;])/g, '$1');
  const conectores = /^(?:[,.;:!\-–—]+|e|às|as|a|à|no|na|nas|nos|de|do|da|dia|em|para|pra|pro|marcar|marca|agendar|agenda|anotar|anota|lembrar de|lembrar|lembrete|lembrete de|lembra de|me lembra de|me lembre de|tenho|vou ter|com aviso|aviso|avisar|,)$/i;
  let palavras = titulo.trim().split(' ');
  const limpa = () => {
    let mudou = true;
    while (mudou && palavras.length) {
      mudou = false;
      for (const n of [3, 2, 1]) {
        if (palavras.length >= n && conectores.test(palavras.slice(0, n).join(' '))) { palavras = palavras.slice(n); mudou = true; break; }
      }
      for (const n of [3, 2, 1]) {
        if (palavras.length >= n && conectores.test(palavras.slice(-n).join(' '))) { palavras = palavras.slice(0, -n); mudou = true; break; }
      }
    }
  };
  limpa();
  titulo = palavras.join(' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').replace(/\s+,/g, ',');
  if (!titulo) titulo = 'Compromisso';
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  // Semanal sem dias explícitos ("toda semana"): repete no dia da semana da 1ª data
  if (repetir && repetir.tipo === 'semanal' && !repetir.dias) repetir.dias = [inicio.getDay()];

  // Trabalho: não conta como compromisso no cálculo de horas livres
  const trabalho = /^(trabalho|trabalhar|expediente|escrit[oó]rio|servi[cç]o|plant[aã]o|home office|jornada)\b/i.test(titulo);

  return { titulo, inicio, avisoMin, faltouData, faltouHora, repetir, duracao: duracao ?? 60, trabalho };
}

// ===== Ocorrências de um compromisso (repetido ou não) entre duas datas =====
// Chave do dia (AAAA-MM-DD, horário local) usada nas exceções de compromissos repetidos
function chaveDia(t) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
// Datas "brutas" da regra de repetição, sem exceções
function ocorrenciasRegra(ev, de, ate, max) {
  const base = new Date(ev.inicio);
  const r = ev.repetir;
  if (!r) return (ev.inicio >= de && ev.inicio <= ate) ? [ev.inicio] : [];
  const out = [];
  const H = base.getHours(), M = base.getMinutes();
  const em = (a, m, d) => new Date(a, m, d, H, M).getTime();
  if (r.tipo === 'diario' || r.tipo === 'semanal') {
    for (let k = 0; out.length < max && k < 800; k++) {
      const t = em(base.getFullYear(), base.getMonth(), base.getDate() + k);
      if (t > ate) break;
      const dia = new Date(t).getDay();
      if (r.tipo === 'semanal' && !(r.dias || [base.getDay()]).includes(dia)) continue;
      if (t >= de) out.push(t);
    }
  } else if (r.tipo === 'mensal' || r.tipo === 'anual') {
    const passo = r.tipo === 'mensal' ? 1 : 12;
    for (let k = 0; out.length < max && k < 600; k += passo) {
      const d = new Date(base.getFullYear(), base.getMonth() + k, 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (base.getDate() > ultimo) continue; // ex.: dia 31 em mês de 30 dias
      const t = em(d.getFullYear(), d.getMonth(), base.getDate());
      if (t > ate) break;
      if (t >= de) out.push(t);
    }
  }
  return out;
}
// Ocorrências com as exceções aplicadas: dias pulados somem (ou vêm marcados) e dias mudados trocam de horário/duração.
// Cada item: { t, dur (min), chave (dia original), mudado, pulado }
function ocorrenciasDet(ev, de, ate, max = 200, incluirPulados = false) {
  const exc = ev.excecoes || {};
  const temExc = ev.repetir && Object.keys(exc).length;
  // um dia mudado pode ter saído de fora do período: olhamos 2 dias a mais de cada lado
  const folga = temExc ? 2 * 86400000 : 0;
  const out = [];
  for (const t0 of ocorrenciasRegra(ev, de - folga, ate + folga, max + (temExc ? 10 : 0))) {
    const chave = chaveDia(t0), e = temExc ? exc[chave] : null;
    let item = { t: t0, dur: ev.duracao ?? 60, chave, mudado: false, pulado: false };
    if (e?.pular) { if (!incluirPulados) continue; item.pulado = true; }
    else if (e?.inicio) item = { ...item, t: e.inicio, dur: e.duracao ?? item.dur, mudado: true };
    if (item.t >= de && item.t <= ate) out.push(item);
  }
  return out.sort((a, b) => a.t - b.t).slice(0, max);
}
function ocorrencias(ev, de, ate, max = 200) { return ocorrenciasDet(ev, de, ate, max).map(o => o.t); }

// ===== Categorias =====
const CATEGORIAS = [
  { id: 'trabalho', nome: 'Trabalho', cor: '#ffb27a' },
  { id: 'saude', nome: 'Saúde', cor: '#ff8fb8' },
  { id: 'estudo', nome: 'Estudo', cor: '#5fd39b' },
  { id: 'financas', nome: 'Finanças', cor: '#7fc8ff' },
  { id: 'casa', nome: 'Casa', cor: '#e6c35c' },
  { id: 'lazer', nome: 'Lazer', cor: '#ff7a59' },
  { id: 'pessoal', nome: 'Pessoal', cor: '#c3a6ff' },
];
const PALAVRAS_CATEGORIA = {
  trabalho: /\b(trabalho|trabalhar|reuniao|expediente|plantao|cliente|call|escritorio|relatorio|apresentacao|entrega|projeto|chefe|equipe|home office)\b/,
  saude: /\b(medico|medica|dentista|consulta|exame|academia|treino|treinos|handebol|futebol|volei|basquete|corrida|correr|caminhada|yoga|pilates|natacao|remedio|terapia|psicologo|fisioterapia|fisio|nutricionista|vacina|hospital|clinica)\b/,
  estudo: /\b(estudar|estudo|estudos|aula|aulas|prova|curso|tcc|monografia|faculdade|ler|leitura|livro|ingles|espanhol|revisar|trabalho da faculdade|programacao|python)\b/,
  financas: /\b(pagar|pagamento|boleto|banco|conta|contas|fatura|cartao|ipva|iptu|contador|imposto|ir|declaracao|investir|investimento|transferir|pix|salario|reembolso|emprestimo|financiamento|parcela|seguro)\b/,
  casa: /\b(faxina|mercado|supermercado|compras|limpeza|limpar|lavar|roupa|consertar|conserto|reforma|encanador|eletricista|cozinhar|feira|carro|oficina|mecanico|pilhas|luz|agua|energia|aluguel|condominio|internet|gas|telefone|padaria|farmacia|combustivel|gasolina|uber|ifood|restaurante|lanche|almoco)\b/,
  lazer: /\b(cinema|filme|festa|show|jogo|bar|churrasco|viagem|viajar|praia|aniversario|passeio|happy hour|balada|teatro|museu)\b/,
};
function categorizar(titulo, trabalho = false) {
  if (trabalho) return 'trabalho';
  const t = [...String(titulo || '')].map(c => c.toLowerCase().normalize('NFD')[0]).join('');
  for (const [id, re] of Object.entries(PALAVRAS_CATEGORIA)) if (re.test(t)) return id;
  return 'pessoal';
}
const categoriaPorId = id => CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];

// ===== Tarefas: "pagar IPVA até sexta", "ligar pro contador", "comprar pilhas amanhã" =====
function interpretarTarefa(textoOriginal, agora = new Date()) {
  let s = [...textoOriginal].map(c => c.toLowerCase().normalize('NFD')[0]).join('');
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dia = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n).getTime();
  let prazo = null, ini = -1, fim = -1;
  const marca = (m, t) => { prazo = t; ini = m.index; fim = m.index + m[0].length; };
  let m;
  if ((m = /\b(?:ate|para|pra)?\s*(?:o\s+|a\s+)?(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(s))) {
    let a = m[3] ? +m[3] : hoje.getFullYear(); if (a < 100) a += 2000;
    let t = new Date(a, +m[2] - 1, +m[1]).getTime(); if (!m[3] && t < hoje.getTime()) t = new Date(a + 1, +m[2] - 1, +m[1]).getTime();
    marca(m, t);
  } else if ((m = /\b(?:ate|para|pra)\s+(?:o\s+)?dia\s+(\d{1,2})\b/.exec(s))) {
    let t = new Date(hoje.getFullYear(), hoje.getMonth(), +m[1]).getTime(); if (t < hoje.getTime()) t = new Date(hoje.getFullYear(), hoje.getMonth() + 1, +m[1]).getTime();
    marca(m, t);
  } else if ((m = /\b(?:ate|para|pra)?\s*(?:a\s+|o\s+)?(?:proxim[ao]\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?\b/.exec(s))) {
    let n = (SEMANA[m[1]] - hoje.getDay() + 7) % 7; if (n === 0) n = 7;
    marca(m, dia(n));
  } else if ((m = /\b(?:ate\s+)?(?:depois de amanha)\b/.exec(s))) marca(m, dia(2));
  else if ((m = /\b(?:ate\s+)?amanha\b/.exec(s))) marca(m, dia(1));
  else if ((m = /\b(?:ate\s+)?hoje\b/.exec(s))) marca(m, dia(0));
  else if ((m = /\b(?:ate\s+o\s+fim\s+d[oa]\s+|ate\s+o\s+final\s+d[oa]\s+)(semana|mes)\b/.exec(s))) {
    marca(m, m[1] === 'semana' ? dia((7 - hoje.getDay()) % 7) : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getTime());
  }
  let titulo = textoOriginal;
  if (ini >= 0) titulo = (textoOriginal.slice(0, ini) + ' ' + textoOriginal.slice(fim));
  titulo = titulo.replace(/\s+/g, ' ').replace(/^\s*(?:tarefa:?|lembrar de|preciso|tenho que|tenho de)\s+/i, '').replace(/[\s,.;:-]+$/, '').trim();
  if (!titulo) titulo = 'Tarefa';
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  return { titulo, prazo, categoria: categorizar(titulo) };
}

// ===== Tempo livre =====
// Todos os compromissos (com repetições) que encostam no período [de, ate]
function intervalosNoPeriodo(eventos, de, ate) {
  const out = [];
  for (const ev of eventos) {
    for (const o of ocorrenciasDet(ev, de - 16 * 3600000, ate, 400)) {
      const fim = o.t + o.dur * 60000;
      if (fim > de) out.push({ ini: o.t, fim, ev, chave: o.chave, mudado: o.mudado });
    }
  }
  return out.sort((a, b) => a.ini - b.ini);
}
// ===== Conflitos =====
// Compromissos (fora o trabalho) que se sobrepõem a um compromisso novo, nos próximos 60 dias
function conflitosDe(novo, eventos, agora = Date.now()) {
  if (novo.trabalho) return [];
  const outros = eventos.filter(e => e.id !== novo.id && !e.trabalho);
  const res = [];
  for (const o of ocorrenciasDet(novo, agora - 3600000, agora + 60 * 86400000, 40)) {
    const fim = o.t + o.dur * 60000;
    for (const i of intervalosNoPeriodo(outros, o.t, fim)) if (i.ini < fim && i.fim > o.t) res.push({ quando: o.t, fimNovo: fim, ...i });
  }
  return res;
}
// Horários livres (das 7h às 22h) com pelo menos `dur` minutos, entre `aPartirDe` e `ate`.
// Prefere um horário por dia (espalha as sugestões) e depois completa com outros do mesmo dia.
function sugerirHorarios(eventos, aPartirDe, dur, quantos = 3, agora = Date.now(), ate = null) {
  const porDia = [];
  const d0 = new Date(aPartirDe);
  for (let k = 0; k < 14; k++) {
    const dia = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + k);
    if (ate && dia.getTime() > ate) break;
    const iv = intervalosNoPeriodo(eventos, dia.getTime(), dia.getTime() + 86400000);
    const doDia = [];
    for (const [a, b] of livreNoDia(iv, dia).livres) {
      let ini = Math.max(a, agora, aPartirDe);
      ini = Math.ceil(ini / (30 * 60000)) * 30 * 60000; // arredonda para a meia hora
      if (b - ini >= dur * 60000) doDia.push(ini);
    }
    if (doDia.length) porDia.push(doDia);
  }
  const out = porDia.map(l => l[0]).slice(0, quantos);
  for (const l of porDia) for (const t of l.slice(1)) if (out.length < quantos) out.push(t);
  return out.sort((a, b) => a - b);
}
// "preciso de 2h para estudar essa semana" → { titulo, dur, de, ate, periodo }
function interpretarBusca(textoOriginal, agora = new Date()) {
  const s = [...textoOriginal].map(c => c.toLowerCase().normalize('NFD')[0]).join('');
  if (!/\b(preciso|precisava|quero|queria|tenho que|tenho de|achar|encontrar|arrumar|separar|reservar|onde (?:da|cabe)|quando (?:da|posso|consigo))\b/.test(s)) return null;
  const m = new RegExp('\\b' + NUM + '\\s*(h|hs|horas?|min|mins|minutos?)(?![a-z])(?:\\s*(?:e\\s*)?(\\d{1,2}|meia)\\s*(?:min(?:utos)?)?)?').exec(s);
  if (!m) return null;
  let dur = /^h/.test(m[2]) ? paraNumero(m[1]) * 60 : paraNumero(m[1]);
  if (m[3]) dur += m[3] === 'meia' ? 30 : +m[3];
  if (!dur || isNaN(dur)) return null;
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dia = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n);
  const fimDomingo = n => { const d = dia(n); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((7 - d.getDay()) % 7), 23, 59).getTime(); };
  let de = agora.getTime(), ate = dia(7).getTime(), periodo = 'nos próximos 7 dias';
  if (/\b(semana que vem|proxima semana)\b/.test(s)) { const seg = (8 - hoje.getDay()) % 7 || 7; de = dia(seg).getTime(); ate = fimDomingo(seg); periodo = 'na semana que vem'; }
  else if (/\b(essa|esta|nessa|nesta) semana\b/.test(s)) { ate = fimDomingo(0); periodo = 'nesta semana'; }
  else if (/\bamanha\b/.test(s)) { de = dia(1).getTime(); ate = dia(2).getTime() - 1; periodo = 'amanhã'; }
  else if (/\bhoje\b/.test(s)) { ate = dia(1).getTime() - 1; periodo = 'hoje'; }
  else if (/\bate (?:a |o )?(segunda|terca|quarta|quinta|sexta|sabado|domingo)/.test(s)) {
    const alvo = SEMANA[/\bate (?:a |o )?(segunda|terca|quarta|quinta|sexta|sabado|domingo)/.exec(s)[1]];
    const n = (alvo - hoje.getDay() + 7) % 7; ate = dia(n + 1).getTime() - 1; periodo = 'até ' + ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][alvo];
  }
  else if (/\bfim de semana\b/.test(s)) { const sab = (6 - hoje.getDay() + 7) % 7; de = Math.max(agora.getTime(), dia(sab).getTime()); ate = dia(sab + 2).getTime() - 1; periodo = 'no fim de semana'; }
  // o que fazer: palavras depois de "para"/"pra", até chegar numa palavra de tempo
  const resto = s.slice(m.index + m[0].length);
  const p = /\b(?:para|pra)\s+(.+)$/.exec(resto) || /\b(?:para|pra)\s+(.+)$/.exec(s);
  let titulo = 'Compromisso';
  if (p) {
    const PARA = new Set(['essa', 'esta', 'nessa', 'nesta', 'semana', 'amanha', 'hoje', 'fim', 'ate', 'proxima', 'que', 'no', 'na', 'de', 'em', 'durante', 'entre']);
    const palavras = p[1].split(/\s+/);
    const usadas = [];
    for (const w of palavras) { const limpa = w.replace(/[^a-z]/g, ''); if (!limpa || PARA.has(limpa) && usadas.length) break; usadas.push(w); if (usadas.length >= 4) break; }
    const trecho = usadas.join(' ').replace(/[,.;!?]+$/, '');
    const ini = s.indexOf(trecho, s.indexOf(p[1]));
    const orig = ini >= 0 ? textoOriginal.substr(ini, trecho.length) : trecho;
    if (orig) titulo = orig.charAt(0).toUpperCase() + orig.slice(1);
  }
  return { titulo, dur, de, ate, periodo };
}
// Horas livres de um dia, das 7h às 22h, sem contar o tempo de trabalho
const JANELA_INI = 7, JANELA_FIM = 22, JANELA_MIN = (JANELA_FIM - JANELA_INI) * 60;
function uniao(lista, a, b) {
  const out = [];
  for (const [i0, f0] of lista.map(([x, y]) => [Math.max(x, a), Math.min(y, b)]).filter(([x, y]) => y > x).sort((p, q) => p[0] - q[0])) {
    const ult = out[out.length - 1];
    if (ult && i0 <= ult[1]) ult[1] = Math.max(ult[1], f0); else out.push([i0, f0]);
  }
  return out;
}
const soma = l => l.reduce((t, [x, y]) => t + (y - x) / 60000, 0);
function livreNoDia(intervalos, dia) {
  const a = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), JANELA_INI).getTime();
  const b = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), JANELA_FIM).getTime();
  const trab = uniao(intervalos.filter(i => i.ev.trabalho).map(i => [i.ini, i.fim]), a, b);
  const outros = uniao(intervalos.filter(i => !i.ev.trabalho).map(i => [i.ini, i.fim]), a, b);
  const tudo = uniao([...trab, ...outros], a, b);
  const livres = []; let cursor = a;
  for (const [x, y] of tudo) { if (x > cursor) livres.push([cursor, x]); cursor = Math.max(cursor, y); }
  if (cursor < b) livres.push([cursor, b]);
  const trabalhoMin = soma(trab);
  // passa das 22h: algum compromisso (fora o trabalho) que continua depois das 22h deste dia
  const meiaNoite = a + (24 - JANELA_INI) * 3600000;
  const passa22 = intervalos.some(i => !i.ev.trabalho && i.fim > b && i.ini < meiaNoite);
  return { livreMin: JANELA_MIN - soma(tudo), disponivelMin: JANELA_MIN - trabalhoMin, trabalhoMin, temOutros: outros.length > 0 || passa22, passa22, livres };
}
// Cores do calendário
// - laranja: dia útil só com o trabalho marcado
// - escala contínua "Noite e âmbar": dia livre se mistura ao fundo escuro; quanto mais ocupado, mais acende (âmbar → vermelho)
// - vermelho mais forte: algum compromisso passa das 22h
const ESCALA = [[0, [42, 47, 61]], [0.16, [63, 74, 74]], [0.33, [107, 106, 58]], [0.5, [168, 132, 46]], [0.66, [224, 166, 42]], [0.82, [255, 122, 61]], [0.96, [255, 77, 77]], [1, [255, 46, 77]]];
function corEscala(f) {
  f = Math.max(0, Math.min(1, f));
  for (let i = 1; i < ESCALA.length; i++) {
    const [a, ca] = ESCALA[i - 1], [b, cb] = ESCALA[i];
    if (f <= b) { const t = (f - a) / (b - a); return ca.map((v, k) => Math.round(v + (cb[k] - v) * t)); }
  }
  return ESCALA[ESCALA.length - 1][1];
}
function corDoDia(info) {
  // Estilo A (1.8): a cor depende só das horas livres das 7h às 22h, contando o trabalho como ocupado
  if (typeof info === 'number') info = { livreMin: info, trabalhoMin: 0, passa22: false };
  if (info.passa22) return { tipo: 'noite', ocupacao: 1, rgb: corEscala(1), trabalho: info.trabalhoMin > 0 };
  const ocupacao = Math.max(0, Math.min(1, (JANELA_MIN - info.livreMin) / JANELA_MIN));
  return { tipo: 'escala', ocupacao, rgb: corEscala(ocupacao * 0.96), trabalho: info.trabalhoMin > 0 };
}
// Texto escuro em fundo claro e branco em fundo escuro
function tintaPara(rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 150 ? '#1e1a2b' : '#ffffff'; }

if (typeof module !== 'undefined') module.exports = { interpretar, interpretarBusca, interpretarTarefa, categorizar, CATEGORIAS, ocorrencias, ocorrenciasDet, chaveDia, intervalosNoPeriodo, livreNoDia, corDoDia, corEscala, tintaPara, conflitosDe, sugerirHorarios };
