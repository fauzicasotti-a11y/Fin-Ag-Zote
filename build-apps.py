# Monta os dois apps a partir do mesmo código:
#   apps/agzote/www/index.html  (AgZote: agenda, tarefas, anotações, Pessoal)
#   apps/finzote/www/index.html (FinZote: finanças com menu de cadastro)
import re, os, shutil
REPO = '/home/claude/recado-android'
head0 = open('az/estilo.html').read(); corpo0 = open('az/corpo.html').read()
parser = open('parser.js').read(); parser = parser[:parser.index("if (typeof module !== 'undefined')")]
app0 = open('az/app.js').read(); fin = open('fin.js').read()
MODULOS = ['financas', 'metas-dividas', 'crono', 'cartoes', 'pessoal', 'rotinas', 'configuracoes', 'painel-escrever', 'semana-patrimonio-pessoal', 'meudia-copiar', 'habitos', 'orcamento', 'relatorios', 'avisos', 'dados',
           'gestos', 'extrato', 'mensagens', 'notas-tarefas', 'semana-descobertas', 'nativo', 'variantes', 'ag', 'fz']
mods = '\n'.join(open('az/' + m + '.js').read() for m in MODULOS)
corte = app0.index('// ===== Início =====')

P = '#123524'; P2 = '#1E4D3A'; M = '#9BE3B8'; C = '#F4F1E8'; D = '#0E2A1E'
ICONE = {
 'ag': f'<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="23" fill="{D}"/>' + ''.join(f'<rect x="{18+i*22}" y="{30+j*22}" width="16" height="16" rx="5" fill="{M if (i,j)==(1,1) else P2}"/>' for i in range(3) for j in range(2)) + f'<rect x="18" y="74" width="60" height="6" rx="3" fill="{C}" opacity=".85"/></svg>',
 'fin': f'<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="23" fill="{C}"/><rect x="20" y="56" width="14" height="24" rx="4" fill="{P2}"/><rect x="43" y="44" width="14" height="36" rx="4" fill="{P2}"/><rect x="66" y="30" width="14" height="50" rx="4" fill="{P}"/><path d="M20 40l20-12 14 8 24-16" fill="none" stroke="{P}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}
NAV = {
 'ag': '''<nav class="barra" id="barra" aria-label="Navegação">
    <button type="button" data-nav="home"><svg><use href="#i-hoje"/></svg><span>Hoje</span></button>
    <button type="button" data-nav="agenda"><svg><use href="#i-cal"/></svg><span>Agenda</span></button>
    <button type="button" data-nav="escrever" class="c"><i><svg><use href="#i-escrever"/></svg></i><span>Escrever</span></button>
    <button type="button" data-nav="tarefas"><svg><use href="#i-tarefas"/></svg><span>Tarefas</span></button>
    <button type="button" data-nav="pessoal"><svg><use href="#i-pessoal"/></svg><span>Pessoal</span></button>
  </nav>''',
 'fin': '''<nav class="barra" id="barra" aria-label="Navegação">
    <button type="button" data-nav="home"><svg><use href="#i-hoje"/></svg><span>Início</span></button>
    <button type="button" data-nav="extrato"><svg><use href="#i-tarefas"/></svg><span>Extrato</span></button>
    <button type="button" data-nav="cad" class="c"><i><svg><use href="#i-mais"/></svg></i><span>Lançar</span></button>
    <button type="button" data-nav="rel"><svg><use href="#i-resumo"/></svg><span>Relatórios</span></button>
    <button type="button" data-nav="contas"><svg><use href="#i-fin"/></svg><span>Contas</span></button>
  </nav>''',
}
EXTRA_HTML = '''<!-- FinZote: menu de cadastro e formulário de lançamento -->
<div class="overlay baixo" id="cadOv" hidden><div class="folha cad" role="dialog" aria-label="O que vai lançar?"><div class="alca"></div><div class="cad-top"><b>O que vai lançar?</b><button type="button" data-cad-x aria-label="Fechar">✕</button></div><div id="cadCorpo"></div></div></div>
<div class="overlay" id="lancOv" hidden><form class="sheet lanc" id="formLanc" autocomplete="off"></form></div>
'''
# cores: um mapa por tema (aplicado a CSS, HTML e JS do app)
TEMA = {
 'ag': {'#000': D, '#000000': D, '#0b0b0b': '#0B2219', '#0d0d0d': '#0B2219', '#111': '#15382A', '#111111': '#15382A', '#121212': '#16392B',
        '#141414': '#18402F', '#161616': '#18402F', '#1a1a1a': '#18402F', '#1c1c1c': '#18402F', '#1e1e1e': '#1A4332', '#1f1f1f': '#1F4A37',
        '#1d1d1d': '#1F4A37', '#222': '#1F4A37', '#262626': '#245440', '#2a2a2a': '#245440', '#c6f432': M, '#C6F432': M, '#8a8a8a': '#9DB5A8', '#f5f5f5': '#EEF3EC',
        '#141a06': '#13392A', '#1d2a0a': '#174531', '#18200a': '#174531', '#1a2208': '#174531', '#121509': '#143A2B', '#0d1205': '#123426', '#2a3610': '#2E6A50', '#3a4a14': '#2E6A50', '#3d4d14': '#2E6A50', '#3d5200': '#1E4D3A', '#2e3a10': '#2E6A50', '#2e3344': '#245440'},
 'fin': {'#000': C, '#000000': C, '#0b0b0b': '#ECE7DA', '#0d0d0d': '#ECE7DA', '#111': '#FFFFFF', '#111111': '#FFFFFF', '#121212': '#FFFFFF',
        '#141414': '#EFEADF', '#161616': '#EFEADF', '#1a1a1a': '#EFEADF', '#1c1c1c': '#EFEADF', '#1e1e1e': '#E7E2D4', '#1f1f1f': '#E3DED0',
        '#1d1d1d': '#E3DED0', '#222': '#E3DED0', '#262626': '#DCD6C6', '#2a2a2a': '#DCD6C6', '#f5f5f5': '#10241B', '#ecebf2': '#10241B',
        '#ccc': '#4A5A52', '#cfcfcf': '#4A5A52', '#c9c9c9': '#4A5A52', '#bdbdbd': '#4A5A52', '#bbb': '#4A5A52', '#8a8a8a': '#6B7A72', '#777': '#6B7A72', '#9a9cae': '#6B7A72',
        '#c6f432': P, '#C6F432': P, '#141a06': '#E7F0E9', '#1d2a0a': '#E7F0E9', '#18200a': '#E7F0E9', '#1a2208': '#E7F0E9', '#121509': '#EEF5EF', '#0d1205': '#EEF5EF',
        '#2a3610': '#B9D3C2', '#3a4a14': '#B9D3C2', '#3d4d14': '#B9D3C2', '#2e3a10': '#B9D3C2', '#3d5200': P, '#2e3344': '#DCD6C6',
        '#2a1010': '#FBE3E0', '#1a0b0b': '#FBE3E0', '#3a1616': '#FBE3E0', '#3a1414': '#FBE3E0', '#4a1f1c': '#F0B8B0', '#ff9d94': '#B23A30', '#ff5a5a': '#C8453B', '#ff6b6b': '#C8453B',
        '#5fe08f': '#1F8A55', '#7fe0ad': '#1F8A55', '#7cc4ff': '#2D6FA8', '#9cc6ff': '#2D6FA8', '#7fc8ff': '#2D6FA8', '#1d2a44': '#DCEAF7',
        '#ffd166': '#8A5A12', '#2a2410': '#FFF1D6', '#3a2f12': '#FFF1D6', '#2a1e0e': '#FCE9D6', '#ffb27a': '#B35A1F', '#ffb627': '#B7791F', '#12301f': '#E7F0E9', '#33300c': '#FFF6D6', '#173d2a': '#E7F0E9'},
}
def tematizar(txt, mapa):
    return re.sub(r'#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])', lambda m: mapa.get(m.group(0), mapa.get(m.group(0).lower(), m.group(0))), txt)
CSS = {
 'ag': '''
/* ---------- AgZote ---------- */
#pa-habitos, #abasEsc [data-fe="fin"], #abaContas, #calAbaContas, #abaFin, #abaFixas { display: none !important; }
.home-top h1 em { color: #9BE3B8; }
.ag-dias { display: flex; gap: 6px; margin: 4px 0 2px; } .ag-dias button { flex: 1; border: 0; background: #15382A; border-radius: 14px; padding: 7px 0 6px; font-size: 0.66rem; color: #9DB5A8; font-weight: 700; position: relative; }
.ag-dias button b { display: block; font-size: 1.02rem; color: #EEF3EC; } .ag-dias button.on { background: #9BE3B8; color: #0E2A1E; } .ag-dias button.on b { color: #0E2A1E; }
.ag-dias button i { position: absolute; bottom: 3px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: #9BE3B8; } .ag-dias button.on i { background: #0E2A1E; }
.tl { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 0 10px; margin-top: 8px; } .tl .h { font-size: 0.74rem; color: #9DB5A8; font-weight: 700; padding-top: 10px; }
.tl-ev { display: block; width: 100%; text-align: left; border: 0; border-left: 4px solid var(--c, #9BE3B8); border-radius: 14px; background: #15382A; color: #EEF3EC; padding: 8px 11px; margin-bottom: 7px; }
.tl-ev b { display: block; font-size: 0.9rem; } .tl-ev small { color: #9DB5A8; font-size: 0.74rem; }
.tl-ev.trab { border-left-color: #E8C27A; background: repeating-linear-gradient(135deg, #1A3A2B 0 7px, #173527 7px 14px); } .tl-ev.agora { background: #1E4D3A; border-left-color: #F3E9C6; } .tl-ev.pas { opacity: 0.55; }
.tl-ev.livre { border: 1.5px dashed #2E6A50; background: transparent; color: #9BE3B8; font-weight: 700; font-size: 0.8rem; }
.tl-vazio { grid-column: 1 / -1; color: #9DB5A8; font-size: 0.86rem; padding: 6px 0; } .tl-am { color: #9DB5A8; font-size: 0.8rem; margin: 2px 0 4px; } .tl-am b { color: #EEF3EC; }
.lnk { border: 0; background: transparent; color: var(--accent); font-weight: 800; font-size: 0.78rem; padding: 0; }
.hj-fin { border-color: #2E6A50 !important; } .hj-fin small { display: block; color: #9DB5A8; margin-top: 3px; font-size: 0.8rem; }
''',
 'fin': '''
/* ---------- FinZote ---------- */
:root { --top: #123524; --top-ink: #F4F1E8; --top-muted: #9CC4AE; --accent-ink: #F4F1E8; --bubble-me: #123524; }
#fxEscrever, #abaLanc, #abaExtrato { display: none !important; }
.home-top, .chat-top { background: #123524 !important; color: #F4F1E8; } .home-top h1, .chat-top .ct b { color: #F4F1E8; } .chat-top .ct small { color: #9CC4AE !important; } .home-top h1 em { color: #9BE3B8; }
.chat-top .voltar, .chat-top .acao { color: #F4F1E8 !important; border-color: #2E6A50 !important; } .engr { background: #1E4D3A !important; color: #F4F1E8 !important; } .engr.alerta::after { box-shadow: 0 0 0 2px #1E4D3A !important; background: #9BE3B8; }
.home-top svg { box-shadow: none !important; }
.abas { background: #123524; padding-bottom: 10px !important; } .abas button { color: #CFE3D7 !important; border-color: #2E6A50 !important; background: transparent !important; } .abas button.on { background: #F4F1E8 !important; color: #123524 !important; border-color: #F4F1E8 !important; }
.barra { background: #fff !important; border-top: 1px solid #E3DED0 !important; } .barra button { color: #6B7A72 !important; } .barra button.on { color: #123524 !important; } .barra .c i { background: #123524 !important; color: #F4F1E8 !important; box-shadow: 0 8px 18px rgb(18 53 36 / 0.35); }
.fz-hero { background: #123524; color: #F4F1E8; margin: -4px -16px 6px; padding: 4px 18px 18px; border-radius: 0 0 24px 24px; } .fz-hero .rot { color: #9CC4AE; } .fz-hero .v { font: 900 2.2rem/1.1 var(--f-marca); letter-spacing: -1.2px; margin-top: 2px; }
.fz-hero .ln { font-size: 0.8rem; margin-top: 3px; color: #CFE3D7; } .fz-hero .ln b { margin-left: 6px; } .fz-hero .rec { color: #9BE3B8; } .fz-hero .gas { color: #FFB3A8; } .fz-hero .inv { color: #A9CDF0; }
.card { background: #fff !important; border: 1px solid #E3DED0 !important; }
.fz-li { width: 100%; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 0 10px; align-items: center; padding: 8px 0; border: 0; border-bottom: 1px solid #EEEADF; background: transparent; color: var(--ink); text-align: left; }
.fz-li:has(.chip) { grid-template-columns: 36px minmax(0, 1fr) auto auto; } .fz-li:last-child { border-bottom: 0; }
.fz-li .e { width: 36px; height: 36px; border-radius: 12px; background: #E7F0E9; display: grid; place-items: center; font-size: 1rem; grid-row: span 2; } .fz-li b { font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fz-li small { grid-column: 2; color: #6B7A72; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .fz-li .v { grid-row: span 2; font-weight: 800; font-size: 0.9rem; white-space: nowrap; } .fz-li .chip { grid-row: span 2; font-weight: 800; }
.fz-cc { display: flex !important; justify-content: space-between; align-items: center; gap: 10px; text-align: left; background: linear-gradient(135deg, var(--cc), #123524) !important; color: #F4F1E8; border: 0 !important; width: 100%; }
.fz-cc small { display: block; color: #CFE3D7; font-size: 0.72rem; font-weight: 400; } .fz-cc .v { text-align: right; font: 900 1.2rem var(--f-marca); } .fz-cc .v small { font: 400 0.68rem var(--f-body); }
.fz-meta { display: block !important; width: 100%; text-align: left; } .fz-meta small { color: #6B7A72; font-size: 0.74rem; } .bar2 { height: 8px; border-radius: 4px; background: #E7E2D4; overflow: hidden; margin: 7px 0 4px; } .bar2 i { display: block; height: 100%; background: #2D6FA8; border-radius: 4px; }
.fz-boas p { margin: 6px 0; color: #4A5A52; font-size: 0.88rem; }
.lnk { border: 0; background: transparent; color: #123524; font-weight: 800; font-size: 0.78rem; padding: 0; }
.folha.cad { gap: 0; padding-bottom: 18px; } .cad-top { display: flex; justify-content: space-between; align-items: center; } .cad-top b { font: 900 1.25rem var(--f-marca) !important; letter-spacing: -0.4px; } .cad-top button { border: 0; background: #EFEADF; width: 32px; height: 32px; border-radius: 50%; color: #10241B; }
.cad-grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; } .cad-grade button { border: 1px solid #E3DED0; background: #fff; border-radius: 16px; padding: 11px 4px 10px; color: #10241B; }
.cad-grade i { display: grid; place-items: center; width: 42px; height: 42px; margin: 0 auto 6px; border-radius: 14px; background: #E7F0E9; font-style: normal; font-size: 1.2rem; } .cad-grade b { display: block; font-size: 0.78rem; line-height: 1.2; } .cad-grade small { display: block; font-size: 0.62rem; color: #6B7A72; margin-top: 2px; }
.cad-grade button:nth-child(1) i { background: #FBE3E0; } .cad-grade button:nth-child(2) i { background: #DDF1E5; } .cad-grade button:nth-child(3) i, .cad-grade button:nth-child(6) i { background: #E6E1F5; } .cad-grade button:nth-child(5) i { background: #FFF1D6; } .cad-grade button:nth-child(7) i { background: #DCEAF7; }
#snackBt { color: #9BE3B8 !important; }
.pat { background: #123524 !important; border: 0 !important; color: #F4F1E8; } .pat small { color: #9CC4AE !important; } .pat .big { color: #F4F1E8 !important; } .pat .eq span { background: #1E4D3A !important; color: #F4F1E8 !important; border-color: #2E6A50 !important; }
.sheet.lanc { max-height: 94vh; overflow-y: auto; padding-top: 10px; } .lc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; } .lc-top b { font: 900 1.15rem var(--f-marca); } .lc-top .x { border: 0; background: #EFEADF; width: 32px; height: 32px; border-radius: 50%; color: #10241B; }
.sheet.lanc .seg { display: flex; background: #E7E2D4; border-radius: 12px; padding: 3px; margin-bottom: 4px; } .sheet.lanc .seg button { flex: 1; border: 0; background: transparent; font-size: 0.8rem; font-weight: 800; padding: 7px 0; border-radius: 10px; color: #6B7A72; } .sheet.lanc .seg button.on { background: #fff; color: #123524; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
.lc-valor { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin: 10px 0 6px; flex-wrap: wrap; } .lc-valor small { flex-basis: 100%; text-align: center; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: #6B7A72; }
.lc-valor span { font: 900 1.6rem var(--f-marca); } .lc-valor input { width: 190px; border: 0; border-bottom: 2px solid #E3DED0; background: transparent; font: 900 2.4rem var(--f-marca); letter-spacing: -1px; text-align: left; padding: 0 2px; color: inherit; outline: none; } .lc-valor input:focus { border-bottom-color: #123524; }
.lc-valor.gas { color: #C8453B; } .lc-valor.rec { color: #1F8A55; } .lc-valor.neu { color: #123524; }
.sheet.lanc .rot { margin-top: 8px; display: block; } .lc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; } .lc-chips .chip { font-weight: 700; padding: 6px 11px; background: #fff; } .lc-chips .chip.on { background: #123524; color: #F4F1E8; border-color: #123524; }
.lc-parc { background: #F4F1E8; border: 1px solid #E3DED0; border-radius: 14px; padding: 9px 11px; margin-top: 6px; font-size: 0.84rem; } .lc-parc .mm { display: flex; gap: 6px; margin: 6px 0 4px; flex-wrap: wrap; } .lc-parc .mm span { background: #E7F0E9; border-radius: 10px; padding: 4px 8px; font-size: 0.72rem; text-align: center; } .lc-parc .mm b { display: block; } .lc-parc small { color: #6B7A72; font-size: 0.72rem; }
.lc-mais { border: 0; background: transparent; color: #123524; font-weight: 800; padding: 10px 0 4px; font-size: 0.84rem; } .lc-acoes { position: sticky; bottom: -16px; background: var(--panel); padding: 10px 0 4px; }
.rl-cat { display: block; width: 100%; border: 0; border-bottom: 1px solid #EEEADF; background: transparent; text-align: left; padding: 9px 0; color: var(--ink); } .rl-cat .l { display: flex; justify-content: space-between; gap: 8px; font-size: 0.86rem; }
.rl-cat i { display: block; height: 8px; border-radius: 4px; background: #E7E2D4; margin-top: 5px; overflow: hidden; } .rl-cat i u { display: block; height: 100%; border-radius: 4px; text-decoration: none; } .rl-cat small { font-size: 0.72rem; }
.rl-6m { display: flex; gap: 8px; align-items: flex-end; height: 130px; margin-top: 10px; } .rl-6m > div { flex: 1; display: grid; justify-items: center; gap: 3px; } .rl-6m .b { display: flex; gap: 3px; align-items: flex-end; height: 92px; }
.rl-6m .b i { width: 11px; border-radius: 4px 4px 1px 1px; display: block; } .rl-6m .b i.rec { background: #1F8A55; } .rl-6m .b i.gas { background: #C8453B; } .rl-6m small { font-size: 0.66rem; color: #6B7A72; } .rl-6m em { font-style: normal; font-size: 0.64rem; font-weight: 800; }
''',
}
for app, pasta, nome in [('ag', 'agzote', 'AgZote'), ('fin', 'finzote', 'FinZote')]:
    corpo = re.sub(r'<nav class="barra" id="barra".*?</nav>', NAV[app], corpo0, flags=re.S)
    corpo = re.sub(r'<svg class="logo".*?</svg>', ICONE[app], corpo, count=1, flags=re.S)
    corpo = corpo.replace('<button type="button" role="tab" id="abaDiv">Dívidas</button>', '<button type="button" role="tab" id="abaDiv">Dívidas</button><button type="button" role="tab" id="abaFixas">Contas fixas</button>')
    corpo = corpo.replace('<div class="corpo" id="finExtrato" hidden></div>', '<div class="corpo" id="finExtrato" hidden></div>\n    <div class="corpo" id="finRel" hidden></div>')
    corpo = corpo.replace('<div class="toast" id="toast"', EXTRA_HTML + '<div class="toast" id="toast"')
    if app == 'ag': corpo = corpo.replace('Escreva qualquer coisa: recado, gasto, treino…', 'Escreva: compromisso, tarefa, remédio, nota…')
    assert 'abaFixas' in corpo and 'finRel' in corpo and 'cadOv' in corpo, 'marcadores do corpo'
    script = parser + '\n' + fin + '\n' + app0[:corte] + mods + '\n' + app0[corte:]
    script = "const APP = '" + app + "';\n" + script
    head = head0.replace('</style>', CSS[app] + '</style>') if False else head0
    doc = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
     '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">\n'
     '<meta name="color-scheme" content="' + ('light' if app == 'fin' else 'dark') + '">\n<meta name="theme-color" content="' + (P if app == 'fin' else D) + '">\n' + head + '\n</head>\n<body>' + corpo + '<script>\n' + script + '</script>\n</body>\n</html>\n')
    doc = tematizar(doc, TEMA[app])
    doc = doc.replace('</style>', CSS[app] + '</style>', 1)
    doc = doc.replace('AZote', nome).replace('AZOTE_ANTIGO', 'AZote')
    os.makedirs(f'{REPO}/apps/{pasta}/www', exist_ok=True)
    open(f'{REPO}/apps/{pasta}/www/index.html', 'w').write(doc)
    if not os.path.exists(f'{REPO}/apps/{pasta}/www/fonts'): shutil.copytree(f'{REPO}/www/fonts', f'{REPO}/apps/{pasta}/www/fonts')
    open(f'check-{pasta}.js', 'w').write(re.findall(r'<script>(.*?)</script>', doc, re.S)[0])
print('ok')
