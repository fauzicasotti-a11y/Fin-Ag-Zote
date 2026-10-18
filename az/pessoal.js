
// =====================================================================
// 1.10 · Pessoal: Lançar · Hábitos · Diário · Metas · Estudos · Leitura · Academia · Remédios
// =====================================================================
let pes = { diaChat: [], relatos: [], chat: [], materias: [], revisoes: [], provas: [], livros: [], leituras: [], treinos: [], corridas: [], medidas: [], remedios: [], doses: [], metas: [], habitos: [], diario: [], avisos: [] };
let pesAba = 'hoje', exSel = null;
// conversas do Pessoal (Lançar e Meu dia) gravadas à parte e só quando mudam (1.14)
let pesChatGravado = null;
async function salvarPes() {
  const { chat, diaChat, ...resto } = pes;
  if (APP === 'ag' && habitosGuardados) resto.habitos = habitosGuardados;
  await guardar('az-pessoal', resto);
  const txt = JSON.stringify({ chat: chat || [], diaChat: diaChat || [] }); if (txt !== pesChatGravado) { pesChatGravado = txt; await guardar('az-pes-chat', { chat: chat || [], diaChat: diaChat || [] }); }
}
const CORES_MAT = ['#5fd39b', '#7fc8ff', '#c3a6ff', '#ffb27a', '#ff8fb8', '#e6c35c', '#5fd3d0'];
const hojeChave = () => chaveDia(Date.now());
const ABAS_PES = [['hoje', 'Hoje'], ['meudia', 'Meu dia'], ['lancar', 'Lançar'], ['habitos', 'Hábitos'], ['diario', 'Diário'], ['metas', 'Metas'], ['estudos', 'Estudos'], ['leitura', 'Leitura'], ['academia', 'Academia'], ['remedios', 'Remédios']];

