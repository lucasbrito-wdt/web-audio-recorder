/**
 * Utility functions for loading encoder files
 * 
 * STANDARD: Files should be placed in `public/encoders/`
 */

/**
 * Get the default base URL for encoder files
 * Defaults to '/encoders' (relative to domain root)
 */
export function getEncoderBaseUrl(): string {
  // Simples e direto: padrão é a pasta /encoders na raiz
  return '/encoders';
}

/**
 * Get the full URL for an encoder script file
 */
export function getEncoderScriptUrl(filename: string, customBaseUrl?: string): string {
  const baseUrl = customBaseUrl || getEncoderBaseUrl();
  
  // Garantir barra no final
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  // Se baseUrl começa com http/https ou /, retorna como está
  if (normalizedBase.startsWith('http') || normalizedBase.startsWith('/')) {
    return `${normalizedBase}${filename}`;
  }
  
  // Caso contrário, relativo à origem atual
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${normalizedBase}${filename}`;
  }
  
  return `/${normalizedBase}${filename}`;
}

/**
 * Configure encoder memory initializer paths
 * Critical for OGG/MP3 Emscripten modules
 */
export function configureEncoderPaths(baseUrl?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Se nenhuma URL for passada, usar o padrão /encoders
  let url = baseUrl || getEncoderBaseUrl();

  // Converter para URL absoluta para evitar problemas com Emscripten
  try {
    if (!url.startsWith('http')) {
      // Usar a URL atual como base
      // Se url for '/encoders', vira 'http://localhost:3000/encoders'
      url = new URL(url, window.location.href).href;
    }
  } catch (e) {
    console.warn('Failed to resolve absolute URL for encoder path:', e);
  }

  // Garantir barra no final
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;

  console.log(`[web-audio-recorder-ts] Configuring encoder memory path to: ${normalizedUrl}`);

  // Configurar globais para o Emscripten
  // OGG
  (window as any).OggVorbisEncoderConfig = {
    // Importante: Emscripten usa isso para achar o arquivo .mem
    memoryInitializerPrefixURL: normalizedUrl
  };

  // MP3
  (window as any).Mp3LameEncoderConfig = {
    memoryInitializerPrefixURL: normalizedUrl
  };
}

/**
 * Find and load encoder script
 * Simplified: ONLY looks in standard locations or provided path
 */
export async function findEncoderPath(filename: string): Promise<string | null> {
  // Caminhos padrão para tentar
  const possiblePaths = [
    // 1. Caminho padrão: /encoders/ (na raiz do servidor)
    `/encoders/${filename}`,
    
    // 2. Caminho na raiz (fallback)
    `/${filename}`,
    
    // 3. Fallback relativo simples
    `./encoders/${filename}`
  ];
  
  console.log(`[web-audio-recorder-ts] Looking for ${filename} mainly in /encoders/...`);

  for (const path of possiblePaths) {
    try {
      // Resolver URL absoluta para teste
      const testUrl = path.startsWith('http') 
        ? path 
        : new URL(path, typeof window !== 'undefined' ? window.location.href : 'file://').href;
      
      const response = await fetch(testUrl, { method: 'GET', cache: 'no-cache' });
      
      if (response.ok) {
        // Verificar se é JS e não HTML (404)
        const text = await response.text();
        if (text.trim().startsWith('<')) {
          continue; // É HTML (erro)
        }
        
        console.log(`[web-audio-recorder-ts] ✅ Found encoder at: ${path}`);
        return path;
      }
    } catch (e) {
      continue;
    }
  }

  console.error(`[web-audio-recorder-ts] ❌ Could not find ${filename}. Please ensure files are in 'public/encoders/' folder.`);
  return null;
}
