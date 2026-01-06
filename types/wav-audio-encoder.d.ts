/**
 * Declarações de tipos para WavAudioEncoder
 */

export interface WavAudioEncoderInstance {
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}

export interface WavAudioEncoderConstructor {
  new (sampleRate: number, numChannels: number): WavAudioEncoderInstance;
}

declare const WavAudioEncoder: WavAudioEncoderConstructor;

export default WavAudioEncoder;
