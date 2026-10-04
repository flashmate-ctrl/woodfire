# 🔥 Ninja Woodfire Pro Connect XL (OG901EU) - Price Tracker & Monitor

Aplicação completa de monitorização de preços, comparador de mercado ao estilo do **KuantoKusta** e sistema de alertas em tempo real no **Telegram** para o grelhador elétrico de exterior **Ninja Woodfire Pro Connect XL (Modelo OG901EU)**.

---

## 🚀 Funcionalidades Principais

- 📱 **Instalação Nativa no Android (PWA):**
  - Compatível com o padrão Progressive Web App para instalação direta no smartphone Android.
  - Funciona como uma aplicação nativa em ecrã inteiro com ícone oficial da **Ninja Woodfire**.
  - Suporte a cache offline através de Service Worker.
- 🎨 **Design com Identidade Oficial Ninja Woodfire:**
  - Estética *Dark Outdoor BBQ* com preto grafite mate, tons de chama *Woodfire Orange*, acentos digitais *ProConnect Cyan* e tipografia robusta inspirada no painel LCD do grelhador.
- ⏰ **Monitorização Automática 4x ao Dia:** Executa verificações automáticas nos horários padrão (**00:00**, **06:00**, **12:00** e **18:00**) através de agendador integrado (`node-cron`).
- 🏬 **Comparador de Lojas com Envio para Portugal:**
  - **Amazon.es** (Envio grátis para Portugal em compras > 35€ / Prime)
  - **Worten.pt** (Envio grátis em loja / campanhas)
  - **PcComponentes.pt** (Envio para Portugal Continental)
  - **Ninja Kitchen Portugal Oficial** (ninjakitchen.pt - envio grátis > 50€)
  - **Top Lojas Portuguesas via KuantoKusta** (Hipermercado, Castro Electrónica, Kibo, NovoAtalho, Stock In, Digibest com portes grátis para PT).
- 📈 **Comparativo de Preços dos Últimos 6 Meses (Estilo KuantoKusta):**
  - Gráfico interativo com a evolução do **Preço Mais Baixo** e do **Preço Médio** no mercado português.
  - Curvas individuais para cada loja (Amazon, Worten, PcComponentes, Ninja Oficial).
  - Veredito inteligente de compra baseado no histórico (ex: "Excelente Compra - 30€ abaixo da média").
- 🚨 **Alertas Automáticos no Telegram:**
  - Notificação imediata com mensagem formatada em HTML sempre que qualquer loja baixar de preço.
  - Inclui percentagem de desconto, poupança em euros, confirmação de portes grátis para Portugal e link direto para a loja.
- 🤖 **Relatório Diário de Vigilância (Heartbeat):**
  - Mesmo que não seja detetada nenhuma descida de preço abaixo do alvo (380 €), o bot envia uma mensagem diária de ponto de situação no Telegram.
  - Garante que sabes sempre que o bot continua 100% ativo e a vigiar as lojas 24/7 sem falhas.
- 💻 **Dashboard Web Moderno:**
  - Interface responsiva acessível no browser em `http://localhost:3000`.
  - Botão **"Verificar Agora"** para disparar um scan instantâneo a qualquer momento.
  - Painel de configuração rápida e botão **"Testar Alerta Agora"** para validar as credenciais do Telegram com 1 clique.

---

## 🛠️ Como Iniciar a Aplicação

### 1. Gestão em Segundo Plano com PM2 (Recomendado)
A aplicação já está configurada no **PM2** e programada para arrancar automaticamente com o Windows:

```bash
# Ver estado dos serviços
pm2 status

# Ver logs em tempo real
pm2 logs ninja-woodfire

# Reiniciar o serviço
pm2 restart ninja-woodfire

# Parar o serviço
pm2 stop ninja-woodfire
```

Abre o teu browser no computador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📱 Como Instalar no Telemóvel Android

A aplicação foi convertida para **PWA (Progressive Web App)**, permitindo ser instalada diretamente no teu smartphone Android como uma aplicação nativa (com ícone próprio no ecrã inicial e execução em ecrã inteiro sem barras do navegador):

