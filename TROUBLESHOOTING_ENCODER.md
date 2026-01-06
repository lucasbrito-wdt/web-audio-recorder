# Troubleshooting: Erro "Unexpected token '<'" ao carregar encoders

## Problema

Se você está vendo este erro:
```
Uncaught SyntaxError: Unexpected token '<' (at OggVorbisEncoder.min.js:1:1)
```

Isso significa que o arquivo `OggVorbisEncoder.min.js` está retornando HTML (geralmente uma página 404) ao invés de JavaScript.

## Causas Comuns

1. **Arquivo não encontrado (404)**: O servidor está retornando uma página de erro HTML
2. **Caminho incorreto**: O arquivo está em um local diferente do esperado
3. **Servidor não configurado**: O servidor não está servindo arquivos de `node_modules`

## Soluções

### Solução 1: Verificar se o arquivo existe

Abra no navegador o URL que está sendo usado. Por exemplo:
- `http://localhost:3000/OggVorbisEncoder.min.js`
- `http://localhost:3000/node_modules/web-audio-recorder-ts/lib/OggVorbisEncoder.min.js`

Se você ver HTML (página de erro), o arquivo não está acessível nesse caminho.

### Solução 2: Copiar arquivos para public/ (Recomendado para Nuxt/Vite)

Copie os arquivos da `lib/` para a pasta `public/` do seu projeto:

```bash
# No seu projeto Nuxt/Vite
cp node_modules/web-audio-recorder-ts/lib/*.js public/
cp node_modules/web-audio-recorder-ts/lib/*.mem public/
```

E então use caminhos manuais:

```typescript
import { loadOggVorbisEncoder } from 'web-audio-recorder-ts';

// Use caminho absoluto da pasta public
await loadOggVorbisEncoder('/OggVorbisEncoder.min.js');
```

### Solução 3: Configurar servidor para servir node_modules

#### Para Nuxt:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    server: {
      fs: {
        allow: ['..'] // Permitir acessar node_modules
      }
    }
  }
})
```

#### Para Vite:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    fs: {
      allow: ['..']
    }
  }
})
```

### Solução 4: Usar CDN ou caminho absoluto

Se você hospedar os arquivos em um CDN ou servidor estático:

```typescript
await loadOggVorbisEncoder('https://cdn.exemplo.com/OggVorbisEncoder.min.js');
```

### Solução 5: Verificar caminho usado

O código agora valida se o conteúdo é JavaScript antes de carregar. Se você ver uma mensagem de erro mais clara, ela indicará qual caminho foi tentado e por que falhou.

## Debug

Adicione logs para ver qual caminho está sendo usado:

```typescript
import { findEncoderPath } from 'web-audio-recorder-ts';

const path = await findEncoderPath('OggVorbisEncoder.min.js');
console.log('Caminho encontrado:', path);

if (path) {
  await loadOggVorbisEncoder(path);
} else {
  console.error('Arquivo não encontrado em nenhum dos caminhos testados');
}
```

## Verificação Rápida

1. Verifique se os arquivos existem:
   ```bash
   ls node_modules/web-audio-recorder-ts/lib/
   ```

2. Teste o acesso direto no navegador:
   - Abra: `http://seu-servidor/OggVorbisEncoder.min.js`
   - Deve mostrar código JavaScript, não HTML

3. Verifique o console do navegador para mensagens de erro mais detalhadas
