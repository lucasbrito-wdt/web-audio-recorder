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

  /**
   * Cria uma instância do encoder OGG Vorbis
   * 
   * @param sampleRate - Taxa de amostragem em Hz
   * @param numChannels - Número de canais
   * @param options - Opções do encoder OGG
   */
  constructor(sampleRate: number, numChannels: number, options: OggVorbisOptions = {}) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.quality = options.quality ?? 0.5;

    // Verificar se OggVorbisEncoder está disponível
    if (typeof OggVorbisEncoder === 'undefined') {
      throw new Error('OggVorbisEncoder is not loaded. Make sure to load OggVorbisEncoder.min.js before using this encoder.');
    }

    // Criar instância do encoder
    this.encoder = new OggVorbisEncoder(sampleRate, numChannels, this.quality);
  }

  /**
   * Codifica buffers de áudio
   * 
   * @param buffers - Array de buffers Float32Array, um por canal
   */
  encode(buffers: Float32Array[]): void {
    if (!this.encoder) {
      throw new Error('Encoder is not initialized');
    }

    if (buffers.length !== this.numChannels) {
      throw new Error(`Expected ${this.numChannels} channels, got ${buffers.length}`);
    }

    this.encoder.encode(buffers);
  }

  /**
   * Finaliza o encoding e retorna o Blob OGG
   * 
   * @param mimeType - Tipo MIME (padrão: 'audio/ogg')
   * @returns Blob contendo o arquivo OGG
   */
  finish(mimeType: string = 'audio/ogg'): Blob {
    if (!this.encoder) {
      throw new Error('Encoder is not initialized');
    }

    return this.encoder.finish(mimeType);
  }

  /**
   * Cancela o encoding
   */
  cancel(): void {
    if (this.encoder) {
      this.encoder.cancel();
      this.encoder = null;
    }
  }
}

/**
 * Função helper para carregar o script OggVorbisEncoder
 * 
 * @param scriptUrl - URL do script OggVorbisEncoder.min.js (opcional, tenta auto-detectar se não fornecido)
 * @returns Promise que resolve quando o script é carregado
 */
export async function loadOggVorbisEncoder(scriptUrl?: string): Promise<void> {
  // Se não fornecido, tentar auto-detectar
  if (!scriptUrl) {
    // Configurar paths dos arquivos .mem
    configureEncoderPaths();
    
    // Tentar encontrar o arquivo automaticamente
    const foundPath = await findEncoderPath('OggVorbisEncoder.min.js');
    if (!foundPath) {
      throw new Error(
        'Could not find OggVorbisEncoder.min.js. ' +
        'Please provide the path manually or ensure the package is installed correctly.'
      );
    }
    scriptUrl = foundPath;
  } else {
    // Se fornecido, ainda configurar paths dos .mem
    configureEncoderPaths();
  }

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
