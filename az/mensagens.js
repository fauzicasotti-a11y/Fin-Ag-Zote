
// =====================================================================
// 1.15 · Editar e apagar o que escreveu (o app refaz o que a mensagem criou)
// e sugestões do momento / completar o texto no Escrever e em Lançamentos
// =====================================================================
let msgEditando = null; // { tipo: 'esc' | 'fin', id?, t?, texto }
function resumoEntrada(en) {
  try {
    if (en.desfeito) return 'nada guardado';
    if (en.dest === 'fin') {
      const it = (en.refs || []).map(u => fin.chat.find(x => x.uid === u)).find(x => x && x.k !== 'me');
      const m = it?.k === 'mov' && fin.movs.find(x => x.id === it.id); if (m) return (sinalMov(m) < 0 ? '− ' : '+ ') + fmtBRL(m.valor) + ' · ' + m.titulo;
      const a = it?.k === 'ag' && fin.agendadas.find(x => x.id === it.id); if (a) return fmtBRL(a.valor) + ' · ' + a.titulo;
    }
    if (en.dest === 'agenda') {
      const it = (en.refs || []).map(u => recados.find(x => x.uid === u)).find(x => x?.k === 'ev'), ev = it && eventos.find(x => x.id === it.id);
      if (ev) { const d = new Date(ev.inicio); return ev.titulo + ', ' + DIAS_CURTO[d.getDay()] + ' ' + fmtDM(ev.inicio) + ' ' + fmtHora(d); }
    }
    if (en.dest === 'tarefa') { const t = tarefas.find(x => x.id === en.ref); if (t) return t.titulo + (en.horas ? ' · +' + fmtLivre(en.horas) : t.prazo !== null ? ' · ' + fmtPrazo(t.prazo) : ''); }
  } catch {}
  return '“' + en.texto + '”';
}
// desfaz o que uma lista de respostas de Finanças criou
async function desfazerItensFin(itens) {
  for (const it of itens) {
    if (it.k === 'mov') await apagarMov(it.id);
    if (it.k === 'ag') fin.agendadas = fin.agendadas.filter(a => a.id !== it.id);
    if (it.k === 'meta') { fin.metas = fin.metas.filter(m => m.id !== it.id); fin.movs = fin.movs.filter(m => m.metaId !== it.id); }
    if (it.k === 'div') { fin.movs.forEach(m => { if (m.dividaId === it.id) { delete m.dividaId; delete m.parcelas; } }); fin.dividas = fin.dividas.filter(x => x.id !== it.id); }
  }
}
async function editarEntradaEsc(en, novo) {
  const antes = resumoEntrada(en);
  if (!en.desfeito) await desfazerEntrada(en);
  for (const k of ['refs', 'ref', 'projeto', 'desfeito', 'horas', 'horaId']) delete en[k];
  en.texto = novo; en.dest = destinoDe(novo); en.editada = Date.now(); en.antes = antes;
  Object.assign(en, await processarComo(en.dest, novo));
  await Promise.all([salvarEscrever(), guardar('az-recados', recados), salvarFin(), salvarPes()]);
  agendarAvisosFinDepois();
}
async function apagarEntradaEsc(en) {
  if (!en.desfeito) await desfazerEntrada(en);
  escrever = escrever.filter(x => x !== en);
  await Promise.all([salvarEscrever(), guardar('az-recados', recados), salvarFin(), salvarPes()]);
}
function blocoFin(t) {
  const i = fin.chat.findIndex(x => x.k === 'me' && x.t === t); if (i < 0) return null;
  let j = i + 1; while (j < fin.chat.length && fin.chat[j].k !== 'me') j++;
  return { i, j, me: fin.chat[i], resp: fin.chat.slice(i + 1, j) };
}
const entradaDoFin = me => me?.uid ? escrever.find(x => (x.refs || []).includes(me.uid)) : null;
async function editarMsgFin(t, novo) {
  const b = blocoFin(t); if (!b) return;
  const en = entradaDoFin(b.me); if (en) { await editarEntradaEsc(en, novo); renderFin(); return; }
  await desfazerItensFin(b.resp); fin.chat.splice(b.i, b.j - b.i);
  const n0 = fin.chat.length; await processarFin(novo);
  const novos = fin.chat.splice(n0); novos.forEach(x => { x.t = t; }); if (novos[0]) novos[0].editada = Date.now();
  fin.chat.splice(b.i, 0, ...novos); await salvarFin(); agendarAvisosFinDepois(); renderChatFin();
}
async function apagarMsgFin(t) {
  const b = blocoFin(t); if (!b) return;
  const en = entradaDoFin(b.me); if (en) { await apagarEntradaEsc(en); }
  else { await desfazerItensFin(b.resp); fin.chat.splice(b.i, b.j - b.i); }
  await salvarFin(); agendarAvisosFinDepois(); renderFin();
}
// faixa “Editando” acima do campo
function mostrarFaixaEdicao() {
  for (const [id, tp] of [['escEdit', 'esc'], ['finEdit', 'fin']]) {
    const f = $(id), on = msgEditando?.tipo === tp; f.hidden = !on;
    if (on) f.innerHTML = '<span>✎ <b>Editando</b> “' + esc(msgEditando.texto.length > 48 ? msgEditando.texto.slice(0, 48) + '…' : msgEditando.texto) + '”</span><button type="button" data-fe-x aria-label="Cancelar edição">✕</button>';
  }
}
function cancelarEdicaoMsg() { const c = msgEditando && $(msgEditando.tipo === 'esc' ? 'entradaEsc' : 'entradaFin'); msgEditando = null; if (c) c.value = ''; mostrarFaixaEdicao(); }
document.addEventListener('click', e => { if (e.target.closest('[data-fe-x]')) cancelarEdicaoMsg(); });
function comecarEdicao(alvo) {
  msgEditando = alvo; const c = $(alvo.tipo === 'esc' ? 'entradaEsc' : 'entradaFin');
  c.value = alvo.texto; mostrarFaixaEdicao(); c.focus(); try { c.setSelectionRange(c.value.length, c.value.length); } catch {}
}
// chamado no envio dos campos do Escrever e de Lançamentos; devolve true se era uma edição
async function enviarEdicao(tipo, texto) {
  if (!msgEditando || msgEditando.tipo !== tipo) return false;
  const alvo = msgEditando; msgEditando = null; mostrarFaixaEdicao();
  if (texto === alvo.texto) { toast('Nada mudou'); return true; }
  if (tipo === 'esc') { const en = escrever.find(x => x.id === alvo.id); if (en) { await editarEntradaEsc(en, texto); renderEscrever(); toast('Mensagem corrigida ✓'); } }
  else { await editarMsgFin(alvo.t, texto); toast('Lançamento refeito ✓'); }
  return true;
}

