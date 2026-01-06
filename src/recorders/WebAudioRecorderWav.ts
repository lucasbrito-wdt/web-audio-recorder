/**
 * Recorder WAV usando WebAudioRecorder
 * 
 * @module recorders/WebAudioRecorderWav
 */

import { WebAudioRecorder } from '../core/WebAudioRecorder';
import { WavAudioEncoder } from '../encoders/WavAudioEncoder';
import { RecorderOptions } from '../core/types';

/**
 * Classe para gravação de áudio em formato WAV
 */
export class WebAudioRecorderWav extends WebAudioRecorder {
  /**
   * Cria uma instância do recorder WAV
   * 
   * @param audioContext - Contexto de áudio Web Audio API
   * @param options - Opções de configuração do recorder
   */
  constructor(audioContext: AudioContext, options: RecorderOptions = {}) {
    const sampleRate = options.sampleRate || audioContext.sampleRate;
    const numChannels = options.numChannels || 2;
    const encoder = new WavAudioEncoder(sampleRate, numChannels);

    super(audioContext, encoder, options);
  }
}
