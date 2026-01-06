# web-audio-recorder-ts

[![npm version](https://img.shields.io/npm/v/web-audio-recorder-ts.svg)](https://www.npmjs.com/package/web-audio-recorder-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript port of [web-audio-recorder-js](https://github.com/higuma/web-audio-recorder-js) with full type support for WAV, OGG Vorbis, and MP3 audio recording in browsers.

**✨ No manual file copying required!** The library automatically detects and loads encoder files from the npm package.

## Features

- ✅ **Full TypeScript support** with complete type definitions
- ✅ **Record audio in WAV, OGG Vorbis, and MP3 formats**
- ✅ **Automatic encoder file detection** - no manual file copying needed!
- ✅ **Modern build system** - ES modules, CommonJS, and UMD outputs
- ✅ **Zero runtime dependencies** - pure TypeScript/JavaScript
- ✅ **Works in browsers and Web Workers**
- ✅ **Type-safe API** with full IntelliSense support
- ✅ **Production ready** - tested and published on npm

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

// Load encoder script (auto-detects from node_modules - no path needed!)
await loadOggVorbisEncoder();

const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

const recorder = new WebAudioRecorderOgg(
  audioContext,
  {},
  { quality: 0.7 } // OGG quality: -0.1 to 1.0
);

recorder.setOnComplete((event) => {
  console.log('OGG recording complete!', event.url);
});

await recorder.start(stream);
const blob = await recorder.stop();
```

### MP3 Recording

```typescript
import { WebAudioRecorderMp3, loadMp3LameEncoder } from 'web-audio-recorder-ts';

// Load encoder script (auto-detects from node_modules - no path needed!)
await loadMp3LameEncoder();

const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

const recorder = new WebAudioRecorderMp3(
  audioContext,
  {},
  { bitrate: 192 } // MP3 bitrate in kbps
);

recorder.setOnComplete((event) => {
  console.log('MP3 recording complete!', event.url);
});

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

OGG and MP3 encoders require external JavaScript files compiled via Emscripten. The good news is that **you don't need to copy any files manually** - the library will automatically detect and load them from the npm package!

### Automatic Loading (Recommended)

Simply call the loader functions without any parameters, and the library will automatically find the encoder files:

```typescript
// For OGG - automatically finds the file in node_modules
await loadOggVorbisEncoder();

// For MP3 - automatically finds the file in node_modules
await loadMp3LameEncoder();
```

The library will:

1. Automatically detect the package location in `node_modules`
2. Configure the memory initializer paths for `.mem` files
3. Load the encoder scripts from the correct location

### Manual Path (If Needed)

If automatic detection fails (e.g., custom build setup), you can still provide the path manually:

```typescript
// For OGG
await loadOggVorbisEncoder('/path/to/OggVorbisEncoder.min.js');

// For MP3
await loadMp3LameEncoder('/path/to/Mp3LameEncoder.min.js');
```

### Advanced Configuration

If you need more control, you can use the utility functions:

```typescript
import { 
  configureEncoderPaths, 
  getEncoderBaseUrl,
  findEncoderPath 
} from 'web-audio-recorder-ts';

// Configure paths manually
configureEncoderPaths('/custom/path/to/lib');

// Get the detected base URL
const baseUrl = getEncoderBaseUrl();

// Find encoder file path
const oggPath = await findEncoderPath('OggVorbisEncoder.min.js');
```

### File Locations

The encoder files are included in the `lib/` directory of the npm package:

- `OggVorbisEncoder.min.js` and `OggVorbisEncoder.min.js.mem`
- `Mp3LameEncoder.min.js` and `Mp3LameEncoder.min.js.mem`

When installed via npm, they will be at:

- `node_modules/web-audio-recorder-ts/lib/`

## Framework Support

### Nuxt.js

If you're using Nuxt and seeing errors about TypeScript source files, see [NUXT_USAGE.md](./NUXT_USAGE.md) for detailed instructions.

Quick fix - add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  vite: {
    optimizeDeps: {
      exclude: ['web-audio-recorder-ts']
    }
  }
})
```

### Vite / Vue

Works out of the box! Just import and use.

### Next.js

Should work with default configuration. For OGG/MP3, ensure encoder files are accessible.

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (may require user gesture for audio context)
- ✅ Opera: Full support

### Requirements

- Modern browser with Web Audio API support
- `getUserMedia` API for microphone access
- For OGG/MP3: Server must be able to serve files from `node_modules` (or use manual paths)

## Troubleshooting

### Encoder files not found

If automatic detection fails, you can:

1. **Check if files exist**: Verify that `node_modules/web-audio-recorder-ts/lib/` contains the encoder files
2. **Use manual paths**: Provide the path explicitly:

   ```typescript
   await loadOggVorbisEncoder('/path/to/OggVorbisEncoder.min.js');
   ```

3. **Check server configuration**: Ensure your dev server can serve files from `node_modules` (Vite, Webpack, etc.)

### Memory initializer errors

If you see errors about `.mem` files:

1. The library automatically configures paths, but if needed:

   ```typescript
   import { configureEncoderPaths } from 'web-audio-recorder-ts';
   configureEncoderPaths('/path/to/lib/');
   ```

### CORS errors

If you see CORS errors when loading encoder files:

- Ensure your server allows loading from `node_modules`
- Consider copying files to `public/` folder in development
- Use a CDN or absolute URLs in production

## License

- TypeScript code: MIT License
- OGG Vorbis encoder: Xiph BSD License
- MP3 LAME encoder: LGPL License

See LICENSE file for details.

## Credits

This is a TypeScript port of:

- [web-audio-recorder-js](https://github.com/higuma/web-audio-recorder-js) by higuma
- [ogg-vorbis-encoder-js](https://github.com/higuma/ogg-vorbis-encoder-js) by higuma

## Development

### Building

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Watch mode for development
pnpm dev

# Run demo
pnpm demo
```

