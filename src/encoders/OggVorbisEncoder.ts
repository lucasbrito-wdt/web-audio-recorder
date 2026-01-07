/**
 * Wrapper TypeScript para OggVorbisEncoder (Emscripten)
 * 
 * @module encoders/OggVorbisEncoder
 */

import { AudioEncoder, OggVorbisOptions } from '../core/types';
import { getEncoderScriptUrl, findEncoderPath, configureEncoderPaths } from '../utils/encoderLoader';
/// <reference types="../../types/ogg-vorbis-encoder" />

// Importar tipos globais
declare const OggVorbisEncoder: {
  new (sampleRate: number, numChannels: number, quality: number): OggVorbisEncoderInstance;
};

interface OggVorbisEncoderInstance {
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}

/**
 * Wrapper para o encoder OGG Vorbis compilado via Emscripten
 */
export class OggVorbisEncoderWrapper implements AudioEncoder {
  private encoder: OggVorbisEncoderInstance | null = null;
  private sampleRate: number;
  private numChannels: number;
  private quality: number;
  private bufferCount: number = 0;
  private totalSamples: number = 0;

  /**
   * Cria uma instância do encoder OGG Vorbis
   * 
   * @param sampleRate - Taxa de amostragem em Hz
   * @param numChannels - Número de canais
   * @param options - Opções do encoder OGG
   */
  constructor(sampleRate: number, numChannels: number, options: OggVorbisOptions = {}) {
    // Validar parâmetros
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error(`Invalid sampleRate: ${sampleRate}. Must be a positive number.`);
    }
    
    if (!Number.isInteger(numChannels) || numChannels < 1 || numChannels > 2) {
      throw new Error(`Invalid numChannels: ${numChannels}. Must be 1 (mono) or 2 (stereo).`);
    }

    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    
    // Validar e limitar qualidade (-0.1 a 1.0 para Vorbis)
    const rawQuality = options.quality ?? 0.5;
    if (!Number.isFinite(rawQuality)) {
      this.quality = 0.5;
    } else {
      this.quality = Math.max(-0.1, Math.min(1.0, rawQuality));
    }

    // Verificar se OggVorbisEncoder está disponível
    if (typeof OggVorbisEncoder === 'undefined') {
      throw new Error('OggVorbisEncoder is not loaded.');
    }

