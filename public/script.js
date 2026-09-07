const formulario = document.getElementById('formulario');
const botaoEnviar = document.getElementById('botaoEnviar');
const conversa = document.getElementById('conversa');
const statusMensagem = document.getElementById('statusMensagem');
const inputJogador = document.getElementById('jogador');
const inputPergunta = document.getElementById('pergunta');
const fotoJogador = document.getElementById('fotoJogador');

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
      fotoJogador.onerror = () => {
        fotoJogador.hidden = true;
      };
    }

    historico.push({ autor: 'usuario', texto: pergunta });
    historico.push({ autor: 'assistente', texto: dados.resposta });

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

inputJogador.addEventListener('change', () => {
  historico = [];
  conversa.innerHTML = '';
  fotoJogador.hidden = true;
});
