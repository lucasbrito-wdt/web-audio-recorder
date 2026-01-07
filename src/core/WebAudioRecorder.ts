/**
 * Classe base WebAudioRecorder para gravação de áudio
 * 
 * @module core/WebAudioRecorder
 */

import {
  RecorderOptions,
  RecorderStatus,
  DataAvailableEvent,
  CompleteEvent,
  ErrorEvent,
  DataAvailableCallback,
  CompleteCallback,
  ErrorCallback,
  AudioEncoder
} from './types';

/**
 * Classe principal para gravação de áudio usando Web Audio API
 */
export class WebAudioRecorder {
  protected audioContext: AudioContext | null = null;
  protected sourceNode: MediaStreamAudioSourceNode | null = null;
  protected scriptProcessor: ScriptProcessorNode | null = null;
  protected encoder: AudioEncoder | null = null;
  protected stream: MediaStream | null = null;
  protected status: RecorderStatus = RecorderStatus.INACTIVE;
  protected sampleRate: number = 44100;
  protected numChannels: number = 2;
  protected bufferSize: number = 4096;
  protected startTime: number = 0;
  protected onDataAvailableCallback: DataAvailableCallback | null = null;
  protected onCompleteCallback: CompleteCallback | null = null;
  protected onErrorCallback: ErrorCallback | null = null;

  /**
   * Cria uma instância do WebAudioRecorder
   * 
   * @param audioContext - Contexto de áudio Web Audio API
   * @param encoder - Encoder de áudio a ser usado
   * @param options - Opções de configuração do recorder
   */
  constructor(
    audioContext: AudioContext,
    encoder: AudioEncoder,
    options: RecorderOptions = {}
  ) {
    this.audioContext = audioContext;
    this.encoder = encoder;
    this.sampleRate = options.sampleRate || this.audioContext.sampleRate;
    this.numChannels = options.numChannels || 2;
    this.bufferSize = options.bufferSize || 4096;
    this.onDataAvailableCallback = options.onDataAvailable || null;
    this.onCompleteCallback = options.onComplete || null;
    this.onErrorCallback = options.onError || null;
  }

