/**
 * Wrapper TypeScript para Mp3LameEncoder (Emscripten)
 * 
 * @module encoders/Mp3LameEncoder
 */

import { AudioEncoder, Mp3Options } from '../core/types';
import { getEncoderScriptUrl, findEncoderPath, configureEncoderPaths } from '../utils/encoderLoader';
/// <reference types="../../types/mp3-lame-encoder" />

// Importar tipos globais
declare const Mp3LameEncoder: {
  new (sampleRate: number, numChannels: number, bitrate: number): Mp3LameEncoderInstance;
};

interface Mp3LameEncoderInstance {
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}

/**
 * Wrapper para o encoder MP3 LAME compilado via Emscripten
 */
export class Mp3LameEncoderWrapper implements AudioEncoder {
  private encoder: Mp3LameEncoderInstance | null = null;
  private sampleRate: number;
  private numChannels: number;
  private bitrate: number;
  private bufferCount: number = 0;
  private totalSamples: number = 0;

  /**
   * Cria uma instância do encoder MP3 LAME
   * 
   * @param sampleRate - Taxa de amostragem em Hz
   * @param numChannels - Número de canais
   * @param options - Opções do encoder MP3
   */
  constructor(sampleRate: number, numChannels: number, options: Mp3Options = {}) {
    // Validar parâmetros
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error(`Invalid sampleRate: ${sampleRate}. Must be a positive number.`);
    }
    
    if (!Number.isInteger(numChannels) || numChannels < 1 || numChannels > 2) {
      throw new Error(`Invalid numChannels: ${numChannels}. Must be 1 (mono) or 2 (stereo).`);
    }

    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    
    // Validar e limitar bitrate (32 a 320 kbps para MP3)
    const rawBitrate = options.bitrate ?? 128;
    if (!Number.isFinite(rawBitrate) || !Number.isInteger(rawBitrate)) {
      console.warn(`Invalid bitrate value: ${rawBitrate}. Using default 128`);
      this.bitrate = 128;
    } else {
      // Clamp bitrate to valid range
      this.bitrate = Math.max(32, Math.min(320, rawBitrate));
      if (rawBitrate !== this.bitrate) {
        console.warn(`Bitrate value ${rawBitrate} clamped to valid range: ${this.bitrate}`);
      }
    }

    // Verificar se Mp3LameEncoder está disponível
    if (typeof Mp3LameEncoder === 'undefined') {
      throw new Error('Mp3LameEncoder is not loaded. Make sure to load Mp3LameEncoder.min.js before using this encoder.');
    }

