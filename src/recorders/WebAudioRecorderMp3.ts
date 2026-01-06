/**
 * Recorder MP3 usando WebAudioRecorder
 * 
 * @module recorders/WebAudioRecorderMp3
 */

import { WebAudioRecorder } from '../core/WebAudioRecorder';
import { Mp3LameEncoderWrapper, loadMp3LameEncoder } from '../encoders/Mp3LameEncoder';
import { RecorderOptions, Mp3Options } from '../core/types';

/**
 * Classe para gravação de áudio em formato MP3
 */
export class WebAudioRecorderMp3 extends WebAudioRecorder {
  private mp3Options: Mp3Options;

  /**
   * Cria uma instância do recorder MP3
   * 
   * @param audioContext - Contexto de áudio Web Audio API
   * @param options - Opções de configuração do recorder
   * @param mp3Options - Opções específicas do encoder MP3
   */
  constructor(
    audioContext: AudioContext,
    options: RecorderOptions = {},
    mp3Options: Mp3Options = {}
  ) {
    const sampleRate = options.sampleRate || audioContext.sampleRate;
    const numChannels = options.numChannels || 2;
    const encoder = new Mp3LameEncoderWrapper(sampleRate, numChannels, mp3Options);

    super(audioContext, encoder, options);
    this.mp3Options = mp3Options;
  }

  /**
   * Carrega o script Mp3LameEncoder antes de usar
   * 
   * @param scriptUrl - URL do script Mp3LameEncoder.min.js
   * @returns Promise que resolve quando o script é carregado
   */
  static async loadEncoder(scriptUrl: string): Promise<void> {
    return loadMp3LameEncoder(scriptUrl);
  }
}
