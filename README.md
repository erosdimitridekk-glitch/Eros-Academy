# Eros Academy + Eros IA

Este pacote contém:
- `www/index.html`: aplicativo Eros Academy atualizado com o chat Eros IA.
- `api/chat.js`: backend serverless que conversa com a Groq e mantém a chave de API no servidor.
- `capacitor.config.json` e `package.json`: configuração para gerar o projeto Android com Capacitor.

## 1) Preparar a IA (necessário uma vez)

A chave Groq NÃO deve ser colocada no HTML nem no APK.

1. Crie/tenha uma chave Groq na sua conta.
2. Publique esta pasta como projeto na Vercel (pelo painel ou pelo CLI).
3. Nas configurações do projeto na Vercel, adicione a variável de ambiente:
   - Nome: `GROQ_API_KEY`
   - Valor: sua chave Groq
4. Opcional: adicione `GROQ_MODEL` com `openai/gpt-oss-20b`.
5. Faça um novo deploy.
6. Copie o endereço público do projeto, por exemplo `https://seu-projeto.vercel.app`.

No aplicativo, toque em **Eros IA** → ⚙ e cole:
`https://seu-projeto.vercel.app/api/chat`

O endereço acima é apenas um exemplo; use o endereço real do seu deploy.

## 2) Gerar o APK Android

Requisitos atuais do Capacitor 8:
- Node.js 24 ou superior.
- Android Studio 2025.2.1 ou superior.
- Android SDK instalado pelo SDK Manager.

No Windows, abra o terminal dentro desta pasta e execute:

```bat
npm install
npx cap add android
npx cap sync android
npx cap open android
```

No Android Studio:
1. Aguarde a sincronização do Gradle.
2. Selecione **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Quando terminar, use o botão de localização do APK gerado.

Para atualizar o app depois de editar `www/index.html`:

```bat
npx cap sync android
```

Se o projeto Android já tiver sido criado, não execute `npx cap add android` novamente.

## 3) Como funciona

- O chat envia a conversa e um resumo dos dados atuais para o backend.
- A Groq interpreta a intenção e pode solicitar funções limitadas.
- O próprio JavaScript do aplicativo aplica as alterações no armazenamento local.
- Dias de folga e alterações de sessão ficam salvos no dispositivo.
- A biblioteca de golpes continua usando a aba existente. O assistente pode cadastrar/editar/excluir números e nomes, mas não cria instruções técnicas.
- Vídeos continuam sendo importados manualmente pela tela de edição do golpe e guardados no IndexedDB do dispositivo.
- O microfone usa reconhecimento de voz do navegador quando disponível. Em alguns WebViews Android essa função pode não ser suportada; o chat por texto continua funcionando.

## 4) Observações importantes

- O ZIP não contém uma APK compilada. Ele contém o projeto-fonte pronto para gerar a plataforma Android com Capacitor; a compilação exige Android Studio e SDK.
- A IA só funciona depois que o backend for publicado e a variável `GROQ_API_KEY` estiver configurada.
- Não compartilhe sua chave Groq. Nunca cole a chave dentro do arquivo HTML.
- O aplicativo mantém seus dados de treino e vídeos localmente no aparelho. Eles não são sincronizados automaticamente entre dispositivos.
- O endpoint serverless tem CORS aberto para permitir chamadas do app instalado. Para uso público, adicione autenticação e limites de requisições no backend.

## 5) Arquivos principais

- `www/index.html`
- `api/chat.js`
- `package.json`
- `capacitor.config.json`
- `vercel.json`
