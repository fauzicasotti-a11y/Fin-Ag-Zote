# Volta o projeto Android ao padrão do Capacitor (sem atalhos e widget), caso não compilem.
import os, shutil
base = 'android/app/src/main'
pasta_java = open('nativo/.pasta_java').read().strip()
shutil.copy('nativo/.manifest.bak', os.path.join(base, 'AndroidManifest.xml'))
if os.path.exists('nativo/.mainactivity.bak'): shutil.copy('nativo/.mainactivity.bak', os.path.join(pasta_java, 'MainActivity.java'))
w = os.path.join(pasta_java, 'AZoteWidget.java')
if os.path.exists(w): os.remove(w)
print('Projeto Android voltou ao padrão (sem atalhos e widget).')
