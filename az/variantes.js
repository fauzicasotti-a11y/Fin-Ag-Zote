
// =====================================================================
// 2.0 · Dois apps a partir do mesmo código: AgZote (APP = 'ag') e FinZote (APP = 'fin')
// Este módulo liga e desliga o que não pertence a cada app.
// =====================================================================
const NOME_APP = APP === 'fin' ? 'FinZote' : 'AgZote';
const ESQUEMA = APP === 'fin' ? 'finzote' : 'agzote';
let habitosGuardados = null; // AgZote não tem controle de hábitos: os dados antigos ficam guardados, mas fora da tela

// configurações: cada app mostra só o que é dele
const paginasTodasBase = paginasTodas;
paginasTodas = function () {
  const P = paginasTodasBase();
  const tira = (pag, f) => { if (P[pag]) P[pag].itens = P[pag].itens.filter(it => !f(it)); };
  if (APP === 'ag') {
    tira('main', it => it.p === 'fin');
    tira('notif', it => it.p === 'av-contas' || it.p === 'av-hab' || it.k === 'metasLembrete');
    tira('uso', it => it.k === 'atalhoHabito');
    tira('priv', it => it.k === 'esconderValores');
    P.main.itens.forEach(it => { if (it.p === 'pessoal') it.sub = 'Metas de leitura e treino, remédios'; });
    if (P.backup) P.backup.itens.splice(2, 0, { t: 'acao', a: 'levar-fin', titulo: '💳 Levar minhas finanças para o FinZote', sub: fin.movs.length ? fin.movs.length + ' lançamentos guardados aqui · gera o arquivo para importar' : 'nada de finanças guardado aqui' });
    if (P.sobre) P.sobre.itens[0] = { t: 'info', html: '<b class="grande">AgZote · versão ' + VERSAO + '</b><span class="rot">Agenda, tarefas, anotações e vida pessoal escritos como mensagem. As finanças ficam no app FinZote.</span>' };
  }
  if (APP === 'fin') Object.assign(P, paginasFin(P));
  return P;
};
CFG_ACOES['levar-fin'] = async () => { await exportarBackup(); config.finExportado = Date.now(); await guardar('az-config', config); };

// busca: cada app procura no que é dele
const resultadosBuscaBase = resultadosBusca;
resultadosBusca = function (q) {
  const r = resultadosBuscaBase(q);
  if (APP === 'ag') { r.movs = []; r.ags = []; }
  if (APP === 'fin') { r.evs = []; r.nts = []; r.tfs = []; }
  return r;
};

// avisos: o AgZote não agenda mais contas; o FinZote só agenda finanças
async function cancelarAvisosDeOutroApp() {
  if (!Notif || typeof Notif.getPending !== 'function') return;
  try {
    const p = (await Notif.getPending()).notifications || [];
    const fora = p.filter(n => { const x = n.extra || {}; return APP === 'ag' ? (x.fin || x.conta || x.habito || n.actionTypeId === 'conta' || String(n.actionTypeId || '').startsWith('hq-')) : !(x.fin || x.conta || x.backup || n.actionTypeId === 'conta'); });
    if (fora.length) await Notif.cancel({ notifications: fora.map(n => ({ id: n.id })) });
  } catch {}
}
if (APP === 'ag') {
  agendarAvisosFin = async () => {};
  delete BLOCOS_RESUMO.contas; delete BLOCOS_RESUMO.orc; delete BLOCOS_RESUMO.saldo; delete BLOCOS_RESUMO.habitos;
}
if (APP === 'fin') {
  agendarResumos = async () => {}; agendarRotinas = async () => {}; agendarAvisosPessoal = async () => {};
  reagendarTodos = async () => {}; agendarRelatorios = async () => {}; agendarAvisoTarefa = async () => {};
}
// chamado no início, depois de ler os dados e migrar
async function prepararApp() {
  document.title = NOME_APP;
  if (APP === 'ag') prepararAg(); else prepararFin();
  setTimeout(() => { if (permissaoOk) cancelarAvisosDeOutroApp(); }, 4000);
}
