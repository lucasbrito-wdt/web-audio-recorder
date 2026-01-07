# Release v1.0.3 - Prioritize node_modules Paths

## ✨ Features

- ✅ **Prioritize node_modules paths** - Auto-detection now tries `node_modules` paths first
- ✅ **Enhanced content validation** - Better detection of HTML responses (404 errors) before loading scripts
- ✅ **Improved error messages** - More detailed troubleshooting information in error messages

## 🔧 Technical Changes

- Updated `findEncoderPath` to prioritize `/node_modules/web-audio-recorder-ts/lib/` paths
- Enhanced validation to check if response is JavaScript before loading
- Improved `getEncoderBaseUrl` to default to node_modules path
- Better Content-Type checking and JavaScript validation
- More comprehensive error messages with step-by-step troubleshooting

## 📦 Installation

```bash
npm install web-audio-recorder-ts@1.0.3
# or
pnpm add web-audio-recorder-ts@1.0.3
# or
yarn add web-audio-recorder-ts@1.0.3
```

## 🎯 What's New

This release prioritizes loading encoder files directly from `node_modules`, making it easier to use the library without manual file copying. The library will:

1. First try to find files in `node_modules/web-audio-recorder-ts/lib/`
2. Validate that the response is JavaScript (not HTML/404)
3. Fall back to other paths if node_modules is not accessible

## ⚙️ Configuration

For Nuxt/Vite projects, you may need to configure the server to serve files from `node_modules`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    server: {
      fs: {
        allow: ['..'] // Allow accessing node_modules
      }
    }
  }
})
```

## 📚 Documentation

- See [TROUBLESHOOTING_ENCODER.md](./TROUBLESHOOTING_ENCODER.md) for detailed troubleshooting guide
- See [NUXT_USAGE.md](./NUXT_USAGE.md) for Nuxt-specific setup
- See [README.md](./README.md) for general usage

## 🔗 Links

- **npm**: https://www.npmjs.com/package/web-audio-recorder-ts
- **GitHub**: https://github.com/lucasbrito-wdt/web-audio-recorder
