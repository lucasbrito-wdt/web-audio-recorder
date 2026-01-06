/**
 * Tipos e interfaces principais para WebAudioRecorder
 */

/**
 * Formatos de áudio suportados
 */
export enum AudioFormat {
  WAV = 'wav',
  OGG = 'ogg',
  MP3 = 'mp3'
}

/**
 * Status do recorder
 */
export enum RecorderStatus {
  INACTIVE = 'inactive',
  RECORDING = 'recording',
  PAUSED = 'paused',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Opções de configuração do recorder
 */
export interface RecorderOptions {
  /** Taxa de amostragem em Hz (padrão: 44100) */
  sampleRate?: number;
  /** Número de canais (1 = mono, 2 = estéreo, padrão: 2) */
  numChannels?: number;
  /** Tamanho do buffer em frames (padrão: 4096) */
  bufferSize?: number;
  /** Callback quando dados estão disponíveis */
  onDataAvailable?: (event: DataAvailableEvent) => void;
  /** Callback quando gravação é completada */
  onComplete?: (event: CompleteEvent) => void;
  /** Callback quando ocorre erro */
  onError?: (event: ErrorEvent) => void;
}

/**
 * Evento de dados disponíveis
 */
export interface DataAvailableEvent {
  /** Dados de áudio como Blob */
  data: Blob;
  /** Timestamp do evento */
  timecode: number;
}

/**
 * Evento de gravação completa
 */
export interface CompleteEvent {
  /** Blob final do áudio gravado */
  blob: Blob;
  /** URL do objeto para reprodução */
  url: string;
}

/**
 * Evento de erro
 */
export interface ErrorEvent {
  /** Mensagem de erro */
  message: string;
  /** Erro original (se houver) */
  error?: Error;
}

/**
 * Interface para encoders de áudio
 */
export interface AudioEncoder {
  /** Codificar buffers de áudio */
  encode(buffers: Float32Array[]): void;
  /** Finalizar encoding e obter Blob */
  finish(mimeType?: string): Blob;
  /** Cancelar encoding */
  cancel(): void;
}

/**
 * Configuração para encoder OGG Vorbis
 */
export interface OggVorbisOptions {
  /** Qualidade Vorbis (-0.1 a 1.0, padrão: 0.5) */
  quality?: number;
}

/**
 * Configuração para encoder MP3
 */
export interface Mp3Options {
  /** Bitrate em kbps (padrão: 128) */
  bitrate?: number;
}

/**
 * Configuração para encoder WAV
 */
export interface WavOptions {
  /** Sem opções específicas no momento */
}

/**
 * Callback para eventos de dados
 */
export type DataAvailableCallback = (event: DataAvailableEvent) => void;

/**
 * Callback para eventos de conclusão
 */
export type CompleteCallback = (event: CompleteEvent) => void;

/**
 * Callback para eventos de erro
 */
export type ErrorCallback = (event: ErrorEvent) => void;
