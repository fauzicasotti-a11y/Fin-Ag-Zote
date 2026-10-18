
// =====================================================================
// 1.12 · Agenda › Semana · gráfico do patrimônio · Pessoal › Hoje
// =====================================================================

// ----- Agenda › Semana -----
let semRef = null; // segunda-feira da semana mostrada
function renderSemanaAg() {
  if (!semRef) semRef = inicioSemana(Date.now());
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime();
  const dias = [...Array(7)].map((_, k) => maisDias(semRef, k));
  const fimSem = maisDias(semRef, 7);
  const iv = intervalosNoPeriodo(eventos, semRef, fimSem);
  // faixa de horas: janela das horas livres, ampliada se algum compromisso sair dela
  let hIni = config.janelaIni ?? 7, hFim = config.janelaFim ?? 22;
  for (const i of iv) {
    const d0 = inicioDoDia(i.ini).getTime(); if (i.ev.trabalho && (i.fim - i.ini) > 13 * 3600000) continue;
    hIni = Math.min(hIni, Math.floor((Math.max(i.ini, d0) - d0) / 3600000));
    hFim = Math.max(hFim, Math.min(24, Math.ceil((Math.min(i.fim, d0 + 86400000) - d0) / 3600000)));
  }
  const PX = 34, alt = (hFim - hIni) * PX; semGeo = { dias, hIni, hFim, PX };
  const iniD = new Date(semRef), fimD = new Date(maisDias(semRef, 6));
  const atual = semRef === inicioSemana(agora);
  $('subAgenda').textContent = 'semana ' + iniD.getDate() + (iniD.getMonth() !== fimD.getMonth() ? ' ' + MESES_N[iniD.getMonth()] : '') + ' a ' + fimD.getDate() + ' ' + MESES_N[fimD.getMonth()] + (atual ? ' · esta semana' : '');
  let livreTot = 0, nComp = 0, maisLivre = null;
  let cab = '<div class="sg-cab"><span></span>', cols = '';
  for (const t of dias) {
    const d = new Date(t), info = livreNoDia(intervalosNoPeriodo(eventos, t, t + 86400000), d);
    livreTot += info.livreMin; if (!maisLivre || info.livreMin > maisLivre.min) maisLivre = { t, min: info.livreMin };
    cab += '<button type="button" class="' + (t === hoje0 ? 'hj' : '') + (t < hoje0 ? ' pas' : '') + '" data-sd="' + t + '"><small>' + DIAS_CURTO[d.getDay()] + '</small><b>' + d.getDate() + '</b><i>' + fmtLivre(info.livreMin) + '</i></button>';
    const doDia = iv.filter(i => i.ini < t + 86400000 && i.fim > t);
    nComp += doDia.filter(i => !i.ev.trabalho && i.ini >= t).length;
    let blocos = '';
    for (const i of doDia) {
      const a = Math.max(i.ini, t + hIni * 3600000), b = Math.min(i.fim, t + hFim * 3600000); if (b <= a) continue;
      const top = (a - t - hIni * 3600000) / 3600000 * PX, h = Math.max(14, (b - a) / 3600000 * PX - 2);
      const c = categoriaPorId(i.ev.categoria || categorizar(i.ev.titulo, i.ev.trabalho));
      blocos += '<div role="button" tabindex="0" class="sg-ev' + (i.ev.trabalho ? ' trab' : '') + (i.fim < agora ? ' pas' : '') + '" style="top:' + top + 'px;height:' + h + 'px;' + (i.ev.trabalho ? '' : 'background:' + c.cor) + '" data-id="' + esc(i.ev.id) + '" data-chave="' + esc(i.chave || '') + '" data-t="' + i.ini + '"><b>' + esc(i.ev.titulo) + '</b>' + (h > 30 ? '<small>' + fmtHora(new Date(i.ini)) + '</small>' : '') + '</div>';
    }
    const agoraLinha = t === hoje0 && agora > t + hIni * 3600000 && agora < t + hFim * 3600000 ? '<i class="sg-agora" style="top:' + ((agora - t) / 3600000 - hIni) * PX + 'px"></i>' : '';
    cols += '<div class="sg-col' + (t === hoje0 ? ' hj' : '') + '" style="height:' + alt + 'px">' + blocos + agoraLinha + '</div>';
  }
  cab += '</div>';
  let horas = '<div class="sg-horas" style="height:' + alt + 'px">';
  for (let h = hIni; h <= hFim; h += 2) horas += '<span style="top:' + (h - hIni) * PX + 'px">' + pad(h % 24) + '</span>';
  horas += '</div>';
  let linhas = ''; for (let h = hIni; h < hFim; h++) linhas += '<i style="top:' + (h - hIni) * PX + 'px"></i>';
  const ml = maisLivre ? new Date(maisLivre.t) : null;
  $('semanaAg').innerHTML = '<div class="sg-nav"><button type="button" class="nav" data-sn="-1" aria-label="Semana anterior">‹</button><button type="button" class="chip' + (atual ? ' on' : '') + '" data-sn="0">Esta semana</button><button type="button" class="nav" data-sn="1" aria-label="Próxima semana">›</button></div>' +
    '<div class="kp"><div><b>' + fmtLivre(livreTot) + '</b><small>livres na semana</small></div><div><b>' + nComp + '</b><small>' + (nComp === 1 ? 'compromisso' : 'compromissos') + '</small></div><div><b style="color:var(--accent)">' + (ml ? DIAS_CURTO[ml.getDay()] + ' ' + ml.getDate() : '—') + '</b><small>dia mais livre</small></div></div>' +
    '<div class="sg">' + cab + '<div class="sg-corpo">' + horas + '<div class="sg-grade"><div class="sg-linhas">' + linhas + '</div>' + cols + '</div></div></div>' +
    '<p class="dica">Segure um compromisso e arraste para remarcar. Toque num espaço vazio para marcar ali. Toque no dia para ver a programação.</p>' + botaoOutraHTML();
}
$('semanaAg').addEventListener('click', async e => {
  const n = e.target.closest('[data-sn]'); if (n) { semRef = n.dataset.sn === '0' ? inicioSemana(Date.now()) : maisDias(semRef, 7 * Number(n.dataset.sn)); renderSemanaAg(); return; }
  const d = e.target.closest('[data-sd]'); if (d) { agendaAba = 'prog'; agendaData = Number(d.dataset.sd); renderAgenda(); $('agenda').scrollTop = 0; return; }
  const b = e.target.closest('.sg-ev'); if (b) { const ev = eventos.find(x => x.id === b.dataset.id); if (!ev) return; if (ev.repetir) abrirFolha(ev.id, b.dataset.chave, Number(b.dataset.t)); else abrirEdicao(ev.id); return; }
  const c = e.target.closest('[data-a]'); if (c) await tratarCronoClique(c);
});

