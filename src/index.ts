/**
 * Web Audio Recorder TypeScript
 * 
 * Biblioteca para gravação de áudio em navegadores usando Web Audio API
 * Suporta formatos WAV, OGG Vorbis e MP3
 * 
 * @module index
 */

// Core
export { WebAudioRecorder } from './core/WebAudioRecorder';
export * from './core/types';

// Encoders
export { WavAudioEncoder } from './encoders/WavAudioEncoder';
export { OggVorbisEncoderWrapper, loadOggVorbisEncoder } from './encoders/OggVorbisEncoder';
export { Mp3LameEncoderWrapper, loadMp3LameEncoder } from './encoders/Mp3LameEncoder';

// Utils
export {
  getEncoderBaseUrl,
  getEncoderScriptUrl,
  configureEncoderPaths,
  findEncoderPath
} from './utils/encoderLoader';

// Recorders
export { WebAudioRecorderWav } from './recorders/WebAudioRecorderWav';
export { WebAudioRecorderOgg } from './recorders/WebAudioRecorderOgg';
export { WebAudioRecorderMp3 } from './recorders/WebAudioRecorderMp3';
