# AgZote e FinZote para Android

Dois apps gerados do mesmo repositório: **AgZote** (agenda, tarefas, anotações, Pessoal) e **FinZote** (finanças com menu de cadastro). Cada um fica em `apps/<nome>` e o GitHub gera os dois APKs em toda atualização (Artifacts › AgZote-apk e FinZote-apk).

## Trocando o AZote pelos dois apps

1. **Não desinstale o AZote.** Instale o `AgZote.apk` por cima dele: o AgZote usa a mesma identificação e fica com todos os seus compromissos, tarefas, anotações e dados pessoais.
2. Abra o AgZote. No Hoje aparece “Suas finanças agora ficam no FinZote”: toque em **Gerar arquivo** e guarde (Drive ou Arquivos).
3. Instale o `FinZote.apk`, toque em **Importar do AZote / AgZote** e escolha esse arquivo.

## Versão antiga (referência)

App de agenda: você escreve um recado ("dentista amanhã às 15h, avisar 30 min antes") e ele vira um compromisso com notificação do Android, que toca mesmo com o app fechado e o celular bloqueado.

## Como gerar o APK (uma vez, ~15 minutos, sem instalar nada no PC)

1. Crie uma conta grátis em https://github.com
2. Clique em **+** (canto superior direito) → **New repository**. Nome: `recado-agenda`. Marque **Private**. Clique em **Create repository**.
3. Na página que abrir, clique no link **uploading an existing file**.
4. Abra a pasta descompactada `recado-android` no seu computador, selecione **tudo o que está dentro dela** (inclusive a pasta `.github`) e arraste para a página. Clique em **Commit changes**.
5. Vá na aba **Actions**. A tarefa **Gerar APK** começa sozinha e leva de 5 a 10 minutos. Se aparecer um botão para habilitar o Actions, clique nele e depois em **Run workflow**.
6. Quando aparecer o ✓ verde, clique na tarefa e, embaixo, em **Artifacts → RecadoAgenda-apk**. Baixe e descompacte: dentro está o `RecadoAgenda.apk`.

## Como instalar no celular

1. Passe o `RecadoAgenda.apk` para o celular (Google Drive, e-mail ou WhatsApp para você mesmo).
2. Toque no arquivo. O Android vai pedir para **permitir instalar apps desta fonte**: permita.
3. Se o Play Protect avisar que o app é desconhecido, toque em **Mais detalhes → Instalar mesmo assim**. O aviso aparece porque o app não veio da Play Store.

## Primeiro uso

1. Abra o app e mande um recado. Quando o Android perguntar, **permita notificações**.
2. Toque em **Testar aviso**: uma notificação deve chegar em 5 segundos.
3. Se o app pedir, permita **Alarmes e lembretes**. Assim os avisos tocam no minuto exato.
4. Em celulares Samsung, Xiaomi, Motorola e outros: Configurações → Apps → Recado Agenda → Bateria → **Sem restrições**. Isso evita que o sistema segure os avisos.

## Bom saber

- Os compromissos ficam guardados **só no celular**. Se você desinstalar o app, eles se perdem.
- Para atualizar o app, troque os arquivos no GitHub. Um APK novo é gerado sozinho e você o instala por cima do antigo, sem perder seus dados.
- Mantenha o repositório **privado**: a pasta `keystore` contém a assinatura do app.

## O que tem em cada arquivo

- `www/index.html`: o app inteiro (tela, interpretação das mensagens e avisos).
- `capacitor.config.json`: nome e identificação do app.
- `package.json`: bibliotecas usadas (Capacitor, notificações locais e armazenamento).
- `.github/workflows/build-apk.yml`: a "receita" que o GitHub segue para compilar o APK.
- `apps/agzote` e `apps/finzote`: o app de cada um (`www`), nome e identificação (`capacitor.config.json`), ícones (`icone-android`), atalhos e widget (`nativo-app`) e a versão (`versao.txt`).
- `nativo/`: código do widget e dos atalhos, comum aos dois. Se essa parte não compilar, o GitHub gera o APK sem ela e mostra um aviso amarelo na tarefa.
