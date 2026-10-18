import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const P = '#123524', P2 = '#1E4D3A', M = '#9BE3B8', C = '#F4F1E8', D = '#0E2A1E';
const glifo = {
  agzote: (cor) => [...Array(6)].map((_, k) => { const i = k % 3, j = Math.floor(k / 3); return `<rect x="${18 + i * 22}" y="${30 + j * 22}" width="16" height="16" rx="5" fill="${cor || ((i === 1 && j === 1) ? M : P2)}"/>`; }).join('') + `<rect x="18" y="74" width="60" height="6" rx="3" fill="${cor || C}"${cor ? '' : ' opacity=".85"'}/>`,
  finzote: (cor) => `<rect x="20" y="56" width="14" height="24" rx="4" fill="${cor || P2}"/><rect x="43" y="44" width="14" height="36" rx="4" fill="${cor || P2}"/><rect x="66" y="30" width="14" height="50" rx="4" fill="${cor || P}"/><path d="M20 40l20-12 14 8 24-16" fill="none" stroke="${cor || P}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
};
const fundo = { agzote: D, finzote: C };
const b = await chromium.launch(); const p = await b.newPage();
async function png(svg, tam, arq) {
  await p.setViewportSize({ width: tam, height: tam });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg', `<svg width="${tam}" height="${tam}"`)}</body></html>`);
  fs.mkdirSync(arq.split('/').slice(0, -1).join('/'), { recursive: true });
  await p.screenshot({ path: arq, omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } });
}
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const app of ['agzote', 'finzote']) {
  const base = `/home/claude/recado-android/apps/${app}/icone-android`;
  const quad = `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${fundo[app]}"/>${glifo[app]()}</svg>`;
  const red = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${fundo[app]}"/><g transform="translate(8 8) scale(.84)">${glifo[app]()}</g></svg>`;
  // adaptativo: 108 de largura, área segura de 66 no centro
  const fg = `<svg viewBox="0 0 108 108"><g transform="translate(26 25) scale(.56)">${glifo[app]()}</g></svg>`;
  const mono = `<svg viewBox="0 0 108 108"><g transform="translate(26 25) scale(.56)">${glifo[app]('#ffffff')}</g></svg>`;
  const stat = `<svg viewBox="0 0 100 100"><g transform="translate(-4 -6) scale(1.08)">${glifo[app]('#ffffff')}</g></svg>`;
  for (const [d, f] of Object.entries(dens)) {
    await png(quad, 48 * f, `${base}/mipmap-${d}/ic_launcher.png`);
    await png(red, 48 * f, `${base}/mipmap-${d}/ic_launcher_round.png`);
    await png(fg, 108 * f, `${base}/mipmap-${d}/ic_launcher_foreground.png`);
    await png(mono, 108 * f, `${base}/mipmap-${d}/ic_launcher_monochrome.png`);
    await png(stat, 24 * f, `${base}/drawable-${d}/ic_stat_az.png`);
  }
  await png(`<svg viewBox="0 0 100 100"><g transform="translate(25 25) scale(.5)">${glifo[app]()}</g></svg>`, 576, `${base}/drawable-xxxhdpi/splash_logo.png`);
  fs.mkdirSync(`${base}/mipmap-anydpi-v26`, { recursive: true }); fs.mkdirSync(`${base}/values`, { recursive: true }); fs.mkdirSync(`${base}/drawable`, { recursive: true });
  for (const n of ['ic_launcher', 'ic_launcher_round']) fs.writeFileSync(`${base}/mipmap-anydpi-v26/${n}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`);
  fs.writeFileSync(`${base}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${fundo[app]}</color>\n</resources>\n`);
  fs.copyFileSync('/home/claude/recado-android/icone-android/drawable/splash.xml', `${base}/drawable/splash.xml`);
}
await b.close(); console.log('ícones ok');