// ----- Finanças › gráfico do patrimônio -----
let patPer = '6m';
const PAT_PER = { '1m': ['1 mês', 30, 1], '6m': ['6 meses', 182, 7], '1a': ['1 ano', 365, 14] };
function ativosEm(t) {
  let contas = 0, inv = 0;
  for (const c of fin.contas) { if (c.criado && c.criado > t) continue; const v = saldoConta(c, t); if (ehInvest(c)) inv += v; else contas += v; }
  for (const m of fin.metas || []) if ((!m.contaId || !contaPorId(m.contaId)) && (!m.criado || m.criado <= t)) inv += guardadoMeta(m, t);
  return { contas, inv, total: contas + inv };
}
function graficoPatrimonioHTML() {
  if (!fin.contas.length) return '';
  const agora = Date.now(), [nome, diasPer, passo] = PAT_PER[patPer];
  const inicioDados = Math.min(...fin.contas.map(c => c.criado || agora), ...fin.movs.map(m => m.t), agora);
  const ini = Math.max(inicioDoDia(agora).getTime() - diasPer * 86400000, inicioDoDia(inicioDados).getTime());
  const pts = [];
  for (let t = ini; t < agora; t = maisDias(t, passo)) pts.push({ t, ...ativosEm(Math.min(agora, t + 86400000 - 1)) });
  pts.push({ t: agora, ...ativosEm(agora) });
  const chips = '<div class="per pat-per">' + Object.entries(PAT_PER).map(([k, [n]]) => '<button type="button" data-pp="' + k + '" class="' + (k === patPer ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  if (pts.length < 3) return '<div class="card pat-graf"><div class="gh" style="margin:0"><span>Evolução</span></div><p class="dica">O gráfico do patrimônio aparece depois de alguns dias de uso: ele mostra suas contas e investimentos dia a dia.</p></div>';
  const vals = pts.map(p => p.total), mx = Math.max(...vals, ...pts.map(p => p.contas), 1), mn = Math.min(0, ...pts.map(p => Math.min(p.contas, p.inv)), ...vals);
  const W = 340, H = 150, pl = 4, pr = 4, pt = 10, pb = 20;
  const X = i => pl + i / (pts.length - 1) * (W - pl - pr), Y = v => pt + (mx - v) / (mx - mn || 1) * (H - pt - pb);
  const area = (f, base) => { let d = 'M' + X(0) + ',' + Y(base(0)); pts.forEach((p, i) => d += 'L' + X(i).toFixed(1) + ',' + Y(f(p)).toFixed(1)); for (let i = pts.length - 1; i >= 0; i--) d += 'L' + X(i).toFixed(1) + ',' + Y(base(i)).toFixed(1); return d + 'Z'; };
  const linha = f => pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(f(p)).toFixed(1)).join('');
  const temInv = pts.some(p => p.inv > 0.009);
  const dIni = new Date(pts[0].t), meio = pts[Math.floor(pts.length / 2)];
  const delta = pts[pts.length - 1].total - pts[0].total, pct = Math.abs(pts[0].total) > 0.01 ? delta / Math.abs(pts[0].total) * 100 : null;
  const svg = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Evolução do patrimônio">' +
    '<defs><linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6f432" stop-opacity=".45"/><stop offset="1" stop-color="#c6f432" stop-opacity=".04"/></linearGradient>' +
    '<linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff" stop-opacity=".55"/><stop offset="1" stop-color="#7cc4ff" stop-opacity=".12"/></linearGradient></defs>' +
    (mn < 0 ? '<line x1="0" x2="' + W + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#333" stroke-dasharray="3 3"/>' : '') +
    '<path d="' + area(p => p.total, () => Math.max(mn, 0)) + '" fill="url(#gPat)"/>' +
    (temInv ? '<path d="' + area(p => p.inv, () => Math.max(mn, 0)) + '" fill="url(#gInv)"/>' : '') +
    '<path d="' + linha(p => p.total) + '" fill="none" stroke="#c6f432" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="' + X(pts.length - 1) + '" cy="' + Y(pts[pts.length - 1].total) + '" r="4" fill="#c6f432" stroke="#000" stroke-width="2"/>' +
    '<text x="' + pl + '" y="' + (H - 5) + '" fill="#8a8a8a" font-size="10">' + dIni.getDate() + ' ' + MESES_N[dIni.getMonth()] + '</text>' +
    '<text x="' + (W / 2) + '" y="' + (H - 5) + '" fill="#8a8a8a" font-size="10" text-anchor="middle">' + new Date(meio.t).getDate() + ' ' + MESES_N[new Date(meio.t).getMonth()] + '</text>' +
    '<text x="' + (W - pr) + '" y="' + (H - 5) + '" fill="#8a8a8a" font-size="10" text-anchor="end">hoje</text></svg>';
  return '<div class="card pat-graf"><div class="gh" style="margin:0 0 4px"><span>Evolução · ' + nome + '</span><b class="' + (delta < -0.009 ? 'gas' : delta > 0.009 ? 'rec' : '') + '">' + (delta > 0.009 ? '+' : '') + fmtBRL(delta) + (pct !== null && !OCULTAR ? ' (' + (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '%)' : '') + '</b></div>' + (OCULTAR ? '<p class="dica">Valores escondidos. Toque no olho para ver o gráfico.</p>' : svg) +
    '<div class="leg"><span><i class="sw" style="background:#c6f432"></i> contas + investimentos</span>' + (temInv ? '<span><i class="sw" style="background:#7cc4ff"></i> investido e metas</span>' : '') + '</div>' + chips +
    '<p class="dica">Dívidas e cartões entram no patrimônio de hoje, acima, mas não no gráfico.</p></div>';
}
$('finSaldos').addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if (b) { patPer = b.dataset.pp; renderFin(); } });

// ----- Pessoal › Hoje -----
function renderPesHoje() {
  const agora = Date.now(), hoje0 = inicioDoDia(agora).getTime(), ch = hojeChave(), dw = new Date().getDay();
  const habs = pes.habitos.filter(x => (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(dw)), doses = dosesDoDia(ch);
  const metaT = config.treinosSemana || 3, tSem = treinosEntre(inicioSemana(agora), fimSemanaT(agora));
  const vazio = !pes.habitos.length && !pes.remedios.length && !pes.materias.length && !pes.livros.length && !pes.treinos.length && !pes.diario.length;
  let h = '<div class="kp">' + (APP === 'ag' ? '' : '<div><b class="' + (habs.length && habs.every(x => feitoHab(x, ch)) ? 'rec' : '') + '">' + habs.filter(x => feitoHab(x, ch)).length + '/' + habs.length + '</b><small>hábitos hoje</small></div>') +
    '<div><b class="' + (doses.length && doses.every(x => x.dose) ? 'rec' : '') + '">' + doses.filter(x => x.dose).length + '/' + doses.length + '</b><small>remédios hoje</small></div>' +
    '<div><b style="color:var(--accent)">' + tSem + '/' + metaT + '</b><small>treinos na semana</small></div></div>';
  if (vazio) h += '<div class="empty"><b>Seu dia pessoal aparece aqui.</b><br>Cadastre hábitos, remédios, matérias e livros nas outras abas, ou lance pelo chat (<i>“supino 4x10 40kg”</i>, <i>“li até a página 30”</i>). Aqui você marca tudo do dia com um toque.</div>';
  // diário rápido
  const di = pes.diario.find(x => x.chave === ch) || {};
  h += '<div class="card"><div class="tp"><b>Como você está hoje?</b></div><div class="rot" style="margin-top:8px">Energia</div><div class="notas5" data-dh="energia">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (di.energia === n ? 'on' : '') + '">⚡' + n + '</button>').join('') + '</div>' +
    '<div class="rot" style="margin-top:8px">Humor</div><div class="notas5" data-dh="humor">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (di.humor === n ? 'on' : '') + '">' + HUMOR[n] + '</button>').join('') + '</div></div>';
  if (habs.length) h += '<div class="grp">Hábitos de hoje</div><div class="hb-lista">' + habs.map(cartaoHabHTML).join('') + '</div>';
  if (doses.length) h += '<div class="card"><div class="tp"><b>Remédios de hoje</b></div>' + doses.map(x => { const atr = !x.dose && x.h <= fmtHora(new Date()); return '<div class="slot rem"><span class="t' + (atr ? ' am' : '') + '">' + x.h + '</span><span class="d"><b>' + esc(x.r.nome) + '</b><small>' + esc(x.r.dose || '') + (x.dose ? ' · tomado às ' + fmtHora(new Date(x.dose.t)) : atr ? ' · atrasado' : '') + '</small></span>' + (x.dose ? '<button type="button" class="ck ok" disabled>✓</button>' : '<button type="button" class="ck" data-hh="dose" data-id="' + esc(x.r.id) + '" data-hr="' + x.h + '"></button>') + '</div>'; }).join('') + '</div>';
  // estudos
  if (pes.materias.length) {
    const ini = inicioSemana(agora), fim = fimSemanaT(agora);
    const rev = pes.revisoes.map(r => ({ r, due: r.feitas.length < 3 ? maisDias(inicioDoDia(r.base).getTime(), [1, 7, 30][r.feitas.length]) : null })).filter(x => x.due !== null && x.due <= hoje0);
    h += '<div class="card"><div class="tp"><b>Estudos da semana</b></div>' + pes.materias.map(m => { const s = minEstudo(m, ini, fim); return '<div class="ph-lin"><span class="sq" style="background:' + m.cor + '"></span><span class="n">' + esc(m.nome) + '</span><b>' + fmtLivre(s) + (m.metaMin ? '<small> / ' + fmtLivre(m.metaMin) + '</small>' : '') + '</b></div>' + (m.metaMin ? '<div class="prog"><div style="width:' + Math.min(100, s / m.metaMin * 100) + '%;background:' + m.cor + '"></div></div>' : ''); }).join('') +
      (rev.length ? '<div class="rot" style="margin-top:10px">Revisões para hoje</div>' + rev.slice(0, 4).map(({ r }) => '<div class="ph-lin"><span class="n">' + esc(r.assunto) + '</span><button type="button" class="btn primary mini-b" data-hh="revisei" data-id="' + esc(r.id) + '">Revisei</button></div>').join('') : '') +
      '<div class="actions"><button type="button" class="btn" data-hh="crono-estudo">▶ Cronometrar estudo</button></div></div>';
  }
  // leitura
  const l = livroAtual();
  if (l) { const pg = paginasEntre(hoje0, agora), rt = ritmoLivro(l);
    h += '<div class="card"><div class="tp"><b>📖 ' + esc(l.titulo) + '</b></div><div class="vals" style="margin-top:6px"><span>página <b>' + (l.pagina || 0) + '</b>' + (l.paginas ? ' de ' + l.paginas : '') + '</span><span>' + (pg ? '<b class="rec">+' + pg + '</b> hoje' : 'nada hoje') + '</span></div>' + (l.paginas ? '<div class="prog"><div style="width:' + Math.min(100, (l.pagina || 0) / l.paginas * 100) + '%;background:var(--accent)"></div></div>' : '') +
      (rt.termina ? '<small class="mut" style="font-size:.74rem">termina por volta de ' + fmtDM(rt.termina) + ' · ' + lidosNoAno().length + ' de ' + (config.metaLivrosAno || 12) + ' livros no ano</small>' : '') + '</div>'; }
  // academia
  if (pes.treinos.length || pes.corridas.length || pes.medidas.length) {
    const peso = pes.medidas.filter(m => m.tipo === 'peso').sort((a, b) => b.t - a.t)[0];
    const ult = [...pes.treinos.map(t => ({ t: t.t, txt: t.exercicios.map(e => e.nome).slice(0, 3).join(', ') || 'treino' })), ...pes.corridas.map(c => ({ t: c.t, txt: c.tipo + ' ' + String(c.km).replace('.', ',') + ' km' }))].sort((a, b) => b.t - a.t)[0];
    h += '<div class="card"><div class="tp"><b>🏋️ Academia</b></div><div class="sem7" style="margin-top:8px">' + [...Array(7)].map((_, k) => { const t = maisDias(inicioSemana(agora), k), f = treinosEntre(t, t + 86400000 - 1) > 0; return '<span class="' + (f ? 'f' : '') + (t === hoje0 ? ' hj' : '') + '">' + DIAS_CURTO[new Date(t).getDay()] + '</span>'; }).join('') + '</div>' +
      '<div class="vals" style="margin-top:8px"><span>' + (ult ? 'último: <b>' + esc(maiuscula(ult.txt)) + '</b> · ' + (difDias(ult.t) === 0 ? 'hoje' : difDias(ult.t) === -1 ? 'ontem' : fmtDM(ult.t)) : '') + '</span><span>' + (peso ? 'peso <b>' + String(peso.valor).replace('.', ',') + ' kg</b>' : '') + '</span></div>' +
      '<small class="mut" style="font-size:.74rem">' + semanasSeguidas() + ' semanas seguidas batendo a meta 🔥</small></div>';
  }
  // metas pessoais
  if (pes.metas.length) h += '<div class="card"><div class="tp"><b>Metas</b></div>' + pes.metas.slice(0, 3).map(m => { const p = progressoMeta(m); return '<div class="ph-lin"><span class="n">' + esc(m.nome) + '</span>' + (p.st ? '<em class="' + p.st[1] + '">' + p.st[0] + '</em>' : '') + '</div><div class="prog"><div style="width:' + Math.min(100, p.pct || 0) + '%;background:var(--accent)"></div></div>'; }).join('') + '</div>';
  h += '<div class="actions"><button type="button" class="btn primary" data-hh="lancar">Lançar pelo chat</button><button type="button" class="btn" data-hh="diario">Diário completo</button></div>';
  $('p-hoje').innerHTML = h;
}
$('p-hoje').addEventListener('click', async e => {
  if (e.target.closest('.hb-lista')) { await cliqueCartaoHab(e, () => renderPesHoje()); return; }
  const n = e.target.closest('[data-dh] button'); if (n) { const campo = n.parentElement.dataset.dh, v = +n.dataset.n; salvarDiario(campo === 'energia' ? v : undefined, campo === 'humor' ? v : undefined); await salvarPes(); renderPesHoje(); return; }
  const b = e.target.closest('[data-hh]'); if (!b) return;
  const a = b.dataset.hh;
  if (a === 'hab') { const x = pes.habitos.find(y => y.id === b.dataset.id); if (!x) return; tocarHabito(x); agendarAvisosPessoalDepois(); }
  if (a === 'dose') { const r = pes.remedios.find(y => y.id === b.dataset.id); if (!r) return; registrarDose(r, Date.now(), b.dataset.hr); agendarAvisosPessoalDepois(); }
  if (a === 'revisei') { const r = pes.revisoes.find(x => x.id === b.dataset.id); if (r) r.feitas.push(Date.now()); }
  if (a === 'crono-estudo') { abrirOutra(); $('otCategoria').value = 'estudo'; return; }
  if (a === 'lancar') { pesAba = 'lancar'; renderPessoal(); rolarChat(); setTimeout(() => $('entradaPes').focus(), 80); return; }
  if (a === 'diario') { pesAba = 'diario'; renderPessoal(); return; }
  await salvarPes(); renderPesHoje();
});
