
// =====================================================================
// 1.10 · Configurações no estilo WhatsApp: engrenagem no topo, listas de opções,
// chaves liga/desliga e janelas de escolha (sem formato de chat).
// =====================================================================
let exatoOk = null, cfgPag = 'main', cfgBusca = '';
const PAGINAS_EXTRA = [], CFG_ACOES = {}, cfgPilha = []; // cfgPilha: páginas anteriores, para o Voltar subir um nível // páginas e ações registradas pelos módulos (relatórios, avisos, Posso gastar, backup)
const CFG_PADRAO = {
  avisoPadrao: 15, resumoHora: '07:00', tarefasHora: '09:00', contasAviso: true, metasLembrete: true, remediosAviso: true, habitosAviso: true,
  janelaIni: 7, janelaFim: 22, trabalhoOcupado: true, duracaoPadrao: 60, avisarConflitos: true, valoresCalendario: true,
  prefs: { acordar: '07:00', dormir: '23:00', almoco: true, almocoIni: '12:00', almocoFim: '13:00', fdsDepois: '09:00', pausa: 0 },
  revisaoHora: '21:00', domingoHora: '19:00', retroAviso: true,
  mostrarSaldoHome: true, esconderValores: false, jurosRotativo: 0.14,
  metaLivrosAno: 12, treinosSemana: 3, cronoNotif: true, tamanho: 'medio', esconderNotif: false,
  // 1.14
  meuDiaHora: '21:30', semanaAviso: true, fechamentoFin: false, resumoFormato: 'curto',
  resumoBlocos: [['comp', true], ['livre', true], ['contas', true], ['remedios', true], ['tarefas', true], ['orc', true], ['habitos', false], ['estudo', false], ['saldo', false]],
  relatorios: [], backupAuto: true,
  contasD3: false, contasD2: true, contasD1: false, contasD0: true, contasHora: '09:00', contasInsistir: false, contasMin: 0, contasReceber: true, contasFatFecha: true, contasBotoes: true, remAdiar: 15,
  dndAtivo: false, dndIni: '22:30', dndFim: '07:00', dndFds: false, dndExRem: true, dndExComp: true, dndExContas: false, dndExHab: false, focoCrono: true, focoTrabalho: false, agrupar: false,
  // 1.15
  sugestoes: true, descobertas: true, atalhoHabito: null, descOcultas: {},
  orcInicio: 1, orcEventuais: false, orcMetas: true, orcReserva: 0, orcCartao: true, orcDistrib: 'igual', orcModo: 'recalc', orcIgn_casa: false, orcIgn_saude: false,
};
const horas = (de, ate, passo = 60) => { const o = []; for (let m = de * 60; m <= ate * 60; m += passo) o.push([pad(Math.floor(m / 60)) + ':' + pad(m % 60), pad(Math.floor(m / 60)) + ':' + pad(m % 60)]); return o; };
const TAMANHOS = { pequeno: '14px', medio: '15px', grande: '16.5px', enorme: '18px' };
function lerCfg(k) { return k.startsWith('prefs.') ? config.prefs?.[k.slice(6)] : config[k]; }
function gravarCfg(k, v) { if (k.startsWith('prefs.')) { config.prefs = { ...(config.prefs || {}), [k.slice(6)]: v }; } else config[k] = v; }
// definição das telas
function paginasCfg() {
  const contas = fin.contas.filter(c => !ehInvest(c));
  const nB = config.ultimoBackup ? Math.floor((Date.now() - config.ultimoBackup) / 86400000) : null;
  return {
    main: { titulo: 'Configurações', itens: [
      { t: 'app' },
      { t: 'nav', p: 'notif', ic: '🔔', bg: '#3a2f12', titulo: 'Avisos', sub: 'Por tipo, não perturbe, foco, histórico' },
      { t: 'nav', p: 'uso', ic: '✨', bg: '#1d2a0a', titulo: 'Facilidades', sub: 'Sugestões, descobertas, atalhos, widget e gestos' },
      { t: 'nav', p: 'relatorios', ic: '📊', bg: '#2c2140', titulo: 'Relatórios', sub: 'Resumo da manhã, semana, mês e os seus' },
      { t: 'nav', p: 'agenda', ic: '📅', bg: '#1f2a45', titulo: 'Agenda e horários', sub: 'Horas livres, trabalho, duração padrão, conflitos' },
      { t: 'nav', p: 'prefs', ic: '🛌', bg: '#26304a', titulo: 'Preferências de horário', sub: 'Sono, almoço protegido, fim de semana, pausas' },
      { t: 'nav', p: 'rotinas', ic: '🌙', bg: '#2c2140', titulo: 'Rotinas', sub: 'Revisão da noite, planejamento de domingo, retrospectiva' },
      { t: 'nav', p: 'fin', ic: '💰', bg: '#13324a', titulo: 'Finanças', sub: 'Conta padrão, cartões, Posso gastar' },
      { t: 'nav', p: 'pessoal', ic: '🌱', bg: '#173d2a', titulo: 'Pessoal', sub: 'Metas de leitura e treino, remédios, hábitos' },
      { t: 'nav', p: 'crono', ic: '⏱️', bg: '#3f2414', titulo: 'Cronômetro', sub: 'Notificação fixa' },
      { t: 'nav', p: 'aparencia', ic: '🎨', bg: '#3a1f2a', titulo: 'Aparência', sub: 'Seu nome, tamanho do texto' },
      { t: 'nav', p: 'priv', ic: '🔒', bg: '#262a36', titulo: 'Privacidade', sub: 'Esconder valores e conteúdo dos avisos' },
      { t: 'nav', p: 'backup', ic: '💾', bg: '#123a2a', titulo: 'Backup e dados', sub: nB === null ? 'Você ainda não fez backup' : 'Último backup ' + (nB === 0 ? 'hoje' : 'há ' + nB + (nB === 1 ? ' dia' : ' dias')), alerta: nB === null || nB >= 7 },
      { t: 'nav', p: 'sobre', ic: 'ℹ️', bg: '#262a36', titulo: 'Sobre e ajuda', sub: 'Versão, exemplos de mensagens' },
    ] },
    agenda: { titulo: 'Agenda e horários', itens: [
      { t: 'sec', titulo: 'Horas livres' },
      { t: 'esc', k: 'janelaIni', titulo: 'Contar a partir de', sub: 'início do dia no calendário', ops: [5, 6, 7, 8, 9, 10].map(h => [h, pad(h) + ':00']) },
      { t: 'esc', k: 'janelaFim', titulo: 'Contar até', sub: 'fim do dia no calendário', ops: [20, 21, 22, 23, 24].map(h => [h, pad(h % 24) + ':00']) },
      { t: 'sw', k: 'trabalhoOcupado', titulo: 'Trabalho conta como ocupado', sub: 'desligado: a cor do dia mede só o tempo fora do trabalho' },
      { t: 'sec', titulo: 'Compromissos' },
      { t: 'esc', k: 'duracaoPadrao', titulo: 'Duração padrão', sub: 'quando o recado não disser', ops: [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hora'], [90, '1h30'], [120, '2 horas']] },
      { t: 'sw', k: 'avisarConflitos', titulo: 'Avisar conflitos de horário', sub: 'perguntar antes de marcar por cima de outro compromisso ou horário protegido' },
      { t: 'info', html: 'Recados que começam com “Trabalho”, “Expediente” ou “Plantão” entram como trabalho. Dá para mudar em Editar.' },
      { t: 'sec', titulo: 'Calendário' },
      { t: 'sw', k: 'valoresCalendario', titulo: 'Mostrar valores das contas', sub: 'nos dias do calendário' },
    ] },
    prefs: { titulo: 'Preferências de horário', itens: [
      { t: 'info', html: 'Valem nas sugestões de horário (achar horário livre, agendar tarefas, planejamento de domingo) e nos avisos de conflito. Não mudam as horas livres do calendário.' },
      { t: 'sec', titulo: 'Sono' },
      { t: 'esc', k: 'prefs.acordar', titulo: 'Acordo às', ops: horas(5, 10, 30) },
      { t: 'esc', k: 'prefs.dormir', titulo: 'Durmo às', ops: [...horas(21, 23, 30), ['24:00', '00:00']] },
      { t: 'sec', titulo: 'Almoço' },
      { t: 'sw', k: 'prefs.almoco', titulo: 'Proteger o almoço', sub: 'não sugerir nada nesse horário' },
      { t: 'esc', k: 'prefs.almocoIni', titulo: 'Almoço começa', ops: horas(11, 13, 30) },
      { t: 'esc', k: 'prefs.almocoFim', titulo: 'Almoço termina', ops: horas(12, 14, 30) },
      { t: 'sec', titulo: 'Fim de semana e pausas' },
      { t: 'esc', k: 'prefs.fdsDepois', titulo: 'Fim de semana só depois das', ops: [[null, 'Sem limite'], ...horas(8, 12)] },
      { t: 'esc', k: 'prefs.pausa', titulo: 'Pausa entre compromissos', sub: 'folga antes e depois nas sugestões', ops: [[0, 'Sem pausa'], [10, '10 min'], [15, '15 min'], [30, '30 min']] },
    ] },
    rotinas: { titulo: 'Rotinas', itens: [
      { t: 'esc', k: 'revisaoHora', titulo: 'Revisão da noite', sub: 'feito × pendente, mover para amanhã, prévia do dia seguinte', ops: [[null, 'Desligada'], ...horas(19, 23, 30)] },
      { t: 'acao', a: 'abrir-revisao', titulo: 'Abrir a revisão agora' },
      { t: 'esc', k: 'domingoHora', titulo: 'Planejamento de domingo', sub: 'conversa guiada para montar a semana', ops: [[null, 'Desligado'], ...horas(16, 21)] },
      { t: 'acao', a: 'abrir-plano', titulo: 'Planejar a semana agora' },
      { t: 'sw', k: 'retroAviso', titulo: 'Retrospectiva do mês', sub: 'aviso todo dia 1º, às 9h' },
      { t: 'acao', a: 'abrir-retro', titulo: 'Ver a retrospectiva' },
    ] },
    fin: { titulo: 'Finanças', itens: [
      { t: 'esc', k: 'contaPadrao', titulo: 'Conta padrão', sub: 'usada quando o lançamento não disser', ops: contas.length ? contas.map(c => [c.id, c.nome]) : [['', 'Nenhuma conta cadastrada']], valor: contaPadrao()?.id || '' },
      { t: 'acao', a: 'ir-saldos', titulo: 'Contas e investimentos', sub: fin.contas.length + (fin.contas.length === 1 ? ' cadastrada' : ' cadastradas') },
      { t: 'acao', a: 'ir-cartoes', titulo: 'Cartões de crédito', sub: 'o gasto conta no mês em que a fatura é paga', dir: String((fin.cartoes || []).length) },
      { t: 'esc', k: 'jurosRotativo', titulo: 'Juros do rotativo', sub: 'usado ao pagar só parte da fatura', ops: [0.08, 0.1, 0.12, 0.14, 0.16, 0.18].map(v => [v, (v * 100).toFixed(0) + '% ao mês']) },
      { t: 'sec', titulo: 'Tela' },
      { t: 'sw', k: 'mostrarSaldoHome', titulo: 'Mostrar saldo na tela inicial', sub: 'na prévia da conversa Finanças' },
      { t: 'sw', k: 'esconderValores', titulo: 'Esconder valores', sub: 'mostrar R$ •••• até tocar no olho em Finanças' },
      { t: 'nav', p: 'orc', ic: '💸', bg: '#1d2a0a', titulo: 'Posso gastar', sub: 'como o valor do dia é calculado' },
    ] },
    pessoal: { titulo: 'Pessoal', itens: [
      { t: 'esc', k: 'metaLivrosAno', titulo: 'Meta de livros no ano', ops: [4, 6, 8, 10, 12, 15, 20, 24, 30, 52].map(n => [n, n + ' livros']) },
      { t: 'esc', k: 'treinosSemana', titulo: 'Treinos por semana', ops: [1, 2, 3, 4, 5, 6, 7].map(n => [n, n + (n === 1 ? ' treino' : ' treinos')]) },
      { t: 'acao', a: 'ir-pessoal', titulo: 'Abrir Pessoal', sub: 'remédios, hábitos, estudos e leitura têm opções em cada aba' },
    ] },
    crono: { titulo: 'Cronômetro', itens: [
      { t: 'sw', k: 'cronoNotif', titulo: 'Notificação fixa', sub: 'mostrar o cronômetro rodando com Pausar e Parar' },
    ] },
    aparencia: { titulo: 'Aparência', itens: [
      { t: 'acao', a: 'nome', titulo: 'Seu nome', sub: 'aparece na saudação do painel Hoje', dir: config.nome || 'não informado' },
      { t: 'esc', k: 'tamanho', titulo: 'Tamanho do texto', ops: [['pequeno', 'Pequeno'], ['medio', 'Médio'], ['grande', 'Grande'], ['enorme', 'Enorme']] },
      { t: 'info', html: 'Tema: <b>Mono AMOLED</b>, preto puro com destaque verde-limão. Em telas AMOLED o preto fica apagado e economiza bateria.' },
    ] },
    priv: { titulo: 'Privacidade', itens: [
      { t: 'sw', k: 'esconderNotif', titulo: 'Esconder conteúdo dos avisos', sub: 'a notificação mostra só “Você tem um aviso do AZote”' },
      { t: 'sw', k: 'esconderValores', titulo: 'Esconder valores em Finanças', sub: 'mostrar R$ •••• até tocar no olho' },
    ] },
    backup: { titulo: 'Backup e dados', itens: [
      { t: 'info', html: '<span class="rot">ÚLTIMO BACKUP</span><b class="grande">' + (config.ultimoBackup ? fmtSeparador(config.ultimoBackup) + ' · ' + fmtHora(new Date(config.ultimoBackup)) : 'nunca') + '</b><span class="rot">' + eventos.length + ' compromissos · ' + tarefas.length + ' tarefas · ' + fin.movs.length + ' lançamentos · ' + notas.length + ' anotações</span>' },
      { t: 'botao', a: 'exportar', titulo: 'Fazer backup agora', primario: true },
      { t: 'botao', a: 'importar', titulo: 'Importar backup' },
      { t: 'sec', titulo: 'Backup automático' },
      { t: 'sw', k: 'backupAuto', titulo: 'Fazer backup toda semana', sub: 'guarda as 4 últimas cópias no celular · ' + (config.backupAutoUlt ? 'último ' + fmtSeparador(config.backupAutoUlt).toLowerCase() + ' às ' + fmtHora(new Date(config.backupAutoUlt)) : 'ainda não fez') },
      { t: 'acao', a: 'enviar-auto', titulo: 'Enviar o último automático', sub: 'para o Drive, e-mail ou WhatsApp' },
      { t: 'acao', a: 'restaurar-auto', titulo: 'Restaurar de um automático', sub: 'escolhe uma das cópias guardadas' },
      { t: 'info', html: 'As cópias automáticas ficam dentro do app e se perdem se ele for desinstalado. Mande uma para o Google Drive de vez em quando; a engrenagem ganha um aviso quando o último envio passar de 7 dias.' },
      { t: 'sec', titulo: 'Exportar para análise' },
      { t: 'acao', a: 'csv-fin', titulo: 'Lançamentos de Finanças (CSV)' },
      { t: 'acao', a: 'csv-crono', titulo: 'Sessões do Cronômetro (CSV)' },
      { t: 'acao', a: 'csv-pessoal', titulo: 'Pessoal: estudos, leitura, treinos, diário (CSV)' },
      { t: 'sec', titulo: 'Zona de perigo' },
      { t: 'botao', a: 'apagar-tudo', titulo: 'Apagar todos os dados', perigo: true },
    ] },
    sobre: { titulo: 'Sobre e ajuda', itens: [
      { t: 'info', html: '<b class="grande">AZote. · versão ' + VERSAO + '</b><span class="rot">Agenda, finanças, cronômetro e vida pessoal escritos como mensagem. Toque no botão verde <b>Escrever</b> e mande qualquer coisa: o app guarda no lugar certo.</span>' },
      { t: 'info', html: 'Para atualizar, instale a versão nova por cima, sem desinstalar. Faça um backup antes.' },
      { t: 'sec', titulo: 'Exemplos de mensagens' },
      { t: 'info', html: '<b>Recados:</b> “dentista amanhã às 15h”, “academia toda seg e qua das 18h às 19h”, “preciso de 2h para estudar essa semana”.<br><b>Finanças:</b> “mercado 312,45”, “tênis 600 em 3x no cartão roxo”, “internet 119,90 todo dia 15”, “guardei 500 pra moto”.<br><b>Pessoal:</b> “supino 4x10 40kg”, “tomei a vitamina d”, “estudei 1h de python”, “li até a página 120”, “energia 4 humor 3”.<br><b>Tarefas:</b> “pagar IPVA até sexta”.<br><b>Anotações:</b> “nota: ideia de presente pra mãe”.<br><b>Hábitos:</b> “bebi 2 copos”, “tomei uma garrafa de 1 litro”.<br><b>Meu dia (Pessoal):</b> “hoje trabalhei normalmente, fui treinar e li um pouco”: o app pergunta os horários e registra tudo.' },
      { t: 'info', html: '<b>Editar ou copiar uma mensagem:</b> segure o dedo sobre a sua mensagem no Escrever ou em Lançamentos para editar (o app refaz o lançamento ou o compromisso), apagar ou copiar.<br><b>Horas por tarefa:</b> “trabalhei 1h30 no relatório”.<br><b>Dividir:</b> “jantar 180 dividido com Ana e Pedro”, depois “Ana me pagou”.<br><b>Anotações:</b> #ideias no texto guarda na pasta Ideias; - [ ] cria uma caixinha.' },
    ] },
  };
}
function paginasTodas() { const P = paginasCfg(); for (const f of PAGINAS_EXTRA) Object.assign(P, f()); return P; }
function valorCfgTexto(it) {
  const v = it.valor !== undefined ? it.valor : lerCfg(it.k);
  const op = it.ops.find(o => o[0] === v) || it.ops.find(o => String(o[0]) === String(v));
  return op ? op[1] : '—';
}
function itemCfgHTML(it, i, pag) {
  const sub = it.sub ? '<small>' + it.sub + '</small>' : '';
  if (it.t === 'app') return '<div class="cfg-app"><span class="lg">' + $('telaHome').querySelector('.home-top svg').outerHTML + '</span><div><b>AZote.</b><small>versão ' + VERSAO + ' · ' + (config.ultimoBackup ? 'último backup ' + fmtSeparador(config.ultimoBackup).toLowerCase() : 'sem backup ainda') + '</small></div></div>';
  if (it.t === 'sec') return '<div class="cfg-sec">' + esc(it.titulo) + '</div>';
  if (it.t === 'info') return '<div class="cfg-info">' + it.html + '</div>';
  if (it.t === 'html') return it.html;
  if (it.t === 'bloco') return '<div class="cfg-bloco' + (it.on ? '' : ' off') + '" data-ci="' + pag + ':' + i + '"><span class="e">' + it.ic + '</span><span class="tx"><b>' + esc(it.titulo) + '</b><small>' + esc(it.sub || '') + '</small></span><button type="button" class="mv" data-mv="-1" aria-label="Subir">↑</button><button type="button" class="mv" data-mv="1" aria-label="Descer">↓</button><span class="chave' + (it.on ? ' on' : '') + '"></span></div>';
  if (it.t === 'botao') return '<button type="button" class="cfg-botao' + (it.primario ? ' pri' : '') + (it.perigo ? ' perigo' : '') + '" data-ci="' + pag + ':' + i + '">' + esc(it.titulo) + '</button>';
  if (it.t === 'nav') return '<button type="button" class="cfg-it cnav" data-ci="' + pag + ':' + i + '"><span class="ic" style="background:' + it.bg + '">' + it.ic + '</span><b>' + esc(it.titulo) + '</b><span class="dir">' + (it.alerta ? '<span class="alerta-p">!</span>' : '') + '<i>›</i></span>' + sub + '</button>';
  let dir = '';
  if (it.t === 'sw') dir = '<span class="chave' + (lerCfg(it.k) !== false ? ' on' : '') + '"></span>';
  if (it.t === 'esc') dir = esc(valorCfgTexto(it)) + '<i>›</i>';
  if (it.t === 'acao') dir = (it.dir ? '<span class="' + (it.ok ? 'okc' : '') + '">' + esc(it.dir) + '</span>' : '') + '<i>›</i>';
  return '<button type="button" class="cfg-it" data-ci="' + pag + ':' + i + '"><b>' + esc(it.titulo) + '</b><span class="dir">' + dir + '</span>' + sub + '</button>';
}
function renderConfig() {
  const P = paginasTodas();
  if (!P[cfgPag]) cfgPag = 'main';
  const pg = P[cfgPag];
  $('cfgTit').textContent = cfgBusca ? 'Buscar' : pg.titulo;
  let h = '';
  if (cfgPag === 'main') h += '<div class="cfg-busca"><input id="cfgBuscaIn" type="search" placeholder="🔍  Buscar nas configurações" value="' + esc(cfgBusca) + '" autocomplete="off"></div>';
  if (cfgBusca) {
    const q = finTxt(cfgBusca);
    for (const [k, p] of Object.entries(P)) (p.itens || []).forEach((it, i) => { if ((it.t === 'sw' || it.t === 'esc' || it.t === 'acao') && finTxt(it.titulo + ' ' + (it.sub || '')).includes(q)) h += itemCfgHTML({ ...it, sub: (p.titulo + (it.sub ? ' · ' + it.sub : '')) }, i, k); });
    if (!h.includes('cfg-it')) h += '<div class="cfg-info">Nada encontrado.</div>';
  } else h += pg.itens.map((it, i) => itemCfgHTML(it, i, cfgPag)).join('');
  $('cfgCorpo').innerHTML = h;
  const bi = $('cfgBuscaIn');
  if (bi) bi.addEventListener('input', () => { cfgBusca = bi.value; const pos = bi.selectionStart; renderConfig(); const n = $('cfgBuscaIn'); n.focus(); n.setSelectionRange(pos, pos); });
}
$('cfgCorpo').addEventListener('click', async e => {
  const ca = e.target.closest('[data-ca]'); if (ca) { await acaoConfig(ca.dataset.ca, ca); return; }
  const b = e.target.closest('[data-ci]'); if (!b) return;
  const [pag, i] = b.dataset.ci.split(':'); const it = paginasTodas()[pag]?.itens[+i]; if (!it) return;
  if (it.t === 'bloco') { const mv = e.target.closest('[data-mv]'); const L = config.resumoBlocos, j = L.findIndex(x => x[0] === it.id); if (mv) { const k = j + Number(mv.dataset.mv); if (k >= 0 && k < L.length) [L[j], L[k]] = [L[k], L[j]]; } else L[j][1] = !L[j][1]; await guardar('az-config', config); agendarResumosDepois(); renderConfig(); return; }
  if (it.t === 'nav') { cfgPilha.push(cfgPag); cfgPag = it.p; cfgBusca = ''; renderConfig(); $('cfgCorpo').scrollTop = 0; return; }
  if (it.t === 'sw') { const novo = lerCfg(it.k) === false; gravarCfg(it.k, novo); await guardar('az-config', config); await aplicarConfig(it.k); renderConfig(); return; }
  if (it.t === 'esc') {
    escolherOpcao(it.titulo, it.ops, it.valor !== undefined ? it.valor : lerCfg(it.k), async v => {
      if (it.k === 'contaPadrao') { fin.contas.forEach(c => c.padrao = c.id === v); await salvarFin(); }
      else { gravarCfg(it.k, v); await guardar('az-config', config); }
      await aplicarConfig(it.k); renderConfig();
    });
    return;
  }
  await acaoConfig(it.a, b);
});
async function aplicarConfig(k) {
  if (k === 'resumoHora') await agendarResumos();
  if (['janelaIni', 'janelaFim', 'trabalhoOcupado'].includes(k)) { definirJanela(config.janelaIni, config.janelaFim, config.trabalhoOcupado !== false); }
  if (k === 'tarefasHora') for (const t of tarefas) await agendarAvisoTarefa(t);
  if (k === 'contasAviso' || k === 'metasLembrete') agendarAvisosFinDepois();
  if (k === 'remediosAviso' || k === 'habitosAviso') agendarAvisosPessoalDepois();
  if (['revisaoHora', 'domingoHora', 'retroAviso'].includes(k)) agendarRotinas();
  if (k === 'cronoNotif') { if (config.cronoNotif === false) cancelarNotifCrono(); else notifCrono(); }
  if (k === 'tamanho') aplicarTamanho();
  if (['meuDiaHora', 'semanaAviso', 'fechamentoFin'].includes(k)) agendarRelatorios();
  if (k === 'resumoFormato') agendarResumos();
  if (k.startsWith('contas') || k.startsWith('dnd') || ['focoTrabalho', 'agrupar'].includes(k)) { agendarAvisosFinDepois(); agendarAvisosPessoalDepois(); agendarRotinas(); agendarResumos(); reagendarTodos(); }
  if (k === 'habitosAviso' || k === 'remAdiar') agendarAvisosPessoalDepois();
  if (k === 'backupAuto' && config.backupAuto !== false) backupAutoSeHora(true);
  if (k === 'esconderValores') OCULTAR = !!config.esconderValores;
  if (k === 'esconderNotif') { reagendarTodos(); agendarResumos(); agendarAvisosFinDepois(); agendarAvisosPessoalDepois(); agendarRotinas(); }
}
function aplicarTamanho() { document.body.style.fontSize = TAMANHOS[config.tamanho] || '15px'; }
async function acaoConfig(a, b) {
  const reg = CFG_ACOES[String(a).split(':')[0]]; if (reg) return reg(a, b);
  if (a === 'ativar') {
    if (!Notif) { responderConfig('Avisos', '<p>Os avisos funcionam no app instalado no Android.</p>'); return; }
    const ok = await pedirPermissao();
    if (ok) { await reagendarTodos(); await agendarResumos(); await agendarAvisosFin(); agendarAvisosPessoalDepois(); agendarRotinas(); }
    else responderConfig('Avisos bloqueados', '<p>Abra <b>Configurações do Android → Apps → AZote → Notificações</b> e ative.</p>');
    renderConfig();
  }
  if (a === 'exato') { try { await Notif.changeExactNotificationSetting(); } catch {} setTimeout(verificarExato, 1500); }
  if (a === 'testar') await testarAviso();
  if (a === 'ver-resumo') {
    const h = new Date(); const { titulo, corpo } = textoResumo(new Date(h.getFullYear(), h.getMonth(), h.getDate()));
    responderConfig('Resumo de hoje', '<p><b>' + esc(titulo) + '</b></p><p style="margin-top:6px">' + esc(corpo) + '</p>');
  }
  if (a === 'nome') { abrirForm('Seu nome', [{ k: 'nome', rot: 'Como você quer ser chamado', v: config.nome || '', ph: 'Ex.: Faz' }], async v => { config.nome = (v.nome || '').trim(); await guardar('az-config', config); renderConfig(); }); return; }
  if (a === 'abrir-revisao') abrirRevisao();
  if (a === 'abrir-plano') abrirPlano();
  if (a === 'abrir-retro') abrirRetro();
  if (a === 'ir-saldos') { finConta = null; abrirFin('saldos'); }
  if (a === 'ir-cartoes') abrirFin('cartoes');
  if (a === 'ir-pessoal') abrir('pessoal');
  if (a === 'exportar') await exportarBackup();
  if (a === 'importar') $('arquivoBackup').click();
  if (a === 'csv-fin') await exportarCSVFin();
  if (a === 'csv-crono') await exportarCSV();
  if (a === 'csv-pessoal') await exportarCSVPessoal();
  if (a === 'apagar-tudo') mostrarDialogo('Apagar todos os dados?', '<p>Compromissos, tarefas, anotações, finanças, cronômetro e pessoal serão apagados deste celular. <b>Não dá para desfazer.</b> Faça um backup antes.</p>', [{ rotulo: 'Cancelar' }, { rotulo: 'Apagar tudo', perigo: true, acao: () => mostrarDialogo('Tem certeza?', '<p>Última confirmação.</p>', [{ rotulo: 'Cancelar' }, { rotulo: 'Sim, apagar', perigo: true, acao: apagarTudo }]) }]);
}
async function apagarTudo() {
  for (const ev of eventos) await cancelarAviso(ev.id);
  for (const k of [CHAVE, 'az-recados', 'az-notas', 'az-tarefas', 'az-fin', 'az-fin-chat', 'az-crono', 'az-pessoal', 'az-pes-chat', 'az-projetos', 'az-escrever', 'az-avisos-log']) await guardar(k, null);
  location.reload();
}
// janela genérica (escolha de opção, avisos e confirmações)
let dlgAcoes = [], dlgEscolha = null;
function mostrarDialogo(titulo, html, botoes = [{ rotulo: 'OK' }]) {
  dlgEscolha = null; dlgAcoes = botoes;
  $('dlgTit').textContent = titulo; $('dlgCorpo').innerHTML = html;
  $('dlgBotoes').innerHTML = botoes.map((b, i) => '<button type="button" data-dlg="' + i + '" class="' + (b.perigo ? 'perigo' : '') + '">' + esc(b.rotulo.toUpperCase()) + '</button>').join('');
  $('dlgOv').hidden = false;
}
function escolherOpcao(titulo, ops, atual, aoEscolher) {
  mostrarDialogo(titulo, ops.map((o, i) => '<label class="rd"><input type="radio" name="dlgR" value="' + i + '"' + (o[0] === atual || String(o[0]) === String(atual) ? ' checked' : '') + '><i></i>' + esc(o[1]) + '</label>').join(''),
    [{ rotulo: 'Cancelar' }, { rotulo: 'OK', acao: () => { const r = $('dlgCorpo').querySelector('input:checked'); if (r) aoEscolher(ops[+r.value][0]); } }]);
  dlgEscolha = { ops, aoEscolher };
}
$('dlgOv').addEventListener('click', async e => {
  if (e.target === $('dlgOv')) { $('dlgOv').hidden = true; return; }
  const c = e.target.closest('[data-c]');
  if (c) { $('dlgOv').hidden = true; await acaoBackupDlg(c.dataset.c); return; }
  const b = e.target.closest('[data-dlg]'); if (!b) return;
  const a = dlgAcoes[+b.dataset.dlg]; $('dlgOv').hidden = true;
  if (a?.acao) await a.acao();
});
$('dlgCorpo').addEventListener('change', e => { if (e.target.name === 'dlgR' && dlgEscolha) { const { ops, aoEscolher } = dlgEscolha; $('dlgOv').hidden = true; aoEscolher(ops[+e.target.value][0]); } });
async function acaoBackupDlg(c) {
  if (c === 'imp-juntar') await aplicarImport('juntar');
  if (c === 'imp-trocar') await aplicarImport('trocar');
  if (c === 'imp-cancelar') importPendente = null;
}
// substitui a antiga resposta em formato de chat: agora é uma janela
function responderConfig(titulo, htmlApp) { mostrarDialogo(titulo || 'AZote', htmlApp); if (tela === 'config') renderConfig(); }
async function testarAviso() {
  if (!Notif) { responderConfig('Testar aviso', '<p>Os avisos funcionam no app instalado no Android.</p>'); return; }
  const ok = await pedirPermissao();
  if (!ok) { responderConfig('Testar aviso', '<p>As notificações estão bloqueadas. Abra <b>Configurações do Android → Apps → AZote → Notificações</b> e ative.</p>'); return; }
  try {
    await agendarNotif([{ id: 1, title: 'Teste de aviso', body: 'Os avisos estão funcionando.', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }]);
    responderConfig('Testar aviso', '<p>Enviei um aviso de teste. Ele chega em 5 segundos, mesmo com a tela bloqueada.</p>');
  } catch (err) { responderConfig('Testar aviso', '<p>Falhou: ' + esc(err?.message || 'erro') + '</p>'); }
}
// todos os avisos passam por aqui (para poder esconder o conteúdo)
async function agendarNotif(lista) {
  if (!Notif || !lista.length) return;
  const ajust = ajustarAvisos(lista); // não perturbe, foco, agrupar e histórico (1.14)
  const l = config.esconderNotif ? ajust.map(n => ({ ...n, title: 'AZote', body: 'Você tem um aviso do AZote', largeBody: undefined })) : ajust;
  return Notif.schedule({ notifications: l });
}
$('btnConfig').onclick = () => { cfgPag = 'main'; cfgBusca = ''; cfgPilha.length = 0; abrir('config'); };
async function baixarTexto(nome, texto, titulo) {
  try {
    if (Arquivos && Compartilhar) { const r = await Arquivos.writeFile({ path: nome, data: texto, directory: 'CACHE', encoding: 'utf8' }); await Compartilhar.share({ title: titulo, files: [r.uri], dialogTitle: 'Enviar para…' }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv' })); a.download = nome; a.click(); }
  } catch {}
}
const csvQ = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const csvData = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
async function exportarCSVFin() {
  const l = [['data', 'tipo', 'descricao', 'categoria', 'valor', 'conta', 'conta_destino', 'cartao', 'parcelas'].join(';')];
  for (const m of fin.movs.slice().sort((a, b) => a.t - b.t)) l.push([csvData(m.t), m.tipo, csvQ(m.titulo), categoriaPorId(m.categoria).nome, String(m.valor).replace('.', ','), csvQ(contaPorId(m.contaId)?.nome || ''), csvQ(contaPorId(m.destinoId)?.nome || ''), csvQ((fin.cartoes || []).find(c => c.id === m.cartaoId)?.nome || ''), m.parcelas || ''].join(';'));
  const h = new Date(); await baixarTexto('azote-financas-' + pad(h.getDate()) + '-' + pad(h.getMonth() + 1) + '-' + h.getFullYear() + '.csv', '﻿' + l.join('\n'), 'Finanças do AZote');
}