// ----- formulário genérico -----
let formAoSalvar = null;
function abrirForm(titulo, campos, aoSalvar, extra = {}) {
  formAoSalvar = aoSalvar;
  $('gfTit').textContent = titulo;
  $('gfCampos').innerHTML = campos.map(c => {
    const v = c.v ?? '';
    if (c.tipo === 'select') return '<div class="field"><label>' + esc(c.rot) + '</label><select data-k="' + c.k + '">' + c.ops.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
    if (c.tipo === 'check') return '<label class="check"><input type="checkbox" data-k="' + c.k + '"' + (v ? ' checked' : '') + '><span>' + esc(c.rot) + (c.dica ? '<small>' + esc(c.dica) + '</small>' : '') + '</span></label>';
    if (c.tipo === 'dias') return '<div class="field"><label>' + esc(c.rot) + '</label><div class="dias-sel" data-k="' + c.k + '">' + DIAS_CURTO.map((d, i) => '<button type="button" data-d="' + i + '" class="' + ((v || []).includes(i) ? 'on' : '') + '">' + d + '</button>').join('') + '</div></div>';
    return '<div class="field"><label>' + esc(c.rot) + '</label><input data-k="' + c.k + '" type="' + (c.tipo === 'date' ? 'date' : c.tipo === 'time' ? 'time' : 'text') + '"' + (c.tipo === 'num' ? ' inputmode="decimal"' : '') + ' value="' + esc(v) + '" placeholder="' + esc(c.ph || '') + '"></div>';
  }).join('');
  $('gfExcluir').hidden = !extra.excluir; $('gfExcluir').classList.remove('armed'); $('gfExcluir').textContent = 'Excluir';
  formAoSalvar.excluir = extra.excluir || null;
  $('formOv').hidden = false; setTimeout(() => { const i = $('gfCampos').querySelector('input[type=text]'); if (i && !i.value) i.focus(); }, 80);
}
$('gfCampos').addEventListener('click', e => { const b = e.target.closest('.dias-sel button'); if (b) b.classList.toggle('on'); });
$('gfCancelar').onclick = () => { $('formOv').hidden = true; };
$('formOv').addEventListener('click', e => { if (e.target === $('formOv')) $('formOv').hidden = true; });
$('gfExcluir').onclick = async () => { const b = $('gfExcluir'); if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Excluir mesmo?'; return; } $('formOv').hidden = true; await formAoSalvar.excluir(); };
$('formGen').addEventListener('submit', async e => {
  e.preventDefault(); const d = {};
  $('gfCampos').querySelectorAll('[data-k]').forEach(el => {
    if (el.classList.contains('dias-sel')) d[el.dataset.k] = [...el.querySelectorAll('.on')].map(b => +b.dataset.d);
    else if (el.type === 'checkbox') d[el.dataset.k] = el.checked; else d[el.dataset.k] = el.value.trim();
  });
  const r = await formAoSalvar(d); if (r !== false) $('formOv').hidden = true;
});
const numOu = (v, p = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? p : n; };

// ----- cálculos -----
const fimSemanaT = t => maisDias(inicioSemana(t), 7) - 1;
function minEstudo(mat, de, ate) { return crono.sessoes.filter(s => s.ini >= de && s.ini <= ate && (s.materiaId === mat.id || finTxt(s.titulo).includes(finTxt(mat.nome)))).reduce((t, s) => t + realMin(s), 0); }
function treinosEntre(de, ate) { return pes.treinos.filter(t => t.t >= de && t.t <= ate).length + pes.corridas.filter(c => c.t >= de && c.t <= ate && !pes.treinos.some(t => chaveDia(t.t) === chaveDia(c.t))).length; }
function semanasSeguidas() { let n = 0, ref = inicioSemana(Date.now()); const meta = config.treinosSemana || 3; if (treinosEntre(ref, fimSemanaT(ref)) < meta) ref = maisDias(ref, -7); while (treinosEntre(ref, fimSemanaT(ref)) >= meta && n < 200) { n++; ref = maisDias(ref, -7); } return n; }
function recordes() { const r = {}; for (const t of pes.treinos) for (const e of t.exercicios) { const k = finTxt(e.nome); if (!r[k] || e.carga > r[k].carga || (e.carga === r[k].carga && e.reps > r[k].reps)) r[k] = { ...e, t: t.t }; } return r; }
const livroAtual = () => pes.livros.filter(l => l.status === 'lendo').sort((a, b) => (b.atualizado || 0) - (a.atualizado || 0))[0] || null;
function ritmoLivro(l) { const regs = pes.leituras.filter(r => r.livroId === l.id); const dias = Math.max(1, (Date.now() - (l.inicio || Date.now())) / DIA_MS); const pd = (l.pagina || 0) / dias; return { pd, termina: pd > 0.5 && l.paginas ? Date.now() + (l.paginas - l.pagina) / pd * DIA_MS : null, regs }; }
const lidosNoAno = (ano = new Date().getFullYear()) => pes.livros.filter(l => l.status === 'lido' && l.fim && new Date(l.fim).getFullYear() === ano);
function paginasEntre(de, ate) { let s = 0; const porLivro = {}; for (const r of pes.leituras.slice().sort((a, b) => a.t - b.t)) { const ant = porLivro[r.livroId] ?? 0; if (r.t >= de && r.t <= ate) s += Math.max(0, r.pagina - ant); porLivro[r.livroId] = r.pagina; } return s; }
function dosesDoDia(chave) {
  const out = [];
  const fimDia = new Date(chave + 'T23:59').getTime();
  for (const r of pes.remedios.filter(x => x.ativo !== false && !x.sePrecisar && (!x.criado || inicioDoDia(x.criado).getTime() <= fimDia))) for (const h of r.horarios || []) {
    if (r.criado && chaveDia(r.criado) === chave && h < fmtHora(new Date(r.criado)) && !pes.doses.some(x => x.remId === r.id && x.horario === h && chaveDia(x.t) === chave)) continue;
    const d = pes.doses.find(x => x.remId === r.id && x.horario === h && chaveDia(x.t) === chave);
    out.push({ r, h, dose: d });
  }
  return out.sort((a, b) => a.h.localeCompare(b.h));
}
function emDia(de, ate) { let prev = 0, tom = 0; for (let t = inicioDoDia(de).getTime(); t <= ate && t <= Date.now(); t = maisDias(t, 1)) { const dd = dosesDoDia(chaveDia(t)).filter(x => t < inicioDoDia(Date.now()).getTime() || x.h <= fmtHora(new Date())); prev += dd.length; tom += dd.filter(x => x.dose).length; } return prev ? tom / prev : null; }
function diasEstoque(r) { const porDia = (r.horarios || []).length * (r.porDose || 1); return porDia && r.estoque != null ? Math.floor(r.estoque / porDia) : null; }
function sequenciaHabito(h) { let n = 0; let t = inicioDoDia(Date.now()).getTime(); if (!feitoHab(h, chaveDia(t))) t = maisDias(t, -1); for (let k = 0; k < 400; k++) { const dia = new Date(t).getDay(); if (h.criado && t < inicioDoDia(h.criado).getTime()) break; if ((h.dias || [0, 1, 2, 3, 4, 5, 6]).includes(dia)) { if (feitoHab(h, chaveDia(t))) n++; else break; } t = maisDias(t, -1); } return n; }
function progressoMeta(m) {
  const agora = Date.now(); let atual = m.progresso || 0, unidade = m.unidade || '', txt = '';
  if (m.tipo === 'estudo') { const mat = pes.materias.find(x => x.id === m.ref); atual = mat ? minEstudo(mat, m.criado, agora) / 60 : 0; unidade = 'h'; }
  if (m.tipo === 'livros') { atual = lidosNoAno().length; unidade = ' livros'; }
  if (m.tipo === 'treinos') { atual = semanasSeguidas(); unidade = ' semanas'; txt = treinosEntre(inicioSemana(agora), fimSemanaT(agora)) + ' de ' + (config.treinosSemana || 3) + ' nesta semana'; }
  if (m.tipo === 'corrida') { atual = Math.max(0, ...pes.corridas.filter(c => c.tipo === 'corrida').map(c => c.km)); unidade = ' km'; }
  if (m.tipo === 'financeira') { const mf = (fin.metas || []).find(x => x.id === m.ref); if (mf) { atual = guardadoMeta(mf); unidade = 'R$'; m = { ...m, alvo: mf.alvo, prazo: mf.prazo }; } }
  const frac = m.prazo ? Math.max(0, Math.min(1, (agora - m.criado) / Math.max(1, m.prazo - m.criado))) : null;
  const pct = m.alvo ? Math.min(100, atual / m.alvo * 100) : 0, ideal = frac !== null ? frac * 100 : null;
  let st = ['no ritmo', 'e-vence'];
  if (pct >= 100) st = ['concluída ✓', 'e-ok']; else if (ideal !== null && pct - ideal > 3) st = ['adiantada', 'e-ok']; else if (ideal !== null && pct - ideal < -8) st = ['atrasada', 'e-atr'];
  if (m.tipo === 'treinos') st = [atual + ' semanas 🔥', atual ? 'e-ok' : 'e-vence'];
  return { atual, alvo: m.alvo, pct, ideal, st, unidade, txt, prazo: m.prazo };
}
const fmtNum = (v, u) => u === 'R$' ? fmtBRL(v) : u === 'h' ? fmtLivre(v * 60) : (Math.round(v * 10) / 10).toString().replace('.', ',') + u;

// ----- tela -----
function renderPessoal() {
  ABAS_PES.forEach(([k]) => $('pa-' + k).classList.toggle('on', pesAba === k));
  ABAS_PES.forEach(([k]) => { const el = $('p-' + k); if (el) el.hidden = pesAba !== k; });
  $('chatPes').hidden = pesAba !== 'lancar';
  $('formPes').hidden = pesAba !== 'lancar';
  $('formDia').hidden = pesAba !== 'meudia';
  const h = new Date(); $('subPes').textContent = MESES_LONGO[h.getMonth()] + ' de ' + h.getFullYear();
  ({ hoje: renderPesHoje, meudia: renderDia, lancar: renderPesChat, habitos: renderHabitos, diario: renderDiario, metas: renderMetasPes, estudos: renderEstudos, leitura: renderLeitura, academia: renderAcademia, remedios: renderRemedios })[pesAba]();
  setTimeout(() => { const on = document.querySelector('#telaPessoal .abas .on'); if (on) on.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }, 20);
}
ABAS_PES.forEach(([k]) => { $('pa-' + k).onclick = () => { pesAba = k; renderPessoal(); if (k === 'lancar' || k === 'meudia') rolarChat(); }; });
// Lançar (chat)
const EXEMPLOS_PES = ['supino 4x10 40kg, agachamento 4x8 60kg', 'tomei a vitamina d', 'estudei 1h30 de python', 'li até a página 120', 'comecei a ler Sapiens, 450 páginas', 'peso 82,4', 'corri 3 km em 19 min', 'energia 4 humor 3', 'fiz meditação'];
function renderPesChat() {
  const vazio = !pes.materias.length && !pes.remedios.length && !pes.habitos.length;
  const boas = bolhaHTML('app', '<p>Escreva como mensagem e eu guardo na aba certa: treinos, corridas, peso, remédios tomados, horas de estudo, páginas lidas, hábitos e o diário de energia e humor.</p><div class="ex">' + EXEMPLOS_PES.map(t => '<button type="button" class="chip" data-ex="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
    (vazio ? '<p class="dica">Para estudos, remédios e hábitos, cadastre primeiro nas abas (ex.: a matéria “Python”, o remédio “Vitamina D”, o hábito “Meditar”).</p>' : ''), null);
  $('chatPes').innerHTML = boas + comSeparadores(pes.chat, it => it.k === 'me' ? bolhaHTML('me', '<p>' + esc(it.texto) + '</p>', it.t) : bolhaHTML('app', htmlItemPes(it), it.t));
  rolarChat();
}
function htmlItemPes(it, semDesfazer) { return it.html + (it.undo && !it.desfeito && !semDesfazer ? '<div class="actions"><button type="button" class="btn" data-pu="' + esc(it.id) + '">Desfazer</button></div>' : it.desfeito ? '<p class="dica">Desfeito.</p>' : ''); }
$('chatPes').addEventListener('click', e => cliquePes(e));
async function cliquePes(e) {
  const ex = e.target.closest('[data-ex]'); if (ex) { $('entradaPes').value = ex.dataset.ex; $('entradaPes').focus(); return; }
  const b = e.target.closest('[data-pu]'); if (!b) return;
  const it = pes.chat.find(x => x.id === b.dataset.pu); if (!it?.undo) return;
  desfazerPes(it.undo); it.desfeito = true; await salvarPes(); await salvarCrono(); renderPesChat();
}
function desfazerPes(u) {
  if (u.col) pes[u.col] = pes[u.col].filter(x => x.id !== u.id);
  if (u.crono) crono.sessoes = crono.sessoes.filter(s => s.id !== u.crono);
  if (u.hab) { const h = pes.habitos.find(x => x.id === u.hab); if (h) marcarHabito(h, u.chave, false); }
  if (u.habq) { const h = pes.habitos.find(x => x.id === u.habq); if (h) desfazerRegHab(h, u.chave, u.regT); }
  if (u.livro) { const l = pes.livros.find(x => x.id === u.livro); if (l) Object.assign(l, u.antes); pes.leituras = pes.leituras.filter(r => r.id !== u.reg); }
  if (u.diario) { pes.diario = pes.diario.filter(d => d.chave !== u.diario); if (u.antes) pes.diario.push(u.antes); }
  if (u.rem) { const r = pes.remedios.find(x => x.id === u.rem); if (r && u.estoque != null) r.estoque = u.estoque; pes.doses = pes.doses.filter(d => d.id !== u.dose); }
  if (u.mat) { const m = pes.materias.find(x => x.id === u.mat); if (m && u.feito != null) m.feito = u.feito; }
}
function respPes(html, undo) { pes.chat.push({ k: 'r', id: novoId(), html, undo, t: Date.now() }); }
function registrarDose(r, quando = Date.now(), horario) {
  const ch = chaveDia(quando);
  if (horario === undefined) { const pend = (r.horarios || []).filter(h => !pes.doses.some(d => d.remId === r.id && d.horario === h && chaveDia(d.t) === ch)); const agoraM = new Date(quando).getHours() * 60 + new Date(quando).getMinutes(); horario = pend.sort((a, b) => Math.abs(a.split(':')[0] * 60 + +a.split(':')[1] - agoraM) - Math.abs(b.split(':')[0] * 60 + +b.split(':')[1] - agoraM))[0] || null; }
  const d = { id: novoId(), remId: r.id, t: quando, horario }; const estoque = r.estoque;
  pes.doses.push(d); if (r.estoque != null) r.estoque = Math.max(0, r.estoque - (r.porDose || 1));
  return { d, estoque };
}
function lancarPes(texto) {
  const mh = lerMedidaHabito(texto);
  if (mh) { const reg = marcarHabito(mh.h, hojeChave(), mh.valor); respPes('<p>✓ ' + esc((mh.h.emoji || '') + ' ' + mh.h.nome) + ' <b>+' + fmtQtd(mh.valor, mh.h.unidade) + '</b> · ' + fmtQtd(totalHab(mh.h, hojeChave()), mh.h.unidade) + ' de ' + fmtQtd(mh.h.meta, mh.h.unidade) + (feitoHab(mh.h, hojeChave()) ? ' · meta batida 🎉' : '') + '</p>', { habq: mh.h.id, chave: hojeChave(), regT: reg?.t }); agendarAvisosPessoalDepois(); return; }
  const r = interpretarPessoal(texto, new Date(), { remedios: pes.remedios, materias: pes.materias, livros: pes.livros, habitos: pes.habitos });
  const agora = Date.now();
  if (!r) { respPes('<p>Não entendi. Exemplos: <i>“supino 4x10 40kg”</i>, <i>“tomei a vitamina d”</i>, <i>“estudei 1h de python”</i>, <i>“li até a página 80”</i>, <i>“energia 4 humor 3”</i>.</p>' + (!pes.materias.length && /estud/.test(finTxt(texto)) ? '<p class="dica">Cadastre a matéria na aba Estudos.</p>' : '') + (!pes.remedios.length && /tomei/.test(finTxt(texto)) ? '<p class="dica">Cadastre o remédio na aba Remédios.</p>' : '')); return; }
  if (r.acao === 'treino') {
    const rec = recordes(), t = { id: novoId(), t: agora, exercicios: r.exercicios }; pes.treinos.push(t);
    const linhas = r.exercicios.map(e => { const ant = rec[finTxt(e.nome)]; const novo = e.carga && (!ant || e.carga > ant.carga); return '<dt>' + esc(e.nome) + '</dt><dd>' + e.series + '×' + e.reps + (e.carga ? ' · ' + String(e.carga).replace('.', ',') + ' kg' : '') + (novo && ant ? ' 🏆 recorde' : '') + '</dd>'; }).join('');
    const sem = treinosEntre(inicioSemana(agora), fimSemanaT(agora));
    respPes('<p>✓ Treino registrado' + (r.exercicios.length ? ' · <b>' + r.exercicios.length + (r.exercicios.length === 1 ? ' exercício' : ' exercícios') + '</b>' : '') + '</p>' + (linhas ? '<dl class="ticket">' + linhas + '</dl>' : '') + '<p class="dica">Treino ' + sem + ' de ' + (config.treinosSemana || 3) + ' na semana.</p>', { col: 'treinos', id: t.id });
  }
  if (r.acao === 'corrida') { const c = { id: novoId(), t: agora, tipo: r.tipo, km: r.km, min: r.min }; pes.corridas.push(c); const pace = r.min ? r.min / r.km : null;
    respPes('<p>✓ ' + maiuscula(r.tipo) + ': <b>' + String(r.km).replace('.', ',') + ' km</b>' + (r.min ? ' em ' + Math.round(r.min) + ' min · ' + Math.floor(pace) + ':' + pad(Math.round((pace % 1) * 60)) + ' min/km' : '') + '</p>', { col: 'corridas', id: c.id }); }
  if (r.acao === 'medida') { const ant = pes.medidas.filter(m => m.tipo === r.tipo).sort((a, b) => b.t - a.t)[0]; const m = { id: novoId(), t: agora, tipo: r.tipo, valor: r.valor }; pes.medidas.push(m);
    const un = r.tipo === 'peso' ? ' kg' : r.tipo === 'gordura' ? '%' : ' cm'; respPes('<p>✓ ' + maiuscula(r.tipo) + ': <b>' + String(r.valor).replace('.', ',') + un + '</b>' + (ant ? ' (' + (r.valor - ant.valor > 0 ? '+' : '') + String(Math.round((r.valor - ant.valor) * 10) / 10).replace('.', ',') + ' desde ' + fmtDM(ant.t) + ')' : '') + '</p>', { col: 'medidas', id: m.id }); }
  if (r.acao === 'tomei') { const { d, estoque } = registrarDose(r.remedio); const de = diasEstoque(r.remedio);
    respPes('<p>✓ ' + esc(r.remedio.nome) + (r.remedio.dose ? ' ' + esc(r.remedio.dose) : '') + ' às ' + fmtHora(new Date()) + (d.horario ? ' (dose das ' + d.horario + ')' : '') + '.</p>' + (r.remedio.estoque != null ? '<p class="dica">Restam ' + r.remedio.estoque + (de !== null ? ': acaba em ' + de + (de === 1 ? ' dia' : ' dias') : '') + '.</p>' : ''), { rem: r.remedio.id, dose: d.id, estoque }); agendarAvisosPessoalDepois(); }
  if (r.acao === 'estoque') { const ant = r.remedio.estoque; r.remedio.estoque = (r.remedio.estoque || 0) + r.qtd; respPes('<p>✓ Estoque de ' + esc(r.remedio.nome) + ': <b>' + r.remedio.estoque + '</b>.</p>', { rem: r.remedio.id, estoque: ant }); }
  if (r.acao === 'estudo') {
    const m = r.materia, undo = { mat: m.id, feito: m.feito ?? null }; let h = '';
    if (r.min) { const s = { id: novoId(), evId: null, chave: null, titulo: m.nome, materiaId: m.id, categoria: 'estudo', ini: agora - r.min * 60000, fim: agora, pausaMin: 0, planIni: null, planFim: null, nota: 'lançado em Pessoal' }; crono.sessoes.push(s); undo.crono = s.id; const sem = minEstudo(m, inicioSemana(agora), fimSemanaT(agora)); h += '<p>✓ <b>+' + fmtLivre(r.min) + '</b> em ' + esc(m.nome) + ' · semana ' + fmtLivre(sem) + (m.metaMin ? ' de ' + fmtLivre(m.metaMin) : '') + '</p>' + (m.metaMin ? '<div class="prog"><div style="width:' + Math.min(100, sem / m.metaMin * 100) + '%;background:' + m.cor + '"></div></div>' : ''); }
    if (r.unidade) { m.feito = r.unidade; h += '<p>' + (m.total ? 'Curso: ' + esc(m.nomeUnidade || r.nomeUnidade || 'parte') + ' ' + r.unidade + ' de ' + m.total + ' (' + Math.round(r.unidade / m.total * 100) + '%).' : 'Registrado: ' + r.nomeUnidade + ' ' + r.unidade + '.') + '</p>'; }
    if (r.unidade || r.assunto) { const rv = { id: novoId(), materiaId: m.id, assunto: r.assunto || (r.nomeUnidade ? r.nomeUnidade + ' ' + r.unidade : m.nome), base: agora, feitas: [] }; if (!r.revisao) { pes.revisoes.push(rv); h += '<p class="dica">Revisões marcadas para ' + [1, 7, 30].map(d => fmtDM(maisDias(inicioDoDia(agora).getTime(), d))).join(', ') + '.</p>'; } }
    if (r.revisao) { const rv = pes.revisoes.filter(x => x.materiaId === m.id && x.feitas.length < 3).find(x => !r.assunto || finTxt(x.assunto).includes(finTxt(r.assunto))) || null; if (rv) { rv.feitas.push(agora); h += '<p>✓ Revisão de “' + esc(rv.assunto) + '” feita (' + rv.feitas.length + ' de 3).</p>'; } else h += '<p>✓ Revisão registrada em ' + esc(m.nome) + '.</p>'; }
    respPes(h || '<p>✓ Estudo registrado.</p>', undo);
  }
  if (r.acao === 'pagina' || r.acao === 'paginasLidas') {
    let l = r.livro; if (!l) { respPes('<p>Qual livro? Escreva <i>“comecei a ler (título), 300 páginas”</i> primeiro.</p>'); return; }
    const antes = { pagina: l.pagina, status: l.status, fim: l.fim, atualizado: l.atualizado }; const pg = r.acao === 'pagina' ? r.pagina : (l.pagina || 0) + r.qtd;
    l.pagina = Math.min(pg, l.paginas || pg); l.atualizado = agora; if (l.status === 'quero') { l.status = 'lendo'; l.inicio = agora; }
    const reg = { id: novoId(), livroId: l.id, t: agora, pagina: l.pagina }; pes.leituras.push(reg);
    let h = '<p>✓ <b>' + esc(l.titulo) + '</b>: página ' + l.pagina + (l.paginas ? ' de ' + l.paginas + ' (' + Math.round(l.pagina / l.paginas * 100) + '%)' : '') + '</p>';
    if (l.paginas && l.pagina >= l.paginas) { l.status = 'lido'; l.fim = agora; h += '<p>🎉 Livro terminado! ' + lidosNoAno().length + ' de ' + (config.metaLivrosAno || 12) + ' no ano.</p>'; }
    else { const rt = ritmoLivro(l); if (rt.termina) h += '<p class="dica">' + Math.round(rt.pd) + ' páginas por dia · termina por volta de ' + fmtDM(rt.termina) + '.</p>'; }
    respPes(h, { livro: l.id, antes, reg: reg.id });
  }
  if (r.acao === 'novoLivro') { const l = { id: novoId(), titulo: r.titulo, paginas: r.paginas, pagina: 0, status: 'lendo', inicio: agora, atualizado: agora }; pes.livros.push(l); respPes('<p>📖 Começou <b>' + esc(l.titulo) + '</b>' + (l.paginas ? ' · ' + l.paginas + ' páginas' : '') + '. Escreva “li até a página 30” para acompanhar.</p>', { col: 'livros', id: l.id }); }
  if (r.acao === 'queroLer') { const l = { id: novoId(), titulo: r.titulo, paginas: null, pagina: 0, status: 'quero', atualizado: agora }; pes.livros.push(l); respPes('<p>✓ <b>' + esc(l.titulo) + '</b> na lista “quero ler”.</p>', { col: 'livros', id: l.id }); }
  if (r.acao === 'terminei') { const l = r.livro, antes = { status: l.status, fim: l.fim, nota: l.nota, pagina: l.pagina }; l.status = 'lido'; l.fim = agora; if (l.paginas) l.pagina = l.paginas; if (r.nota) l.nota = r.nota; respPes('<p>🎉 <b>' + esc(l.titulo) + '</b> terminado' + (r.nota ? ' · ' + '★'.repeat(r.nota) : '') + '. ' + lidosNoAno().length + ' de ' + (config.metaLivrosAno || 12) + ' livros no ano.</p>', { livro: l.id, antes }); }
  if (r.acao === 'habito') { const h = r.habito; if (tipoHab(h) === 'qtd' || tipoHab(h) === 'tempo') { const v = h.medidas?.[0]?.valor || h.meta || 1; const reg = marcarHabito(h, hojeChave(), v); respPes('<p>✓ ' + esc((h.emoji || '') + ' ' + h.nome) + ' <b>+' + fmtQtd(v, h.unidade) + '</b> · ' + fmtQtd(totalHab(h, hojeChave()), h.unidade) + ' de ' + fmtQtd(h.meta, h.unidade) + '</p>', { habq: h.id, chave: hojeChave(), regT: reg?.t }); return; } marcarHabito(h, hojeChave(), true); respPes('<p>✓ ' + esc((h.emoji || '') + ' ' + h.nome) + ' feito hoje · sequência de <b>' + sequenciaHabito(h) + '</b> 🔥</p>', { hab: h.id, chave: hojeChave() }); }
  if (r.acao === 'diario') { const ch = hojeChave(), ant = pes.diario.find(d => d.chave === ch); const novo = { chave: ch, t: agora, energia: r.energia ?? ant?.energia ?? null, humor: r.humor ?? ant?.humor ?? null, nota: [ant?.nota, r.nota].filter(Boolean).join('\n') };
    pes.diario = pes.diario.filter(d => d.chave !== ch); pes.diario.push(novo); respPes('<p>✓ Diário de hoje' + (novo.energia ? ' · energia <b>' + novo.energia + '</b>' : '') + (novo.humor ? ' · humor <b>' + ['', '😞', '😕', '😐', '🙂', '😄'][novo.humor] + ' ' + novo.humor + '</b>' : '') + '</p>' + (r.nota ? '<p class="dica">' + esc(r.nota) + '</p>' : ''), { diario: ch, antes: ant || null }); }
}
$('formPes').addEventListener('submit', async e => {
  e.preventDefault(); const texto = $('entradaPes').value.trim(); if (!texto) return;
  $('entradaPes').value = ''; await processarPes(texto); $('entradaPes').focus();
});
async function processarPes(texto) {
  pes.chat.push({ k: 'me', texto, t: Date.now() });
  lancarPes(texto); if (pes.chat.length > 400) pes.chat = pes.chat.slice(-400);
  await salvarPes(); await salvarCrono(); renderPesChat();
}
// Hábitos
// Diário de energia e humor
const HUMOR = ['', '😞', '😕', '😐', '🙂', '😄'];
function renderDiario() {
  const ch = hojeChave(), d = pes.diario.find(x => x.chave === ch) || {};
  let h = '<div class="card"><div class="tp"><b>Hoje · ' + DIAS[new Date().getDay()] + ', ' + new Date().getDate() + '</b></div>' +
    '<div class="rot" style="margin-top:8px">ENERGIA</div><div class="notas5" data-campo="energia">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (d.energia === n ? 'on' : '') + '">' + '⚡'.repeat(1) + n + '</button>').join('') + '</div>' +
    '<div class="rot" style="margin-top:8px">HUMOR</div><div class="notas5" data-campo="humor">' + [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" class="' + (d.humor === n ? 'on' : '') + '">' + HUMOR[n] + '</button>').join('') + '</div>' +
    '<textarea id="diarioNota" rows="3" placeholder="Como foi o dia? (opcional)">' + esc(d.nota || '') + '</textarea><div class="actions"><button type="button" class="btn primary" data-pd="salvar">Salvar</button></div></div>';
  const ult = pes.diario.slice().sort((a, b) => b.t - a.t).filter(x => x.chave !== ch).slice(0, 20);
  const sem = pes.diario.filter(x => x.t >= inicioSemana(Date.now()));
  const med = (l, k) => { const v = l.map(x => x[k]).filter(Boolean); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null; };
  if (pes.diario.length) h += '<div class="kp"><div><b>' + (med(sem, 'energia') ? med(sem, 'energia').toFixed(1).replace('.', ',') : '—') + '</b><small>energia média na semana</small></div><div><b>' + (med(sem, 'humor') ? med(sem, 'humor').toFixed(1).replace('.', ',') : '—') + '</b><small>humor médio na semana</small></div><div><b>' + pes.diario.length + '</b><small>dias registrados</small></div></div>';
  const ano = pes.diario.find(x => x.chave === chaveDia(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()).getTime()));
  if (ano) h += '<div class="aviso a">📅 Neste dia, há 1 ano: energia ' + (ano.energia || '—') + ', humor ' + (HUMOR[ano.humor] || '—') + (ano.nota ? ' · “' + esc(ano.nota.slice(0, 120)) + '”' : '') + '</div>';
  if (ult.length) h += '<div class="grp">Dias anteriores</div>' + ult.map(x => { const t = new Date(x.chave + 'T12:00'); return '<div class="slot"><span class="t">' + DIAS_CURTO[t.getDay()] + ' ' + fmtDM(t.getTime()) + '</span><span class="d">⚡' + (x.energia || '—') + ' · ' + (HUMOR[x.humor] || '—') + (x.nota ? ' · ' + esc(x.nota.slice(0, 80)) : '') + '</span></div>'; }).join('');
  h += '<p class="dica">O cruzamento com a agenda fica em Resumo da semana › Bem-estar. A revisão da noite também pergunta.</p>';
  $('p-diario').innerHTML = h;
}
let diarioRasc = {};
$('p-diario').addEventListener('click', async e => {
  const n = e.target.closest('.notas5 button'); if (n) { const c = n.parentElement.dataset.campo; n.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === n)); diarioRasc[c] = +n.dataset.n; return; }
  if (e.target.closest('[data-pd="salvar"]')) { salvarDiario(diarioRasc.energia, diarioRasc.humor, $('diarioNota').value.trim()); diarioRasc = {}; await salvarPes(); renderDiario(); mostrarDialogo('Diário salvo', '<p>Registro de hoje guardado ✓</p>'); }
});
function salvarDiario(energia, humor, nota) { const ch = hojeChave(), ant = pes.diario.find(d => d.chave === ch) || {}; pes.diario = pes.diario.filter(d => d.chave !== ch); pes.diario.push({ chave: ch, t: Date.now(), energia: energia ?? ant.energia ?? null, humor: humor ?? ant.humor ?? null, nota: nota ?? ant.nota ?? '' }); }
// Metas pessoais
function renderMetasPes() {
  let h = '';
  if (!pes.metas.length) h = '<div class="empty"><b>Nenhuma meta pessoal.</b><br>Metas que juntam dados de várias áreas: horas de estudo de uma matéria, livros no ano, treinos por semana, distância de corrida, uma meta de dinheiro de Finanças ou qualquer outra que você atualiza à mão.</div>';
  else {
    const ps = pes.metas.map(m => ({ m, p: progressoMeta(m) }));
    h += '<div class="kp"><div><b>' + ps.filter(x => x.p.pct < 100).length + '</b><small>metas ativas</small></div><div><b class="rec">' + ps.filter(x => x.p.st[1] === 'e-ok').length + '</b><small>no ritmo ou adiantadas</small></div><div><b style="color:var(--accent)">' + ps.filter(x => x.p.pct >= 100).length + '</b><small>concluídas</small></div></div>';
    h += ps.map(({ m, p }) => '<button type="button" class="metac" data-pm="' + esc(m.id) + '"><div class="tp"><b>' + esc(m.nome) + '</b><em class="' + p.st[1] + '">' + p.st[0] + '</em></div><div class="prog"><div style="width:' + p.pct + '%;background:' + (m.tipo === 'financeira' ? 'var(--inv)' : 'var(--accent)') + '"></div>' + (p.ideal !== null ? '<i style="left:' + p.ideal + '%"></i>' : '') + '</div>' +
      '<div class="vals"><span><b>' + fmtNum(p.atual, p.unidade) + '</b>' + (p.alvo ? ' de ' + fmtNum(p.alvo, p.unidade) : '') + '</span><span>' + (p.txt || (p.prazo ? 'até ' + fmtDMA(p.prazo) : '')) + '</span></div><div class="fontes"><span>' + ({ manual: 'atualizada à mão', estudo: 'Cronômetro · Estudos', livros: 'Leitura', treinos: 'Academia', corrida: 'corridas registradas', financeira: 'Finanças › Metas' })[m.tipo] + '</span></div></button>').join('');
  }
  $('p-metas').innerHTML = h + '<div class="actions"><button type="button" class="btn primary" data-pm="nova">+ Nova meta</button></div>';
}
$('p-metas').addEventListener('click', e => { const b = e.target.closest('[data-pm]'); if (!b) return; formMetaPes(b.dataset.pm === 'nova' ? null : pes.metas.find(m => m.id === b.dataset.pm)); });
function formMetaPes(m) {
  const tipos = [['manual', 'Atualizo à mão'], ['estudo', 'Horas de estudo de uma matéria'], ['livros', 'Livros no ano'], ['treinos', 'Treinos por semana (sequência)'], ['corrida', 'Distância de corrida (km)'], ['financeira', 'Meta de dinheiro (Finanças)']];
  const refs = [['', '—'], ...pes.materias.map(x => [x.id, 'Matéria: ' + x.nome]), ...(fin.metas || []).map(x => [x.id, 'Finanças: ' + x.nome])];
  abrirForm(m ? 'Meta: ' + m.nome : 'Nova meta pessoal', [{ k: 'nome', rot: 'Nome', v: m?.nome, ph: 'Ex.: 🇬🇧 Inglês B2 até dezembro' }, { k: 'tipo', rot: 'Como medir', tipo: 'select', ops: tipos, v: m?.tipo || 'manual' }, { k: 'ref', rot: 'Ligada a (matéria ou meta de Finanças)', tipo: 'select', ops: refs, v: m?.ref || '' },
    { k: 'alvo', rot: 'Alvo (número)', tipo: 'num', v: m?.alvo ?? '', ph: 'Ex.: 120 (horas), 12 (livros), 5 (km)' }, { k: 'progresso', rot: 'Progresso atual (só para “à mão”)', tipo: 'num', v: m?.progresso ?? '' }, { k: 'unidade', rot: 'Unidade (só para “à mão”)', v: m?.unidade || '', ph: 'Ex.: kg, aulas' }, { k: 'prazo', rot: 'Prazo', tipo: 'date', v: m?.prazo ? dataInput(m.prazo) : '' }],
    async d => { if (!d.nome) return false; const dados = { nome: d.nome, tipo: d.tipo, ref: d.ref || null, alvo: numOu(d.alvo, null), progresso: numOu(d.progresso, 0), unidade: d.unidade ? ' ' + d.unidade.trim() : '', prazo: d.prazo ? lerDataInput(d.prazo, 23) : null };
      if (d.tipo === 'livros' && !dados.alvo) dados.alvo = config.metaLivrosAno || 12; if (d.tipo === 'treinos' && !dados.alvo) dados.alvo = 52;
      if (m) Object.assign(m, dados); else pes.metas.push({ id: novoId(), ...dados, criado: Date.now() }); await salvarPes(); renderMetasPes(); },
    m ? { excluir: async () => { pes.metas = pes.metas.filter(x => x.id !== m.id); await salvarPes(); renderMetasPes(); } } : {});
}
// Estudos
function renderEstudos() {
  const agora = Date.now(), ini = inicioSemana(agora), fim = fimSemanaT(agora);
  const tot = pes.materias.reduce((t, m) => t + minEstudo(m, ini, fim), 0), meta = pes.materias.reduce((t, m) => t + (m.metaMin || 0), 0);
  const revHoje = pes.revisoes.map(r => ({ r, due: r.feitas.length < 3 ? maisDias(inicioDoDia(r.base).getTime(), [1, 7, 30][r.feitas.length]) : null })).filter(x => x.due !== null).sort((a, b) => a.due - b.due);
  let h = '<div class="kp"><div><b>' + fmtLivre(tot) + '</b><small>estudadas na semana</small></div><div><b style="color:var(--accent)">' + (meta ? Math.round(tot / meta * 100) + '%' : '—') + '</b><small>' + (meta ? 'da meta de ' + fmtLivre(meta) : 'sem meta') + '</small></div><div><b>' + revHoje.filter(x => x.due <= fim).length + '</b><small>revisões na semana</small></div></div>';
  if (!pes.materias.length) h += '<div class="empty"><b>Cadastre suas matérias ou cursos.</b><br>O tempo vem do Cronômetro (sessões com o nome da matéria) e do chat: <i>“estudei 1h de python”</i>.</div>';
  for (const m of pes.materias) { const s = minEstudo(m, ini, fim), st = m.metaMin ? (s >= m.metaMin ? ['meta batida ✓', 'e-ok'] : s >= m.metaMin * (Math.min(7, (agora - ini) / DIA_MS + 1) / 7) - 15 ? ['no ritmo', 'e-vence'] : ['atrasada', 'e-atr']) : null;
    h += '<button type="button" class="metac" data-pe="mat" data-id="' + esc(m.id) + '"><div class="tp"><span class="sq" style="background:' + m.cor + ';width:10px;height:10px;border-radius:3px"></span><b>' + esc(m.nome) + '</b>' + (st ? '<em class="' + st[1] + '">' + st[0] + '</em>' : '') + '</div>' +
      '<div class="vals" style="margin-top:6px"><span>semana <b>' + fmtLivre(s) + '</b>' + (m.metaMin ? ' de ' + fmtLivre(m.metaMin) : '') + '</span><span>' + (m.total ? 'curso <b>' + Math.round((m.feito || 0) / m.total * 100) + '%</b>' : '') + '</span></div>' +
      (m.metaMin ? '<div class="prog"><div style="width:' + Math.min(100, s / m.metaMin * 100) + '%;background:' + m.cor + '"></div></div>' : '') + (m.total ? '<small style="color:var(--muted);font-size:.72rem">' + esc(m.curso || 'Curso') + ' · ' + esc(m.nomeUnidade || 'parte') + ' ' + (m.feito || 0) + ' de ' + m.total + '</small>' : '') + '</button>'; }
  if (revHoje.length) h += '<div class="grp">Revisões (1, 7 e 30 dias)</div>' + revHoje.slice(0, 8).map(({ r, due }) => { const dd = difDias(due), mat = pes.materias.find(x => x.id === r.materiaId); return '<div class="slot"><span class="t' + (dd <= 0 ? ' am' : '') + '">' + (dd < 0 ? 'atrasada' : dd === 0 ? 'hoje' : dd === 1 ? 'amanhã' : fmtDM(due)) + '</span><span class="d">' + esc(r.assunto) + ' <small style="color:var(--muted)">· ' + esc(mat?.nome || '') + ' · ' + ['1 dia', '7 dias', '30 dias'][r.feitas.length] + '</small> ' + (dd <= 0 ? '<button type="button" class="btn primary mini-b" data-pe="revisei" data-id="' + esc(r.id) + '">Revisei</button>' : '') + '</span></div>'; }).join('');
  const provas = pes.provas.filter(p => p.data >= inicioDoDia(agora).getTime()).sort((a, b) => a.data - b.data);
  if (provas.length) h += '<div class="grp">Provas e entregas</div>' + provas.map(p => '<div class="slot" data-pe="prova" data-id="' + esc(p.id) + '"><span class="t' + (difDias(p.data) <= 7 ? ' am' : '') + '">' + (difDias(p.data) === 0 ? 'hoje' : difDias(p.data) + ' dias') + '</span><span class="d">' + esc(p.titulo) + ' <small style="color:var(--muted)">· ' + fmtDM(p.data) + '</small></span></div>').join('');
  h += '<div class="actions"><button type="button" class="btn primary" data-pe="nova-mat">+ Matéria</button><button type="button" class="btn" data-pe="nova-prova">+ Prova ou entrega</button><button type="button" class="btn" data-pe="nova-rev">+ Revisão</button></div>';
  $('p-estudos').innerHTML = h;
}
$('p-estudos').addEventListener('click', async e => {
  const b = e.target.closest('[data-pe]'); if (!b) return; const a = b.dataset.pe, id = b.dataset.id;
  if (a === 'revisei') { const r = pes.revisoes.find(x => x.id === id); if (r) r.feitas.push(Date.now()); await salvarPes(); renderEstudos(); return; }
  if (a === 'nova-mat' || a === 'mat') { const m = a === 'mat' ? pes.materias.find(x => x.id === id) : null;
    abrirForm(m ? m.nome : 'Nova matéria ou curso', [{ k: 'nome', rot: 'Nome', v: m?.nome, ph: 'Ex.: Python' }, { k: 'meta', rot: 'Meta por semana (horas)', tipo: 'num', v: m?.metaMin ? m.metaMin / 60 : '' }, { k: 'curso', rot: 'Curso ou material (opcional)', v: m?.curso || '' }, { k: 'nomeUnidade', rot: 'Dividido em', tipo: 'select', ops: [['módulo', 'módulos'], ['capítulo', 'capítulos'], ['aula', 'aulas'], ['unidade', 'unidades'], ['lista', 'listas'], ['parte', 'partes']], v: m?.nomeUnidade || 'módulo' }, { k: 'total', rot: 'Quantos no total', tipo: 'num', v: m?.total || '' }, { k: 'feito', rot: 'Já concluí', tipo: 'num', v: m?.feito || '' }],
      async d => { if (!d.nome) return false; const dados = { nome: d.nome, metaMin: Math.round(numOu(d.meta) * 60), curso: d.curso, nomeUnidade: d.nomeUnidade, total: numOu(d.total) || null, feito: numOu(d.feito) }; if (m) Object.assign(m, dados); else pes.materias.push({ id: novoId(), cor: CORES_MAT[pes.materias.length % CORES_MAT.length], ...dados }); await salvarPes(); renderEstudos(); },
      m ? { excluir: async () => { pes.materias = pes.materias.filter(x => x.id !== m.id); await salvarPes(); renderEstudos(); } } : {}); }
  if (a === 'nova-prova' || a === 'prova') { const p = a === 'prova' ? pes.provas.find(x => x.id === id) : null;
    abrirForm(p ? p.titulo : 'Prova ou entrega', [{ k: 'titulo', rot: 'O quê', v: p?.titulo, ph: 'Ex.: Prova de inglês' }, { k: 'data', rot: 'Data', tipo: 'date', v: p ? dataInput(p.data) : '' }],
      async d => { if (!d.titulo || !d.data) return false; const dados = { titulo: d.titulo, data: lerDataInput(d.data) }; if (p) Object.assign(p, dados); else pes.provas.push({ id: novoId(), ...dados }); await salvarPes(); renderEstudos(); },
      p ? { excluir: async () => { pes.provas = pes.provas.filter(x => x.id !== p.id); await salvarPes(); renderEstudos(); } } : {}); }
  if (a === 'nova-rev') abrirForm('Nova revisão', [{ k: 'assunto', rot: 'Assunto', ph: 'Ex.: pandas groupby' }, { k: 'mat', rot: 'Matéria', tipo: 'select', ops: [['', '—'], ...pes.materias.map(x => [x.id, x.nome])] }],
    async d => { if (!d.assunto) return false; pes.revisoes.push({ id: novoId(), materiaId: d.mat || null, assunto: d.assunto, base: Date.now(), feitas: [] }); await salvarPes(); renderEstudos(); });
});
// Leitura
function renderLeitura() {
  const l = livroAtual(), meta = config.metaLivrosAno || 12, lidos = lidosNoAno();
  let h = '';
  if (l) { const rt = ritmoLivro(l); h += '<button type="button" class="metac" data-pl="livro" data-id="' + esc(l.id) + '"><div class="tp"><div><b>' + esc(l.titulo) + '</b><small style="display:block;color:var(--muted);font-weight:400;font-size:.72rem">lendo agora · desde ' + fmtDM(l.inicio || l.atualizado) + '</small></div>' + (l.paginas ? '<em class="e-vence">' + Math.round(l.pagina / l.paginas * 100) + '%</em>' : '') + '</div>' +
    (l.paginas ? '<div class="prog"><div style="width:' + (l.pagina / l.paginas * 100) + '%;background:#c3a6ff"></div></div>' : '') + '<div class="vals"><span>página <b>' + (l.pagina || 0) + '</b>' + (l.paginas ? ' de ' + l.paginas : '') + '</span><span>' + (l.paginas ? 'faltam ' + (l.paginas - l.pagina) : '') + '</span></div>' +
    '<div class="l3"><div><b>' + Math.round(rt.pd) + '</b><small>páginas por dia</small></div><div><b>' + (rt.termina ? fmtDM(rt.termina) : '—') + '</b><small>previsão de término</small></div><div><b>' + paginasEntre(inicioSemana(Date.now()), Date.now()) + '</b><small>páginas na semana</small></div></div></button>'; }
  else h += '<div class="empty"><b>Nenhum livro em leitura.</b><br>Escreva em Lançar: <i>“comecei a ler Sapiens, 450 páginas”</i> e depois <i>“li até a página 80”</i>.</div>';
  const outros = pes.livros.filter(x => x.status === 'lendo' && x !== l);
  if (outros.length) h += '<div class="grp">Também lendo</div>' + outros.map(x => '<div class="slot" data-pl="livro" data-id="' + esc(x.id) + '"><span class="t">' + (x.paginas ? Math.round(x.pagina / x.paginas * 100) + '%' : 'p. ' + x.pagina) + '</span><span class="d">' + esc(x.titulo) + '</span></div>').join('');
  const cores = ['#ff8fb8', '#5fd39b', '#7fc8ff', '#e6c35c', '#c3a6ff', '#ff7a59', '#5fd3d0', '#ffb27a', '#9cc6ff'];
  h += '<div class="grp">Livros de ' + new Date().getFullYear() + ' · meta ' + meta + '</div><div class="capas">' + Array.from({ length: Math.max(meta, lidos.length) }, (_, i) => i < lidos.length ? '<i style="background:' + cores[i % cores.length] + '" title="' + esc(lidos[i].titulo) + '"></i>' : i === lidos.length && l ? '<i style="background:#c3a6ff;opacity:.35"></i>' : '<i class="v"></i>').join('') + '</div>';
  const dia = (Date.now() - new Date(new Date().getFullYear(), 0, 1)) / DIA_MS, ritmoAno = lidos.length / Math.max(dia, 1) * 365;
  h += '<div class="vals" style="margin-top:6px"><span><b>' + lidos.length + '</b> lidos' + (l ? ' · 1 lendo' : '') + '</span><span>' + (ritmoAno >= meta ? 'no ritmo de ' + Math.round(ritmoAno) + ' no ano' : 'ritmo de ' + Math.round(ritmoAno) + ' no ano') + '</span></div>';
  const term = pes.livros.filter(x => x.status === 'lido').sort((a, b) => b.fim - a.fim).slice(0, 6);
  if (term.length) h += '<div class="grp">Terminados</div>' + term.map(x => '<div class="slot" data-pl="livro" data-id="' + esc(x.id) + '"><span class="t">' + MESES_N[new Date(x.fim).getMonth()] + '</span><span class="d">' + esc(x.titulo) + (x.nota ? ' · ' + '★'.repeat(x.nota) : '') + '</span></div>').join('');
  const quero = pes.livros.filter(x => x.status === 'quero');
  if (quero.length) h += '<div class="grp">Quero ler</div><div class="ex">' + quero.map(x => '<button type="button" class="chip" data-pl="livro" data-id="' + esc(x.id) + '">' + esc(x.titulo) + '</button>').join('') + '</div>';
  const falta = Math.max(0, meta - lidos.length), mesesRest = 12 - new Date().getMonth() - new Date().getDate() / 31;
  if (falta) h += '<div class="aviso a">Para bater ' + meta + ' livros: ' + falta + (falta === 1 ? ' livro' : ' livros') + ' em ' + Math.max(1, Math.round(mesesRest * 10) / 10).toString().replace('.', ',') + ' meses (1 a cada ' + Math.max(1, Math.round(mesesRest * 4.3 / falta)) + ' semanas).</div>';
  h += '<div class="actions"><button type="button" class="btn primary" data-pl="novo">+ Livro</button></div>';
  $('p-leitura').innerHTML = h;
}
$('p-leitura').addEventListener('click', e => { const b = e.target.closest('[data-pl]'); if (!b) return; const l = b.dataset.pl === 'livro' ? pes.livros.find(x => x.id === b.dataset.id) : null;
  abrirForm(l ? l.titulo : 'Novo livro', [{ k: 'titulo', rot: 'Título', v: l?.titulo }, { k: 'paginas', rot: 'Páginas', tipo: 'num', v: l?.paginas || '' }, { k: 'pagina', rot: 'Página atual', tipo: 'num', v: l?.pagina || '' }, { k: 'status', rot: 'Situação', tipo: 'select', ops: [['lendo', 'Lendo'], ['lido', 'Lido'], ['quero', 'Quero ler']], v: l?.status || 'lendo' }, { k: 'nota', rot: 'Nota', tipo: 'select', ops: [['', '—'], ['1', '★'], ['2', '★★'], ['3', '★★★'], ['4', '★★★★'], ['5', '★★★★★']], v: l?.nota || '' }],
    async d => { if (!d.titulo) return false; const dados = { titulo: d.titulo, paginas: numOu(d.paginas) || null, pagina: numOu(d.pagina), status: d.status, nota: +d.nota || null, atualizado: Date.now() };
      if (l) { if (d.status === 'lido' && l.status !== 'lido') dados.fim = Date.now(); if (d.status === 'lendo' && !l.inicio) dados.inicio = Date.now(); Object.assign(l, dados); } else pes.livros.push({ id: novoId(), ...dados, inicio: d.status === 'lendo' ? Date.now() : null, fim: d.status === 'lido' ? Date.now() : null });
      await salvarPes(); renderLeitura(); }, l ? { excluir: async () => { pes.livros = pes.livros.filter(x => x.id !== l.id); await salvarPes(); renderLeitura(); } } : {}); });