### Project Structure

```
web-audio-recorder-ts/
├── src/
│   ├── core/           # Core recorder classes and types
│   ├── encoders/       # Audio encoders (WAV, OGG, MP3)
│   ├── recorders/      # Format-specific recorders
│   └── utils/          # Utility functions (auto-detection, etc.)
├── lib/                # Emscripten encoder files
├── types/              # TypeScript declarations for Emscripten
├── demo/               # Demo application
└── dist/               # Build output
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Examples

### Complete Example with Error Handling

```typescript
import { WebAudioRecorderWav } from 'web-audio-recorder-ts';

async function recordAudio() {
  try {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const recorder = new WebAudioRecorderWav(audioContext, {
      onDataAvailable: (event) => {
        console.log('Data available:', event.data.length, 'bytes');
      },
      onComplete: (event) => {
        console.log('Recording complete!');
        // Download the file
        const a = document.createElement('a');
        a.href = event.url;
        a.download = 'recording.wav';
        a.click();
      },
      onError: (event) => {
        console.error('Recording error:', event.message);
      }
    });
    
    await recorder.start(stream);
    
    // Record for 5 seconds
    setTimeout(async () => {
      const blob = await recorder.stop();
      console.log('Blob size:', blob.size, 'bytes');
      recorder.cleanup();
    }, 5000);
    
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}
```

## Repository

- **GitHub**: [https://github.com/lucasbrito-wdt/web-audio-recorder](https://github.com/lucasbrito-wdt/web-audio-recorder)
- **npm**: [https://www.npmjs.com/package/web-audio-recorder-ts](https://www.npmjs.com/package/web-audio-recorder-ts)
- **Issues**: [https://github.com/lucasbrito-wdt/web-audio-recorder/issues](https://github.com/lucasbrito-wdt/web-audio-recorder/issues)

## Changelog

### 1.0.0 (2026-01-06)

- ✨ **Initial TypeScript port** - Complete conversion from JavaScript
- ✨ **Automatic encoder file detection** - No manual file copying required
- ✨ **Full type definitions** - Complete TypeScript support with IntelliSense
- ✨ **Support for WAV, OGG, and MP3 formats** - All three formats working
- ✨ **Modern build system** - ESM, CJS, and UMD outputs
- ✨ **Zero configuration** - Works out of the box with auto-detection
- 📦 **Published on npm** - Ready for production use
