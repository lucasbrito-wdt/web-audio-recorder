# Instalação e Configuração Simplificada

Esta biblioteca requer arquivos de encoder (WebAssembly/ASM.js) que devem ser servidos estaticamente pelo seu servidor web.

## Passo Único: Copiar Arquivos

Para usar gravação em OGG ou MP3, você deve copiar os arquivos da biblioteca para uma pasta pública do seu projeto.

### 1. Crie a pasta

Crie uma pasta chamada `encoders` dentro da sua diretório público (`public/`, `static/`, ou `dist/` dependendo do seu framework).

### 2. Copie os arquivos

Copie todos os arquivos da pasta `node_modules/web-audio-recorder-ts/lib/` para `public/encoders/`.

Os arquivos essenciais são:

- `OggVorbisEncoder.min.js`
- `OggVorbisEncoder.min.js.mem`
- `Mp3LameEncoder.min.js`
- `Mp3LameEncoder.min.js.mem`
- `WavAudioEncoder.min.js`

## Uso no Código

Com os arquivos na pasta correta, você não precisa configurar caminhos. A biblioteca detectará automaticamente em `/encoders/`.

```typescript
import { WebAudioRecorderOgg, loadOggVorbisEncoder } from 'web-audio-recorder-ts';

// Opcional: pré-carregar (busca automática em /encoders/)
await loadOggVorbisEncoder();

// Iniciar gravador
const recorder = new WebAudioRecorderOgg(audioContext);
recorder.start(stream);
```

## Solução de Problemas

Se você ver erros 404:

1. Verifique se `http://localhost:3000/encoders/OggVorbisEncoder.min.js` está acessível no navegador.
2. Se você usou uma pasta diferente, passe o caminho manualmente:

   ```typescript
   await loadOggVorbisEncoder('/meus-arquivos/OggVorbisEncoder.min.js');
   ```
