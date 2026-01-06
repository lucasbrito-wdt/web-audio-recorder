# Como Criar a Release v1.0.1 no GitHub

## Opção 1: Via Interface Web do GitHub (Recomendado)

1. Acesse: https://github.com/lucasbrito-wdt/web-audio-recorder/releases/new
2. Selecione a tag: `v1.0.1`
3. Título: `v1.0.1 - Nuxt Compatibility Fixes`
4. Descrição (copie e cole):

```markdown
## Changes in v1.0.1

### Fixes
- ✅ Fixed Nuxt compatibility - disabled source maps to prevent bundlers from accessing TypeScript source files
- ✅ Improved exports configuration for better compatibility with Nuxt and other modern bundlers
- ✅ Updated documentation with Nuxt-specific instructions

### Technical Changes
- Disabled source maps in Rollup build configuration
- Disabled source maps in TypeScript configuration
- Improved package.json exports structure
- Added NUXT_USAGE.md guide

### Installation
\`\`\`bash
npm install web-audio-recorder-ts@1.0.1
\`\`\`
```

5. Clique em "Publish release"

## Opção 2: Via GitHub CLI

Se você tiver o GitHub CLI instalado:

```bash
gh release create v1.0.1 --title "v1.0.1 - Nuxt Compatibility Fixes" --notes-file RELEASE_NOTES_v1.0.1.md
```

## Status Atual

- ✅ Tag v1.0.1 criada e enviada para GitHub
- ✅ Commit com versão 1.0.1 feito
- ⏳ Release no GitHub (precisa ser criada manualmente)
- ⏳ Publicação no npm (precisa de código OTP)
