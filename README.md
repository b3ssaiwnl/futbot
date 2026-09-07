# Chatbot de Jogadores de Futebol

Chatbot que responde perguntas sobre jogadores de futebol combinando:
- **Dados reais** da API "Free API Live Football Data" (RapidAPI)
- **IA generativa** (Google Gemini) para transformar os dados em respostas naturais e complementar com biografia

## Como rodar na sua máquina

### 1. Ter o Node.js instalado
Baixe em https://nodejs.org (versão 18 ou mais recente, para ter o `fetch` nativo).

### 2. Instalar as dependências
Abra o terminal dentro da pasta do projeto e rode:

```
npm install
```

### 3. Configurar suas chaves
Copie o arquivo `.env.example` e renomeie a cópia para `.env`. Abra esse novo arquivo e cole suas chaves:

```
GEMINI_API_KEY=sua_chave_do_gemini
RAPIDAPI_KEY=sua_chave_do_rapidapi
```

⚠️ O arquivo `.env` nunca deve ser enviado ao GitHub (ele já está no `.gitignore`).

### 4. Rodar o servidor

```
npm start
```

Depois, abra no navegador: **http://localhost:3000**

## Como funciona (por dentro)

1. Você digita o nome de um jogador e uma pergunta na página.
2. O backend (`server.js`) busca esse jogador na API de futebol e recebe os dados brutos (estatísticas, time, etc).
3. O backend manda esses dados + sua pergunta para o Gemini, pedindo para ele responder usando os dados reais como fonte principal.
4. A resposta da IA volta para a tela.

## Possíveis melhorias futuras

- Trocar a IA para a API do Claude (Anthropic) quando tiver créditos — só muda a função `perguntarAoGemini` no `server.js`.
- Guardar um histórico de conversa (hoje cada pergunta é isolada).
- Mostrar foto do jogador e escudo do time, se a API fornecer.
- Tratar melhor os casos em que a busca não encontra nenhum jogador.

## Estrutura de arquivos

```
chatbot-futebol/
├── server.js          
├── package.json
├── .env.example        
├── public/
│   ├── index.html      
│   ├── style.css        
│   └── script.js        
```
