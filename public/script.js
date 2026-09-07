const formulario = document.getElementById('formulario');
const botaoEnviar = document.getElementById('botaoEnviar');
const conversa = document.getElementById('conversa');
const statusMensagem = document.getElementById('statusMensagem');
const inputJogador = document.getElementById('jogador');
const inputPergunta = document.getElementById('pergunta');
const fotoJogador = document.getElementById('fotoJogador');

// Guarda o histórico da conversa atual (some se recarregar a página).
// Cada item: { autor: 'usuario' | 'assistente', texto: '...' }
let historico = [];

function adicionarMensagem(autor, texto) {
  const bolha = document.createElement('div');
  bolha.className = `mensagem mensagem-${autor}`;
  bolha.textContent = texto;
  conversa.appendChild(bolha);
  conversa.scrollTop = conversa.scrollHeight;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const jogador = inputJogador.value.trim();
  const pergunta = inputPergunta.value.trim();

  if (!jogador) {
    statusMensagem.textContent = '⚠️ Digite o nome de um jogador antes de perguntar.';
    statusMensagem.className = 'status erro';
    statusMensagem.hidden = false;
    inputJogador.focus();
    return;
  }

  if (!pergunta) return;

  adicionarMensagem('usuario', pergunta);
  inputPergunta.value = '';
  statusMensagem.hidden = true;
  botaoEnviar.disabled = true;
  botaoEnviar.textContent = '...';

  try {
    const resposta = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador, pergunta, historico }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Algo deu errado.');
    }

    adicionarMensagem('assistente', dados.resposta);

    if (dados.jogadorId) {
      fotoJogador.src = `/api/player-image/${dados.jogadorId}`;
      fotoJogador.hidden = false;
      // Se a imagem não carregar (404, etc), escondemos de novo em vez de mostrar o ícone quebrado.
      fotoJogador.onerror = () => {
        fotoJogador.hidden = true;
      };
    }

    // Atualiza o histórico para a próxima pergunta poder usar o contexto.
    historico.push({ autor: 'usuario', texto: pergunta });
    historico.push({ autor: 'assistente', texto: dados.resposta });

    // Mantém só as últimas 10 mensagens para não deixar o pedido gigante.
    if (historico.length > 10) {
      historico = historico.slice(-10);
    }
  } catch (erro) {
    statusMensagem.textContent = `⚠️ ${erro.message}`;
    statusMensagem.className = 'status erro';
    statusMensagem.hidden = false;
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = 'Chutar';
  }
});

// Se o nome do jogador mudar, começamos uma conversa nova (limpa o histórico).
inputJogador.addEventListener('change', () => {
  historico = [];
  conversa.innerHTML = '';
  fotoJogador.hidden = true;
});
