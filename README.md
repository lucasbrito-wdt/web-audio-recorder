# web-audio-recorder-ts

TypeScript port of [web-audio-recorder-js](https://github.com/higuma/web-audio-recorder-js) with full type support for WAV, OGG Vorbis, and MP3 audio recording in browsers.

## Features

- ✅ Full TypeScript support with type definitions
- ✅ Record audio in WAV, OGG Vorbis, and MP3 formats
- ✅ Modern ES modules, CommonJS, and UMD builds
- ✅ Zero runtime dependencies
- ✅ Works in browsers and Web Workers
- ✅ Type-safe API with IntelliSense support

## Installation

```bash
npm install web-audio-recorder-ts
# or
pnpm add web-audio-recorder-ts
# or
yarn add web-audio-recorder-ts
```

## Quick Start

### WAV Recording

```typescript
import { WebAudioRecorderWav } from 'web-audio-recorder-ts';

// Create audio context
const audioContext = new AudioContext();

// Get user media
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Create recorder
const recorder = new WebAudioRecorderWav(audioContext);

// Set up callbacks
recorder.setOnComplete((event) => {
  console.log('Recording complete!', event.url);
  // event.blob contains the WAV file
  // event.url is a blob URL for playback
});

recorder.setOnError((event) => {
  console.error('Error:', event.message);
});

// Start recording
await recorder.start(stream);

// Stop recording (after some time)
const blob = await recorder.stop();
```

### OGG Vorbis Recording

```typescript
import { WebAudioRecorderOgg, loadOggVorbisEncoder } from 'web-audio-recorder-ts';

// Load encoder script first
await loadOggVorbisEncoder('/path/to/OggVorbisEncoder.min.js');

// Configure memory initializer path (if needed)
if (typeof window !== 'undefined') {
  (window as any).OggVorbisEncoderConfig = {
    memoryInitializerPrefixURL: '/path/to/'
  };
}

const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

const recorder = new WebAudioRecorderOgg(
  audioContext,
  {},
  { quality: 0.7 } // OGG quality: -0.1 to 1.0
);

await recorder.start(stream);
const blob = await recorder.stop();
```

### MP3 Recording

```typescript
import { WebAudioRecorderMp3, loadMp3LameEncoder } from 'web-audio-recorder-ts';

// Load encoder script first
await loadMp3LameEncoder('/path/to/Mp3LameEncoder.min.js');

// Configure memory initializer path (if needed)
if (typeof window !== 'undefined') {
  (window as any).Mp3LameEncoderConfig = {
    memoryInitializerPrefixURL: '/path/to/'
  };
}

const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

const recorder = new WebAudioRecorderMp3(
  audioContext,
  {},
  { bitrate: 192 } // MP3 bitrate in kbps
);

await recorder.start(stream);
const blob = await recorder.stop();
```

## API Reference

### WebAudioRecorder (Base Class)

Base class for all recorders. Usually you'll use the specific format recorders instead.

#### Constructor

```typescript
constructor(
  audioContext: AudioContext,
  encoder: AudioEncoder,
  options?: RecorderOptions
)
```

#### Methods

- `start(stream: MediaStream): Promise<void>` - Start recording
- `stop(mimeType?: string): Promise<Blob>` - Stop recording and get the audio blob
- `cancel(): void` - Cancel current recording
- `getStatus(): RecorderStatus` - Get current recorder status
- `setOnDataAvailable(callback: DataAvailableCallback | null): void` - Set data available callback
- `setOnComplete(callback: CompleteCallback | null): void` - Set completion callback
- `setOnError(callback: ErrorCallback | null): void` - Set error callback
- `cleanup(): void` - Clean up resources

### WebAudioRecorderWav

WAV format recorder. No external dependencies required.

```typescript
const recorder = new WebAudioRecorderWav(audioContext, options?);
```

### WebAudioRecorderOgg

OGG Vorbis format recorder. Requires OggVorbisEncoder.min.js and .mem files.

```typescript
const recorder = new WebAudioRecorderOgg(
  audioContext,
  options?,
  { quality?: number } // -0.1 to 1.0, default: 0.5
);
```

### WebAudioRecorderMp3

MP3 format recorder. Requires Mp3LameEncoder.min.js and .mem files.

```typescript
const recorder = new WebAudioRecorderMp3(
  audioContext,
  options?,
  { bitrate?: number } // in kbps, default: 128
);
```

### Types

```typescript
interface RecorderOptions {
  sampleRate?: number;        // Default: audioContext.sampleRate
  numChannels?: number;       // Default: 2 (stereo)
  bufferSize?: number;         // Default: 4096
  onDataAvailable?: (event: DataAvailableEvent) => void;
  onComplete?: (event: CompleteEvent) => void;
  onError?: (event: ErrorEvent) => void;
}

enum RecorderStatus {
  INACTIVE = 'inactive',
  RECORDING = 'recording',
  PAUSED = 'paused',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}
```

## Setup for OGG and MP3

OGG and MP3 encoders require external JavaScript files compiled via Emscripten. You need to:

1. Copy the encoder files to your project:
   - `OggVorbisEncoder.min.js` and `OggVorbisEncoder.min.js.mem`
   - `Mp3LameEncoder.min.js` and `Mp3LameEncoder.min.js.mem`

2. These files are included in the `lib/` directory of this package.

3. Load the encoder scripts before creating recorders:

```typescript
// For OGG
await loadOggVorbisEncoder('/path/to/OggVorbisEncoder.min.js');

// For MP3
await loadMp3LameEncoder('/path/to/Mp3LameEncoder.min.js');
```

4. Configure memory initializer path if needed:

```typescript
// For OGG
window.OggVorbisEncoderConfig = {
  memoryInitializerPrefixURL: '/path/to/'
};

// For MP3
window.Mp3LameEncoderConfig = {
  memoryInitializerPrefixURL: '/path/to/'
};
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require user gesture for audio context)
- Opera: Full support

## License

- TypeScript code: MIT License
- OGG Vorbis encoder: Xiph BSD License
- MP3 LAME encoder: LGPL License

See LICENSE file for details.

## Credits

This is a TypeScript port of:
- [web-audio-recorder-js](https://github.com/higuma/web-audio-recorder-js) by higuma
- [ogg-vorbis-encoder-js](https://github.com/higuma/ogg-vorbis-encoder-js) by higuma

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.0.0

- Initial TypeScript port
- Full type definitions
- Support for WAV, OGG, and MP3 formats
- Modern build system with ESM, CJS, and UMD outputs