    try {
      // Criar instância do encoder
      this.encoder = new Mp3LameEncoder(sampleRate, numChannels, this.bitrate);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize MP3 encoder: ${errorMsg}. ` +
        `Parameters: sampleRate=${sampleRate}, numChannels=${numChannels}, bitrate=${this.bitrate}`
      );
    }
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

    // Converter canais se necessário ANTES de validar
    // Isso permite que streams mono funcionem com encoders estéreo e vice-versa
    let processedBuffers = buffers;
    
    if (buffers.length !== this.numChannels) {
      // Ajustar número de canais para corresponder ao esperado pelo encoder
      if (buffers.length === 1 && this.numChannels === 2) {
        // Mono -> Estéreo: duplicar o canal
        processedBuffers = [
          new Float32Array(buffers[0]),
          new Float32Array(buffers[0])
        ];
      } else if (buffers.length === 2 && this.numChannels === 1) {
        // Estéreo -> Mono: usar apenas o primeiro canal
        processedBuffers = [new Float32Array(buffers[0])];
      } else if (buffers.length < this.numChannels) {
        // Menos canais: duplicar o último canal
        processedBuffers = [...buffers];
        while (processedBuffers.length < this.numChannels && processedBuffers.length > 0) {
          processedBuffers.push(new Float32Array(processedBuffers[processedBuffers.length - 1]));
        }
      } else if (buffers.length > this.numChannels) {
        // Mais canais: usar apenas os primeiros
        processedBuffers = buffers.slice(0, this.numChannels);
      }
    }
    
    // Validação final
    if (processedBuffers.length !== this.numChannels) {
      throw new Error(
        `Failed to adjust channels: Expected ${this.numChannels} channels, ` +
        `got ${processedBuffers.length} after conversion from ${buffers.length} channels`
      );
    }

    // Validar que todos os buffers têm o mesmo tamanho
    if (processedBuffers.length > 0) {
      const expectedLength = processedBuffers[0].length;
      for (let i = 1; i < processedBuffers.length; i++) {
        if (processedBuffers[i].length !== expectedLength) {
          throw new Error(`Channel ${i} has length ${processedBuffers[i].length}, expected ${expectedLength}`);
        }
      }

      // Validar que há dados para processar
      if (expectedLength === 0) {
        // Buffer vazio, não há nada para codificar
        return;
      }
    } else {
      // Nenhum buffer fornecido
      return;
    }

    // Criar cópias dos buffers e validar valores (NaN, Infinity)
    const safeBuffers: Float32Array[] = processedBuffers.map((buffer, channelIndex) => {
      const safeBuffer = new Float32Array(buffer.length);
      let hasInvalidValues = false;
      
      for (let i = 0; i < buffer.length; i++) {
        const value = buffer[i];
        
        // Verificar NaN e Infinity
        if (!Number.isFinite(value)) {
          hasInvalidValues = true;
          // Substituir valores inválidos por 0
          safeBuffer[i] = 0;
        } else {
          // Clamp valores para o range válido de áudio (-1.0 a 1.0)
          safeBuffer[i] = Math.max(-1.0, Math.min(1.0, value));
        }
      }
      
      if (hasInvalidValues) {
        console.warn(
          `MP3 Encoder: Found invalid values (NaN/Infinity) in channel ${channelIndex}. ` +
          `Replaced with 0. Buffer length: ${buffer.length}`
        );
      }
      
      return safeBuffer;
    });

    try {
      this.encoder.encode(safeBuffers);
      // Contar buffers processados para garantir que há dados antes de finalizar
      this.bufferCount++;
      this.totalSamples += safeBuffers[0].length;
    } catch (error) {
      // Melhorar mensagem de erro para incluir informações de debug
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `MP3 encoding error: ${errorMsg}. ` +
        `Buffers: ${buffers.length} channels, lengths: ${buffers.map(b => b.length).join(', ')}, ` +
        `Total buffers processed: ${this.bufferCount}, Total samples: ${this.totalSamples}`
      );
    }
  }

  /**
   * Finaliza o encoding e retorna o Blob MP3
   * 
   * @param mimeType - Tipo MIME (padrão: 'audio/mpeg')
   * @returns Blob contendo o arquivo MP3
   */
  finish(mimeType: string = 'audio/mpeg'): Blob {
    if (!this.encoder) {
      throw new Error('Encoder is not initialized');
    }

    // Verificar se há dados processados
    if (this.bufferCount === 0) {
      console.warn('MP3 Encoder: finish() called but no buffers were encoded. This may cause issues with the Emscripten encoder.');
      // Ainda tentar finalizar, mas avisar
    }

    try {
      const blob = this.encoder.finish(mimeType);
      
      // Validar que o blob não está vazio
      if (blob.size === 0) {
        console.warn('MP3 Encoder: finish() returned empty blob. This may indicate insufficient audio data was encoded.');
      }
      
      return blob;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `MP3 finish() error: ${errorMsg}. ` +
        `Buffers processed: ${this.bufferCount}, Total samples: ${this.totalSamples}, ` +
        `Sample rate: ${this.sampleRate}, Channels: ${this.numChannels}, Bitrate: ${this.bitrate}`
      );
    }
  }

  /**
   * Cancela o encoding
   */
  cancel(): void {
    if (this.encoder) {
      this.encoder.cancel();
      this.encoder = null;
    }
    // Reset contadores
    this.bufferCount = 0;
    this.totalSamples = 0;
  }
}

/**
 * Função helper para carregar o script Mp3LameEncoder
 * 
 * @param scriptUrl - URL do script Mp3LameEncoder.min.js (opcional, tenta auto-detectar se não fornecido)
 * @returns Promise que resolve quando o script é carregado
 */
export async function loadMp3LameEncoder(scriptUrl?: string): Promise<void> {
  // Se URL não fornecida, tentar encontrar no padrão /encoders
  if (!scriptUrl) {
    const foundPath = await findEncoderPath('Mp3LameEncoder.min.js');
    if (!foundPath) {
       throw new Error(
        'Could not find Mp3LameEncoder.min.js in public/encoders/ folder.\n' +
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
    baseUrl = 'encoders';
  }
  
  // Configurar encoder (isso define Mp3LameEncoderConfig global)
  configureEncoderPaths(baseUrl);

  return loadMp3LameEncoderInternal(scriptUrl);
}

/**
 * Internal function to load the encoder script
 */
function loadMp3LameEncoderInternal(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já está carregado
    if (typeof (window as any).Mp3LameEncoder !== 'undefined') {
      resolve();
      return;
    }

    // Verificar se o script já está sendo carregado
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;
    if (existingScript) {
      // Se já está carregado, verificar imediatamente
      if (typeof (window as any).Mp3LameEncoder !== 'undefined') {
        resolve();
        return;
      }
      // Aguardar o script existente carregar
      existingScript.addEventListener('load', () => {
        setTimeout(() => {
          if (typeof (window as any).Mp3LameEncoder !== 'undefined') {
            resolve();
          } else {
            reject(new Error('Mp3LameEncoder failed to load'));
          }
        }, 100);
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Mp3LameEncoder script'));
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
              if (typeof (window as any).Mp3LameEncoder !== 'undefined') {
                resolve();
              } else {
                reject(new Error(`Mp3LameEncoder object not found after script load from ${scriptUrl}. The script may not have exported the global correctly, or the file may be corrupted.`));
              }
            }, 200);
          };
          
          script.onerror = (event) => {
            const error = new Error(`Failed to load Mp3LameEncoder script from ${scriptUrl}. Check browser console for CORS or network errors. Make sure the file exists and is accessible.`);
            console.error('Script load error:', event);
            console.error('Script URL:', scriptUrl);
            console.error('Try accessing the URL directly in your browser to verify it exists.');
            reject(error);
          };
          
          document.head.appendChild(script);
        });
      })
      .catch(error => {
        const errorMsg = `Cannot access Mp3LameEncoder script at ${scriptUrl}: ${error.message}\n\n` +
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
