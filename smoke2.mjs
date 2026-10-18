import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1])); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.clock.install({ time: new Date(2026, 9, 14, 12, 45) });

const shot = n => p.screenshot({ path: 'v2-' + n + '.png' });
const ev = f => p.evaluate(f);

const carregar = async app => { await p.goto('file:///home/claude/recado-android/apps/' + app + '/www/index.html'); await p.evaluate(() => {
    localStorage.clear(); const d = (y, m, dd, h = 12, mi = 0) => new Date(y, m, dd, h, mi).getTime();
    localStorage.setItem('recado-agenda-eventos', JSON.stringify([{ id: 'w1', titulo: 'Trabalho', inicio: d(2026, 8, 1, 8, 0), duracao: 540, avisoMin: null, repetir: { tipo: 'semanal', dias: [1, 2, 3, 4, 5] }, trabalho: true, categoria: 'trabalho' }, { id: 'e1', titulo: 'Dentista', inicio: d(2026, 9, 14, 19, 0), duracao: 60, avisoMin: 30, repetir: null, trabalho: false, categoria: 'saude' }, { id: 'e2', titulo: 'Academia', inicio: d(2026, 8, 2, 18, 30), duracao: 60, avisoMin: 15, repetir: { tipo: 'semanal', dias: [1, 3] }, trabalho: false, categoria: 'saude' }]));
    localStorage.setItem('az-config', JSON.stringify({ avisoPadrao: 15, corrigiu151: true, nome: 'Faz', ultimoBackup: d(2026, 9, 13), resumoHora: '07:00', dadosVersao: 6 }));
    const movs = [], g = (id, t, v, tit, cat, tipo = 'gasto') => movs.push({ id, t, tipo, valor: v, contaId: 'c1', titulo: tit, categoria: cat });
    // histórico: lazer normal nas semanas anteriores, alto nesta semana
    for (let k = 1; k <= 6; k++) g('lz' + k, d(2026, 9, 14) - k * 7 * 86400000, 80, 'Cinema', 'lazer');
    g('lz9', d(2026, 9, 12, 21), 190, 'Jantar fora', 'lazer'); g('lz10', d(2026, 9, 13, 21), 160, 'Bar', 'lazer');
    // assinatura netflix em ago e set
    g('nf8', d(2026, 7, 14, 10), 39.9, 'Netflix', 'lazer'); g('nf9', d(2026, 8, 14, 10), 39.9, 'Netflix', 'lazer');
    // farmácia normal e um valor fora do comum
    g('fa1', d(2026, 6, 3), 70, 'Farmácia', 'saude'); g('fa2', d(2026, 7, 3), 80, 'Farmácia', 'saude'); g('fa3', d(2026, 8, 3), 75, 'Farmácia', 'saude'); g('fa4', d(2026, 9, 9, 15), 7500, 'Farmácia', 'saude');
    // repetido
    g('mc1', d(2026, 9, 12, 10, 0), 312.45, 'Mercado', 'casa'); g('mc2', d(2026, 9, 12, 10, 3), 312.45, 'Mercado', 'casa');
    // sem categoria
    g('sc1', d(2026, 9, 6, 15), 89.9, 'Shopee', 'pessoal'); g('sc2', d(2026, 9, 7, 15), 45, 'Loja X', 'pessoal');
    g('ub1', d(2026, 9, 14, 8, 10), 23, 'Uber', 'casa');
    movs.push({ id: 'r1', t: d(2026, 9, 5, 9), tipo: 'receita', valor: 5200, contaId: 'c1', titulo: 'Salário', categoria: 'financas', agId: 'a1', chave: '2026-10-05' });
    localStorage.setItem('az-fin', JSON.stringify({ contas: [{ id: 'c1', tipo: 'corrente', nome: 'Conta corrente', saldoInicial: 9000, criado: d(2026, 5, 1), padrao: true }, { id: 'c2', tipo: 'corrente', nome: 'Nubank', saldoInicial: 500, criado: d(2026, 5, 1) }],
      agendadas: [{ id: 'a1', tipo: 'receber', titulo: 'Salário', valor: 5200, inicio: d(2026, 5, 5, 9), repetir: { tipo: 'mensal' }, categoria: 'financas', contaId: 'c1', baixas: { '2026-10-05': 'r1' }, criado: d(2026, 5, 1) }, { id: 'a2', tipo: 'pagar', titulo: 'Aluguel', valor: 1500, inicio: d(2026, 5, 10, 9), repetir: { tipo: 'mensal' }, categoria: 'casa', contaId: 'c1', baixas: {}, criado: d(2026, 5, 1) }],
      movs, chat: [], metas: [], dividas: [], cartoes: [] }));
    // escrever: almoço por volta das 12:40 em vários dias + outros frequentes
    const esc = []; for (let k = 1; k <= 4; k++) esc.push({ id: 'x' + k, t: d(2026, 9, 14 - k, 12, 38), texto: 'almoço 34,90', dest: 'fin', refs: [] });
    for (let k = 1; k <= 3; k++) esc.push({ id: 'y' + k, t: d(2026, 9, 14 - k, 8, 5), texto: 'uber ' + (20 + k), dest: 'fin', refs: [] });
    for (let k = 1; k <= 2; k++) esc.push({ id: 'z' + k, t: d(2026, 9, 10 - k, 7, 30), texto: 'padaria 18', dest: 'fin', refs: [] });
    localStorage.setItem('az-escrever', JSON.stringify(esc.sort((a, b) => a.t - b.t)));
    localStorage.setItem('az-notas', JSON.stringify([{ id: 'n1', texto: 'Capítulo 2 pendências #monografia\n- [x] Revisão de literatura\n- [ ] Tabela de produtividade\n- [ ] Falar com o orientador sobre **DEA**', t: d(2026, 9, 10), lado: 'me' }, { id: 'n2', texto: 'Widget de saldo\nMostrar Pode gastar na tela inicial #ideias', t: d(2026, 9, 13), lado: 'app' }]));
    localStorage.setItem('az-tarefas', JSON.stringify([{ id: 't1', titulo: 'Relatório mensal do trabalho', prazo: d(2026, 9, 17, 0), categoria: 'trabalho', feita: false, feitaEm: null, criado: d(2026, 9, 1), estimativa: 120 }, { id: 't2', titulo: 'Renovar CNH', prazo: d(2026, 9, 15, 0), categoria: 'pessoal', feita: false, feitaEm: null, criado: d(2026, 9, 1), adiada: 3 }, { id: 't3', titulo: 'Pagar IPVA', prazo: d(2026, 9, 16, 0), categoria: 'financas', feita: false, feitaEm: null, criado: d(2026, 9, 1) }]));
    // estudo às terças nas últimas 4 semanas
    const ses = []; for (let k = 1; k <= 4; k++) { const t = d(2026, 9, 13, 20, 0) - k * 7 * 86400000 + 7 * 86400000 * 0; ses.push({ id: 's' + k, titulo: 'Monografia', categoria: 'estudo', ini: d(2026, 9, 6, 20) - (k - 1) * 7 * 86400000, fim: d(2026, 9, 6, 21, 50) - (k - 1) * 7 * 86400000, pausaMin: 0 }); }
    ses.push({ id: 's9', titulo: 'Monografia', categoria: 'estudo', ini: d(2026, 9, 2, 20), fim: d(2026, 9, 2, 20, 30), pausaMin: 0 });
    localStorage.setItem('az-crono', JSON.stringify({ ativo: null, sessoes: ses }));
    const diario = [], treinos = [];
    for (let k = 1; k <= 12; k++) { const t = d(2026, 9, 14 - k, 12), ch = new Date(t).toISOString().slice(0, 10), tr = k % 2 === 0; if (tr) treinos.push({ id: 'tr' + k, t, exercicios: [] }); diario.push({ chave: [new Date(t).getFullYear(), String(new Date(t).getMonth() + 1).padStart(2, '0'), String(new Date(t).getDate()).padStart(2, '0')].join('-'), t, energia: 3, humor: tr ? 4 : 3, nota: '' }); }
    localStorage.setItem('az-pessoal', JSON.stringify({ materias: [], revisoes: [], provas: [], livros: [], leituras: [], treinos, corridas: [], medidas: [], remedios: [], doses: [], metas: [], habitos: [{ id: 'h1', nome: 'Água', emoji: '💧', tipo: 'qtd', unidade: 'ml', meta: 5000, medidas: [{ nome: 'Copo', valor: 300, emoji: '🥛' }, { nome: 'Garrafa', valor: 500, emoji: '🍶' }], dias: [0, 1, 2, 3, 4, 5, 6], feitos: {}, regs: {}, criado: d(2026, 9, 1) }], diario, avisos: [] }));
  });
  
 await p.reload(); await p.waitForTimeout(600); };
