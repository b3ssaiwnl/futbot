require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const {
  GEMINI_API_KEY,
  RAPIDAPI_KEY,
  PORT = 3000,
} = process.env;

const FOOTBALL_API_HOST = 'free-api-live-football-data.p.rapidapi.com';
const GEMINI_MODEL = 'gemini-3.6-flash';

function headersFootball() {
  return {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': FOOTBALL_API_HOST,
  };
}

async function buscarIdDoJogador(nome) {
  const url = `https://${FOOTBALL_API_HOST}/football-players-search?search=${encodeURIComponent(nome)}`;
  const resposta = await fetch(url, { headers: headersFootball() });

  if (!resposta.ok) {
    throw new Error(`Erro ao buscar jogador na API de futebol (status ${resposta.status})`);
  }

  const dados = await resposta.json();
  const sugestoes = dados?.response?.suggestions ?? [];
  const primeiroJogador = sugestoes.find((item) => item.type === 'player' && !item.isCoach);

  if (!primeiroJogador) {
    throw new Error(`Não encontrei nenhum jogador com o nome "${nome}". Confira a grafia e tente de novo.`);
  }

  return {
    id: primeiroJogador.id,
    nome: primeiroJogador.name,
    time: primeiroJogador.teamName,
  };
}

async function buscarDetalhesDoJogador(id) {
  const url = `https://${FOOTBALL_API_HOST}/football-get-player-detail?playerid=${id}`;
  const resposta = await fetch(url, { headers: headersFootball() });

  if (!resposta.ok) {
    throw new Error(`Erro ao buscar detalhes do jogador (status ${resposta.status})`);
  }

  return resposta.json();
}

async function perguntarAoGemini(pergunta, dadosDoJogador, historico = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Você é um assistente especialista em futebol, que conversa de forma simpática e direta.

Um usuário fez esta pergunta: "${pergunta}"

Abaixo estão dados brutos (em JSON) vindos de uma API oficial de estatísticas de futebol sobre o jogador.
Use esses dados como fonte principal e confiável para estatísticas, time e números.
Você também pode complementar com conhecimento geral sobre biografia, trajetória e curiosidades do jogador,
mas deixe claro quando uma informação vier do seu conhecimento geral (e não da API), pois pode estar desatualizada.
Se os dados da API não trouxerem alguma estatística específica que o usuário pediu, diga isso claramente
em vez de inventar um número.

Dados da API:
${JSON.stringify(dadosDoJogador).slice(0, 10000)}

Responda em português, de forma organizada e fácil de ler.
`.trim();

  const contents = [
    ...historico.map((mensagem) => ({
      role: mensagem.autor === 'usuario' ? 'user' : 'model',
      parts: [{ text: mensagem.texto }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Erro ao chamar o Gemini (status ${resposta.status}): ${detalhe}`);
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!texto) {
    throw new Error('O Gemini não retornou um texto de resposta.');
  }

  return texto;
}

app.post('/api/chat', async (req, res) => {
  const { jogador, pergunta, historico } = req.body;

  if (!jogador || !pergunta) {
    return res.status(400).json({
      erro: 'Envie "jogador" (nome do jogador) e "pergunta" (o que você quer saber) no corpo da requisição.',
    });
  }

  try {
    const { id, nome, time } = await buscarIdDoJogador(jogador);
    const detalhes = await buscarDetalhesDoJogador(id);
    const dadosCompletos = { nomeEncontrado: nome, time, detalhes };
    const respostaFinal = await perguntarAoGemini(pergunta, dadosCompletos, historico);
    res.json({ resposta: respostaFinal, jogadorId: id });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: erro.message || 'Erro inesperado no servidor.' });
  }
});

function encontrarUrlDeImagem(objeto, profundidade = 0) {
  if (!objeto || typeof objeto !== 'object' || profundidade > 5) return null;

  for (const valor of Object.values(objeto)) {
    if (typeof valor === 'string' && valor.startsWith('http')) return valor;
    if (typeof valor === 'object') {
      const encontrado = encontrarUrlDeImagem(valor, profundidade + 1);
      if (encontrado) return encontrado;
    }
  }

  return null;
}

app.get('/api/player-image/:id', async (req, res) => {
  try {
    const url = `https://${FOOTBALL_API_HOST}/football-get-player-logo?playerid=${req.params.id}`;
    const resposta = await fetch(url, { headers: headersFootball() });

    if (!resposta.ok) {
      return res.status(resposta.status).end();
    }

    const tipoConteudo = resposta.headers.get('content-type') || '';

    if (tipoConteudo.startsWith('image/')) {
      res.set('Content-Type', tipoConteudo);
      const buffer = Buffer.from(await resposta.arrayBuffer());
      return res.send(buffer);
    }

    const dadosJson = await resposta.json();
    const urlDaImagem = encontrarUrlDeImagem(dadosJson);

    if (!urlDaImagem) {
      return res.status(404).end();
    }

    const respostaImagem = await fetch(urlDaImagem);
    if (!respostaImagem.ok) {
      return res.status(respostaImagem.status).end();
    }

    res.set('Content-Type', respostaImagem.headers.get('content-type') || 'image/png');
    const buffer = Buffer.from(await respostaImagem.arrayBuffer());
    res.send(buffer);
  } catch (erro) {
    console.error(erro);
    res.status(500).end();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('cole_sua_chave')) {
    console.warn('⚠️  GEMINI_API_KEY não configurada no arquivo .env');
  }
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY.includes('cole_sua_chave')) {
    console.warn('⚠️  RAPIDAPI_KEY não configurada no arquivo .env');
  }
});