    try {
      this.encoder = new OggVorbisEncoder(sampleRate, numChannels, this.quality);
    } catch (error) {
      throw new Error(`Failed to initialize OGG encoder: ${String(error)}`);
    }
  }

  /**
   * Codifica buffers de áudio
   */
  encode(buffers: Float32Array[]): void {
    if (!this.encoder) {
      throw new Error('Encoder is not initialized');
    }

    // Validação básica de entrada
    if (!buffers || buffers.length === 0) {
      return;
    }

    // Preparar buffers para o encoder
    // O encoder espera exatamente this.numChannels arrays
    const finalBuffers: Float32Array[] = [];
    
    // 1. Resolver mismatch de canais
    if (buffers.length === this.numChannels) {
      // Caso ideal: número de canais bate
      for (let i = 0; i < this.numChannels; i++) {
        finalBuffers.push(buffers[i]);
      }
    } else if (buffers.length === 1 && this.numChannels === 2) {
      // Mono -> Stereo (Duplicar)
      finalBuffers.push(buffers[0]);
      finalBuffers.push(buffers[0]);
    } else if (buffers.length >= 2 && this.numChannels === 1) {
      // Stereo -> Mono (Pegar apenas o primeiro canal - downmixing simples)
      finalBuffers.push(buffers[0]);
    } else {
      // Fallback genérico: preencher com o que tem ou silêncio
      for (let i = 0; i < this.numChannels; i++) {
        if (i < buffers.length) {
          finalBuffers.push(buffers[i]);
        } else {
          // Duplicar o último disponível
          finalBuffers.push(buffers[buffers.length - 1]);
        }
      }
    }

    // 2. Sanitizar dados (Safe Clamping)
    // Importante: valores exatamente 1.0 ou -1.0 podem causar crash em algumas versões do Vorbis encoder
    // Usamos um clamping levemente conservador para garantir estabilidade
    const SAFE_MAX = 0.9999; 
    const SAFE_MIN = -0.9999;

    const safeBuffers: Float32Array[] = finalBuffers.map(buffer => {
      // Criar nova cópia para não alterar o original e garantir propriedade
      const copy = new Float32Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i];
        if (!Number.isFinite(val)) {
          copy[i] = 0; // Remove NaN/Infinity
        } else {
          // Clamp conservador
          if (val > SAFE_MAX) copy[i] = SAFE_MAX;
          else if (val < SAFE_MIN) copy[i] = SAFE_MIN;
          else copy[i] = val;
        }
      }
      return copy;
    });

    try {
      this.encoder.encode(safeBuffers);
      this.bufferCount++;
      this.totalSamples += safeBuffers[0].length;
    } catch (error) {
      throw new Error(`OGG encoding error: ${String(error)}`);
    }
  }

  /**
   * Finaliza o encoding e retorna o Blob OGG
   */
  finish(mimeType: string = 'audio/ogg'): Blob {
    if (!this.encoder) {
      throw new Error('Encoder is not initialized');
    }

    // Requisito mínimo de samples (0.5s)
    const MIN_SAMPLES = this.sampleRate * 0.5;
    if (this.totalSamples < MIN_SAMPLES) {
      // Se não atingiu o mínimo, gera silêncio para completar e salvar o arquivo
      // Isso é melhor que lançar erro ou crashar
      const missingSamples = Math.ceil(MIN_SAMPLES - this.totalSamples);
      if (missingSamples > 0 && missingSamples < this.sampleRate * 10) { // Limite de 10s de silêncio
        console.warn(`OGG Encoder: Padding with ${missingSamples} samples of silence to reach minimum duration.`);
        const silence = new Float32Array(missingSamples); // Preenchido com zeros por padrão
        const silenceBuffers = Array(this.numChannels).fill(silence);
        try {
          this.encoder.encode(silenceBuffers);
        } catch (e) {
          console.error("Failed to pad silence:", e);
        }
      } else if (this.bufferCount === 0) {
        throw new Error('No audio data recorded.');
      }
    }

    try {
      // Tentar finalizar
      const blob = this.encoder.finish(mimeType);
      return blob;
    } catch (error) {
      const msg = String(error);
      // Se for abort(3), geralmente é erro fatal de memória ou interno do WASM
      if (msg.includes('abort')) {
         throw new Error(
           `OGG Critical Error: The encoder crashed (${msg}). ` +
           `This usually happens due to memory issues or invalid audio data. ` +
           `Stats: ${this.totalSamples} samples, ${this.bufferCount} buffers.`
         );
      }
      throw new Error(`OGG finish() error: ${msg}`);
    }
  }

  /**
   * Cancela o encoding
   */
  cancel(): void {
    try {
      if (this.encoder) {
        this.encoder.cancel();
      }
    } catch (e) {
      // Ignorar erros no cancelamento
    }
    this.encoder = null;
    this.bufferCount = 0;
    this.totalSamples = 0;
  }
}

/**
 * Função helper para carregar o script OggVorbisEncoder
 * 
 * @param scriptUrl - URL do script OggVorbisEncoder.min.js (opcional, tenta auto-detectar se não fornecido)
 * @returns Promise que resolve quando o script é carregado
 */
export async function loadOggVorbisEncoder(scriptUrl?: string): Promise<void> {
  // Se URL não fornecida, tentar encontrar no padrão /encoders
  if (!scriptUrl) {
    const foundPath = await findEncoderPath('OggVorbisEncoder.min.js');
    if (!foundPath) {
      throw new Error(
        'Could not find OggVorbisEncoder.min.js in public/encoders/ folder.\n' +
        'Please copy lib/*.js files to your public/encoders/ directory.'
      );
    }
    scriptUrl = foundPath;
  }
  
  // Extrair diretório base da URL para configurar carregamento do .mem
  let baseUrl = '';
  const lastSlash = scriptUrl.lastIndexOf('/');
  if (lastSlash !== -1) {
    baseUrl = scriptUrl.substring(0, lastSlash);
  } else {
    // Se não tem barra, assumimos que está na raiz ou relativo simples
    // Mas se foi retornado por findEncoderPath como 'OggVorbis...', então deve ser ''
    baseUrl = 'encoders'; // Melhor chute para fallback
  }
  
  // Configurar encoder (isso define OggVorbisEncoderConfig global)
  configureEncoderPaths(baseUrl);

  return loadOggVorbisEncoderInternal(scriptUrl);
}

