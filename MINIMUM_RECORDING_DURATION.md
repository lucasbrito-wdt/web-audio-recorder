# Gravação Mínima para OGG Vorbis

## ⚠️ Importante: Requisito de Duração Mínima

O encoder **OGG Vorbis** requer uma quantidade mínima de dados de áudio para criar um arquivo válido.

### Requisitos

- **Duração mínima**: 0.5 segundos (meio segundo)
- **Samples mínimos**: `sampleRate * 0.5` (exemplo: 24.000 samples em 48kHz)

### Por que isso acontece?

O OGG Vorbis utiliza um encoder compilado via **Emscripten** (C/C++ para WebAssembly), que foi projetado para codificar arquivos de áudio de tamanho real. Quando você tenta finalizar a codificação com dados insuficientes, o encoder chama `abort(3)` porque não consegue criar um arquivo OGG válido.

## Erro Comum

Se você ver este erro:

```
OGG finish() error: abort(3) at Error
Buffers processed: 1, Total samples: 4096...
```

Isso significa que você tentou parar a gravação muito rapidamente (menos de 0.5 segundo).

## Solução

### 1. ✅ Grave por pelo menos 0.5 segundo

```typescript
import { WebAudioRecorderOgg } from 'web-audio-recorder-ts';

const recorder = new WebAudioRecorderOgg(audioContext);

// Iniciar gravação
await recorder.start(stream);

// ⚠️ IMPORTANTE: Aguardar pelo menos 0.5 segundo antes de parar
setTimeout(async () => {
  try {
    const blob = await recorder.stop();
    // Sucesso!
  } catch (error) {
    console.error('Erro ao parar gravação:', error);
  }
}, 500); // Mínimo 500ms
```

### 2. ✅ Implementar UI com Indicador de Tempo

```typescript
let recordingStartTime: number = 0;
const MIN_RECORDING_DURATION = 500; // 500ms

async function startRecording() {
  await recorder.start(stream);
  recordingStartTime = Date.now();
  
  // Desabilitar botão "Parar" até atingir tempo mínimo
  updateStopButtonState();
}

function updateStopButtonState() {
  const interval = setInterval(() => {
    const elapsed = Date.now() - recordingStartTime;
    
    if (elapsed >= MIN_RECORDING_DURATION) {
      stopButton.disabled = false;
      stopButton.title = 'Parar gravação';
      clearInterval(interval);
    } else {
      const remaining = (MIN_RECORDING_DURATION - elapsed) / 1000;
      stopButton.disabled = true;
      stopButton.title = `Aguarde ${remaining.toFixed(1)}s...`;
    }
  }, 100);
}

async function stopRecording() {
  const elapsed = Date.now() - recordingStartTime;
  
  if (elapsed < MIN_RECORDING_DURATION) {
    alert('Por favor, grave por pelo menos 0.5 segundo');
    return;
  }
  
  try {
    const blob = await recorder.stop();
    // Sucesso!
  } catch (error) {
    if (error.message.includes('Insufficient audio data')) {
      alert('Gravação muito curta. Por favor, grave por mais tempo.');
    }
    throw error;
  }
}
```

### 3. ✅ Tratamento de Erro Robusto

```typescript
async function stopRecording() {
  try {
    const blob = await recorder.stop();
    return blob;
  } catch (error) {
    if (error.message.includes('Insufficient audio data')) {
      // Erro de gravação muito curta
      console.error('Gravação muito curta:', error.message);
      
      // Cancelar gravação para limpar recursos
      recorder.cancel();
      
      // Informar usuário
      showError('Por favor, grave por pelo menos 0.5 segundo antes de parar.');
      
      return null;
    }
    
    // Outro tipo de erro
    throw error;
  }
}
```

## Alternativa: Use WAV para Gravações Muito Curtas

Se você precisa gravar áudios muito curtos (menos de 0.5 segundo), considere usar o formato **WAV** ao invés de OGG:

```typescript
import { WebAudioRecorderWav } from 'web-audio-recorder-ts';

// WAV não tem requisito de duração mínima
const recorder = new WebAudioRecorderWav(audioContext);

await recorder.start(stream);
// Pode parar imediatamente se necessário
const blob = await recorder.stop();
```

### Comparação de Formatos

| Formato | Duração Mínima | Compressão | Tamanho | Uso Recomendado |
|---------|----------------|------------|---------|-----------------|
| **WAV** | Nenhuma | Não | Grande | Gravações curtas, edição |
| **OGG** | 0.5s | Sim | Pequeno | Gravações longas, streaming |
| **MP3** | 0.5s | Sim | Pequeno | Gravações longas, compatibilidade |

## Verificação de Status no Código

A biblioteca agora valida automaticamente antes de finalizar:

```typescript
// O método finish() agora lança erro se:
// 1. Não há dados gravados (bufferCount === 0)
// 2. Dados insuficientes (totalSamples < sampleRate * 0.5)

try {
  const blob = await recorder.stop();
} catch (error) {
  if (error.message.includes('Insufficient audio data')) {
    // Tratar especificamente erro de gravação curta
    console.log('Gravação muito curta detectada');
  }
}
```

## Debug

Para verificar quanto foi gravado:

```typescript
// No console do navegador, após erro:
// Verifique a mensagem de erro que mostra:
// - Total samples gravados
// - Duração em segundos
// - Samples mínimos necessários

// Exemplo de mensagem:
// "Recorded 4096 samples (0.09s) but need at least 24000 samples (0.5s)"
```

## Resumo

✅ **Sempre grave por pelo menos 0.5 segundo** ao usar OGG Vorbis  
✅ **Implemente timer visual** para mostrar quando pode parar  
✅ **Trate erros apropriadamente** com mensagens claras  
✅ **Use WAV para gravações muito curtas** se necessário  
✅ **Teste a gravação** antes de implementar em produção  
