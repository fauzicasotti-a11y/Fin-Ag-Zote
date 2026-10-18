
// =====================================================================
// 1.15 · Agenda › Semana: segurar e arrastar para remarcar, tocar num espaço livre
// para marcar · Hoje: descobertas da semana
// =====================================================================
let semGeo = null, semArr = null, semTimer = null, semBloq = 0;
const rotQuando = t => { const d = new Date(t); return DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' ' + fmtHora(d); };
$('semanaAg').addEventListener('pointerdown', e => {
  const b = e.target.closest('.sg-ev'); if (!b || !semGeo || e.button > 0) return;
  const ev = eventos.find(x => x.id === b.dataset.id); if (!ev) return;
  const st = { b, ev, x: e.clientX, y: e.clientY, pid: e.pointerId, ativo: false };
  semArr = st; clearTimeout(semTimer); semTimer = setTimeout(() => iniciarArraste(st), 380);
});
function iniciarArraste(st) {
  if (semArr !== st) return;
  st.ativo = true; try { navigator.vibrate?.(15); } catch {}
  const r = st.b.getBoundingClientRect(); st.offY = st.y - r.top;
  const t0 = Number(st.b.dataset.t), oc = ocorrenciasDet(st.ev, t0 - 1, t0 + 1, 3).find(o => (o.chave || '') === (st.b.dataset.chave || ''));
  st.t0 = t0; st.dur = oc?.dur ?? st.ev.duracao ?? 60;
  const f = document.createElement('div'); f.className = 'sg-fant'; f.style.height = Math.max(26, r.height) + 'px';
  f.innerHTML = '<b>' + esc(st.ev.titulo) + '</b><em></em>'; f.style.background = st.ev.trabalho ? '#ffb27a' : getComputedStyle(st.b).backgroundColor;
  document.body.appendChild(f); st.fant = f; st.b.classList.add('sg-orig'); moverFantasma(st, st.x, st.y);
}
function alvoArraste(st, x, y) {
  const cols = [...$('semanaAg').querySelectorAll('.sg-col')]; if (!cols.length) return null;
  let k = cols.findIndex(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; });
  if (k < 0) k = x < cols[0].getBoundingClientRect().left ? 0 : cols.length - 1;
  const rc = cols[k].getBoundingClientRect();
  let min = Math.round((semGeo.hIni * 60 + (y - st.offY - rc.top) / semGeo.PX * 60) / 15) * 15;
  min = Math.max(0, Math.min(24 * 60 - 15, min));
  const d = new Date(semGeo.dias[k]), t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(min / 60), min % 60).getTime();
  return { k, t, left: rc.left, width: rc.width, top: rc.top + (min - semGeo.hIni * 60) / 60 * semGeo.PX };
}
function moverFantasma(st, x, y) {
  const a = alvoArraste(st, x, y); if (!a) return; st.alvo = a;
  Object.assign(st.fant.style, { left: a.left + 1 + 'px', width: Math.max(60, a.width - 2) + 'px', top: a.top + 'px' });
  st.fant.querySelector('em').textContent = rotQuando(a.t);
  const box = $('semanaAg'), rb = box.getBoundingClientRect(); // rola sozinho perto das bordas
  if (y < rb.top + 40) box.scrollTop -= 12; else if (y > rb.bottom - 40) box.scrollTop += 12;
}
document.addEventListener('pointermove', e => {
  const st = semArr; if (!st || e.pointerId !== st.pid) return;
  if (!st.ativo) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) { clearTimeout(semTimer); semArr = null; } return; }
  moverFantasma(st, e.clientX, e.clientY);
});
$('semanaAg').addEventListener('touchmove', e => { if (semArr?.ativo) e.preventDefault(); }, { passive: false });
function fimArraste(e, cancelado) {
  const st = semArr; clearTimeout(semTimer); semArr = null; if (!st || !st.ativo) return;
  st.fant.remove(); st.b.classList.remove('sg-orig'); semBloq = Date.now();
  if (!cancelado && st.alvo) concluirArraste(st);
}
document.addEventListener('pointerup', e => fimArraste(e, false));
document.addEventListener('pointercancel', e => fimArraste(e, true));
async function concluirArraste(st) {
  const ev = st.ev, novo = st.alvo.t, chave = st.b.dataset.chave || null, t0 = st.t0;
  if (novo === t0) return;
  const msg = ev.titulo + ': ' + rotQuando(t0) + ' → ' + rotQuando(novo);
  if (!ev.repetir) { const foto = clonar(ev); await salvarEvento({ ...ev, inicio: novo }); toastDesfazer(msg, () => salvarEvento(foto)); return; }
  mostrarDialogo('Remarcar ' + ev.titulo, '<p>' + rotQuando(t0) + ' → <b>' + rotQuando(novo) + '</b></p><p class="dica">Compromisso repetido (' + esc(fmtRepetir(ev.repetir)) + '). Mudar só este dia ou todos?</p>', [
    { rotulo: 'Cancelar' },
    { rotulo: 'Todos', acao: async () => {
      const foto = clonar(ev), delta = novo - t0, dDias = Math.round((inicioDoDia(novo) - inicioDoDia(t0)) / 86400000);
      const n = { ...ev, inicio: ev.inicio + delta };
      if (dDias) { n.excecoes = {}; if (n.repetir?.tipo === 'semanal') n.repetir = { ...n.repetir, dias: [...new Set((n.repetir.dias || [new Date(t0).getDay()]).map(d => ((d + dDias) % 7 + 7) % 7))].sort() }; }
      await salvarEvento(n); toastDesfazer('Série remarcada', () => salvarEvento(foto)); } },
    { rotulo: 'Só este dia', acao: async () => { const foto = clonar(ev); await mudarExcecao(ev.id, chave, { inicio: novo, duracao: st.dur }); toastDesfazer(msg, () => salvarEvento(foto)); } },
  ]);
}
// depois de arrastar, o toque não abre a edição; tocar num espaço livre marca um compromisso ali
$('semanaAg').addEventListener('click', e => {
  if (Date.now() - semBloq < 400) { e.stopImmediatePropagation(); return; }
  const col = e.target.closest('.sg-col'); if (!col || e.target.closest('.sg-ev') || !semGeo) return;
  const cols = [...$('semanaAg').querySelectorAll('.sg-col')], k = cols.indexOf(col), rc = col.getBoundingClientRect();
  const min = Math.max(0, Math.min(23 * 60 + 30, Math.floor((semGeo.hIni * 60 + (e.clientY - rc.top) / semGeo.PX * 60) / 30) * 30));
  const d = new Date(semGeo.dias[k]); novoCompromisso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(min / 60), min % 60).getTime());
}, true);
function novoCompromisso(t) {
  abrirEdicao(null, null, { id: novoId(), titulo: '', inicio: t, avisoMin: config.avisoPadrao, repetir: null, duracao: config.duracaoPadrao || 60, trabalho: false, categoria: 'pessoal', texto: '', criado: Date.now(), _novo: true });
  setTimeout(() => $('edTitulo').focus(), 120);
}