/**
 * Internal function to load the encoder script
 */
function loadOggVorbisEncoderInternal(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já está carregado
    if (typeof (window as any).OggVorbisEncoder !== 'undefined') {
      resolve();
      return;
    }

    // Verificar se o script já está sendo carregado
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;
    if (existingScript) {
      // Se já está carregado, verificar imediatamente
      if (typeof (window as any).OggVorbisEncoder !== 'undefined') {
        resolve();
        return;
      }
      // Aguardar o script existente carregar
      existingScript.addEventListener('load', () => {
        setTimeout(() => {
          if (typeof (window as any).OggVorbisEncoder !== 'undefined') {
            resolve();
          } else {
            reject(new Error('OggVorbisEncoder failed to load'));
          }
        }, 100);
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load OggVorbisEncoder script'));
      });
      return;
    }

    // Verificar se o arquivo existe e é JavaScript válido
    fetch(scriptUrl, { method: 'GET', cache: 'no-cache' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`File not found: ${scriptUrl} (${response.status} ${response.statusText}). Make sure the file exists and is accessible.`);
        }
        
        // Verificar Content-Type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('javascript') && !contentType.includes('application/javascript') && !contentType.includes('text/javascript')) {
          console.warn(`Warning: Content-Type is "${contentType}", expected JavaScript. Proceeding with validation...`);
        }
        
        // Verificar se o conteúdo é JavaScript (não HTML)
        return response.text().then(text => {
          const trimmedText = text.trim();
          
          // Se começar com '<', provavelmente é HTML (erro 404, etc)
          if (trimmedText.startsWith('<')) {
            const errorMsg = `Invalid response from ${scriptUrl}. Expected JavaScript but received HTML (likely a 404 error page).\n\n` +
              `The file was not found at this path. Please:\n` +
              `1. Verify the file exists at: ${scriptUrl}\n` +
              `2. Check if you need to copy files to your public/ folder\n` +
              `3. Ensure your server is configured to serve the file\n` +
              `4. Try accessing the URL directly in your browser`;
            
            console.error(errorMsg);
            reject(new Error(errorMsg));
            return; // Não continuar se for HTML
          }
          
          // Verificar se parece com JavaScript (contém pelo menos algumas palavras-chave comuns)
          if (!trimmedText.includes('function') && !trimmedText.includes('var') && !trimmedText.includes('const') && !trimmedText.includes('let')) {
            console.warn(`Warning: Response from ${scriptUrl} does not appear to be valid JavaScript.`);
          }
          
          // Criar e carregar novo script
          const script = document.createElement('script');
          script.src = scriptUrl;
          script.async = false; // Carregar de forma síncrona para garantir ordem
          script.type = 'text/javascript';
          
          script.onload = () => {
            // Aguardar um pouco para garantir que o objeto global foi criado
            setTimeout(() => {
              if (typeof (window as any).OggVorbisEncoder !== 'undefined') {
                resolve();
              } else {
                reject(new Error(`OggVorbisEncoder object not found after script load from ${scriptUrl}. The script may not have exported the global correctly, or the file may be corrupted.`));
              }
            }, 200);
          };
          
          script.onerror = (event) => {
            const error = new Error(`Failed to load OggVorbisEncoder script from ${scriptUrl}. Check browser console for CORS or network errors. Make sure the file exists and is accessible.`);
            console.error('Script load error:', event);
            console.error('Script URL:', scriptUrl);
            console.error('Try accessing the URL directly in your browser to verify it exists.');
            reject(error);
          };
          
          document.head.appendChild(script);
        });
      })
      .catch(error => {
        const errorMsg = `Cannot access OggVorbisEncoder script at ${scriptUrl}: ${error.message}\n\n` +
          `Troubleshooting:\n` +
          `1. Open ${scriptUrl} in your browser to verify the file exists\n` +
          `2. Check browser console for CORS errors\n` +
          `3. Ensure your server is configured to serve files from node_modules or public folder\n` +
          `4. See TROUBLESHOOTING_ENCODER.md for more help`;
        console.error(errorMsg);
        reject(new Error(errorMsg));
      });
  });
}
