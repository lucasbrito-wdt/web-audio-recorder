# Release v1.0.2 - Improved Encoder Loading Validation

## 🐛 Fixes

- ✅ **Improved encoder loading validation** - Now detects HTML responses (404 errors) before attempting to load scripts
- ✅ **Better error messages** - Clearer diagnostics when encoder files are not found
- ✅ **Enhanced debugging** - Added detailed logging for troubleshooting script loading issues

## 🔧 Technical Changes

- Added content validation in `OggVorbisEncoder` and `Mp3LameEncoder` loaders
- Scripts now verify response is JavaScript (not HTML) before loading
- Improved error messages with specific guidance
- Added `TROUBLESHOOTING_ENCODER.md` guide

## 📦 Installation

```bash
npm install web-audio-recorder-ts@1.0.2
# or
pnpm add web-audio-recorder-ts@1.0.2
# or
yarn add web-audio-recorder-ts@1.0.2
```

## 🔍 What's Fixed

This release fixes the "Unexpected token '<'" error that occurred when encoder files returned HTML (404 pages) instead of JavaScript. The library now:

1. Validates that the response is JavaScript before loading
2. Provides clear error messages indicating file not found
3. Suggests troubleshooting steps in error messages

## 📚 Documentation

- See [TROUBLESHOOTING_ENCODER.md](./TROUBLESHOOTING_ENCODER.md) for detailed troubleshooting guide
- See [NUXT_USAGE.md](./NUXT_USAGE.md) for Nuxt-specific setup
- See [README.md](./README.md) for general usage

## 🔗 Links

- **npm**: https://www.npmjs.com/package/web-audio-recorder-ts
- **GitHub**: https://github.com/lucasbrito-wdt/web-audio-recorder