1. Certifica-te de que o teu smartphone Android está ligado à mesma rede Wi-Fi do computador.
2. No telemóvel, abre o **Google Chrome** e acede ao endereço IP local do teu PC:
   👉 **`http://192.168.1.66:3000`**
3. Toca no botão **"Instalar App"** no topo da página, ou toca no menu dos **três pontos (⋮)** do Chrome e seleciona **"Instalar aplicação"** (ou *"Adicionar ao ecrã principal"*).
4. Confirma a instalação. O ícone oficial do **Ninja Woodfire** aparecerá no ecrã inicial do teu smartphone!

---

### 2. Iniciar Manualmente (sem PM2)
Se quiseres correr diretamente no terminal:
```bash
npm start
```

### 3. Executar uma Verificação Rápida via Terminal (CLI)
Se quiseres verificar os preços pontualmente no terminal sem abrir o browser:

```bash
npm run check
```

---

## 📱 Configuração do Telegram (Passo a Passo de 2 Minutos)

Para receberes as notificações no teu smartphone ou computador:

1. **Criar o Bot:**
   - No Telegram, pesquisa por **`@BotFather`** e envia o comando `/newbot`.
   - Escolhe um nome e um username para o teu bot (ex: `MeuNinjaBot`).
   - O BotFather dará um **HTTP API Token** (ex: `7123456789:AAHk...`).

2. **Iniciar o Bot:**
   - Procura pelo username do teu novo bot no Telegram e clica em **Começar / Start**.

3. **Obter o teu Chat ID:**
   - No Telegram, pesquisa por **`@userinfobot`** e envia qualquer mensagem.
   - O bot responde com o teu **ID** numérico (ex: `123456789`).

4. **Guardar no Dashboard ou no ficheiro `.env`:**
   - Abre o painel em `http://localhost:3000`.
   - No cartão **"Configuração de Alertas Telegram"**, cola o **Bot Token** e o **Chat ID**.
   - Clica em **"Guardar Configuração"** e de seguida em **"Testar Alerta Agora"**.
   - Irás receber de imediato uma mensagem de confirmação no Telegram!

---

## 📊 Estrutura de Ficheiros

```text
woodfire/
├── package.json               # Dependências (express, node-cron, cheerio, dotenv)
├── .env                       # Variáveis de ambiente locais (portas, tokens)
├── data/
│   ├── config.json            # Configuração persistente do utilizador
│   ├── database.json          # Preços atuais, logs de scans e histórico de alertas
│   └── history_6m.json        # Dataset dos últimos 6 meses estilo KuantoKusta
├── src/
│   ├── server.js              # Servidor Express e rotas da API REST
│   ├── monitor.js             # Agendador das 4 verificações diárias (00h, 06h, 12h, 18h)
│   ├── telegram.js            # Integração com a API do Telegram e formatação de alertas
│   ├── database.js            # Camada de dados e persistência
│   ├── seed_history.js        # Gerador do histórico de 6 meses
│   ├── cli-check.js           # Utilitário de linha de comandos
│   └── scrapers/              # Módulos de extração de dados
│       ├── index.js           # Orquestrador de verificação
│       ├── kuantokusta.js     # Scraper KuantoKusta (ofertas PT e portes)
│       ├── amazon.js          # Scraper Amazon.es (ASIN B0CXDTMM28)
│       ├── worten.js          # Scraper Worten.pt
│       ├── pccomponentes.js   # Scraper PcComponentes.pt
│       └── ninjakitchen.js    # Scraper Loja Oficial Ninja Kitchen PT
└── public/                    # Frontend do Dashboard Web
    ├── index.html             # Estrutura HTML estilo KuantoKusta
    ├── css/style.css          # Estilos modernos e responsivos
    └── js/app.js              # Gráfico Chart.js e interações dinâmicas
```

---

## ⏰ Personalização de Horários de Verificação

Por predefinição, o monitor corre 4 vezes por dia nos horários `00:00`, `06:00`, `12:00` e `18:00`.
Podes alterar a expressão cron no ficheiro `.env` ou no painel:

- `0 0,6,12,18 * * *` (Padrão: 4 vezes ao dia)
- `0 */4 * * *` (De 4 em 4 horas - 6 vezes ao dia)
- `0 */2 * * *` (De 2 em 2 horas)
