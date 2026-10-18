
// =====================================================================
// 1.15 · Anotações formatadas (pastas, fixar, caixinhas), horas por tarefa,
// detalhe da tarefa e busca geral
// =====================================================================
// ----- anotações -----
let notaPasta = '', notaEditando = null, notaFixarNova = false, notaPastaNova = null;
const RE_TAG = /(^|\s)#([\p{L}\d_-]{2,30})/u, RE_TAGS = /(^|\s)#[\p{L}\d_-]{2,30}/gu;
const pastaDoTexto = txt => { const m = RE_TAG.exec(txt || ''); return m ? maiuscula(m[2]) : null; };
const pastasNotas = () => [...new Set(notas.map(n => n.pasta).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const inlNota = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])_(.+?)_(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>');
const RE_CK = /^\s*(?:[-*•]\s*)?\[( |x|X)\]\s?(.*)$/;
function formatarNota(n) {
  const linhas = n.texto.replace(RE_TAGS, '$1').split('\n'); let h = '';
  linhas.forEach((l, i) => {
    let m;
    if ((m = RE_CK.exec(l))) h += '<button type="button" class="nck' + (m[1] !== ' ' ? ' ok' : '') + '" data-nl="' + i + '"><i>' + (m[1] !== ' ' ? '✓' : '') + '</i><span>' + inlNota(m[2]) + '</span></button>';
    else if ((m = /^\s*#{1,3}\s+(.*)$/.exec(l))) h += '<b class="nh">' + inlNota(m[1]) + '</b>';
    else if ((m = /^\s*[-*•]\s+(.*)$/.exec(l))) h += '<div class="nli">' + inlNota(m[1]) + '</div>';
    else if (l.trim()) h += i === 0 && linhas.filter(x => x.trim()).length > 1 ? '<b class="nh">' + inlNota(l) + '</b>' : '<p>' + inlNota(l) + '</p>';
  });
  return h || '<p class="mut">(vazia)</p>';
}
function renderNotas() {
  const pastas = pastasNotas(), nf = notas.filter(n => n.fixa).length;
  $('subNotas').textContent = notas.length + (notas.length === 1 ? ' nota' : ' notas') + (pastas.length ? ' · ' + pastas.length + (pastas.length === 1 ? ' pasta' : ' pastas') : '');
  $('notasPastas').innerHTML = [['', 'Todas'], ...(nf ? [['#fix', '📌 Fixadas']] : []), ...pastas.map(p => [p, p])].map(([k, n]) => '<button type="button" role="tab" data-np="' + esc(k) + '" class="' + (notaPasta === k ? 'on' : '') + '">' + esc(n) + '</button>').join('');
  if (notaPasta && notaPasta !== '#fix' && !pastas.includes(notaPasta)) notaPasta = '';
  const lista = notas.filter(n => !notaPasta || (notaPasta === '#fix' ? n.fixa : n.pasta === notaPasta)).sort((a, b) => (b.fixa ? 1 : 0) - (a.fixa ? 1 : 0) || (b.editada || b.t) - (a.editada || a.t));
  const quando = n => { const t = n.editada || n.t, d = difDias(t); return (n.editada ? 'editada ' : '') + (d === 0 ? 'hoje' : d === -1 ? 'ontem' : fmtDM(t)) + ' · ' + fmtHora(new Date(t)); };
  $('notasLista').innerHTML = lista.length ? lista.map(n => {
    const sel = n.id === notaSel, temCk = RE_CK.test(n.texto) || n.texto.split('\n').some(l => RE_CK.test(l));
    return '<div class="nota' + (sel ? ' sel' : '') + (n.fixa ? ' fixa' : '') + '" data-nota="' + esc(n.id) + '">' + (n.pasta || n.fixa ? '<span class="npasta">' + (n.fixa ? '📌 ' : '') + esc(n.pasta || 'Fixada') + '</span>' : '') +
      '<div class="ntx">' + formatarNota(n) + '</div><small class="nq">' + quando(n) + '</small>' +
      (sel ? '<div class="bts"><button type="button" class="p" data-n="editar">Editar</button><button type="button" data-n="fixar">' + (n.fixa ? 'Desafixar' : '📌 Fixar') + '</button><button type="button" data-n="pasta">🏷 Pasta</button><button type="button" data-n="tarefa">' + (temCk ? 'Virar tarefas' : 'Virar tarefa') + '</button><button type="button" data-n="copiar">Copiar</button>' + (Compartilhar ? '<button type="button" data-n="enviar">Enviar</button>' : '') + '<button type="button" class="perigo" data-n="apagar">Apagar</button></div>' : '') + '</div>';
  }).join('') : '<div class="empty">' + (notas.length ? 'Nenhuma nota aqui.' : '<b>Suas anotações ficam aqui.</b><br>Escreva embaixo. Use os botões para <b>negrito</b>, listas com caixinhas e títulos; <i>#ideias</i> no texto guarda na pasta Ideias.') + '</div>';
  $('nbFixar').classList.toggle('on', notaFixarNova); $('nbPasta').textContent = notaPastaNova ? '🏷 ' + notaPastaNova : '🏷';
  const f = $('notaEdit'); f.hidden = !notaEditando; if (notaEditando) f.innerHTML = '<span>✎ <b>Editando a nota</b></span><button type="button" data-ne-x aria-label="Cancelar edição">✕</button>';
}
$('notasPastas').addEventListener('click', e => { const b = e.target.closest('[data-np]'); if (!b) return; notaPasta = b.dataset.np; notaSel = null; notaPastaNova = notaPasta && notaPasta !== '#fix' ? notaPasta : null; renderNotas(); });
$('notaEdit').addEventListener('click', e => { if (e.target.closest('[data-ne-x]')) { notaEditando = null; campoNota.value = ''; ajustarAltura(); renderNotas(); } });
$('notasLista').addEventListener('click', async e => {
  const card = e.target.closest('[data-nota]'); if (!card) return;
  const n = notas.find(x => x.id === card.dataset.nota); if (!n) return;
  const ck = e.target.closest('[data-nl]');
  if (ck) { const ls = n.texto.split('\n'), i = +ck.dataset.nl; ls[i] = ls[i].replace(/\[( |x|X)\]/, m => m === '[ ]' ? '[x]' : '[ ]'); n.texto = ls.join('\n'); await guardar('az-notas', notas); renderNotas(); return; }
  const b = e.target.closest('[data-n]');
  if (!b) { notaSel = notaSel === n.id ? null : n.id; renderNotas(); return; }
  const a = b.dataset.n;
  if (a === 'editar') { notaEditando = n.id; notaFixarNova = !!n.fixa; notaPastaNova = n.pasta || null; campoNota.value = n.texto; ajustarAltura(); notaSel = null; renderNotas(); campoNota.focus(); return; }
  if (a === 'fixar') { n.fixa = !n.fixa; await guardar('az-notas', notas); renderNotas(); return; }
  if (a === 'pasta') { escolherPasta(n.pasta, async p => { n.pasta = p; n.texto = n.texto.replace(RE_TAGS, '$1').replace(/[ \t]+$/gm, ''); await guardar('az-notas', notas); renderNotas(); }); return; }
  if (a === 'copiar') { toast(await copiarTexto(n.texto.replace(RE_TAGS, '$1')) ? 'Copiado ✓' : 'Não deu para copiar'); return; }
  if (a === 'enviar') { try { await Compartilhar.share({ title: 'Anotação', text: n.texto.replace(RE_TAGS, '$1') }); } catch {} return; }
  if (a === 'tarefa') {
    const foto = clonar(tarefas), itens = n.texto.split('\n').map(l => RE_CK.exec(l)).filter(m => m && m[1] === ' ').map(m => m[2].trim()).filter(Boolean);
    const titulos = itens.length ? itens : [n.texto.replace(RE_TAGS, '$1').split('\n').find(l => l.trim()).replace(/^\s*#+\s*/, '').trim()];
    for (const tt of titulos) { const r = interpretarTarefa(tt, new Date()); const t = { id: novoId(), titulo: r.titulo, prazo: r.prazo, categoria: r.categoria, feita: false, feitaEm: null, criado: Date.now(), notaId: n.id }; tarefas.push(t); await agendarAvisoTarefa(t); }
    await salvarTarefas(); notaSel = null; renderNotas();
    toastDesfazer(titulos.length === 1 ? 'Virou tarefa ✓' : titulos.length + ' tarefas criadas ✓', () => voltarTarefas(foto)); return;
  }
  if (a === 'apagar') {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Apagar mesmo?'; return; }
    const foto = clonar(notas); notas = notas.filter(x => x.id !== n.id); notaSel = null; await guardar('az-notas', notas); renderNotas();
    toastDesfazer('Nota apagada', async () => { notas = foto; await guardar('az-notas', notas); if (tela === 'notas') renderNotas(); });
  }
});
function escolherPasta(atual, f) {
  const ps = pastasNotas();
  escolherOpcao('Guardar na pasta', [['', 'Sem pasta'], ...ps.map(p => [p, p]), ['__nova', '+ Nova pasta…']], atual || '', v => {
    if (v === '__nova') { abrirForm('Nova pasta', [{ k: 'nome', rot: 'Nome da pasta', ph: 'Ex.: Monografia' }], d => { if (!d.nome) return false; f(maiuscula(d.nome.replace(/^#/, '').trim())); }); return; }
    f(v || null);
  });
}
// barra de formatação
function envolverSel(antes, depois = antes) {
  const c = campoNota, a = c.selectionStart, b = c.selectionEnd, sel = c.value.slice(a, b);
  c.value = c.value.slice(0, a) + antes + sel + depois + c.value.slice(b); c.focus(); c.setSelectionRange(a + antes.length, a + antes.length + sel.length); ajustarAltura();
}
function prefixoLinha(pref) {
  const c = campoNota, a = c.selectionStart, ini = c.value.lastIndexOf('\n', a - 1) + 1, linha = c.value.slice(ini);
  if (linha.startsWith(pref)) { c.value = c.value.slice(0, ini) + linha.slice(pref.length); c.setSelectionRange(Math.max(ini, a - pref.length), Math.max(ini, a - pref.length)); }
  else { c.value = c.value.slice(0, ini) + pref + linha; c.setSelectionRange(a + pref.length, a + pref.length); }
  c.focus(); ajustarAltura();
}
$('notaBarra').addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); }); // não fecha o teclado
$('notaBarra').addEventListener('click', e => {
  const b = e.target.closest('[data-nb]'); if (!b) return;
  const a = b.dataset.nb;
  if (a === 'b') envolverSel('**'); if (a === 'i') envolverSel('_');
  if (a === 'ck') prefixoLinha('- [ ] '); if (a === 'li') prefixoLinha('- '); if (a === 'h') prefixoLinha('# ');
  if (a === 'fixar') { notaFixarNova = !notaFixarNova; b.classList.toggle('on', notaFixarNova); }
  if (a === 'pasta') escolherPasta(notaPastaNova, p => { notaPastaNova = p; $('nbPasta').textContent = p ? '🏷 ' + p : '🏷'; });
});
// lista: Enter numa linha de caixinha começa outra caixinha
campoNota.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const c = campoNota, a = c.selectionStart, ini = c.value.lastIndexOf('\n', a - 1) + 1, linha = c.value.slice(ini, a), m = /^(\s*(?:- \[ \] |- \[x\] |- ))/.exec(linha);
  if (!m) return; e.preventDefault();
  if (linha.trim() === m[1].trim()) { c.value = c.value.slice(0, ini) + c.value.slice(a); c.setSelectionRange(ini, ini); ajustarAltura(); return; }
  const novo = '\n' + m[1].replace('[x]', '[ ]'); c.value = c.value.slice(0, a) + novo + c.value.slice(a); c.setSelectionRange(a + novo.length, a + novo.length); ajustarAltura();
});

// ----- horas por tarefa -----
let tarefaAberta = null, horasPer = 'semana';
function sessoesTarefa(t) {
  const l = crono.sessoes.filter(s => s.tarefaId === t.id).map(s => ({ id: s.id, ini: s.ini, fim: s.fim, min: realMin(s), origem: 'cronômetro', crono: true }));
  for (const h of t.horas || []) l.push({ id: h.id, ini: h.ini, fim: h.ini + h.min * 60000, min: h.min, origem: h.origem === 'chat' ? 'pelo chat' : h.origem || 'lançado' });
  return l.sort((a, b) => b.ini - a.ini);
}
function minTarefa(t, de = -Infinity, ate = Infinity) {
  let m = sessoesTarefa(t).filter(s => s.ini >= de && s.ini <= ate).reduce((s, x) => s + x.min, 0);
  if (crono.ativo?.tarefaId === t.id && crono.ativo.ini <= ate) m += minDe(tempoDe(crono.ativo));
  return m;
}
function lerHorasTarefa(texto) {
  const s = finTxt(texto).replace(/\s+/g, ' ');
  const m = /^\s*(?:trabalhei|gastei|dediquei|passei|fiquei|levei|investi|fiz)\s+(.+?)\s+(?:no|na|nos|nas|em|com|pro|pra|para o|para a|para)\s+(.+)$/.exec(s); if (!m) return null;
  const d = finDuracao(m[1]); if (!d || d.min < 1 || d.min > 16 * 60) return null;
  const pal = finPalavras(m[2].replace(/\b(hoje|ontem|de manha|a tarde|a noite|agora|cedo)\b/g, ' ')); if (!pal.length) return null;
  let melhor = null;
  for (const t of tarefas.filter(x => !x.feita || difDias(x.feitaEm) >= -1)) {
    const tp = finPalavras(t.titulo), n = pal.filter(w => tp.some(x => x === w || (w.length >= 5 && x.length >= 5 && x.slice(0, 5) === w.slice(0, 5)))).length;
    if (n && (!melhor || n > melhor.n)) melhor = { t, n };
  }
  return melhor ? { tarefa: melhor.t, min: d.min, ontem: /\bontem\b/.test(s) } : null;
}
function lancarHoras(t, min, origem = 'lançado', ini = Date.now() - min * 60000) { const h = { id: novoId(), ini, min, origem }; t.horas = [...(t.horas || []), h]; return h; }
function abrirTarefa(id) { tarefasAba = 'tarefas'; if (tela !== 'tarefas') abrir('tarefas'); tarefaAberta = id; renderTarefas(); $('tarefasLista').scrollTop = 0; }
async function cronoTarefa(t) {
  if (crono.ativo?.tarefaId === t.id) { await pararCrono(); return; }
  await iniciarCrono({ evId: null, chave: null, tarefaId: t.id, titulo: t.titulo, categoria: t.categoria || categorizar(t.titulo) });
}
function renderTarefaDet() {
  const t = tarefas.find(x => x.id === tarefaAberta); if (!t) { tarefaAberta = null; renderTarefas(); return; }
  const feito = minTarefa(t), rod = crono.ativo?.tarefaId === t.id, est = t.estimativa || 0, c = categoriaPorId(t.categoria);
  const p = t.projetoId && projetos.find(x => x.id === t.projetoId);
  $('subTarefas').textContent = p ? 'Projeto ' + p.nome : 'detalhe da tarefa';
  let h = '<button type="button" class="volta-lista" data-td="voltar">‹ Tarefas</button><div class="hd-tit">' + (t.feita ? '✓ <s>' + esc(t.titulo) + '</s>' : esc(t.titulo)) + '<small>' + [t.prazo !== null ? fmtPrazo(t.prazo) : 'sem prazo', c.nome, t.feita ? 'feita ' + fmtDM(t.feitaEm) : ''].filter(Boolean).join(' · ') + '</small></div>';
  h += '<div class="hd-anel">' + anelHTML(est ? feito / est : feito ? 1 : 0, 150, est && feito > est ? 'var(--gas)' : 'var(--accent)', 12, '<b>' + fmtLivre(feito) + '</b><small>' + (est ? 'de ' + fmtLivre(est) + ' estimadas' : 'sem estimativa') + '</small>') + '</div>';
  if (est && feito > est) h += '<p class="dica" style="text-align:center;color:#ff9d94">Passou ' + fmtLivre(feito - est) + ' da estimativa.</p>';
  h += '<div class="hd-bts">' + (rod ? '<button type="button" class="p" data-td="crono">■ Parar<small data-crono-tempo>' + fmtCrono(tempoDe(crono.ativo)) + '</small></button>' : '<button type="button" class="p" data-td="crono">▶ Iniciar<small>cronômetro</small></button>') +
    '<button type="button" data-td="mais" data-min="30">+30 min<small>lançar</small></button><button type="button" data-td="mais" data-min="60">+1 h<small>lançar</small></button><button type="button" data-td="outro">Outro<small>valor</small></button></div>';
  const ss = sessoesTarefa(t);
  h += '<div class="grp">Sessões' + (ss.length ? ' · toque numa lançada para apagar' : '') + '</div>' + (rod ? '<div class="tlh"><span>agora</span><b>' + fmtHora(new Date(crono.ativo.ini)) + ' →</b><b class="am">rodando</b></div>' : '') +
    (ss.length ? ss.slice(0, 30).map(s => { const d = new Date(s.ini); return '<button type="button" class="tlh" data-hs="' + esc(s.id) + '"' + (s.crono ? ' data-cr="1"' : '') + '><span>' + DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + '</span><b>' + fmtHora(d) + '–' + fmtHora(new Date(s.fim)) + '</b><b>' + fmtLivre(s.min) + ' <small class="mut">· ' + s.origem + '</small></b></button>'; }).join('') : '<p class="txt" style="color:var(--muted)">Nenhuma hora ainda. Toque em ▶ Iniciar, use +30 min ou escreva no Escrever: <i>“trabalhei 1h30 no ' + esc(t.titulo.toLowerCase().split(' ').slice(0, 2).join(' ')) + '”</i>.</p>');
  if (p) {
    const doProj = tarefas.filter(x => x.projetoId === p.id), porEt = p.etapas.map(e => ({ e, min: doProj.filter(x => x.etapaId === e.id).reduce((s, x) => s + minTarefa(x), 0) }));
    const outras = doProj.filter(x => !x.etapaId || !p.etapas.some(e => e.id === x.etapaId)).reduce((s, x) => s + minTarefa(x), 0), tot = porEt.reduce((s, x) => s + x.min, 0) + outras, mx = Math.max(1, ...porEt.map(x => x.min), outras);
    h += '<div class="grp">Por etapa do projeto</div>' + porEt.map(x => '<div class="barh"><span>' + esc(x.e.titulo) + '</span><i><u style="width:' + (x.min / mx * 100) + '%;background:#5fd39b"></u></i><b>' + (x.min ? fmtLivre(x.min) : '—') + '</b></div>').join('') + (outras ? '<div class="barh"><span>Sem etapa</span><i><u style="width:' + (outras / mx * 100) + '%;background:#5fd39b"></u></i><b>' + fmtLivre(outras) + '</b></div>' : '') +
      '<div class="campo-c"><span><small>Projeto ' + esc(p.nome) + '</small><b>' + fmtLivre(tot) + ' no total' + (p.prazo ? ' · prazo ' + fmtDM(p.prazo) : '') + '</b></span></div>';
  }
  h += '<div class="actions" style="margin-top:14px"><button type="button" class="btn ' + (t.feita ? '' : 'primary') + '" data-td="feita">' + (t.feita ? 'Reabrir' : '✓ Feita') + '</button><button type="button" class="btn" data-td="estimativa">' + (est ? 'Estimativa ' + fmtLivre(est) : 'Estimar tempo') + '</button><button type="button" class="btn" data-td="prazo">Prazo</button>' + (!t.feita ? '<button type="button" class="btn" data-td="agendar">Agendar horário</button>' : '') + '<button type="button" class="btn" data-td="cat">Categoria</button>' + (p ? '' : projetos.length ? '<button type="button" class="btn" data-td="proj">Projeto</button>' : '') + '<button type="button" class="btn danger" data-td="apagar">Apagar</button></div>';
  $('tarefasLista').innerHTML = h;
}
function renderHorasTarefas() {
  const agora = Date.now(), de = horasPer === 'semana' ? inicioSemana(agora) : inicioMes(agora), ate = horasPer === 'semana' ? maisDias(de, 7) - 1 : fimMes(agora);
  const l = tarefas.map(t => ({ t, min: minTarefa(t, de, ate) })).filter(x => x.min > 0).sort((a, b) => b.min - a.min), tot = l.reduce((s, x) => s + x.min, 0), mx = Math.max(1, ...l.map(x => x.min));
  $('subTarefas').textContent = fmtLivre(tot) + (horasPer === 'semana' ? ' esta semana' : ' neste mês');
  let h = '<div class="per">' + [['semana', 'Semana'], ['mes', 'Mês']].map(([k, n]) => '<button type="button" data-hz="' + k + '" class="' + (horasPer === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  h += '<div class="kp"><div><b>' + fmtLivre(tot) + '</b><small>em tarefas</small></div><div><b>' + l.length + '</b><small>' + (l.length === 1 ? 'tarefa' : 'tarefas') + '</small></div><div><b class="' + (l.some(x => x.t.estimativa && minTarefa(x.t) > x.t.estimativa) ? 'gas' : '') + '">' + l.filter(x => x.t.estimativa && minTarefa(x.t) > x.t.estimativa).length + '</b><small>passaram da estimativa</small></div></div>';
  h += l.length ? '<div class="grp">Horas por tarefa</div>' + l.map(x => '<button type="button" class="hz" data-ht="' + esc(x.t.id) + '"><span class="l"><span>' + esc(x.t.titulo) + '</span><b>' + fmtLivre(x.min) + (x.t.estimativa ? '<small> / ' + fmtLivre(x.t.estimativa) + '</small>' : '') + '</b></span><i><u style="width:' + (x.min / mx * 100) + '%;background:' + categoriaPorId(x.t.categoria).cor + '"></u></i></button>').join('')
    : '<div class="empty">Nenhuma hora em tarefas ' + (horasPer === 'semana' ? 'nesta semana' : 'neste mês') + '.<br>Toque no ▶ de uma tarefa para cronometrar, ou escreva <i>“trabalhei 1h30 no relatório”</i>.</div>';
  $('tarefasLista').innerHTML = h;
}
$('tarefasLista').addEventListener('click', async e => {
  const hz = e.target.closest('[data-hz]'); if (hz) { horasPer = hz.dataset.hz; renderTarefas(); return; }
  const ht = e.target.closest('[data-ht]'); if (ht) { abrirTarefa(ht.dataset.ht); return; }
  const hs = e.target.closest('[data-hs]');
  const t = tarefas.find(x => x.id === tarefaAberta);
  if (hs && t) {
    if (hs.dataset.cr) { abrirSessao(hs.dataset.hs); return; }
    if (!hs.classList.contains('armed')) { hs.classList.add('armed'); hs.querySelector('b:last-child').textContent = 'Apagar? toque de novo'; return; }
    t.horas = (t.horas || []).filter(x => x.id !== hs.dataset.hs); await salvarTarefas(); renderTarefas(); return;
  }
  const b = e.target.closest('[data-td]'); if (!b || !t) { if (b?.dataset.td === 'voltar') { tarefaAberta = null; renderTarefas(); } return; }
  const a = b.dataset.td, foto = clonar(tarefas);
  if (a === 'voltar') { tarefaAberta = null; renderTarefas(); return; }
  if (a === 'crono') { await cronoTarefa(t); renderTarefas(); return; }
  if (a === 'mais') { const min = +b.dataset.min; lancarHoras(t, min); await salvarTarefas(); renderTarefas(); toastDesfazer('+' + fmtLivre(min) + ' em ' + t.titulo, () => voltarTarefas(foto)); return; }
  if (a === 'outro') { abrirForm('Lançar horas · ' + t.titulo, [{ k: 'tempo', rot: 'Quanto tempo', ph: 'Ex.: 1h20 ou 45 min' }, { k: 'dia', rot: 'Dia', tipo: 'date', v: dataInput(Date.now()) }], async d => {
    const r = finDuracao(finTxt(d.tempo).replace(/^(\d{1,3})$/, '$1 min')); if (!r) { toast('Escreva como 1h20 ou 45 min'); return false; }
    const ini = d.dia ? Math.min(Date.now(), lerDataInput(d.dia, new Date().getHours())) - r.min * 60000 : Date.now() - r.min * 60000;
    lancarHoras(t, r.min, 'lançado', ini); await salvarTarefas(); renderTarefas(); toastDesfazer('+' + fmtLivre(r.min) + ' em ' + t.titulo, () => voltarTarefas(foto)); }); return; }
  if (a === 'feita') { t.feita = !t.feita; t.feitaEm = t.feita ? Date.now() : null; if (t.feita && crono.ativo?.tarefaId === t.id) await pararCrono(false); }
  if (a === 'estimativa') { escolherOpcao('Quanto tempo deve levar?', [[0, 'Sem estimativa'], [30, '30 min'], [60, '1 hora'], [90, '1h30'], [120, '2 horas'], [180, '3 horas'], [240, '4 horas'], [360, '6 horas'], [480, '8 horas'], [600, '10 horas'], [900, '15 horas'], [1200, '20 horas'], [2400, '40 horas']], t.estimativa || 0, async v => { t.estimativa = +v || null; await salvarTarefas(); renderTarefas(); }); return; }
  if (a === 'prazo') { abrirForm('Prazo · ' + t.titulo, [{ k: 'prazo', rot: 'Prazo (deixe vazio para tirar)', tipo: 'date', v: t.prazo !== null ? dataInput(t.prazo) : '' }], async d => { const novo = d.prazo ? inicioDoDia(lerDataInput(d.prazo, 12)).getTime() : null; if (novo !== null && t.prazo !== null && novo > t.prazo) t.adiada = (t.adiada || 0) + 1; t.prazo = novo; await salvarTarefas(); await agendarAvisoTarefa(t); renderTarefas(); }); return; }
  if (a === 'agendar') { abrirAgendarTarefa(t); return; }
  if (a === 'cat') { escolherOpcao('Categoria', CATEGORIAS.map(c => [c.id, c.nome]), t.categoria, async v => { t.categoria = v; await salvarTarefas(); renderTarefas(); }); return; }
  if (a === 'proj') { escolherOpcao('Projeto', [['', 'Nenhum'], ...projetos.filter(p => !p.arquivado).map(p => [p.id, p.nome])], t.projetoId || '', async v => { t.projetoId = v || undefined; await salvarTarefas(); renderTarefas(); }); return; }
  if (a === 'apagar') {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Apagar mesmo?'; return; }
    tarefas = tarefas.filter(x => x.id !== t.id); tarefaAberta = null; await cancelarAvisoTarefa(t.id); await salvarTarefas(); renderTarefas();
    toastDesfazer('Tarefa apagada', () => voltarTarefas(foto)); return;
  }
  await salvarTarefas(); await agendarAvisoTarefa(t); renderTarefas();
});
ACOES_SW.tarefa = {
  dir: async id => { const t = tarefas.find(x => x.id === id); if (!t) return; const foto = clonar(tarefas); t.feita = !t.feita; t.feitaEm = t.feita ? Date.now() : null; await salvarTarefas(); await agendarAvisoTarefa(t); atualizarTudo(); toastDesfazer(t.feita ? '✓ ' + t.titulo : 'Reaberta', () => voltarTarefas(foto)); },
  esq: async id => { const t = tarefas.find(x => x.id === id); if (!t || t.feita) return; const foto = clonar(tarefas); const am = maisDias(inicioDoDia(Date.now()).getTime(), 1); if (t.prazo === null || t.prazo < am) { t.prazo = am; t.adiada = (t.adiada || 0) + 1; } else { t.prazo = maisDias(t.prazo, 1); t.adiada = (t.adiada || 0) + 1; } await salvarTarefas(); await agendarAvisoTarefa(t); atualizarTudo(); toastDesfazer(t.titulo + ' → ' + fmtPrazo(t.prazo), () => voltarTarefas(foto)); },
};

// ----- busca geral -----
let buscaVoltar = 'home', buscaFiltro = '';
function abrirBusca(filtro = '') { if (tela !== 'busca') buscaVoltar = tela; buscaFiltro = filtro; abrir('busca'); setTimeout(() => $('buscaCampo').focus(), 120); }
function resultadosBusca(q) {
  const tem = t => finTxt(t || '').includes(q), agora = Date.now();
  const num = /^\d+([.,]\d{1,2})?$/.test(q) ? parseFloat(q.replace(',', '.')) : null;
  const movs = fin.movs.filter(m => m.tipo !== 'rotativo' && (tem(m.titulo) || tem(categoriaPorId(m.categoria).nome) || (num !== null && Math.abs(m.valor - num) < 0.01))).sort((a, b) => b.t - a.t);
  const ags = fin.agendadas.filter(a => tem(a.titulo));
  const evs = eventos.filter(e => tem(e.titulo) || tem(e.texto)).map(e => ({ e, t: ocorrencias(e, agora, agora + 366 * 86400000, 1)[0] ?? e.inicio })).sort((a, b) => Math.abs(a.t - agora) - Math.abs(b.t - agora));
  const nts = notas.filter(n => tem(n.texto)).sort((a, b) => (b.editada || b.t) - (a.editada || a.t));
  const tfs = tarefas.filter(t => tem(t.titulo)).sort((a, b) => (a.feita - b.feita) || (b.criado || 0) - (a.criado || 0));
  return { movs, ags, evs, nts, tfs };
}
function renderBusca() {
  const q = finTxt($('buscaCampo').value).trim(); $('buscaLimpar').hidden = !q;
  if (q.length < 2) { $('buscaFiltros').innerHTML = ''; $('buscaRes').innerHTML = '<div class="empty">Procure em <b>finanças</b>, <b>agenda</b>, <b>anotações</b> e <b>tarefas</b> de uma vez.<br>Ex.: <i>mercado</i>, <i>dentista</i>, <i>monografia</i>, <i>312,45</i>.</div>'; return; }
  const r = resultadosBusca(q), nF = r.movs.length + r.ags.length;
  const fs = [['', 'Tudo', nF + r.evs.length + r.nts.length + r.tfs.length], ['fin', 'Finanças', nF], ['agenda', 'Agenda', r.evs.length], ['notas', 'Notas', r.nts.length], ['tarefas', 'Tarefas', r.tfs.length]];
  $('buscaFiltros').innerHTML = fs.filter(f => !f[0] || f[2]).map(([k, n, c]) => '<button type="button" class="chip' + (buscaFiltro === k ? ' on' : '') + '" data-bf="' + k + '">' + n + ' · ' + c + '</button>').join('');
  let h = '';
  const ver = k => !buscaFiltro || buscaFiltro === k;
  if (ver('fin') && nF) {
    const mes = r.movs.filter(m => m.t >= inicioMes(Date.now()) && sinalMov(m) < 0).reduce((s, m) => s + (m.tipo === 'gasto' ? valorGasto(m) : m.valor), 0);
    h += '<div class="gh"><span>Finanças</span>' + (mes ? '<b class="gas">' + fmtBRL(mes) + ' no mês</b>' : '') + '</div>' + r.movs.slice(0, buscaFiltro ? 60 : 8).map(m => { const s = sinalMov(m); return '<button type="button" class="ext-it" data-bm="' + esc(m.id) + '"><span class="ic">' + iconeMov(m) + '</span><span class="tx"><b>' + esc(m.titulo) + '</b><small>' + fmtDMA(m.t) + ' · ' + esc(nomeContaMov(m)) + '</small></span><span class="v ' + (s < 0 ? 'gas' : s > 0 ? 'rec' : 'neu') + '">' + (s < 0 ? '− ' : s > 0 ? '+ ' : '') + fmtBRL(Math.abs(m.valor)) + '</span></button>'; }).join('') +
      r.ags.slice(0, 5).map(a => '<button type="button" class="ext-it" data-ba="' + esc(a.id) + '"><span class="ic">📅</span><span class="tx"><b>' + esc(a.titulo) + '</b><small>conta ' + (a.tipo === 'receber' ? 'a receber' : 'a pagar') + (a.repetir ? ' · ' + esc(fmtRepetir(a.repetir)) : '') + '</small></span><span class="v ' + (a.tipo === 'receber' ? 'rec' : 'gas') + '">' + fmtBRL(a.valor) + '</span></button>').join('') +
      (!buscaFiltro && r.movs.length > 8 ? '<button type="button" class="mais-res" data-bf="fin">Ver os ' + r.movs.length + ' lançamentos ›</button>' : '');
  }
  if (ver('agenda') && r.evs.length) h += '<div class="gh"><span>Agenda</span></div>' + r.evs.slice(0, buscaFiltro ? 40 : 5).map(x => { const d = new Date(x.t); return '<button type="button" class="ext-it" data-be="' + esc(x.e.id) + '" data-t="' + x.t + '"><span class="ic">🗓️</span><span class="tx"><b>' + esc(x.e.titulo) + '</b><small>' + DIAS_CURTO[d.getDay()] + ', ' + fmtDMA(x.t) + ' · ' + fmtHora(d) + (x.e.repetir ? ' · ↻ ' + esc(fmtRepetir(x.e.repetir)) : '') + '</small></span></button>'; }).join('');
  if (ver('notas') && r.nts.length) h += '<div class="gh"><span>Anotações</span></div>' + r.nts.slice(0, buscaFiltro ? 40 : 5).map(n => { const ls = n.texto.replace(RE_TAGS, '$1').split('\n').map(l => l.replace(/^\s*(#+|[-*•]\s*(\[.\])?)\s*/, '').trim()).filter(Boolean); return '<button type="button" class="ext-it" data-bn="' + esc(n.id) + '"><span class="ic">📝</span><span class="tx"><b>' + esc((ls[0] || '').slice(0, 60)) + '</b><small>' + esc(ls.slice(1, 4).join(', ').slice(0, 80) || fmtDM(n.t)) + '</small></span></button>'; }).join('');
  if (ver('tarefas') && r.tfs.length) h += '<div class="gh"><span>Tarefas</span></div>' + r.tfs.slice(0, buscaFiltro ? 40 : 5).map(t => '<button type="button" class="ext-it" data-bt="' + esc(t.id) + '"><span class="ic">' + (t.feita ? '✅' : '☐') + '</span><span class="tx"><b>' + esc(t.titulo) + '</b><small>' + (t.feita ? 'feita' : t.prazo !== null ? fmtPrazo(t.prazo) : 'sem prazo') + (minTarefa(t) ? ' · ' + fmtLivre(minTarefa(t)) : '') + '</small></span></button>').join('');
  $('buscaRes').innerHTML = h || '<div class="empty">Nada encontrado para “' + esc($('buscaCampo').value.trim()) + '”.</div>';
}
$('buscaCampo').addEventListener('input', renderBusca);
$('buscaLimpar').onclick = () => { $('buscaCampo').value = ''; buscaFiltro = ''; renderBusca(); $('buscaCampo').focus(); };
$('buscaFiltros').addEventListener('click', e => { const b = e.target.closest('[data-bf]'); if (!b) return; buscaFiltro = b.dataset.bf; renderBusca(); });
$('buscaRes').addEventListener('click', e => {
  const f = e.target.closest('[data-bf]'); if (f) { buscaFiltro = f.dataset.bf; renderBusca(); return; }
  const m = e.target.closest('[data-bm]'); if (m) { abrirEditMov(m.dataset.bm); return; }
  const a = e.target.closest('[data-ba]'); if (a) { abrirAgForm(a.dataset.ba); return; }
  const ev = e.target.closest('[data-be]'); if (ev) { agendaAba = 'prog'; agendaData = inicioDoDia(Number(ev.dataset.t)).getTime(); abrir('agenda'); return; }
  const n = e.target.closest('[data-bn]'); if (n) { notaPasta = ''; notaSel = n.dataset.bn; abrir('notas'); setTimeout(() => document.querySelector('.nota.sel')?.scrollIntoView({ block: 'center' }), 80); return; }
  const t = e.target.closest('[data-bt]'); if (t) abrirTarefa(t.dataset.bt);
});
$('btnBusca').onclick = () => abrirBusca();
$('btnBuscaFin').onclick = () => abrirBusca('fin');
document.querySelector('[data-busca-notas]').onclick = () => abrirBusca('notas');
