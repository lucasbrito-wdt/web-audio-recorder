/**
 * Recorder OGG Vorbis usando WebAudioRecorder
 * 
 * @module recorders/WebAudioRecorderOgg
 */

import { WebAudioRecorder } from '../core/WebAudioRecorder';
import { OggVorbisEncoderWrapper, loadOggVorbisEncoder } from '../encoders/OggVorbisEncoder';
import { RecorderOptions, OggVorbisOptions } from '../core/types';

/**
 * Classe para gravação de áudio em formato OGG Vorbis
 */
export class WebAudioRecorderOgg extends WebAudioRecorder {
  private oggOptions: OggVorbisOptions;

  /**
   * Cria uma instância do recorder OGG Vorbis
   * 
   * @param audioContext - Contexto de áudio Web Audio API
   * @param options - Opções de configuração do recorder
   * @param oggOptions - Opções específicas do encoder OGG
   */
  constructor(
    audioContext: AudioContext,
    options: RecorderOptions = {},
    oggOptions: OggVorbisOptions = {}
  ) {
    const sampleRate = options.sampleRate || audioContext.sampleRate;
    const numChannels = options.numChannels || 2;
    const encoder = new OggVorbisEncoderWrapper(sampleRate, numChannels, oggOptions);

    super(audioContext, encoder, options);
    this.oggOptions = oggOptions;
  }

  /**
   * Carrega o script OggVorbisEncoder antes de usar
   * 
   * @param scriptUrl - URL do script OggVorbisEncoder.min.js
   * @returns Promise que resolve quando o script é carregado
   */
  static async loadEncoder(scriptUrl: string): Promise<void> {
    return loadOggVorbisEncoder(scriptUrl);
  }
}
