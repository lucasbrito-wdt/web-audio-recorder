# Instruções para Publicar no npm

## Status Atual

✅ **Commit criado e enviado para GitHub**
✅ **Tag v1.0.0 já existe no repositório**
✅ **Build executado com sucesso**
⏳ **Aguardando código OTP para publicação no npm**

## Próximo Passo

O npm está pedindo um código de autenticação de dois fatores (OTP). Você precisa:

1. **Abrir seu app autenticador** (Google Authenticator, Authy, etc.)
2. **Copiar o código de 6 dígitos** para `web-audio-recorder-ts`
3. **Executar o comando com o código OTP**:

```bash
npm publish --access public --otp=SEU_CODIGO_AQUI
```

**Exemplo:**
```bash
npm publish --access public --otp=123456
```

## Alternativa: Usar Token de Acesso

Se preferir usar um token de acesso granular (sem precisar de OTP a cada publicação):

1. Crie um token em: https://www.npmjs.com/settings/luquinhasbrito/tokens
2. Configure no `.npmrc`:
   ```
   //registry.npmjs.org/:_authToken=SEU_TOKEN_AQUI
   ```
3. Depois pode publicar normalmente:
   ```bash
   npm publish --access public
   ```

## Verificar Publicação

Após publicar, verifique se está disponível:

```bash
npm view web-audio-recorder-ts
```

Ou acesse: https://www.npmjs.com/package/web-audio-recorder-ts
