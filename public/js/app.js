// Configuração e constantes
const OLLAMA_API_URL = 'http://localhost:11434/api';
const modelSelect = document.getElementById('model');
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusElement = document.getElementById('status');
const apiStatusElement = document.getElementById('api-status');

// Estados da aplicação
let isGenerating = false;
let currentController = null;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);
    
    // Event listeners para input do usuário
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserMessage();
        }
    });
    
    sendButton.addEventListener('click', handleUserMessage);
});

// Função para verificar status do servidor Ollama
async function checkOllamaStatus() {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/tags`, { 
            method: 'GET',
            timeout: 3000
        });
        
        if (response.ok) {
            const data = await response.json();
            apiStatusElement.className = 'api-status online';
            apiStatusElement.textContent = `Ollama: Conectado (${data.models.length} modelos)`;
            
            // Atualizar lista de modelos disponíveis
            updateAvailableModels(data.models);
        } else {
            setApiOffline();
        }
    } catch (error) {
        setApiOffline();
    }
}

// Função para marcar API como offline
function setApiOffline() {
    apiStatusElement.className = 'api-status offline';
    apiStatusElement.textContent = 'Ollama: Desconectado';
}

// Atualizar lista de modelos disponíveis
function updateAvailableModels(models) {
    // Salvar o modelo selecionado atualmente
    const currentModel = modelSelect.value;
    
    // Limpar seletor
    modelSelect.innerHTML = '';
    
    // Adicionar modelos disponíveis
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        modelSelect.appendChild(option);
    });
    
    // Tentar restaurar a seleção anterior ou usar o primeiro disponível
    if (models.some(m => m.name === currentModel)) {
        modelSelect.value = currentModel;
    }
    
    // Habilitar o select
    modelSelect.disabled = false;
}

// Função para lidar com mensagens do usuário
function handleUserMessage() {
    const message = userInput.value.trim();
    
    if (message && !isGenerating) {
        // Adicionar mensagem do usuário ao chat
        addMessageToChat('user', message);
        
        // Limpar input
        userInput.value = '';
        
        // Gerar resposta
        generateResponse(message);
    }
}

// Função para adicionar mensagem ao chat
function addMessageToChat(role, content, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    const icon = document.createElement('i');
    icon.className = role === 'user' ? 'fas fa-user' : 'fas fa-robot';
    avatar.appendChild(icon);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    
    // Se for streaming, adicionar um ID para atualizar depois
    if (isStreaming) {
        textDiv.id = 'streaming-message';
    }
    
    // Converter Markdown simples
    textDiv.innerHTML = formatMessage(content);
    
    messageContent.appendChild(avatar);
    messageContent.appendChild(textDiv);
    messageDiv.appendChild(messageContent);
    
    messagesContainer.appendChild(messageDiv);
    
    // Rolar para o final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Formatar mensagem (tratamento completo de Markdown)
function formatMessage(content) {
    // Escapar HTML para evitar injeção
    let text = escapeHtml(content);
    
    // Preservar blocos de código antes de outras transformações
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code>${code}</code></pre>`);
        return placeholder;
    });
    
    // Preservar código inline antes de outras transformações
    const inlineCode = [];
    text = text.replace(/`([^`]+?)`/g, (match, code) => {
        const placeholder = `__INLINE_CODE_${inlineCode.length}__`;
        inlineCode.push(`<code>${code}</code>`);
        return placeholder;
    });
    
    // Títulos
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Negrito
    text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    
    // Itálico
    text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
      // Listas não ordenadas - detecção mais robusta
    const ulBlocks = [];
    text = text.replace(/(?:^\* .*?$\n?)+/gm, (match) => {
        const items = match.split('\n')
            .filter(line => line.trim().startsWith('* '))
            .map(line => `<li>${line.trim().substring(2)}</li>`)
            .join('');
        
        const placeholder = `__UL_BLOCK_${ulBlocks.length}__`;
        ulBlocks.push(`<ul>${items}</ul>`);
        return placeholder;
    });
    
    // Listas ordenadas - detecção mais robusta
    const olBlocks = [];
    text = text.replace(/(?:^\d+\. .*?$\n?)+/gm, (match) => {
        const items = match.split('\n')
            .filter(line => /^\d+\. /.test(line.trim()))
            .map(line => `<li>${line.trim().replace(/^\d+\. /, '')}</li>`)
            .join('');
        
        const placeholder = `__OL_BLOCK_${olBlocks.length}__`;
        olBlocks.push(`<ol>${items}</ol>`);
        return placeholder;
    });
    
    // Parágrafos
    text = text.replace(/\n\n/g, '</p><p>');
      // Restaurar listas não ordenadas e ordenadas
    ulBlocks.forEach((list, index) => {
        text = text.replace(`__UL_BLOCK_${index}__`, list);
    });
    
    olBlocks.forEach((list, index) => {
        text = text.replace(`__OL_BLOCK_${index}__`, list);
    });
    
    // Restaurar blocos de código
    codeBlocks.forEach((block, index) => {
        text = text.replace(`__CODE_BLOCK_${index}__`, block);
    });
    
    // Restaurar código inline
    inlineCode.forEach((code, index) => {
        text = text.replace(`__INLINE_CODE_${index}__`, code);
    });
    
    // Quebras de linha (depois de processar outros elementos)
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para gerar resposta usando Ollama API
async function generateResponse(prompt) {
    const selectedModel = modelSelect.value;
    
    // Atualizar estado
    isGenerating = true;
    sendButton.disabled = true;
    statusElement.textContent = 'Gerando resposta...';
    
    // Adicionar mensagem vazia para streaming
    addMessageToChat('bot', '▌', true);
    
    let fullResponse = '';
    
    // Criar controller para poder cancelar a requisição
    currentController = new AbortController();
    const signal = currentController.signal;
    
    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: true
            }),
            signal
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Elemento para atualizar durante o streaming
        const streamingElement = document.getElementById('streaming-message');
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Decodificar o chunk
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            // Processar cada linha de resposta
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    
                    if (json.response) {
                        fullResponse += json.response;
                        streamingElement.innerHTML = formatMessage(fullResponse + (json.done ? '' : '▌'));
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                    
                    if (json.done) {
                        break;
                    }
                } catch (e) {
                    console.error('Erro ao processar JSON:', e);
                }
            }
        }
        
        // Atualizar a mensagem final
        streamingElement.innerHTML = formatMessage(fullResponse);
        streamingElement.removeAttribute('id');
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Requisição cancelada');
        } else {
            console.error('Erro ao gerar resposta:', error);
            
            // Atualizar a mensagem de erro
            const streamingElement = document.getElementById('streaming-message');
            if (streamingElement) {
                streamingElement.innerHTML = 'Erro ao conectar com o servidor Ollama. Verifique se o serviço está rodando.';
                streamingElement.removeAttribute('id');
            }
        }
    } finally {
        // Restaurar estado
        isGenerating = false;
        sendButton.disabled = false;
        statusElement.textContent = 'Pronto';
        currentController = null;
    }
}

// Funcionalidade para cancelar a geração
function stopGeneration() {
    if (currentController) {
        currentController.abort();
        statusElement.textContent = 'Geração cancelada';
    }
}
