// Configuração e constantes
const OLLAMA_API_URL = 'http://localhost:11434/api';
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusElement = document.getElementById('status');
const apiStatusElement = document.getElementById('api-status');
const modelButton = document.getElementById('model-button');
const modelDropdown = document.getElementById('model-dropdown');
const themeToggle = document.getElementById('theme-toggle');

// Estados da aplicação
let isGenerating = false;
let currentController = null;
let selectedModel = 'llama2'; // Modelo padrão
let availableModels = [];
let currentTheme = localStorage.getItem('theme') || 'light';

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema
    initializeTheme();
    
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
    
    // Event listeners para o dropdown de modelos
    modelButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleModelDropdown();
    });
    
    // Event listener para troca de tema
    themeToggle.addEventListener('click', toggleTheme);
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', () => {
        closeModelDropdown();
    });
    
    // Event listeners para itens do dropdown
    modelDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.classList.contains('dropdown-item')) {
            selectModel(e.target.dataset.model, e.target.textContent);
        }
    });
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
            apiStatusElement.textContent = `Ollama: Connected (${data.models.length} models)`;
            
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
    apiStatusElement.textContent = 'Ollama: Disconnected';
}

// Atualizar lista de modelos disponíveis
function updateAvailableModels(models) {
    availableModels = models;
    
    // Limpar dropdown
    modelDropdown.innerHTML = '';
    
    // Adicionar modelos disponíveis
    models.forEach(model => {
        const dropdownItem = document.createElement('div');
        dropdownItem.className = 'dropdown-item';
        dropdownItem.dataset.model = model.name;
        dropdownItem.textContent = model.name;
        
        // Marcar como selecionado se for o modelo atual
        if (model.name === selectedModel) {
            dropdownItem.classList.add('selected');
        }
        
        modelDropdown.appendChild(dropdownItem);
    });
    
    // Se o modelo selecionado não estiver disponível, usar o primeiro
    if (!models.some(m => m.name === selectedModel) && models.length > 0) {
        selectedModel = models[0].name;
        updateSelectedModel();
    }
}

// Funções para controlar o dropdown
function toggleModelDropdown() {
    modelDropdown.classList.toggle('show');
    modelButton.classList.toggle('active');
}

function closeModelDropdown() {
    modelDropdown.classList.remove('show');
    modelButton.classList.remove('active');
}

function selectModel(modelName, displayName) {
    selectedModel = modelName;
    updateSelectedModel();
    closeModelDropdown();
}

function updateSelectedModel() {
    // Atualizar seleção visual no dropdown
    const items = modelDropdown.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        item.classList.toggle('selected', item.dataset.model === selectedModel);
    });
}

// Funções para controlar temas
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    if (currentTheme === 'dark') {
        icon.className = 'fas fa-sun';
        themeToggle.title = 'Alternar para tema claro';
    } else {
        icon.className = 'fas fa-moon';
        themeToggle.title = 'Alternar para tema escuro';
    }
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
function addMessageToChat(role, content, isStreaming = false, stats = null) {
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
    
    // Adicionar estatísticas se fornecidas (apenas para mensagens do bot)
    if (stats && role === 'bot') {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'message-stats';
        statsDiv.innerHTML = `
            <div class="stats-item">
                <i class="fas fa-clock"></i>
                <span>Duration: ${stats.duration}s</span>
            </div>
            <div class="stats-item">
                <i class="fas fa-tachometer-alt"></i>
                <span>Speed: ${stats.tokensPerSecond} tokens/s</span>
            </div>
            <div class="stats-item">
                <i class="fas fa-cubes"></i>
                <span>Total Tokens: ${stats.totalTokens}</span>
            </div>
        `;
        messageDiv.appendChild(statsDiv);
    }
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
    // Atualizar estado
    isGenerating = true;
    sendButton.disabled = true;
    statusElement.textContent = 'Gerando resposta...';
    
    // Adicionar mensagem vazia para streaming
    addMessageToChat('bot', '▌', true);
    
    let fullResponse = '';
    let startTime = Date.now();
    let endTime = null;
    let totalTokens = 0;
    let evalCount = 0;
    let evalDuration = 0;
    
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
                        endTime = Date.now();
                        // Capturar estatísticas do Ollama
                        if (json.eval_count) evalCount = json.eval_count;
                        if (json.eval_duration) evalDuration = json.eval_duration;
                        totalTokens = json.eval_count || estimateTokens(fullResponse);
                        break;
                    }
                } catch (e) {
                    console.error('Error processing JSON:', e);
                }
            }
        }
        
        // Calcular estatísticas
        const duration = (endTime - startTime) / 1000; // em segundos
        const tokensPerSecond = totalTokens > 0 ? (totalTokens / duration).toFixed(1) : 'N/A';
        
        const stats = {
            duration: duration.toFixed(2),
            tokensPerSecond: tokensPerSecond,
            totalTokens: totalTokens
        };
        
        // Remover a mensagem de streaming
        streamingElement.remove();
        
        // Adicionar mensagem final com estatísticas
        addMessageToChat('bot', fullResponse, false, stats);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request cancelled');
        } else {
            console.error('Error generating response:', error);
            
            // Atualizar a mensagem de erro
            const streamingElement = document.getElementById('streaming-message');
            if (streamingElement) {
                streamingElement.innerHTML = 'Error connecting to Ollama server. Please check if the service is running.';
                streamingElement.removeAttribute('id');
            }
        }
    } finally {
        // Restaurar estado
        isGenerating = false;
        sendButton.disabled = false;
        statusElement.textContent = 'Ready';
        currentController = null;
    }
}

// Função auxiliar para estimar tokens quando não fornecido pelo servidor
function estimateTokens(text) {
    // Estimativa simples: aproximadamente 4 caracteres por token
    return Math.ceil(text.length / 4);
}

// Funcionalidade para cancelar a geração
function stopGeneration() {
    if (currentController) {
        currentController.abort();
        statusElement.textContent = 'Geração cancelada';
    }
}
