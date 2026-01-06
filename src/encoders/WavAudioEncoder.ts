/**
 * Encoder WAV para áudio
 * 
 * @module encoders/WavAudioEncoder
 */

import { AudioEncoder } from '../core/types';

/**
 * Encoder WAV simples que cria arquivos WAV a partir de buffers de áudio
 */
export class WavAudioEncoder implements AudioEncoder {
  private sampleRate: number;
  private numChannels: number;
  private buffers: Float32Array[][] = [];

  /**
   * Cria uma instância do encoder WAV
   * 
   * @param sampleRate - Taxa de amostragem em Hz
   * @param numChannels - Número de canais (1 = mono, 2 = estéreo)
   */
  constructor(sampleRate: number, numChannels: number) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.buffers = [];
  }

  /**
   * Codifica buffers de áudio
   * 
   * @param buffers - Array de buffers Float32Array, um por canal
   */
  encode(buffers: Float32Array[]): void {
    if (buffers.length !== this.numChannels) {
      throw new Error(`Expected ${this.numChannels} channels, got ${buffers.length}`);
    }

    // Armazenar buffers para processamento posterior
    this.buffers.push(buffers.map(buffer => new Float32Array(buffer)));
  }

  /**
   * Finaliza o encoding e retorna o Blob WAV
   * 
   * @param mimeType - Tipo MIME (padrão: 'audio/wav')
   * @returns Blob contendo o arquivo WAV
   */
  finish(mimeType: string = 'audio/wav'): Blob {
    if (this.buffers.length === 0) {
      throw new Error('No audio data to encode');
    }

    // Calcular tamanho total somando todos os frames de todos os buffers
    let totalFrames = 0;
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].length > 0 && this.buffers[i][0].length > 0) {
        totalFrames += this.buffers[i][0].length;
      }
    }

    if (totalFrames === 0) {
      throw new Error('No valid audio data to encode');
    }

    // Calcular tamanho dos dados (16-bit samples = 2 bytes por sample)
    const dataSize = totalFrames * this.numChannels * 2;
    const fileSize = 44 + dataSize; // 44 bytes de cabeçalho + dados

    // Criar buffer para o arquivo WAV
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Escrever cabeçalho WAV
    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true); // Tamanho do arquivo - 8 bytes do header RIFF
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, this.numChannels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * this.numChannels * 2, true); // byte rate
    view.setUint16(32, this.numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Escrever dados de áudio (intercalados para estéreo)
    let offset = 44;
    for (let i = 0; i < this.buffers.length; i++) {
      const frameBuffers = this.buffers[i];
      
      // Verificar se há dados válidos
      if (frameBuffers.length === 0 || frameBuffers[0].length === 0) {
        continue;
      }

      const frameLength = frameBuffers[0].length;

      // Verificar se todos os canais têm o mesmo tamanho
      for (let channel = 0; channel < this.numChannels; channel++) {
        if (frameBuffers[channel].length !== frameLength) {
          throw new Error(`Channel ${channel} has different length in frame ${i}`);
        }
      }

      for (let j = 0; j < frameLength; j++) {
        for (let channel = 0; channel < this.numChannels; channel++) {
          // Verificar se o offset está dentro dos limites
          if (offset + 2 > buffer.byteLength) {
            throw new Error(`Offset ${offset + 2} exceeds buffer size ${buffer.byteLength}`);
          }

          // Converter float32 (-1.0 a 1.0) para int16 (-32768 a 32767)
          const sample = Math.max(-1, Math.min(1, frameBuffers[channel][j]));
          const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, int16Sample, true);
          offset += 2;
        }
      }
    }

    // Verificar se escrevemos todos os dados
    if (offset !== buffer.byteLength) {
      console.warn(`Warning: Expected to write ${buffer.byteLength} bytes, but wrote ${offset} bytes`);
    }

    // Limpar buffers
    this.buffers = [];

    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Cancela o encoding e limpa os buffers
   */
  cancel(): void {
    this.buffers = [];
  }

  /**
   * Escreve string no DataView
   * 
   * @param view - DataView
   * @param offset - Offset inicial
   * @param string - String a escrever
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
