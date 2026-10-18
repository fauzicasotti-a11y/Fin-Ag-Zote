
// =====================================================================
// 1.14 · Dados: migração única com número de versão e backup automático semanal
// =====================================================================
const VERSAO_DADOS = 7;
// cada passo roda uma vez só, em ordem; antes de uma atualização de estrutura o app guarda uma cópia
const MIGRACOES = [
  [1, () => { for (const e of eventos) if (e.trabalho === undefined) e.trabalho = /^(trabalho|trabalhar|expediente|plant[aã]o)\b/i.test(e.titulo || ''); }],
  [2, () => { // 1.5.1: compromissos lidos errado pela versão antiga ("das 19 até às 21", "dia útil")
    if (config.corrigiu151) return;
    for (const e of eventos) {
      if (!e.texto || !/\b(das|de)\s+\d{1,2}h?\s+at[eé]\s*$|\bdias?\s+[uú]teis\b|\b[uú]til\b/i.test(e.titulo || '')) continue;
      const r = interpretar(e.texto, new Date(e.criado || e.inicio), { avisoPadrao: e.avisoMin }), d = new Date(e.inicio);
      e.titulo = r.titulo; e.duracao = r.duracao; e.repetir = r.repetir || e.repetir; e.trabalho = e.trabalho || r.trabalho;
      e.inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), r.inicio.getHours(), r.inicio.getMinutes()).getTime();
    }
    config.corrigiu151 = true;
  }],
  [3, () => { for (const e of eventos) if (!e.categoria) e.categoria = categorizar(e.titulo, e.trabalho); }],
  [4, () => { pes.diaChat = pes.diaChat || []; pes.relatos = pes.relatos || []; }],
  [5, () => { for (const h of pes.habitos) { h.tipo = h.tipo || 'sim'; h.feitos = h.feitos || {}; h.regs = h.regs || {}; if (h.hora && !h.lembrete) h.lembrete = 'hora'; } }],
  [6, () => { config.resumoBlocos = JSON.parse(JSON.stringify(config.resumoBlocos || CFG_PADRAO.resumoBlocos)); config.relatorios = config.relatorios || []; for (const c of CATEGORIAS) if (config['orcIgn_' + c.id] === undefined) config['orcIgn_' + c.id] = false; }],
  [7, () => { fin.revOk = fin.revOk || {}; fin.receber = fin.receber || []; fin.naoAssin = fin.naoAssin || {}; for (const n of notas) { if (n.pasta === undefined) n.pasta = pastaDoTexto(n.texto); delete n.lado; } for (const t of tarefas) t.horas = t.horas || []; }],
];
async function migrarDados() {
  const atual = config.dadosVersao || 0; if (atual >= VERSAO_DADOS) return;
  if (eventos.length || fin.movs.length || notas.length) { try { await guardarCopia('antes-da-atualizacao.json'); } catch {} } // cópia de segurança antes de mexer na estrutura
  for (const [v, f] of MIGRACOES) if (v > atual) { try { f(); } catch (err) { console.error('migração', v, err); } }
  config.dadosVersao = VERSAO_DADOS;
  await Promise.all([guardar(CHAVE, eventos), guardar('az-config', config), salvarPes(), salvarFin(), guardar('az-notas', notas), guardar('az-tarefas', tarefas)]);
}
// ----- backup automático semanal -----
const PASTA_BACKUP = 'backups';
async function guardarCopia(nome, dados = dadosBackup()) {
  const texto = JSON.stringify(dados);
  if (Arquivos) { await Arquivos.writeFile({ path: PASTA_BACKUP + '/' + nome, data: texto, directory: 'DATA', encoding: 'utf8', recursive: true }); return true; }
  try { localStorage.setItem('az-copia-' + nome, texto); return true; } catch { return false; }
}
async function listarCopias() {
  if (Arquivos) { try { const r = await Arquivos.readdir({ path: PASTA_BACKUP, directory: 'DATA' }); return (r.files || []).map(f => typeof f === 'string' ? f : f.name).filter(n => /^azote-auto-.*\.json$/.test(n)).sort().reverse(); } catch { return []; } }
  return Object.keys(localStorage).filter(k => k.startsWith('az-copia-azote-auto-')).map(k => k.slice(9)).sort().reverse();
}
async function lerCopia(nome) {
  if (Arquivos) { const r = await Arquivos.readFile({ path: PASTA_BACKUP + '/' + nome, directory: 'DATA', encoding: 'utf8' }); return r.data; }
  return localStorage.getItem('az-copia-' + nome);
}
async function apagarCopia(nome) { try { if (Arquivos) await Arquivos.deleteFile({ path: PASTA_BACKUP + '/' + nome, directory: 'DATA' }); else localStorage.removeItem('az-copia-' + nome); } catch {} }
let fazendoBackup = false;
async function backupAutoSeHora(forcar = false) {
  if (config.backupAuto === false || fazendoBackup) return;
  if (!forcar && config.backupAutoUlt && Date.now() - config.backupAutoUlt < 7 * 86400000) return;
  if (!eventos.length && !fin.movs.length && !notas.length && !tarefas.length) return; // nada para guardar ainda
  fazendoBackup = true;
  try {
    const h = new Date(), nome = 'azote-auto-' + h.getFullYear() + '-' + pad(h.getMonth() + 1) + '-' + pad(h.getDate()) + '.json';
    if (!(await guardarCopia(nome))) return;
    for (const velho of (await listarCopias()).slice(4)) await apagarCopia(velho);
    config.backupAutoUlt = Date.now(); await guardar('az-config', config);
    if (Notif && permissaoOk) try { await agendarNotif([{ id: idNumerico('backup#auto'), title: '💾 Backup automático feito', body: 'Guardado no celular. Toque para mandar uma cópia ao Drive.', schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true }, extra: { backup: 'auto' } }]); } catch {}
  } catch {} finally { fazendoBackup = false; }
}
CFG_ACOES['enviar-auto'] = async () => {
  const l = await listarCopias(); if (!l.length) { responderConfig('Backup automático', '<p>Ainda não há cópia automática. Ela é feita uma vez por semana ao abrir o app.</p>'); return; }
  const texto = await lerCopia(l[0]);
  try {
    if (Arquivos && Compartilhar) { const r = await Arquivos.writeFile({ path: l[0], data: texto, directory: 'CACHE', encoding: 'utf8' }); await Compartilhar.share({ title: 'Backup do AZote', files: [r.uri], dialogTitle: 'Guardar o backup em…' }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = l[0]; a.click(); }
    config.ultimoBackup = Date.now(); await guardar('az-config', config); renderConfig();
  } catch {}
};
CFG_ACOES['restaurar-auto'] = async () => {
  const l = await listarCopias(); if (!l.length) { responderConfig('Backup automático', '<p>Ainda não há cópias automáticas guardadas.</p>'); return; }
  escolherOpcao('Restaurar qual cópia?', l.map(n => [n, n.replace('azote-auto-', '').replace('.json', '').split('-').reverse().join('/')]), l[0], async nome => {
    try { const d = JSON.parse(await lerCopia(nome)); importPendente = d; const q = d.exportado ? new Date(d.exportado) : null;
      responderConfig('Restaurar ' + nome, '<p>Essa cópia' + (q ? ' é de <b>' + q.getDate() + ' de ' + MESES_LONGO[q.getMonth()] + ', ' + fmtHora(q) + '</b> e' : '') + ' tem <b>' + d.eventos.length + ' compromissos</b> e <b>' + (d.fin?.movs?.length || 0) + ' lançamentos</b>.</p><div class="actions"><button class="btn primary" type="button" data-c="imp-juntar">Juntar com os atuais</button><button class="btn danger" type="button" data-c="imp-trocar">Substituir tudo</button><button class="btn" type="button" data-c="imp-cancelar">Cancelar</button></div>');
    } catch (err) { responderConfig('Restaurar', '<div class="note">Não consegui ler essa cópia (' + esc(err?.message || 'erro') + ').</div>'); }
  });
};