// ----- descobertas da semana -----
let descAberto = false, descAcoes = {};
function calcDescobertas(agora = Date.now()) {
  const out = [], tag = '@' + inicioSemana(agora), hoje0 = inicioDoDia(agora).getTime(), fim7 = hoje0 + DIA_MS, ini7 = fim7 - 7 * DIA_MS;
  // 1 · uma categoria de gasto bem acima da média das 4 semanas anteriores
  if (fin.movs.some(m => m.t < ini7 - 21 * DIA_MS)) {
    const t7 = totais(ini7, fim7 - 1).porCat, ant = [1, 2, 3, 4].map(k => totais(ini7 - k * 7 * DIA_MS, ini7 - (k - 1) * 7 * DIA_MS - 1).porCat);
    let mx = null;
    for (const c of CATEGORIAS) { const a = t7[c.id] || 0, med = ant.reduce((s, p) => s + (p[c.id] || 0), 0) / 4; if (med > 20 && a >= med * 1.3 && a - med >= 60) { const pct = (a / med - 1) * 100; if (!mx || pct > mx.pct) mx = { c, a, med, pct }; } }
    if (mx) { const n = fin.movs.filter(m => m.t >= ini7 && m.t < fim7 && m.categoria === mx.c.id && (m.tipo === 'gasto' || m.tipo === 'credito')).length;
      out.push({ id: 'gasto-' + mx.c.id + tag, k: '+' + Math.round(mx.pct) + '%', cor: 'var(--gas)', tit: 'em ' + mx.c.nome.toLowerCase(), txt: fmtBRL(mx.a) + ' nos últimos 7 dias contra ' + fmtBRL(mx.med) + ' de média' + (n ? ' · ' + n + (n === 1 ? ' lançamento' : ' lançamentos') : '') + '.',
        bts: [['Ver gastos', () => { extCat = mx.c.id; extFiltro = 'gastos'; extConta = ''; extMes = inicioMes(Date.now()); extRevisar = false; abrirFin('extrato'); }]] }); }
  }
  // 2 · melhor dia da semana para estudar (cronômetro, 4 semanas)
  const s0 = inicioSemana(agora), ss = crono.sessoes.filter(s => s.ini >= s0 - 28 * DIA_MS && s.ini < s0 && (s.categoria === 'estudo' || s.materiaId));
  if (ss.length >= 4) {
    const por = [0, 0, 0, 0, 0, 0, 0], inis = [[], [], [], [], [], [], []];
    for (const s of ss) { const d = new Date(s.ini); por[d.getDay()] += realMin(s); inis[d.getDay()].push(d.getHours() * 60 + d.getMinutes()); }
    const best = por.indexOf(Math.max(...por)), avg = por[best] / 4, outros = por.filter((_, i) => i !== best).reduce((a, b) => a + b, 0) / 6 / 4;
    const jaTem = eventos.some(e => e.repetir?.tipo === 'semanal' && (e.categoria === 'estudo') && (e.repetir.dias || [new Date(e.inicio).getDay()]).includes(best));
    if (avg >= 30 && avg >= outros * 1.6 && !jaTem) {
      const md = medianaDe(inis[best]), hm = Math.round(md / 30) * 30, dur = Math.max(30, Math.round(avg / 30) * 30), hhmm = pad(Math.floor(hm / 60)) + ':' + pad(hm % 60);
      out.push({ id: 'estudo-' + best + tag, k: DIAS[best].replace('-feira', ''), cor: 'var(--accent)', tit: 'é seu melhor dia de estudo', txt: 'Média de ' + fmtLivre(Math.round(avg)) + ' de estudo às ' + DIAS[best] + 's, contra ' + (outros < 5 ? 'quase nada' : fmtLivre(Math.round(outros))) + ' nos outros dias.',
        bts: [['Marcar estudo toda ' + DIAS_CURTO[best] + ' ' + hhmm, async () => {
          let d = inicioDoDia(Date.now()); while (d.getDay() !== best) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          const ev = { id: novoId(), titulo: 'Estudo', inicio: new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(hm / 60), hm % 60).getTime(), avisoMin: config.avisoPadrao, repetir: { tipo: 'semanal', dias: [best] }, duracao: dur, trabalho: false, categoria: 'estudo', texto: '', criado: Date.now() };
          await salvarEvento(ev); toastDesfazer('Estudo toda ' + DIAS[best] + ' às ' + hhmm, () => apagarEvento(ev.id)); }]] });
    }
  }
  // 3 · humor nos dias de treino × sem treino (60 dias)
  const diasTreino = new Set([...pes.treinos, ...pes.corridas].map(x => chaveDia(x.t)));
  const reg = pes.diario.filter(d => d.humor && new Date(d.chave + 'T12:00').getTime() > agora - 60 * DIA_MS);
  const com = reg.filter(d => diasTreino.has(d.chave)), sem = reg.filter(d => !diasTreino.has(d.chave)), med = l => l.reduce((s, d) => s + d.humor, 0) / l.length;
  if (com.length >= 3 && sem.length >= 3 && med(com) - med(sem) >= 0.5) out.push({ id: 'humor' + tag, k: ['', '😞', '😕', '😐', '🙂', '😄'][Math.round(med(com))] + ' ' + med(com).toFixed(1).replace('.', ','), cor: 'var(--ink)', tit: 'humor nos dias de treino', txt: 'Nos dias sem treino a média é ' + med(sem).toFixed(1).replace('.', ',') + '.', bts: [] });
  // 4 · tarefa adiada várias vezes
  const ad = tarefas.filter(t => !t.feita && (t.adiada || 0) >= 3).sort((a, b) => b.adiada - a.adiada)[0];
  if (ad) {
    const sug = sugerirComPreferencias(maisDias(hoje0, 1), 30, 2);
    out.push({ id: 'adiada-' + ad.id + '-' + ad.adiada, k: ad.adiada + '×', cor: 'var(--warn)', tit: 'você adiou “' + ad.titulo + '”', txt: sug.length ? 'Quer encaixar 30 min num horário livre?' : 'Que tal fazer hoje ou dividir em partes menores?',
      bts: sug.map(t => [rotQuando(t).replace(/ \d+\/\d+/, ''), async () => { const ev = { id: novoId(), titulo: ad.titulo, inicio: t, avisoMin: config.avisoPadrao, repetir: null, duracao: 30, trabalho: false, categoria: ad.categoria || categorizar(ad.titulo), tarefaId: ad.id, texto: '', criado: Date.now() }; ad.agendados = [...(ad.agendados || []), ev.id]; ad.adiada = 0; await salvarTarefas(); await salvarEvento(ev); toastDesfazer(ad.titulo + ' · ' + rotQuando(t), async () => { await apagarEvento(ev.id); }); }]) });
  }
  return out;
}
function descobertasHTML() {
  if (config.descobertas === false) return '';
  const oc = config.descOcultas || {}, l = calcDescobertas().filter(d => !oc[d.id]); descAcoes = {};
  if (!l.length) return '';
  const vis = descAberto ? l : l.slice(0, 2);
  return '<div class="rot hj-tit">Descobertas da semana</div>' + vis.map(d => { d.bts.forEach((b, i) => { descAcoes[d.id + '|' + i] = b[1]; });
    return '<div class="ins"><button type="button" class="x" data-dx="' + esc(d.id) + '" aria-label="Dispensar">✕</button><span class="k" style="color:' + d.cor + '">' + esc(d.k) + '</span> <b>' + esc(d.tit) + '</b><p>' + esc(d.txt) + '</p>' + (d.bts.length ? '<div class="bts">' + d.bts.map((b, i) => '<button type="button" class="' + (i ? '' : 'p') + '" data-da="' + esc(d.id + '|' + i) + '">' + esc(b[0]) + '</button>').join('') + '</div>' : '') + '</div>'; }).join('') +
    (l.length > 2 ? '<button type="button" class="mais-res" data-dm>' + (descAberto ? 'Mostrar menos' : 'Mais ' + (l.length - 2) + (l.length - 2 === 1 ? ' descoberta' : ' descobertas') + ' ›') + '</button>' : '');
}
$('hoje').addEventListener('click', async e => {
  const x = e.target.closest('[data-dx]'); if (x) { config.descOcultas = { ...(config.descOcultas || {}), [x.dataset.dx]: true }; await guardar('az-config', config); renderHome(); return; }
  const m = e.target.closest('[data-dm]'); if (m) { descAberto = !descAberto; renderHome(); return; }
  const a = e.target.closest('[data-da]'); if (a && descAcoes[a.dataset.da]) { await descAcoes[a.dataset.da](); if (tela === 'home') renderHome(); }
});
