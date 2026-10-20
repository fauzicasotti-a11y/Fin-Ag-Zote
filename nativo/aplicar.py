# Adiciona ao projeto Android gerado pelo Capacitor: atalhos do ícone, link <esquema>:// e o widget.
# Vale para os dois apps: o pacote vem do capacitor.config.json e o esquema de nativo-app/esquema.txt.
# Guarda cópias para nativo/desfazer.py voltar atrás se a compilação falhar.
import os, shutil, json
cfg = json.load(open('capacitor.config.json', encoding='utf-8'))
pacote = cfg['appId']; esquema = open('nativo-app/esquema.txt').read().strip()
base = 'android/app/src/main'
pasta_java = os.path.join(base, 'java', *pacote.split('.'))
man = os.path.join(base, 'AndroidManifest.xml'); ma = os.path.join(pasta_java, 'MainActivity.java')
shutil.copy(man, 'nativo/.manifest.bak')
if os.path.exists(ma): shutil.copy(ma, 'nativo/.mainactivity.bak')
open('nativo/.pasta_java', 'w').write(pasta_java)
os.makedirs(pasta_java, exist_ok=True)
for f in os.listdir('nativo/java'):
    open(os.path.join(pasta_java, f), 'w', encoding='utf-8').write(open(os.path.join('nativo/java', f), encoding='utf-8').read().replace('__PACOTE__', pacote))
# sobra da versão 1.x: az_strings.xml repetia textos que agora ficam em nativo-app/res/values/az_app.xml (causava "Duplicate resources")
for velho in ['nativo/res/values/az_strings.xml', os.path.join(base, 'res/values/az_strings.xml')]:
    if os.path.exists(velho): os.remove(velho); print('removido arquivo antigo:', velho)
for origem in ['nativo/res', 'nativo-app/res']:
    shutil.copytree(origem, os.path.join(base, 'res'), dirs_exist_ok=True)
s = open(man, encoding='utf-8').read()
i = s.find('MainActivity'); ini = s.rfind('<activity', 0, i); fim = s.find('</activity>', i)
assert ini >= 0 and fim > i, 'MainActivity não encontrada no manifesto'
extra = ('\n            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />'
         '\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />'
         '\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="' + esquema + '" />\n            </intent-filter>\n        ')
s = s[:fim] + extra + s[fim:]
rec = ('    <receiver android:name=".AZoteWidget" android:exported="false">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>'
       '\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/az_widget_info" />\n        </receiver>\n    ')
k = s.rfind('</application>'); s = s[:k] + rec + s[k:]
# o AgZote abre o FinZote por link: o Android 11+ precisa saber que o app pode consultar esse esquema
q = '<intent><action android:name="android.intent.action.VIEW" /><data android:scheme="finzote" /></intent><intent><action android:name="android.intent.action.VIEW" /><data android:scheme="agzote" /></intent>'
if '<queries>' in s: s = s.replace('<queries>', '<queries>' + q, 1)
else: k = s.find('<application'); s = s[:k] + '<queries>' + q + '</queries>\n    ' + s[k:]
open(man, 'w', encoding='utf-8').write(s)
print(s)