// ----- sugestões do momento e completar -----
const chaveSug = t => finTxt(t).replace(/[\d.,]+(\s*(reais|r\$))?/g, ' ').replace(/\s+/g, ' ').trim();
function calcSugestoes(hist, agora = Date.now()) {
  const desde = agora - 90 * 86400000, por = new Map(), a = new Date(agora), ma = a.getHours() * 60 + a.getMinutes();
  for (const h of hist) {
    if (h.t < desde || !h.texto) continue; const k = chaveSug(h.texto); if (k.length < 3 || h.texto.length > 60) continue;
    const g = por.get(k) || { k, texto: h.texto, t: 0, dias: new Set(), agora: new Set() };
    g.dias.add(chaveDia(h.t)); if (h.t > g.t) { g.t = h.t; g.texto = h.texto; }
    const d = new Date(h.t), m = d.getHours() * 60 + d.getMinutes(); if (Math.min(Math.abs(m - ma), 1440 - Math.abs(m - ma)) <= 60) g.agora.add(chaveDia(h.t));
    por.set(k, g);
  }
  const l = [...por.values()];
  const ag = l.filter(g => g.agora.size >= 2).sort((x, y) => y.agora.size - x.agora.size || y.t - x.t).slice(0, 3);
  const us = l.filter(g => g.dias.size >= 2 && !ag.includes(g)).sort((x, y) => y.dias.size - x.dias.size || y.t - x.t).slice(0, 6);
  return { agora: ag, usados: us };
}
const histEsc = () => escrever.filter(en => !en.desfeito && !(APP === 'ag' && (en.dest === 'fin' || en.dest === 'finzote'))).map(en => ({ texto: en.texto, t: en.t }));
const histFin = () => [...fin.chat.filter(x => x.k === 'me').map(x => ({ texto: x.texto, t: x.t })), ...escrever.filter(en => en.dest === 'fin' && !en.desfeito).map(en => ({ texto: en.texto, t: en.t }))];
function acoesDoMomento() {
  const out = [], ch = hojeChave(), hj = new Date().getDay(), agoraM = new Date().getHours() * 60 + new Date().getMinutes();
  for (const h of pes.habitos.filter(x => (tipoHab(x) === 'qtd') && x.medidas?.length && (x.dias || [0, 1, 2, 3, 4, 5, 6]).includes(hj) && !feitoHab(x, ch)).slice(0, 2))
    out.push({ rot: (h.emoji || '✓') + ' +1 ' + h.medidas[0].nome.toLowerCase(), a: 'hab', id: h.id });
  for (const x of dosesDoDia(ch).filter(x => !x.dose && Math.abs(minDeHora(x.h) - agoraM) <= 90).slice(0, 2)) out.push({ rot: '💊 tomei ' + x.r.nome, a: 'dose', id: x.r.id, h: x.h });
  return out;
}
function quandoFoi(t) { const d = difDias(t); return d === 0 ? 'de hoje' : d === -1 ? 'igual ao de ontem' : d > -7 ? 'de ' + DIAS_CURTO[new Date(t).getDay()] : 'de ' + fmtDM(t); }
function renderSug(tipo) {
  const box = $(tipo === 'esc' ? 'escSug' : 'finSug'), campo = $(tipo === 'esc' ? 'entradaEsc' : 'entradaFin');
  if (!box) return;
  if (config.sugestoes === false || msgEditando?.tipo === tipo) { box.hidden = true; return; }
  const hist = tipo === 'esc' ? histEsc() : histFin(), v = campo.value.trim();
  let h = '';
  if (v.length >= 2) {
    const p = finTxt(v).replace(/\s+/g, ' ');
    const c = hist.slice().sort((a, b) => b.t - a.t).find(x => { const k = finTxt(x.texto).replace(/\s+/g, ' '); return k.startsWith(p) && k !== p; });
    if (c) h = '<button type="button" class="sug-comp" data-sg="' + esc(c.texto) + '">Completar: <b>' + esc(c.texto) + '</b> <span>· ' + quandoFoi(c.t) + '</span></button>';
  } else {
    const s = calcSugestoes(hist), ac = tipo === 'esc' ? acoesDoMomento() : [];
    if (ac.length || s.agora.length) h += '<div class="sug-t">Agora · ' + fmtHora(new Date()) + '</div><div class="sug">' + ac.map(x => '<button type="button" class="h" data-sa="' + x.a + '" data-id="' + esc(x.id) + '"' + (x.h ? ' data-hr="' + x.h + '"' : '') + '>' + esc(x.rot) + '</button>').join('') + s.agora.map(g => '<button type="button" class="h" data-sg="' + esc(g.texto) + '">' + esc(g.texto) + '</button>').join('') + '</div>';
    if (s.usados.length) h += '<div class="sug-t">Mais usados</div><div class="sug">' + s.usados.map(g => '<button type="button" data-sg="' + esc(g.texto) + '">' + esc(g.texto) + '</button>').join('') + '</div>';
  }
  box.innerHTML = h; box.hidden = !h;
}
for (const tipo of ['esc', 'fin']) {
  const campo = $(tipo === 'esc' ? 'entradaEsc' : 'entradaFin');
  campo.addEventListener('input', () => renderSug(tipo));
  $(tipo === 'esc' ? 'escSug' : 'finSug').addEventListener('pointerdown', e => { if (e.target.closest('button') && document.activeElement === campo) e.preventDefault(); }); // não fecha o teclado
  $(tipo === 'esc' ? 'escSug' : 'finSug').addEventListener('click', async e => {
    const g = e.target.closest('[data-sg]');
    if (g) { campo.value = g.dataset.sg; campo.focus(); try { campo.setSelectionRange(campo.value.length, campo.value.length); } catch {} renderSug(tipo); return; }
    const a = e.target.closest('[data-sa]'); if (!a) return;
    if (a.dataset.sa === 'hab') { const h = pes.habitos.find(x => x.id === a.dataset.id); if (h) { tocarHabito(h); await salvarPes(); agendarAvisosPessoalDepois(); } }
    if (a.dataset.sa === 'dose') { const r = pes.remedios.find(x => x.id === a.dataset.id); if (r) { registrarDose(r, Date.now(), a.dataset.hr); await salvarPes(); agendarAvisosPessoalDepois(); toast('💊 ' + r.nome + ' ✓'); } }
    renderSug(tipo);
  });
}
