
// =====================================================================
// 1.14 · Hábitos com medida: sim/não, quantidade (copos, páginas…), tempo e evitar
// =====================================================================
// Campos: tipo ('sim' | 'qtd' | 'tempo' | 'evitar'), unidade ('ml', 'páginas', 'min', …), meta (por dia),
// medidas [{ nome, valor, emoji }], regs { 'AAAA-MM-DD': [{ t, v }] }, falhas { dia: true } (evitar),
// feitos { dia: true } (meta batida ou marcado), lembrete ('hora' | 'intervalo'), intervalo (min), lembIni/lembFim.
let habSel = null;
const tipoHab = h => h?.tipo || 'sim';
const somaRegs = l => (l || []).reduce((s, r) => s + r.v, 0);
const totalHab = (h, ch) => somaRegs(h.regs?.[ch]);
function feitoHab(h, ch) {
  if (tipoHab(h) === 'evitar') return !h.falhas?.[ch] && (!h.criado || ch >= chaveDia(h.criado)) && ch <= hojeChave();
  return !!h.feitos?.[ch];
}
// marca, desmarca ou soma (valor numérico); devolve o registro criado, se houver
function marcarHabito(h, ch, valor) {
  const tipo = tipoHab(h);
  h.feitos = h.feitos || {};
  if (tipo === 'evitar') { h.falhas = h.falhas || {}; if (valor === 'falha') h.falhas[ch] = !h.falhas[ch] || undefined; else if (valor === false) h.falhas[ch] = true; else if (valor === true) delete h.falhas[ch]; if (!h.falhas[ch]) delete h.falhas[ch]; return null; }
  if ((tipo === 'qtd' || tipo === 'tempo') && typeof valor === 'number') {
    h.regs = h.regs || {}; const reg = { t: Date.now(), v: valor }; (h.regs[ch] = h.regs[ch] || []).push(reg);
    if (totalHab(h, ch) >= (h.meta || Infinity)) h.feitos[ch] = true; else delete h.feitos[ch];
    return reg;
  }
  const v = valor === undefined ? !h.feitos[ch] : !!valor;
  if (v) h.feitos[ch] = true; else delete h.feitos[ch];
  if (!v && (tipo === 'qtd' || tipo === 'tempo') && h.regs) delete h.regs[ch];
  if (v && (tipo === 'qtd' || tipo === 'tempo') && totalHab(h, ch) < (h.meta || 0)) { h.regs = h.regs || {}; (h.regs[ch] = h.regs[ch] || []).push({ t: Date.now(), v: h.meta - totalHab(h, ch) }); }
  return null;
}
function desfazerRegHab(h, ch, t) {
  const l = h.regs?.[ch]; if (!l || !l.length) return;
  const i = t ? l.findIndex(r => r.t === t) : l.length - 1; if (i < 0) return;
  l.splice(i, 1); if (totalHab(h, ch) >= (h.meta || Infinity)) h.feitos[ch] = true; else if (h.feitos) delete h.feitos[ch];
}
// o toque rápido de cada tipo (cartões no Hoje, Pessoal › Hoje e revisão)
function tocarHabito(h, ch = hojeChave()) {
  const tipo = tipoHab(h);
  if (tipo === 'qtd' || tipo === 'tempo') { const m = h.medidas?.[0]; const v = m?.valor || (tipo === 'tempo' ? 10 : 1); marcarHabito(h, ch, v); try { toast('+' + fmtQtd(v, h.unidade) + ' · ' + fmtQtd(totalHab(h, ch), h.unidade) + ' de ' + fmtQtd(h.meta, h.unidade)); } catch {} return; }
  if (tipo === 'evitar') { marcarHabito(h, ch, 'falha'); return; }
  marcarHabito(h, ch);
}
function fmtQtd(v, un, curto) {
  v = Math.round((v || 0) * 100) / 100;
  if (un === 'ml') return v >= 1000 || curto ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace('.', ',') + (curto ? '' : ' L') : v + ' ml';
  if (un === 'min') return curto ? String(Math.round(v)) : fmtLivre(v);
  const n = String(v).replace('.', ',');
  return curto || !un ? n : n + ' ' + un;
}
const EMOJI_MEDIDA = (nome, v) => /copo|x[ií]cara/i.test(nome) ? '🥛' : /garraf/i.test(nome) ? (v >= 1000 ? '🧴' : '🍶') : /p[aá]g/i.test(nome) ? '📖' : /min/i.test(nome) ? '⏱' : '＋';
function lerMedidas(txt, un) {
  return String(txt || '').split(/[;\n]+/).map(p => p.trim()).filter(Boolean).map(p => {
    const m = /^(.*?)[\s=:]+(\d+(?:[.,]\d+)?)\s*(ml|l|litros?|min|p[aá]g\w*)?$/i.exec(p); if (!m) return null;
    let v = parseFloat(m[2].replace(',', '.')); if (/^l/i.test(m[3] || '') && un === 'ml') v *= 1000;
    const nome = maiuscula(m[1].trim() || 'Medida'); return { nome, valor: v, emoji: EMOJI_MEDIDA(nome, v) };
  }).filter(Boolean);
}
const txtMedidas = h => (h.medidas || []).map(m => m.nome + ' = ' + (h.unidade === 'ml' && m.valor >= 1000 ? (m.valor / 1000).toString().replace('.', ',') + ' L' : m.valor)).join('; ');
// ritmo ideal: quanto já deveria ter sido feito a esta hora (entre o início e o fim dos lembretes)
function idealAgora(h, agora = Date.now()) {
  if (!h.meta) return null; const d = new Date(agora), min = d.getHours() * 60 + d.getMinutes();
  const ini = minDeHora(h.lembIni || '08:00'), fim = minDeHora(h.lembFim || '20:00');
  return h.meta * Math.max(0, Math.min(1, (min - ini) / Math.max(1, fim - ini)));
}
// “bebi 2 copos”, “tomei uma garrafa de 1 litro”, “500 ml de água”
const NUM_PAL = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, meio: 0.5, meia: 0.5 };
function lerMedidaHabito(texto) {
  const t = finTxt(texto), qs = pes.habitos.filter(h => tipoHab(h) === 'qtd' && h.medidas?.length);
  if (!qs.length) return null;
  const qtd = s => { const m = /(\d+(?:[.,]\d+)?)\s*$/.exec(s) || /\b(um|uma|dois|duas|tres|quatro|cinco|seis|meio|meia)\s*$/.exec(s); return m ? (NUM_PAL[m[1]] ?? parseFloat(m[1].replace(',', '.'))) : 1; };
  const vol = /(\d+(?:[.,]\d+)?)\s*(ml|l|litros?)\b/.exec(t);
  for (const h of qs) {
    const nomeH = finTxt(h.nome);
    for (const m of h.medidas.slice().sort((a, b) => b.nome.length - a.nome.length)) {
      const base = finTxt(m.nome).replace(/s$/, ''), i = t.search(new RegExp('\\b' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b'));
      if (i < 0) continue;
      let med = m;
      if (vol) { const v = parseFloat(vol[1].replace(',', '.')) * (/^l/.test(vol[2]) ? 1000 : 1); med = h.medidas.find(x => finTxt(x.nome).startsWith(base) && Math.abs(x.valor - v) < 1) || { ...m, valor: v }; }
      return { h, valor: med.valor * qtd(t.slice(0, i).trim()), medida: med };
    }
    if (vol && h.unidade === 'ml' && (t.includes(nomeH) || /agua|beb/.test(t))) return { h, valor: parseFloat(vol[1].replace(',', '.')) * (/^l/.test(vol[2]) ? 1000 : 1) };
  }
  return null;
}
// lembretes por intervalo (só se estiver atrás do ritmo) com botões +1 na notificação
function avisosHabitosQtd() {
  const out = [], agora = new Date();
  for (const h of pes.habitos.filter(x => (tipoHab(x) === 'qtd' || tipoHab(x) === 'tempo') && x.lembrete === 'intervalo')) {
    const passo = h.intervalo || 90, ini = minDeHora(h.lembIni || '08:00'), fim = minDeHora(h.lembFim || '20:00');
    for (let k = 0; k < 2; k++) {
      const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k), ch = chaveDia(dia.getTime());
      if (!(h.dias || [0, 1, 2, 3, 4, 5, 6]).includes(dia.getDay()) || (k === 0 && feitoHab(h, ch))) continue;
      for (let m = ini + passo; m <= fim; m += passo) {
        const at = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(m / 60), m % 60);
        if (at <= agora) continue;
        if (k === 0 && totalHab(h, ch) >= idealAgora(h, at.getTime()) - 0.001) continue; // já está no ritmo dessa hora
        out.push({ id: idNumerico('habq#' + h.id + '#' + ch + '#' + m), title: (h.emoji || '✅') + ' ' + (h.unidade === 'ml' ? 'Hora de beber água' : h.nome), body: (k === 0 ? fmtQtd(totalHab(h, ch), h.unidade) + ' de ' + fmtQtd(h.meta, h.unidade) + ' · o ideal agora é ' + fmtQtd(idealAgora(h, at.getTime()), h.unidade) : 'Meta de ' + fmtQtd(h.meta, h.unidade) + ' hoje'), actionTypeId: 'hq-' + h.id, schedule: { at, allowWhileIdle: true }, extra: { habito: h.id, chave: ch } });
      }
    }
  }
  return out;
}
function tiposNotifHabitos() { return pes.habitos.filter(h => (tipoHab(h) === 'qtd' || tipoHab(h) === 'tempo') && h.medidas?.length).map(h => ({ id: 'hq-' + h.id, actions: h.medidas.slice(0, 2).map((m, i) => ({ id: 'm' + i, title: '+' + (tipoHab(h) === 'tempo' ? '' : i === 0 ? '1 ' : ' ') + m.nome.toLowerCase() })).concat([{ id: 'depois', title: 'Mais tarde' }]) })); }
async function somarPelaNotif(h, i) {
  const m = h.medidas?.[i]; if (!m) return; const ch = hojeChave();
  marcarHabito(h, ch, m.valor); await salvarPes(); agendarAvisosPessoalDepois();
  try { await agendarNotif([{ id: idNumerico('habq#ok#' + h.id), title: '✓ +' + fmtQtd(m.valor, h.unidade) + ' registrado', body: h.nome + ' ' + fmtQtd(totalHab(h, ch), h.unidade) + ' de ' + fmtQtd(h.meta, h.unidade), schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true }, extra: { habito: h.id, info: true } }]); } catch {}
  if (tela === 'pessoal' || tela === 'home') atualizarTudo();
}
// anel de progresso
function anelHTML(pct, tam, cor = 'var(--accent)', esp = 7, centro = '') {
  const r = (tam - esp) / 2, c = 2 * Math.PI * r;
  return '<span class="anel" style="width:' + tam + 'px;height:' + tam + 'px"><svg width="' + tam + '" height="' + tam + '"><circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="#222" stroke-width="' + esp + '"/><circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="' + cor + '" stroke-width="' + esp + '" stroke-linecap="round" stroke-dasharray="' + (c * Math.min(1, Math.max(0, pct))).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + tam / 2 + ' ' + tam / 2 + ')"/></svg><span class="c">' + centro + '</span></span>';
}
const COR_TIPO = { sim: 'var(--accent)', qtd: 'var(--accent)', tempo: '#ff8fb8', evitar: '#ffb27a' };
function diasSemFalha(h) { let n = 0, t = inicioDoDia(Date.now()).getTime(); for (let k = 0; k < 1000; k++) { const ch = chaveDia(t); if (h.criado && t < inicioDoDia(h.criado).getTime()) break; if (h.falhas?.[ch]) break; n++; t = maisDias(t, -1); } return n; }
function recordeSemFalha(h) { let best = 0, cur = 0, t = h.criado ? inicioDoDia(h.criado).getTime() : maisDias(Date.now(), -365); const fim = inicioDoDia(Date.now()).getTime(); while (t <= fim) { if (h.falhas?.[chaveDia(t)]) cur = 0; else best = Math.max(best, ++cur); t = maisDias(t, 1); } return best; }
// ----- tela -----
function cartaoHabHTML(x) {
  const ch = hojeChave(), tipo = tipoHab(x), hoje = (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(new Date().getDay());
  let pct, sub, st = '', bt;
  if (tipo === 'qtd' || tipo === 'tempo') {
    const tot = totalHab(x, ch); pct = x.meta ? tot / x.meta : 0; const id = idealAgora(x);
    sub = fmtQtd(tot, x.unidade) + ' de ' + fmtQtd(x.meta, x.unidade) + (x.medidas?.[0] && tipo === 'qtd' ? ' · ' + Math.floor(tot / x.medidas[0].valor) + ' de ' + Math.ceil(x.meta / x.medidas[0].valor) + ' ' + x.medidas[0].nome.toLowerCase() + 's' : '');
    if (feitoHab(x, ch)) st = '<span class="st ok">meta batida 🎉</span>'; else if (id !== null && tot < id * 0.85 && id > 0) st = '<span class="st at">um pouco atrás: o ideal agora é ' + fmtQtd(id, x.unidade) + '</span>';
    const m = x.medidas?.[0]; bt = tipo === 'tempo' ? '<button type="button" class="hb-mais" data-ph="crono" style="background:#ff8fb8">▶ ' + fmtQtd(Math.max(1, (x.meta || 0) - tot), 'min') + '</button>' : '<button type="button" class="hb-mais" data-ph="somar" data-i="0"' + (hoje ? '' : ' disabled') + '>+1 ' + esc((m?.nome || '').toLowerCase()) + '<small>' + (m ? fmtQtd(m.valor, x.unidade) : '') + '</small></button>';
  } else if (tipo === 'evitar') {
    const n = diasSemFalha(x); pct = Math.min(1, n / Math.max(7, recordeSemFalha(x))); sub = 'evitar · ' + n + (n === 1 ? ' dia seguido' : ' dias seguidos'); st = '<span class="st">recorde: ' + recordeSemFalha(x) + ' dias</span>';
    bt = '<button type="button" class="hb-falha' + (x.falhas?.[ch] ? ' on' : '') + '" data-ph="falha">' + (x.falhas?.[ch] ? 'Escorreguei hoje' : 'Escorreguei') + '</button>';
  } else {
    const f = feitoHab(x, ch); pct = f ? 1 : 0; sub = 'sim ou não' + (hoje ? '' : ' · hoje não');
    st = '<span class="st ok">🔥 sequência de ' + sequenciaHabito(x) + (sequenciaHabito(x) === 1 ? ' dia' : ' dias') + '</span>';
    bt = '<button type="button" class="ck' + (f ? ' ok' : '') + '" data-ph="marcar"' + (hoje ? '' : ' disabled') + '>' + (f ? '✓' : '') + '</button>';
  }
  return '<div class="hcard" data-hab="' + esc(x.id) + '"><button type="button" class="hc-abre" data-ph="abrir">' + anelHTML(pct, 50, COR_TIPO[tipo], 6, '<span style="font-size:17px">' + esc(x.emoji || '✓') + '</span>') + '<span class="tt"><b>' + esc(x.nome) + '</b><small>' + sub + '</small>' + st + '</span></button>' + bt + '</div>';
}
function renderHabitos() {
  const box = $('p-habitos');
  if (habSel) { const x = pes.habitos.find(h => h.id === habSel); if (x) { box.innerHTML = detalheHabHTML(x); return; } habSel = null; }
  const hj = new Date().getDay(), doDia = pes.habitos.filter(x => (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(hj));
  let h = '';
  if (!pes.habitos.length) h = '<div class="empty"><b>Nenhum hábito ainda.</b><br>Crie hábitos de <b>sim ou não</b> (meditar), de <b>quantidade</b> (água em copos de 300 ml, páginas), de <b>tempo</b> (caminhar 30 min) ou para <b>evitar</b> (doce). Toque no botão de cada um para registrar.</div>';
  else {
    h += '<div class="hb-top"><span class="rot">Hoje · ' + doDia.filter(x => feitoHab(x, hojeChave())).length + ' de ' + doDia.length + ' completos</span><b>🔥 ' + (n => n + (n === 1 ? ' dia' : ' dias'))(Math.max(0, ...pes.habitos.filter(x => tipoHab(x) !== 'evitar').map(sequenciaHabito))) + '</b></div>';
    h += pes.habitos.map(cartaoHabHTML).join('');
  }
  box.innerHTML = h + '<div class="actions"><button type="button" class="btn primary" data-ph="novo">+ Novo hábito</button></div><p class="dica">Pelo chat também: “bebi 2 copos”, “fiz meditação”, “li 10 páginas”.</p>';
}
function detalheHabHTML(x) {
  const ch = hojeChave(), tipo = tipoHab(x), ini = maisDias(inicioDoDia(Date.now()).getTime(), -6);
  let h = '<button type="button" class="volta-lista" data-ph="lista">‹ Hábitos</button><div class="hd-tit">' + esc((x.emoji ? x.emoji + ' ' : '') + x.nome) + '<small>' + ({ sim: 'sim ou não', qtd: 'meta de ' + fmtQtd(x.meta, x.unidade) + ' por dia', tempo: 'meta de ' + fmtQtd(x.meta, 'min') + ' por dia', evitar: 'evitar' })[tipo] + '</small></div>';
  if (tipo === 'qtd' || tipo === 'tempo') {
    const tot = totalHab(x, ch), id = idealAgora(x);
    h += '<div class="hd-anel">' + anelHTML(x.meta ? tot / x.meta : 0, 150, COR_TIPO[tipo], 13, '<b>' + fmtQtd(tot, x.unidade) + '</b><small>de ' + fmtQtd(x.meta, x.unidade) + ' · ' + Math.round(x.meta ? tot / x.meta * 100 : 0) + '%</small>') + '</div>';
    h += '<div class="hd-bts">' + (x.medidas || []).slice(0, 3).map((m, i) => '<button type="button" class="' + (i === 0 ? 'p' : '') + '" data-ph="somar" data-i="' + i + '">+ ' + esc(m.nome) + '<small>' + fmtQtd(m.valor, x.unidade) + '</small></button>').join('') + '<button type="button" data-ph="outro">Outro<small>valor</small></button>' + (tipo === 'tempo' ? '<button type="button" data-ph="crono">▶<small>cronômetro</small></button>' : '') + '</div>';
    if (id !== null && !feitoHab(x, ch)) { const fimM = minDeHora(x.lembFim || '20:00'), agoraM = new Date().getHours() * 60 + new Date().getMinutes(), horas = Math.max(0.5, (fimM - agoraM) / 60), falta = Math.max(0, x.meta - tot); h += '<div class="campo-c"><div><small>Ritmo</small><b>ideal agora ' + fmtQtd(id, x.unidade) + ' · faltam ' + fmtQtd(falta, x.unidade) + '</b></div><span>até ' + (x.lembFim || '20:00') + '<br>' + (x.medidas?.[0] && fimM > agoraM ? '≈ ' + String(Math.round(falta / x.medidas[0].valor / horas * 10) / 10).replace('.', ',') + ' ' + x.medidas[0].nome.toLowerCase() + 's/h' : '') + '</span></div>'; }
    const regs = (x.regs?.[ch] || []).slice().sort((a, b) => a.t - b.t); let ac = 0;
    h += '<div class="grp">Hoje</div>' + (regs.length ? regs.map(r => { ac += r.v; const m = (x.medidas || []).find(mm => mm.valor === r.v); return '<div class="tlh"><span>' + fmtHora(new Date(r.t)) + '</span><b>' + (m ? m.emoji + ' ' + esc(m.nome) + ' · ' : '') + fmtQtd(r.v, x.unidade) + '</b><span>' + fmtQtd(ac, x.unidade) + '</span></div>'; }).join('') + '<button type="button" class="volta-lista" data-ph="desfazer">↶ Desfazer o último</button>' : '<p class="txt" style="color:var(--muted)">Nada registrado hoje.</p>');
    const vals = [...Array(7)].map((_, k) => { const t = maisDias(ini, k); return [t, totalHab(x, chaveDia(t))]; }), mx = Math.max(x.meta || 1, ...vals.map(v => v[1])) * 1.1;
    h += '<div class="grp">Últimos 7 dias · meta ' + fmtQtd(x.meta, x.unidade) + '</div><div class="b7">' + vals.map(([t, v]) => '<div><i class="' + (v >= (x.meta || Infinity) ? 'ok' : '') + '" style="height:' + Math.max(3, v / mx * 74).toFixed(0) + 'px"></i><small>' + DIAS_CURTO[new Date(t).getDay()] + '</small></div>').join('') + '<i class="b7-meta" style="bottom:' + ((x.meta || 0) / mx * 74 + 16).toFixed(0) + 'px"></i></div>';
    const med = vals.reduce((s, v) => s + v[1], 0) / 7, bat = vals.filter(v => v[1] >= (x.meta || Infinity)).length;
    h += '<div class="vals" style="margin-top:6px"><span>média <b>' + fmtQtd(med, x.unidade) + '</b></span><span>meta batida <b>' + bat + ' de 7</b></span><span>🔥 <b>' + sequenciaHabito(x) + '</b></span></div>';
  } else if (tipo === 'evitar') {
    h += '<div class="hd-anel">' + anelHTML(Math.min(1, diasSemFalha(x) / Math.max(7, recordeSemFalha(x))), 150, COR_TIPO.evitar, 13, '<b>' + diasSemFalha(x) + '</b><small>dias seguidos</small>') + '</div><div class="vals"><span>recorde <b>' + recordeSemFalha(x) + ' dias</b></span><span>escorregões no mês <b>' + Object.keys(x.falhas || {}).filter(k => k.slice(0, 7) === ch.slice(0, 7)).length + '</b></span></div>';
    h += '<div class="actions"><button type="button" class="btn' + (x.falhas?.[ch] ? ' primary' : '') + '" data-ph="falha">' + (x.falhas?.[ch] ? 'Desfazer escorregão de hoje' : 'Escorreguei hoje') + '</button></div>';
  } else {
    h += '<div class="hd-anel">' + anelHTML(feitoHab(x, ch) ? 1 : 0, 150, COR_TIPO.sim, 13, '<b>' + sequenciaHabito(x) + '</b><small>dias seguidos</small>') + '</div><div class="actions"><button type="button" class="btn primary" data-ph="marcar">' + (feitoHab(x, ch) ? 'Desmarcar hoje' : '✓ Feito hoje') + '</button></div>';
  }
  if (tipo !== 'qtd' && tipo !== 'tempo') h += '<div class="grp">Semana</div><div class="sem7">' + [...Array(7)].map((_, k) => { const t = maisDias(ini, k), c = chaveDia(t); return '<span class="' + (feitoHab(x, c) ? 'f' : t < inicioDoDia(Date.now()).getTime() ? 'x' : '') + (c === ch ? ' hj' : '') + '">' + DIAS_CURTO[new Date(t).getDay()][0] + '</span>'; }).join('') + '</div>';
  h += '<div class="actions" style="margin-top:14px"><button type="button" class="btn" data-ph="editar">Editar hábito</button></div>';
  return h;
}
$('p-habitos').addEventListener('click', e => cliqueCartaoHab(e, renderHabitos));
// cliques nos cartões de hábito (Pessoal › Hábitos e Pessoal › Hoje)
async function cliqueCartaoHab(e, redesenhar) {
  const b = e.target.closest('[data-ph]'); if (!b) return;
  const el = b.closest('[data-hab]'), x = pes.habitos.find(h => h.id === (el ? el.dataset.hab : habSel)), ch = hojeChave(), a = b.dataset.ph;
  if (a === 'novo') { formHabito(null); return; }
  if (a === 'lista') { habSel = null; renderHabitos(); return; }
  if (!x) return;
  if (a === 'abrir') { habSel = x.id; if (pesAba !== 'habitos') { pesAba = 'habitos'; renderPessoal(); } else renderHabitos(); $('p-habitos').scrollTop = 0; return; }
  if (a === 'editar') { formHabito(x); return; }
  if (a === 'marcar') marcarHabito(x, ch);
  if (a === 'somar') { const m = x.medidas?.[+b.dataset.i]; if (m) { marcarHabito(x, ch, m.valor); toast('+' + fmtQtd(m.valor, x.unidade)); } }
  if (a === 'desfazer') desfazerRegHab(x, ch);
  if (a === 'falha') { if (!x.falhas?.[ch] && !b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Confirmar?'; return; } marcarHabito(x, ch, 'falha'); }
  if (a === 'crono') { await iniciarCrono({ evId: null, chave: null, titulo: x.nome, categoria: 'saude', habitoId: x.id }); toast('▶ Cronometrando ' + x.nome); }
  if (a === 'outro') { abrirForm('Registrar · ' + x.nome, [{ k: 'v', rot: 'Quanto (' + (x.unidade || 'unidades') + ')', tipo: 'num', ph: x.unidade === 'ml' ? '250' : '' }], async d => { const v = numOu(d.v, 0); if (!v) return false; marcarHabito(x, ch, v); await salvarPes(); agendarAvisosPessoalDepois(); redesenhar(); }); return; }
  await salvarPes(); agendarAvisosPessoalDepois(); redesenhar();
}
const UNIDADES = [['ml', 'ml (água)'], ['páginas', 'páginas'], ['min', 'minutos'], ['vezes', 'vezes'], ['passos', 'passos'], ['km', 'km'], ['g', 'gramas']];
function formHabito(x) {
  abrirForm(x ? 'Editar hábito' : 'Novo hábito', [
    { k: 'nome', rot: 'Nome', v: x?.nome, ph: 'Ex.: Água' }, { k: 'emoji', rot: 'Emoji (opcional)', v: x?.emoji, ph: '💧' },
    { k: 'tipo', rot: 'Tipo', tipo: 'select', v: tipoHab(x), ops: [['sim', '✓ Sim ou não (meditar, tomar sol)'], ['qtd', '🔢 Quantidade (água, páginas, passos)'], ['tempo', '⏱ Tempo (caminhar, alongar)'], ['evitar', '🚫 Evitar (doce, cigarro, redes)']] },
    { k: 'unidade', rot: 'Unidade (quantidade)', tipo: 'select', v: x?.unidade || 'ml', ops: UNIDADES },
    { k: 'meta', rot: 'Meta por dia (ex.: 5000 ml = 5 L; 30 min)', tipo: 'num', v: x?.meta ?? '', ph: '5000' },
    { k: 'medidas', rot: 'Medidas rápidas (nome = valor; separadas por ;)', v: x ? txtMedidas(x) : 'Copo = 300; Garrafa = 500; Garrafa grande = 1 L', ph: 'Copo = 300; Garrafa = 500' },
    { k: 'dias', rot: 'Dias', tipo: 'dias', v: x?.dias || [0, 1, 2, 3, 4, 5, 6] },
    { k: 'lembrete', rot: 'Lembrete', tipo: 'select', v: x?.lembrete || (x?.hora ? 'hora' : 'nao'), ops: [['nao', 'Sem lembrete'], ['hora', 'Num horário fixo'], ['intervalo', 'A cada intervalo, só se estiver atrasado']] },
    { k: 'hora', rot: 'Horário fixo', tipo: 'time', v: x?.hora || '20:00' },
    { k: 'intervalo', rot: 'Intervalo', tipo: 'select', v: x?.intervalo || 90, ops: [[60, 'a cada 1 hora'], [90, 'a cada 1h30'], [120, 'a cada 2 horas'], [180, 'a cada 3 horas']] },
    { k: 'lembIni', rot: 'Das', tipo: 'time', v: x?.lembIni || '08:00' }, { k: 'lembFim', rot: 'Até', tipo: 'time', v: x?.lembFim || '20:00' },
  ], async d => {
    if (!d.nome) return false;
    const tipo = d.tipo, un = tipo === 'tempo' ? 'min' : tipo === 'qtd' ? d.unidade : null;
    let meta = numOu(d.meta, 0); if (tipo === 'qtd' && un === 'ml' && meta > 0 && meta <= 20) meta *= 1000; // “5” vira 5 L
    if ((tipo === 'qtd' || tipo === 'tempo') && !meta) { mostrarDialogo('Falta a meta', '<p>Diga a meta por dia, como <b>5000</b> (ml) ou <b>30</b> (minutos).</p>'); return false; }
    const medidas = tipo === 'qtd' ? lerMedidas(d.medidas, un) : tipo === 'tempo' ? [{ nome: '10 min', valor: 10, emoji: '⏱' }] : [];
    const dados = { nome: d.nome, emoji: d.emoji || (un === 'ml' ? '💧' : ''), tipo, unidade: un, meta: meta || null, medidas, dias: d.dias.length ? d.dias : [0, 1, 2, 3, 4, 5, 6], lembrete: d.lembrete === 'nao' ? null : d.lembrete, hora: d.lembrete === 'hora' ? d.hora : null, intervalo: +d.intervalo || 90, lembIni: d.lembIni || '08:00', lembFim: d.lembFim || '20:00' };
    if (x) Object.assign(x, dados); else pes.habitos.push({ id: novoId(), ...dados, feitos: {}, regs: {}, falhas: {}, criado: Date.now() });
    await salvarPes(); await registrarTiposNotif(); agendarAvisosPessoalDepois(); renderHabitos();
  }, { excluir: x ? async () => { pes.habitos = pes.habitos.filter(h => h.id !== x.id); habSel = null; await salvarPes(); agendarAvisosPessoalDepois(); renderHabitos(); } : null });
}
