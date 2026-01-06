/**
 * Declarações de tipos para OggVorbisEncoder (Emscripten)
 */

export interface OggVorbisEncoderConfig {
  memoryInitializerPrefixURL?: string;
}

export interface OggVorbisEncoderInstance {
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}

export interface OggVorbisEncoderModule {
  new (sampleRate: number, numChannels: number, quality: number): OggVorbisEncoderInstance;
}

declare global {
  interface OggVorbisEncoderConfig {
    memoryInitializerPrefixURL?: string;
  }

  var OggVorbisEncoder: OggVorbisEncoderModule;
  var OggVorbisEncoderConfig: OggVorbisEncoderConfig;
}

export {};