  /**
   * Inicia a gravação de áudio
   * 
   * @param stream - Stream de mídia a ser gravado
   * @returns Promise que resolve quando a gravação inicia
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.status === RecorderStatus.RECORDING) {
      throw new Error('Recording is already in progress');
    }

    if (this.status === RecorderStatus.PROCESSING) {
      throw new Error('Previous recording is still being processed');
    }

    try {
      this.stream = stream;
      this.status = RecorderStatus.RECORDING;
      this.startTime = Date.now();

      if (!this.audioContext) {
        throw new Error('AudioContext is not initialized');
      }

      // Criar source node a partir do stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Detectar número real de canais do stream
      let detectedChannels = this.numChannels;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        // Tentar obter do getSettings (navegadores modernos)
        const settings = audioTracks[0].getSettings();
        if (settings.channelCount) {
          detectedChannels = settings.channelCount;
        } else {
          // Fallback: assumir que a maioria dos microfones é mono (1) ou usar padrão (2)
          // Mas como não podemos ter certeza sem processar, vamos confiar na configuração 
          // ou no padrão do AudioContext
          console.log('Channel count not available in track settings, using default/configured:', this.numChannels);
        }
      }

      // Atualizar numChannels se necessário
      if (detectedChannels !== this.numChannels) {
        console.log(`Detected ${detectedChannels} channel(s) in stream, adjusting from ${this.numChannels} to ${detectedChannels}`);
        this.numChannels = detectedChannels;
      }

      // Criar script processor para capturar dados de áudio
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.bufferSize,
        this.numChannels,
        this.numChannels
      );

      // Conectar os nós
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Configurar callback para processar dados de áudio
      this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (this.status !== RecorderStatus.RECORDING) {
          return;
        }

        try {
          const inputBuffer = event.inputBuffer;
          const actualChannels = inputBuffer.numberOfChannels;
          const buffers: Float32Array[] = [];

          // Extrair dados de cada canal disponível
          for (let channel = 0; channel < actualChannels; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            buffers.push(new Float32Array(channelData));
          }

          // Garantir que temos exatamente o número de canais esperado
          // Se o número de canais do buffer não corresponde ao esperado, ajustar
          if (actualChannels !== this.numChannels) {
            if (actualChannels === 1 && this.numChannels === 2) {
              // Mono -> Estéreo: duplicar o canal
              buffers.push(new Float32Array(buffers[0]));
            } else if (actualChannels === 2 && this.numChannels === 1) {
              // Estéreo -> Mono: usar apenas o primeiro canal
              buffers.splice(1);
            } else if (actualChannels < this.numChannels) {
              // Menos canais do que esperado: duplicar o último canal
              while (buffers.length < this.numChannels && buffers.length > 0) {
                buffers.push(new Float32Array(buffers[buffers.length - 1]));
              }
            } else if (actualChannels > this.numChannels) {
              // Mais canais do que esperado: usar apenas os primeiros
              buffers.splice(this.numChannels);
            }
          }

          // Validação final CRÍTICA: garantir que temos exatamente o número correto de canais
          // O encoder Emscripten é muito sensível e aborta se o número de canais não corresponder
          if (buffers.length !== this.numChannels) {
            console.warn(
              `Channel mismatch detected: Expected ${this.numChannels} channels, ` +
              `got ${buffers.length} after adjustment. ` +
              `Actual input channels: ${actualChannels}. ` +
              `Fixing by ${buffers.length < this.numChannels ? 'duplicating' : 'removing'} channels.`
            );
            
            // Tentar corrigir: duplicar ou remover canais conforme necessário
            while (buffers.length < this.numChannels) {
              if (buffers.length > 0) {
                // Duplicar o primeiro canal (ou último se houver mais de um)
                const sourceChannel = buffers[buffers.length - 1];
                buffers.push(new Float32Array(sourceChannel));
              } else {
                // Se não há buffers, criar um buffer vazio (não deveria acontecer)
                console.error('No buffers available! Creating empty buffer.');
                buffers.push(new Float32Array(inputBuffer.length));
              }
            }
            
            // Remover canais extras se houver mais do que o esperado
            if (buffers.length > this.numChannels) {
              buffers.splice(this.numChannels);
            }
          }

          // Validação final absoluta: se ainda não temos o número correto, não codificar
          if (buffers.length !== this.numChannels) {
            console.error(
              `CRITICAL: Failed to fix channel mismatch. ` +
              `Expected ${this.numChannels}, got ${buffers.length}. ` +
              `Skipping this buffer to prevent encoder abort().`
            );
            return; // Não codificar este buffer para evitar abort()
          }

          // Codificar os dados
          if (this.encoder && buffers.length > 0) {
            this.encoder.encode(buffers);
          }
        } catch (error) {
          this.handleError(error as Error);
        }
      };
    } catch (error) {
      this.status = RecorderStatus.ERROR;
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Para a gravação e finaliza o arquivo de áudio
   * 
   * @param mimeType - Tipo MIME do arquivo (padrão: baseado no encoder)
   * @returns Promise que resolve com o Blob do áudio gravado
   */
  async stop(mimeType?: string): Promise<Blob> {
    if (this.status !== RecorderStatus.RECORDING) {
      throw new Error('No recording in progress');
    }

    this.status = RecorderStatus.PROCESSING;

    try {
      // Desconectar nós
      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
        this.scriptProcessor = null;
      }

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      // Finalizar encoding
      if (!this.encoder) {
        throw new Error('Encoder is not initialized');
      }

      // Aguardar um pouco para garantir que todos os callbacks de áudio foram processados
      // Isso evita condições de corrida onde finish() é chamado antes de todos os buffers serem processados
      await new Promise(resolve => setTimeout(resolve, 50));

      const blob = this.encoder.finish(mimeType);
      const url = URL.createObjectURL(blob);
      const timecode = Date.now() - this.startTime;

      // Criar evento de conclusão
      const completeEvent: CompleteEvent = {
        blob,
        url
      };

      this.status = RecorderStatus.COMPLETE;

      // Chamar callback de conclusão
      if (this.onCompleteCallback) {
        this.onCompleteCallback(completeEvent);
      }

      // Criar evento de dados disponíveis
      const dataEvent: DataAvailableEvent = {
        data: blob,
        timecode
      };

      if (this.onDataAvailableCallback) {
        this.onDataAvailableCallback(dataEvent);
      }

      return blob;
    } catch (error) {
      this.status = RecorderStatus.ERROR;
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Cancela a gravação atual
   */
  cancel(): void {
    if (this.status === RecorderStatus.INACTIVE || this.status === RecorderStatus.COMPLETE) {
      return;
    }

    // Desconectar nós
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Cancelar encoding
    if (this.encoder) {
      this.encoder.cancel();
    }

    // Limpar stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.status = RecorderStatus.INACTIVE;
  }

  /**
   * Obtém o status atual do recorder
   * 
   * @returns Status atual
   */
  getStatus(): RecorderStatus {
    return this.status;
  }

  /**
   * Define callback para quando dados estão disponíveis
   * 
   * @param callback - Função callback
   */
  setOnDataAvailable(callback: DataAvailableCallback | null): void {
    this.onDataAvailableCallback = callback;
  }

  /**
   * Define callback para quando gravação é completada
   * 
   * @param callback - Função callback
   */
  setOnComplete(callback: CompleteCallback | null): void {
    this.onCompleteCallback = callback;
  }

  /**
   * Define callback para quando ocorre erro
   * 
   * @param callback - Função callback
   */
  setOnError(callback: ErrorCallback | null): void {
    this.onErrorCallback = callback;
  }

  /**
   * Trata erros e chama callback de erro
   * 
   * @param error - Erro ocorrido
   */
  protected handleError(error: Error): void {
    const errorEvent: ErrorEvent = {
      message: error.message,
      error
    };

    if (this.onErrorCallback) {
      this.onErrorCallback(errorEvent);
    }
  }

  /**
   * Limpa recursos e reseta o recorder
   */
  cleanup(): void {
    this.cancel();
    this.encoder = null;
    this.audioContext = null;
    this.status = RecorderStatus.INACTIVE;
  }
}
