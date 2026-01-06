/**
 * Declarações de tipos para Mp3LameEncoder (Emscripten)
 */

export interface Mp3LameEncoderConfig {
  memoryInitializerPrefixURL?: string;
}

export interface Mp3LameEncoderInstance {
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}

export interface Mp3LameEncoderModule {
  new (sampleRate: number, numChannels: number, bitrate: number): Mp3LameEncoderInstance;
}

declare global {
  interface Mp3LameEncoderConfig {
    memoryInitializerPrefixURL?: string;
  }

  var Mp3LameEncoder: Mp3LameEncoderModule;
  var Mp3LameEncoderConfig: Mp3LameEncoderConfig;
}

export {};
