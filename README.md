# LocalLama Chat

Um chatbot web simples que utiliza modelos de linguagem locais do Ollama para gerar respostas.

## Requisitos

- [Ollama](https://ollama.ai/) instalado e rodando localmente
- Um navegador web moderno

## Como usar

1. Instale o Ollama seguindo as instruções em [ollama.ai](https://ollama.ai/)
2. Execute o Ollama no seu computador
3. Baixe pelo menos um modelo (como llama2, mistral, gemma, etc.) usando comando `ollama pull modelo`
4. Abra o arquivo `public/index.html` em seu navegador
5. Selecione o modelo que você baixou no seletor no cabeçalho
6. Digite sua mensagem e pressione Enter ou clique no botão de enviar

## Características

- Interface de chat moderna e responsiva
- Suporte para múltiplos modelos do Ollama
- Formatação básica de markdown nas respostas
- Status de conexão com o Ollama

## Solução de problemas

Se encontrar problemas com o aplicativo:

1. Verifique se o Ollama está rodando (você deve ver "Ollama: Conectado" na barra de status)
2. Verifique se você já baixou pelo menos um modelo com `ollama pull modelo`
3. Se o Ollama ficar offline, o status irá atualizar automaticamente a cada 30 segundos

## Desenvolvimento

Este é um projeto simples baseado em HTML, CSS e JavaScript puro, sem dependências externas. Todos os arquivos estão na pasta `public/`.

Para modificar:
- `public/index.html` - Estrutura da página
- `public/css/style.css` - Estilos e layout
- `public/js/app.js` - Toda a lógica de comunicação com o Ollama

## Nota sobre CORS

Se você tiver problemas de CORS ao acessar a API do Ollama, pode ser necessário iniciar o Ollama com a flag `OLLAMA_ORIGINS=*` para permitir o acesso a partir do navegador:

```
OLLAMA_ORIGINS=* ollama serve
```