// ================= FinZote =================
await carregar('finzote');
console.log('fin cats:', await ev(() => JSON.stringify({ cats: CATEGORIAS.map(c => c.id).join(','), farm: fin.movs.find(m => m.id === 'fa4').sub, sal: fin.movs.find(m => m.id === 'r1').categoria, catsFin: config.catsFin })));
await p.click('#barra [data-nav="cad"]'); await p.waitForTimeout(80); await shot('fin-cad');
await p.click('[data-cad="gasto"]'); await p.waitForTimeout(80);
await p.fill('#lcValor', '312,45'); await p.fill('#lcDesc', 'Mercado Extra'); await p.dispatchEvent('#lcDesc', 'input'); await p.waitForTimeout(50);
console.log('auto cat:', await ev(() => lanc.cat + ' › ' + lanc.sub));
await p.click('[data-lc="forma"][data-v="pix"]'); await p.click('[data-lca="extras"]'); await p.fill('#lcTags', 'mes'); await shot('fin-gasto');
await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(150);
console.log('gasto salvo:', await ev(() => { const m = fin.movs.at(-1); return JSON.stringify([m.tipo, m.valor, m.titulo, m.categoria, m.sub, m.forma, m.tags]); }));
// compra no cartão sem cartão → cadastrar
await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="cartao"]'); await p.waitForTimeout(60);
console.log('sem cartão aviso:', await ev(() => $('formLanc').textContent.includes('Nenhum cartão')));
await ev(() => { fin.cartoes.push({ id: 'k1', nome: 'Roxo', limite: 5000, fecha: 3, vence: 10, cor: '#6b3fd1', contaId: 'c1' }); renderLanc(); });
await p.fill('#lcValor', '600'); await p.dispatchEvent('#lcValor', 'input'); await p.fill('#lcDesc', 'Tênis Nike'); await p.dispatchEvent('#lcDesc', 'input');
await p.click('[data-lc="parcelas"][data-v="3"]'); await p.waitForTimeout(50); await shot('fin-cartao');
await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(150);
console.log('cartão salvo:', await ev(() => { const m = fin.movs.at(-1); return JSON.stringify([m.tipo, m.valor, m.parcelas, m.cartaoId, m.categoria, m.sub]); }));
// receita com repetir
await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="receita"]'); await p.fill('#lcValor', '800'); await p.fill('#lcDesc', 'Freela site'); await p.dispatchEvent('#lcDesc', 'input');
await p.click('[data-lca="extras"]'); await p.check('#lcRepetir'); await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(150);
console.log('receita:', await ev(() => { const m = fin.movs.at(-1); const ag = fin.agendadas.find(a => a.id === m.agId); return JSON.stringify([m.tipo, m.categoria, m.sub, !!ag, ag?.tipo]); }));
// transferência
await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="transf"]'); await p.fill('#lcValor', '200'); await p.click('[data-lc="destino"][data-v="c2"]'); await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(120);
console.log('transf:', await ev(() => { const m = fin.movs.at(-1); return JSON.stringify([m.tipo, m.contaId, m.destinoId, m.titulo]); }));
// dividido
await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="dividido"]'); await p.fill('#lcValor', '180'); await p.fill('#lcDesc', 'Jantar Coco Bambu'); await p.dispatchEvent('#lcDesc', 'input'); await p.fill('#lcNomes', 'Ana'); await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(120);
console.log('dividido:', await ev(() => { const m = fin.movs.at(-1); return JSON.stringify([m.aReceber, fin.receber.map(r => r.nome + ':' + r.valor)]); }));
// extrato → editar
await p.click('#barra [data-nav="extrato"]'); await p.waitForTimeout(100); await shot('fin-extrato');
await p.locator('#finExtrato [data-em]').first().click(); await p.waitForTimeout(80); await shot('fin-editar');
console.log('editar abre:', await ev(() => !$('lancOv').hidden && lanc.id && $('formLanc').querySelector('.lc-top b').textContent));
await p.fill('#lcValor', '190'); await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(100);
// relatórios
await p.click('#barra [data-nav="rel"]'); await p.waitForTimeout(100); await shot('fin-rel'); await ev(() => { $('finRel').scrollTop = 9999; }); await shot('fin-rel2');
await p.locator('[data-rlc="lazer"]').click(); await p.fill('#gfCampos [data-k="limite"]', '300'); await p.click('#formGen button[type=submit]'); await p.waitForTimeout(80);
console.log('limite:', await ev(() => JSON.stringify(config.limites)));
// contas
await p.click('#barra [data-nav="contas"]'); await p.waitForTimeout(100); await shot('fin-contas');
await p.click('#abaFixas'); await p.waitForTimeout(100); await shot('fin-fixas');
await p.click('#abaCartoes'); await p.waitForTimeout(100); await shot('fin-cartoes');
console.log('barra on:', await ev(() => document.querySelector('#barra .on')?.dataset.nav));
// meta e dívida pelo menu
await ev(() => { fin.metas.push({ id: 'mt1', nome: 'Moto', alvo: 10000, prazo: Date.now() + 200 * 86400000, contaId: null, criado: Date.now(), jaTinha: 0, base: 0 }); });
await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="meta"]'); await p.fill('#gfCampos [data-k="valor"]', '500'); await p.click('#formGen button[type=submit]'); await p.waitForTimeout(100);
console.log('meta:', await ev(() => guardadoMeta(fin.metas[0])));
// config
await ev(() => { cfgPag = 'main'; abrir('config'); }); await p.waitForTimeout(80); await shot('fin-cfg');
await ev(() => { cfgPag = 'categorias'; renderConfig(); }); await p.waitForTimeout(80); await shot('fin-cfg-cat');
// links
await ev(() => tratarLink('finzote://gasto?valor=80.00&desc=farm%C3%A1cia')); await p.waitForTimeout(100);
console.log('link gasto:', await ev(() => JSON.stringify([!$('lancOv').hidden, lanc.valor, lanc.titulo, lanc.cat, lanc.sub])));
await ev(() => { $('lancOv').hidden = true; abrir('home'); }); await shot('fin-home');
console.log('busca fin:', await ev(() => JSON.stringify(Object.fromEntries(Object.entries(resultadosBusca('mercado')).map(([k, v]) => [k, v.length])))));
console.log('widget fin:', await ev(() => JSON.stringify(dadosWidget())));
console.log('FIN ERROS:', errs.splice(0).join('\n') || 'nenhum');
// import de backup antigo (sem fin chat) — modo substituir
await ev(() => { importPendente = { app: 'azote', eventos: [{ id: 'x' }], fin: { contas: [{ id: 'z1', tipo: 'corrente', nome: 'Velha', saldoInicial: 10, criado: 1 }], movs: [{ id: 'q1', t: Date.now(), tipo: 'gasto', valor: 9, contaId: 'z1', titulo: 'Padaria', categoria: 'pessoal' }], agendadas: [], chat: [{ k: 'me' }] }, config: { orcReserva: 10 } }; return aplicarImport('trocar'); }); await p.waitForTimeout(100);
console.log('import:', await ev(() => JSON.stringify({ contas: fin.contas.map(c => c.nome), mov: fin.movs[0].categoria + '›' + fin.movs[0].sub, chat: fin.chat.length, ev: eventos.length, res: config.orcReserva })));
console.log('FIN ERROS 2:', errs.splice(0).join('\n') || 'nenhum');
// ================= AgZote =================
await carregar('agzote');
console.log('ag hábitos:', await ev(() => JSON.stringify({ tela: pes.habitos.length, guardados: habitosGuardados.length, salvo: JSON.parse(localStorage.getItem('az-pessoal')).habitos?.length, aba: $('pa-habitos').hidden })));
await p.click('#barra [data-nav="escrever"]'); await p.fill('#entradaEsc', 'gastei 80 na farmácia'); await p.press('#entradaEsc', 'Enter'); await p.waitForTimeout(150);
console.log('ag escrever gasto:', await ev(() => JSON.stringify({ dest: escrever.at(-1).dest, movs: fin.movs.length, link: linkFinZote('gastei 80 na farmácia') })));
await p.fill('#entradaEsc', 'dentista sexta às 15h'); await p.press('#entradaEsc', 'Enter'); await p.waitForTimeout(150);
await p.locator('#entradaEsc').blur(); await shot('ag-escrever');
await p.click('#barra [data-nav="tarefas"]'); await p.waitForTimeout(80); await shot('ag-tarefas');
await p.click('#barra [data-nav="pessoal"]'); await p.waitForTimeout(80); await shot('ag-pessoal');
await ev(() => { agendaAba = 'semana'; abrir('agenda'); }); await p.waitForTimeout(80); await shot('ag-semana');
await ev(() => { agendaAba = 'prog'; agendaData = null; abrir('agenda'); }); await p.waitForTimeout(80); await shot('ag-agenda');
await ev(() => { abrir('notas'); }); await p.waitForTimeout(80); await shot('ag-notas');
await ev(() => { cfgPag = 'main'; abrir('config'); }); await p.waitForTimeout(80); await shot('ag-cfg');
await ev(() => { cfgPag = 'notif'; renderConfig(); }); await p.waitForTimeout(80); await shot('ag-cfg-avisos');
console.log('ag blocos:', await ev(() => blocosResumo().map(b => b[0]).join(',')));
console.log('ag busca:', await ev(() => JSON.stringify(Object.fromEntries(Object.entries(resultadosBusca('mercado')).map(([k, v]) => [k, v.length])))));
console.log('ag widget:', await ev(() => JSON.stringify(dadosWidget())));
await ev(() => tratarLink('agzote://tarefa')); await p.waitForTimeout(300); console.log('ag link tarefa:', await ev(() => tela));
console.log('AG ERROS:', errs.splice(0).join('\n') || 'nenhum');
await b.close();