// Academia
function renderAcademia() {
  const agora = Date.now(), ini = inicioSemana(agora), meta = config.treinosSemana || 3;
  const peso = pes.medidas.filter(m => m.tipo === 'peso').sort((a, b) => b.t - a.t), p0 = peso[0], p30 = peso.find(m => m.t <= agora - 30 * DIA_MS) || peso[peso.length - 1];
  let h = '<div class="kp"><div><b>' + treinosEntre(ini, fimSemanaT(agora)) + '/' + meta + '</b><small>treinos na semana</small></div><div><b style="color:var(--accent)">' + semanasSeguidas() + ' 🔥</b><small>semanas seguidas</small></div><div><b>' + (p0 ? String(p0.valor).replace('.', ',') : '—') + '</b><small>kg' + (p0 && p30 && p30 !== p0 ? ' · ' + (p0.valor - p30.valor > 0 ? '+' : '') + String(Math.round((p0.valor - p30.valor) * 10) / 10).replace('.', ',') + ' em 30 dias' : '') + '</small></div></div>';
  h += '<div class="sem7 grande">' + [0, 1, 2, 3, 4, 5, 6].map(k => { const t = maisDias(ini, k), feito = pes.treinos.some(x => chaveDia(x.t) === chaveDia(t)) || pes.corridas.some(x => chaveDia(x.t) === chaveDia(t)); return '<span class="' + (feito ? 'f' : '') + (chaveDia(t) === hojeChave() ? ' hj' : '') + '">' + (feito ? '✓' : '') + '<small>' + DIAS_CURTO[new Date(t).getDay()] + '</small></span>'; }).join('') + '</div>';
  const rec = recordes(), nomes = Object.keys(rec);
  if (nomes.length) {
    const freq = {}; for (const t of pes.treinos) for (const e of t.exercicios) freq[finTxt(e.nome)] = (freq[finTxt(e.nome)] || 0) + 1;
    if (!exSel || !rec[exSel]) exSel = nomes.sort((a, b) => freq[b] - freq[a])[0];
    const pts = pes.treinos.filter(t => t.exercicios.some(e => finTxt(e.nome) === exSel)).sort((a, b) => a.t - b.t).map(t => [t.t, Math.max(...t.exercicios.filter(e => finTxt(e.nome) === exSel).map(e => e.carga))]).slice(-16);
    h += '<div class="grp">Evolução</div><div class="ex">' + nomes.slice(0, 8).map(n => '<button type="button" class="chip' + (n === exSel ? ' on' : '') + '" data-pa="ex" data-n="' + esc(n) + '">' + esc(rec[n].nome) + '</button>').join('') + '</div>';
    if (pts.length >= 2) { const W = 320, H = 120, mn = Math.min(...pts.map(p => p[1])) * 0.95, mx = Math.max(...pts.map(p => p[1])) * 1.05 || 1, X = i => 30 + i * (W - 40) / (pts.length - 1), Y = v => H - 18 - (v - mn) / (mx - mn || 1) * (H - 30);
      h += '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" width="100%">' + [mn, (mn + mx) / 2, mx].map(v => '<line x1="30" x2="' + (W - 8) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#2e3344"/><text x="26" y="' + (Y(v) + 3).toFixed(1) + '" fill="#9a9cae" font-size="9" text-anchor="end">' + Math.round(v) + '</text>').join('') +
        '<polyline points="' + pts.map((p, i) => X(i).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ') + '" fill="none" stroke="#ff8fb8" stroke-width="2.5"/>' + pts.map((p, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3" fill="#ff8fb8"/>').join('') +
        '<text x="30" y="' + (H - 3) + '" fill="#9a9cae" font-size="9">' + fmtDM(pts[0][0]) + '</text><text x="' + (W - 8) + '" y="' + (H - 3) + '" fill="#9a9cae" font-size="9" text-anchor="end">' + fmtDM(pts[pts.length - 1][0]) + '</text></svg><div class="leg"><span>carga máxima (kg) por treino</span><span style="margin-left:auto">' + (pts[pts.length - 1][1] - pts[0][1] >= 0 ? '+' : '') + (pts[pts.length - 1][1] - pts[0][1]) + ' kg</span></div>'; }
    else h += '<p class="dica">Registre mais treinos de ' + esc(rec[exSel].nome) + ' para ver o gráfico.</p>';
    h += '<div class="grp">Recordes</div>' + nomes.sort((a, b) => rec[b].carga - rec[a].carga).slice(0, 8).map(n => '<div class="slot"><span class="t">' + (rec[n].carga ? String(rec[n].carga).replace('.', ',') + ' kg' : '—') + '</span><span class="d">' + esc(rec[n].nome) + ' <small style="color:var(--muted)">· ' + rec[n].series + '×' + rec[n].reps + ' · ' + fmtDM(rec[n].t) + '</small></span></div>').join('');
  } else h += '<div class="empty">Registre treinos em Lançar: <i>“supino 4x10 40kg, agachamento 4x8 60kg”</i>.</div>';
  const cor = pes.corridas.slice().sort((a, b) => b.t - a.t).slice(0, 4);
  if (cor.length) h += '<div class="grp">Corridas e cardio</div>' + cor.map(c => '<div class="slot"><span class="t">' + fmtDM(c.t) + '</span><span class="d">' + maiuscula(c.tipo) + ' · ' + String(c.km).replace('.', ',') + ' km' + (c.min ? ' em ' + Math.round(c.min) + ' min' : '') + '</span></div>').join('');
  const tiposM = [...new Set(pes.medidas.map(m => m.tipo))];
  if (tiposM.length) h += '<div class="grp">Medidas</div>' + tiposM.map(tp => { const l = pes.medidas.filter(m => m.tipo === tp).sort((a, b) => b.t - a.t); const d = l[1] ? l[0].valor - l[1].valor : 0; return '<div class="slot"><span class="t">' + String(l[0].valor).replace('.', ',') + (tp === 'peso' ? ' kg' : tp === 'gordura' ? '%' : ' cm') + '</span><span class="d">' + maiuscula(tp) + (d ? ' <span class="' + (d < 0 ? 'rec' : 'gas') + '">' + (d > 0 ? '+' : '') + String(Math.round(d * 10) / 10).replace('.', ',') + '</span>' : '') + ' <small style="color:var(--muted)">· ' + fmtDM(l[0].t) + '</small></span></div>'; }).join('');
  const ult = pes.treinos.slice().sort((a, b) => b.t - a.t).slice(0, 5);
  if (ult.length) h += '<div class="grp">Últimos treinos</div>' + ult.map(t => '<div class="slot"><span class="t">' + fmtDM(t.t) + '</span><span class="d">' + (t.exercicios.length ? t.exercicios.map(e => esc(e.nome) + ' ' + e.series + '×' + e.reps + (e.carga ? ' ' + e.carga + 'kg' : '')).join(' · ') : 'treino') + '</span></div>').join('');
  $('p-academia').innerHTML = h;
}
$('p-academia').addEventListener('click', e => { const b = e.target.closest('[data-pa="ex"]'); if (b) { exSel = b.dataset.n; renderAcademia(); } });
// Remédios
function renderRemedios() {
  const ch = hojeChave(), hoje = dosesDoDia(ch), agoraH = fmtHora(new Date());
  const ed = emDia(Date.now() - 29 * DIA_MS, Date.now()), acabando = pes.remedios.filter(r => { const d = diasEstoque(r); return d !== null && d <= 7; });
  let h = '<div class="kp"><div><b class="rec">' + hoje.filter(x => x.dose).length + '/' + hoje.length + '</b><small>tomados hoje</small></div><div><b>' + (ed === null ? '—' : Math.round(ed * 100) + '%') + '</b><small>em dia (30 dias)</small></div><div><b style="color:var(--accent)">' + acabando.length + '</b><small>acabando</small></div></div>';
  if (!pes.remedios.length) h += '<div class="empty"><b>Nenhum remédio cadastrado.</b><br>Cadastre com os horários: o aviso chega na hora com os botões <b>Tomei</b> e <b>Adiar 15 min</b>. Também dá para escrever <i>“tomei a vitamina d”</i>.</div>';
  if (hoje.length) h += '<div class="grp">Hoje</div>' + hoje.map(x => '<div class="slot rem"><span class="t' + (!x.dose && x.h <= agoraH ? ' am' : '') + '">' + x.h + '</span><span class="d"><b>' + esc(x.r.nome) + '</b>' + (x.r.dose ? ' ' + esc(x.r.dose) : '') + '<small>' + (x.dose ? 'tomei às ' + fmtHora(new Date(x.dose.t)) : x.h <= agoraH ? 'pendente' : 'mais tarde') + '</small></span>' +
    (x.dose ? '<button type="button" class="ck ok" data-pr="desfazer" data-id="' + esc(x.dose.id) + '">✓</button>' : '<button type="button" class="ck" data-pr="tomar" data-id="' + esc(x.r.id) + '" data-h="' + x.h + '"></button>') + '</div>').join('');
  const sp = pes.remedios.filter(r => r.sePrecisar && r.ativo !== false);
  if (sp.length) h += '<div class="grp">Se precisar</div>' + sp.map(r => { const hj = pes.doses.filter(d => d.remId === r.id && chaveDia(d.t) === ch).length, ult = pes.doses.filter(d => d.remId === r.id).sort((a, b) => b.t - a.t)[0];
    return '<div class="slot rem"><span class="t">—</span><span class="d"><b>' + esc(r.nome) + '</b><small>' + (r.maxDia ? hj + ' de ' + r.maxDia + ' hoje' : '') + (ult ? ' · último ' + fmtDM(ult.t) + ' ' + fmtHora(new Date(ult.t)) : '') + '</small></span><button type="button" class="btn" data-pr="tomar-sp" data-id="' + esc(r.id) + '"' + (r.maxDia && hj >= r.maxDia ? ' disabled' : '') + '>Tomei</button></div>'; }).join('');
  const comEst = pes.remedios.filter(r => r.estoque != null && r.ativo !== false);
  if (comEst.length) h += '<div class="grp">Estoque</div>' + comEst.map(r => { const d = diasEstoque(r), tot = r.estoqueCheio || Math.max(r.estoque, 1); return '<button type="button" class="metac" data-pr="editar" data-id="' + esc(r.id) + '"><div class="tp"><b>' + esc(r.nome) + '</b><em class="' + (d !== null && d <= 7 ? 'e-atr' : 'e-ok') + '">' + (d === null ? r.estoque + ' un.' : d <= 0 ? 'acabou' : 'acaba ' + fmtDM(maisDias(inicioDoDia(Date.now()).getTime(), d))) + '</em></div><div class="prog"><div style="width:' + Math.min(100, r.estoque / tot * 100) + '%;background:' + (d !== null && d <= 7 ? 'var(--gas)' : 'var(--ok)') + '"></div></div><div class="vals"><span><b>' + r.estoque + '</b> restantes</span><span>' + (r.horarios || []).length * (r.porDose || 1) + ' por dia</span></div></button>'; }).join('');
  if (pes.remedios.length) { h += '<div class="grp">Últimos 14 dias</div><div class="sem14">' + Array.from({ length: 14 }, (_, k) => { const t = maisDias(inicioDoDia(Date.now()).getTime(), k - 13), dd = dosesDoDia(chaveDia(t)).filter(x => k < 13 || x.h <= agoraH); const ok = dd.length && dd.every(x => x.dose); return '<i class="' + (!dd.length ? '' : ok ? 'f' : 'x') + '" title="' + fmtDM(t) + '"></i>'; }).join('') + '</div>'; h += '<div class="grp">Cadastrados</div>' + pes.remedios.map(r => '<div class="slot" data-pr="editar" data-id="' + esc(r.id) + '"><span class="t">' + (r.sePrecisar ? 'se precisar' : (r.horarios || []).join(', ')) + '</span><span class="d">' + esc(r.nome) + (r.dose ? ' · ' + esc(r.dose) : '') + (r.ativo === false ? ' (pausado)' : '') + '</span></div>').join(''); }
  h += '<div class="actions"><button type="button" class="btn primary" data-pr="novo">+ Novo remédio</button></div>';
  $('p-remedios').innerHTML = h;
}
$('p-remedios').addEventListener('click', async e => {
  const b = e.target.closest('[data-pr]'); if (!b) return; const a = b.dataset.pr, id = b.dataset.id;
  if (a === 'tomar') { const r = pes.remedios.find(x => x.id === id); if (r) registrarDose(r, Date.now(), b.dataset.h); }
  if (a === 'tomar-sp') { const r = pes.remedios.find(x => x.id === id); if (r) registrarDose(r, Date.now(), null); }
  if (a === 'desfazer') { const d = pes.doses.find(x => x.id === id); if (d) { const r = pes.remedios.find(x => x.id === d.remId); if (r?.estoque != null) r.estoque += r.porDose || 1; pes.doses = pes.doses.filter(x => x.id !== id); } }
  if (a === 'novo' || a === 'editar') { formRemedio(a === 'editar' ? pes.remedios.find(x => x.id === id) : null); return; }
  await salvarPes(); agendarAvisosPessoalDepois(); renderRemedios();
});
function formRemedio(r) {
  abrirForm(r ? r.nome : 'Novo remédio', [{ k: 'nome', rot: 'Nome', v: r?.nome, ph: 'Ex.: Vitamina D' }, { k: 'dose', rot: 'Dose (opcional)', v: r?.dose || '', ph: 'Ex.: 2000 UI, 1 comprimido' }, { k: 'horarios', rot: 'Horários (separados por vírgula)', v: (r?.horarios || []).join(', '), ph: 'Ex.: 08:00, 20:00' },
    { k: 'sePrecisar', rot: 'Só quando precisar (sem horário)', tipo: 'check', v: r?.sePrecisar }, { k: 'maxDia', rot: 'Máximo por dia (se precisar)', tipo: 'num', v: r?.maxDia || '' }, { k: 'estoque', rot: 'Estoque atual (unidades)', tipo: 'num', v: r?.estoque ?? '' }, { k: 'porDose', rot: 'Unidades por dose', tipo: 'num', v: r?.porDose || 1 }, { k: 'ativo', rot: 'Ativo (avisos ligados)', tipo: 'check', v: r ? r.ativo !== false : true }],
    async d => { if (!d.nome) return false; const hs = d.horarios.split(/[,;\s]+/).map(x => { const m = /^(\d{1,2})(?::?(\d{2}))?h?$/.exec(x.trim()); return m ? pad(+m[1]) + ':' + (m[2] || '00') : null; }).filter(Boolean).sort();
      const est = d.estoque === '' ? null : numOu(d.estoque); const dados = { nome: d.nome, dose: d.dose, horarios: d.sePrecisar ? [] : hs, sePrecisar: d.sePrecisar, maxDia: numOu(d.maxDia) || null, estoque: est, estoqueCheio: est != null && (!r || est > (r.estoque || 0)) ? est : r?.estoqueCheio, porDose: numOu(d.porDose, 1) || 1, ativo: d.ativo };
      if (!d.sePrecisar && !hs.length) { mostrarDialogo('Faltou o horário', '<p>Informe os horários (ex.: 08:00, 20:00) ou marque “Só quando precisar”.</p>'); return false; }
      if (r) Object.assign(r, dados); else pes.remedios.push({ id: novoId(), ...dados, criado: Date.now() }); await salvarPes(); agendarAvisosPessoalDepois(); renderRemedios(); },
    r ? { excluir: async () => { pes.remedios = pes.remedios.filter(x => x.id !== r.id); await salvarPes(); agendarAvisosPessoalDepois(); renderRemedios(); } } : {});
}
// avisos de remédios e hábitos
let tiposRemOk = false;
async function agendarAvisosPessoal() {
  if (!Notif) return;
  try { if (pes.avisos?.length) await Notif.cancel({ notifications: pes.avisos.map(id => ({ id })) }); } catch {}
  pes.avisos = [];
  if (!permissaoOk) { await salvarPes(); return; }
  if (!tiposRemOk) await registrarTiposNotif();
  const lista = [], agora = new Date();
  if (config.remediosAviso !== false) for (const r of pes.remedios.filter(x => x.ativo !== false && !x.sePrecisar)) for (let k = 0; k < 3; k++) for (const h of r.horarios || []) {
    const [hh, mm] = h.split(':').map(Number), at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k, hh, mm);
    if (at <= agora) continue; const ch = chaveDia(at.getTime()); if (pes.doses.some(d => d.remId === r.id && d.horario === h && chaveDia(d.t) === ch)) continue;
    lista.push({ id: idNumerico('rem#' + r.id + '#' + ch + '#' + h), title: '💊 ' + r.nome + (r.dose ? ' · ' + r.dose : ''), body: 'Hora do remédio das ' + h + '.', actionTypeId: 'remedio', schedule: { at, allowWhileIdle: true }, extra: { remedio: r.id, horario: h, chave: ch } });
  }
  if (config.habitosAviso !== false) lista.push(...avisosHabitosQtd());
  if (config.habitosAviso !== false) for (const x of pes.habitos.filter(h => h.hora && h.lembrete !== 'intervalo')) for (let k = 0; k < 3; k++) {
    const [hh, mm] = x.hora.split(':').map(Number), at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k, hh, mm);
    if (at <= agora || !(x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(at.getDay()) || feitoHab(x, chaveDia(at.getTime()))) continue;
    lista.push({ id: idNumerico('hab#' + x.id + '#' + chaveDia(at.getTime())), title: (x.emoji || '✅') + ' ' + x.nome, body: 'Sequência de ' + sequenciaHabito(x) + ' dias. Bora manter!', actionTypeId: 'habito', schedule: { at, allowWhileIdle: true }, extra: { habito: x.id, chave: chaveDia(at.getTime()) } });
  }
  try { if (lista.length) await agendarNotif(lista); pes.avisos = lista.map(n => n.id); } catch {}
  await salvarPes();
}
let timerPes = null;
function agendarAvisosPessoalDepois() { clearTimeout(timerPes); timerPes = setTimeout(agendarAvisosPessoal, 1500); }
async function acaoNotifPessoal(ev) {
  const x = ev?.notification?.extra || {};
  if (x.remedio) {
    const r = pes.remedios.find(y => y.id === x.remedio); if (!r) return true;
    if (ev.actionId === 'tomei') { if (!pes.doses.some(d => d.remId === r.id && d.horario === x.horario && chaveDia(d.t) === x.chave)) registrarDose(r, Date.now(), x.horario); await salvarPes(); if (tela === 'pessoal') renderPessoal(); return true; }
    if (ev.actionId === 'adiar') { await agendarNotif([{ id: idNumerico('rem#adiar#' + r.id + '#' + x.horario + '#' + Date.now()), title: '💊 ' + r.nome, body: 'Lembrete adiado da dose das ' + x.horario + '.', actionTypeId: 'remedio', schedule: { at: new Date(Date.now() + (config.remAdiar || 15) * 60000), allowWhileIdle: true }, extra: x }]); return true; }
    pesAba = 'remedios'; abrir('pessoal'); return true;
  }
  if (x.habito) { const h = pes.habitos.find(y => y.id === x.habito); if (h && ev.actionId === 'feito') { marcarHabito(h, x.chave, true); await salvarPes(); return true; } if (h && /^m\d$/.test(ev.actionId || '')) { await somarPelaNotif(h, +ev.actionId.slice(1)); return true; } pesAba = 'habitos'; habSel = h ? h.id : null; abrir('pessoal'); return true; }
  return false;
}
async function exportarCSVPessoal() {
  const l = [['data', 'area', 'descricao', 'valor', 'unidade', 'detalhe'].join(';')];
  for (const s of crono.sessoes.filter(s => s.materiaId || s.categoria === 'estudo')) l.push([csvData(s.ini), 'estudo', csvQ(s.titulo), realMin(s), 'min', csvQ(s.nota)].join(';'));
  for (const r of pes.leituras) l.push([csvData(r.t), 'leitura', csvQ(pes.livros.find(x => x.id === r.livroId)?.titulo || ''), r.pagina, 'pagina', ''].join(';'));
  for (const t of pes.treinos) for (const e of t.exercicios) l.push([csvData(t.t), 'treino', csvQ(e.nome), e.carga, 'kg', e.series + 'x' + e.reps].join(';'));
  for (const c of pes.corridas) l.push([csvData(c.t), c.tipo, '', String(c.km).replace('.', ','), 'km', c.min ? Math.round(c.min) + ' min' : ''].join(';'));
  for (const m of pes.medidas) l.push([csvData(m.t), 'medida', m.tipo, String(m.valor).replace('.', ','), m.tipo === 'peso' ? 'kg' : 'cm', ''].join(';'));
  for (const d of pes.doses) l.push([csvData(d.t), 'remedio', csvQ(pes.remedios.find(x => x.id === d.remId)?.nome || ''), 1, 'dose', d.horario || 'se precisar'].join(';'));
  for (const d of pes.diario) l.push([csvData(new Date(d.chave + 'T12:00').getTime()), 'diario', '', d.energia || '', 'energia', 'humor ' + (d.humor || '')].join(';'));
  for (const h of pes.habitos) for (const ch of Object.keys(h.feitos || {})) l.push([csvData(new Date(ch + 'T12:00').getTime()), 'habito', csvQ(h.nome), 1, 'feito', ''].join(';'));
  const h = new Date(); await baixarTexto('azote-pessoal-' + pad(h.getDate()) + '-' + pad(h.getMonth() + 1) + '-' + h.getFullYear() + '.csv', '﻿' + l.join('\n'), 'Pessoal do AZote');
}
