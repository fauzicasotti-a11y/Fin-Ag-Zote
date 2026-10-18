
// =====================================================================
// 1.15 · Desfazer na hora (barra embaixo) e deslizar para agir nas listas
// =====================================================================
let timerSnack = null, snackDesfazer = null;
function toastDesfazer(txt, desfazer, ms = 5000) {
  const s = $('snack'); $('snackTxt').textContent = txt; snackDesfazer = desfazer || null;
  $('snackBt').hidden = !desfazer; s.hidden = false; posicionarSnack(); requestAnimationFrame(() => s.classList.add('on'));
  clearTimeout(timerSnack); timerSnack = setTimeout(fecharSnack, ms);
}
// fica logo acima da barra de baixo ou do campo de escrever da tela atual
function posicionarSnack() {
  const tops = [];
  const bar = $('barra'); if (!bar.hidden && bar.offsetParent) tops.push(bar.getBoundingClientRect().top);
  const sec = [...document.querySelectorAll('.tela')].find(x => x.offsetParent);
  if (sec) for (const el of sec.querySelectorAll('.composer, .nota-barra, .sug-barra, .edit-faixa')) if (!el.hidden && el.offsetParent) tops.push(el.getBoundingClientRect().top);
  const top = tops.length ? Math.min(...tops) : innerHeight - 16;
  $('snack').style.bottom = Math.max(12, innerHeight - top + 8) + 'px';
}
function fecharSnack() { const s = $('snack'); s.classList.remove('on'); snackDesfazer = null; setTimeout(() => { if (!s.classList.contains('on')) s.hidden = true; }, 220); }
$('snackBt').addEventListener('click', async () => { const f = snackDesfazer; fecharSnack(); if (f) { await f(); toast('Desfeito ✓'); } });
// cópia do estado antes de uma ação; o Desfazer volta exatamente ao que era
const clonar = o => JSON.parse(JSON.stringify(o));
function fotoFin() { const { chat, ...resto } = fin; return clonar(resto); }
async function voltarFin(foto) { const chat = fin.chat; fin = { ...clonar(foto), chat }; await salvarFin(); agendarAvisosFinDepois(); atualizarTudo(); }
async function voltarTarefas(foto) { tarefas = clonar(foto); await salvarTarefas(); for (const t of tarefas) await agendarAvisoTarefa(t); atualizarTudo(); }

// ----- deslizar: <div class="sw" data-sw="tipo" data-id="…"><div class="swp-bg">…</div><div class="swp-fg">…</div></div> -----
const ACOES_SW = {}; // tipo → { dir: fn(id), esq: fn(id) }
function swHTML(tipo, id, esq, dir, conteudo, extraCls = '') {
  return '<div class="swp ' + extraCls + '" data-sw="' + tipo + '" data-id="' + esc(id) + '"><div class="swp-bg"><span class="d">' + dir + '</span><span class="e">' + esq + '</span></div><div class="swp-fg">' + conteudo + '</div></div>';
}
let swAtual = null, swBloqClique = 0;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.swp'); if (!el || e.button > 0) return;
  swAtual = { el, fg: el.querySelector('.swp-fg'), x: e.clientX, y: e.clientY, dx: 0, ativo: false, id: e.pointerId };
});
document.addEventListener('pointermove', e => {
  const s = swAtual; if (!s || e.pointerId !== s.id) return;
  const dx = e.clientX - s.x, dy = e.clientY - s.y;
  if (!s.ativo) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { swAtual = null; return; }
    if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    s.ativo = true; s.el.classList.add('movendo'); clearTimeout(segurar); segurar = null;
  }
  s.dx = Math.max(-150, Math.min(150, dx));
  s.fg.style.transform = 'translateX(' + s.dx + 'px)';
  s.el.classList.toggle('pra-dir', s.dx > 0); s.el.classList.toggle('pra-esq', s.dx < 0);
  s.el.classList.toggle('pronto', Math.abs(s.dx) >= 88);
});
function soltarSw(e) {
  const s = swAtual; swAtual = null; if (!s || !s.ativo) return;
  swBloqClique = Date.now();
  const lado = s.dx >= 88 ? 'dir' : s.dx <= -88 ? 'esq' : null;
  s.fg.style.transition = 'transform .18s'; s.fg.style.transform = lado ? 'translateX(' + (lado === 'dir' ? 400 : -400) + 'px)' : '';
  setTimeout(async () => {
    s.el.classList.remove('movendo', 'pra-dir', 'pra-esq', 'pronto'); s.fg.style.transition = ''; s.fg.style.transform = '';
    const f = lado && ACOES_SW[s.el.dataset.sw]?.[lado]; if (f) { try { navigator.vibrate?.(10); } catch {} await f(s.el.dataset.id, s.el); }
  }, lado ? 170 : 180);
}
document.addEventListener('pointerup', soltarSw); document.addEventListener('pointercancel', soltarSw);
// depois de deslizar, o toque não vale como clique
document.addEventListener('click', e => { if (Date.now() - swBloqClique < 350 && e.target.closest('.swp')) { e.stopPropagation(); e.preventDefault(); } }, true);
