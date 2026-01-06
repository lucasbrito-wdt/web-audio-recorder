# Release v1.0.1 - Nuxt Compatibility Fixes

## 🐛 Fixes

- ✅ **Fixed Nuxt compatibility** - Disabled source maps to prevent bundlers from accessing TypeScript source files
- ✅ **Improved exports configuration** - Better compatibility with Nuxt and other modern bundlers
- ✅ **Updated documentation** - Added Nuxt-specific instructions and troubleshooting guide

## 🔧 Technical Changes

- Disabled source maps in Rollup build configuration
- Disabled source maps in TypeScript configuration (`sourceMap: false`, `declarationMap: false`)
- Improved `package.json` exports structure with proper type definitions
- Added `NUXT_USAGE.md` guide with detailed instructions

## 📦 Installation

```bash
npm install web-audio-recorder-ts@1.0.1
# or
pnpm add web-audio-recorder-ts@1.0.1
# or
yarn add web-audio-recorder-ts@1.0.1
```

## 📚 Documentation

- See [NUXT_USAGE.md](./NUXT_USAGE.md) for Nuxt-specific setup instructions
- See [README.md](./README.md) for general usage

## 🔗 Links

- **npm**: https://www.npmjs.com/package/web-audio-recorder-ts
- **GitHub**: https://github.com/lucasbrito-wdt/web-audio-recorder
