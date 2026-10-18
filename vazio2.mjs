import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
for (const app of ['finzote', 'agzote']) {
  await p.goto('file:///home/claude/recado-android/apps/' + app + '/www/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  await p.screenshot({ path: 'v2-' + app + '-vazio.png' });
  if (app === 'finzote') {
    await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="gasto"]'); await p.fill('#lcValor', '18,50'); await p.fill('#lcDesc', 'padaria'); await p.dispatchEvent('#lcDesc', 'input'); await p.click('#formLanc button[type=submit]'); await p.waitForTimeout(150);
    console.log('fin vazio gasto:', await p.evaluate(() => JSON.stringify([fin.contas.map(c => c.nome), fin.movs.map(m => m.categoria + '›' + m.sub)])));
    for (const n of ['extrato', 'rel', 'contas']) { await p.click('#barra [data-nav="' + n + '"]'); await p.waitForTimeout(80); }
    await p.click('#abaFixas'); await p.click('#abaGastar'); await p.click('#abaMetas'); await p.click('#abaDiv'); await p.click('#abaCartoes');
    await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="fatura"]'); await p.waitForTimeout(80); console.log('fatura sem cartão:', await p.evaluate(() => $('dlgTit').textContent)); await p.evaluate(() => { $('dlgOv').hidden = true; });
    await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="divida"]'); await p.waitForTimeout(80); await p.evaluate(() => { $('dlgOv').hidden = true; });
    await p.click('#barra [data-nav="cad"]'); await p.click('[data-cad="fixa"]'); await p.waitForTimeout(80); console.log('fixa abre:', await p.evaluate(() => !$('agOv').hidden)); await p.evaluate(() => { $('agOv').hidden = true; });
  } else {
    for (const n of ['agenda', 'escrever', 'tarefas', 'pessoal', 'home']) { await p.click('#barra [data-nav="' + n + '"]'); await p.waitForTimeout(80); }
  }
  console.log(app, 'erros:', errs.splice(0).join(' | ') || 'nenhum');
}
await b.close();
