/**
 * Utility functions for automatically loading encoder files from the npm package
 */

/**
 * Get the base URL for encoder files
 * Tries to detect the package location automatically
 */
export function getEncoderBaseUrl(): string {
  // Try to detect from import.meta.url (ESM)
  // Use try-catch to safely check for import.meta
  try {
    // @ts-ignore - import.meta may not exist in all environments
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      try {
        // @ts-ignore
        const url = new URL(import.meta.url);
        // If running from node_modules, construct path to lib
        if (url.pathname.includes('node_modules')) {
          const packagePath = url.pathname.split('node_modules/')[1];
          const packageName = packagePath.split('/')[0];
          // Return relative path from package root
          return `/node_modules/${packageName}/lib`;
        }
        // If running from dist, go up to lib
        if (url.pathname.includes('/dist/')) {
          return url.pathname.replace('/dist/', '/lib/').replace(/\/[^/]+$/, '');
        }
      } catch (e) {
        // Fall through to other methods
      }
    }
  } catch (e) {
    // import.meta not available, continue to other methods
  }

  // Try to detect from __dirname (CJS/Node.js)
  if (typeof __dirname !== 'undefined') {
    try {
      // If in node_modules, construct path
      if (__dirname.includes('node_modules')) {
        const parts = __dirname.split('node_modules/');
        if (parts.length > 1) {
          const packageName = parts[1].split('/')[0];
          // Retornar caminho absoluto se possível
          if (typeof window !== 'undefined') {
            return `${window.location.origin}/node_modules/${packageName}/lib`;
          }
          return `/node_modules/${packageName}/lib`;
        }
      }
      // If in dist, go to lib
      if (__dirname.includes('dist')) {
        const libPath = __dirname.replace('dist', 'lib');
        if (typeof window !== 'undefined') {
          return `${window.location.origin}${libPath}`;
        }
        return libPath;
      }
    } catch (e) {
      // Fall through
    }
  }

  // Try to detect from document.currentScript or all scripts (browser)
  if (typeof document !== 'undefined') {
    // Try currentScript first
    let script: HTMLScriptElement | null = document.currentScript as HTMLScriptElement;
    
    // If no currentScript, try to find script with web-audio-recorder in src
    if (!script || !script.src) {
      const scripts = document.querySelectorAll('script[src]');
      for (const s of Array.from(scripts)) {
        const src = (s as HTMLScriptElement).src;
        if (src.includes('web-audio-recorder')) {
          script = s as HTMLScriptElement;
          break;
        }
      }
    }
    
    if (script && script.src) {
      try {
        const url = new URL(script.src);
        // If from node_modules
        if (url.pathname.includes('node_modules')) {
          const packagePath = url.pathname.split('node_modules/')[1];
          const packageName = packagePath.split('/')[0];
          // Retornar caminho absoluto para node_modules
          return `${url.origin}/node_modules/${packageName}/lib`;
        }
        // If from dist, go to lib
        if (url.pathname.includes('/dist/')) {
          const libPath = url.pathname.replace('/dist/', '/lib/').replace(/\/[^/]+$/, '');
          return `${url.origin}${libPath}`;
        }
      } catch (e) {
        // Fall through
      }
    }
  }

  // Default fallback: try node_modules first, then root
  if (typeof window !== 'undefined') {
    // Priorizar node_modules
    return '/node_modules/web-audio-recorder-ts/lib';
  }
  
  return '/lib';
}

/**
 * Get the full URL for an encoder script file
 * @param filename - Name of the encoder file (e.g., 'OggVorbisEncoder.min.js')
 * @param customBaseUrl - Optional custom base URL (overrides auto-detection)
 */
export function getEncoderScriptUrl(filename: string, customBaseUrl?: string): string {
  const baseUrl = customBaseUrl || getEncoderBaseUrl();
  
  // Ensure baseUrl ends with /
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  // If baseUrl is absolute (starts with http:// or https://), return as is
  if (normalizedBase.startsWith('http://') || normalizedBase.startsWith('https://')) {
    return `${normalizedBase}${filename}`;
  }
  
  // If baseUrl starts with /, it's already absolute
  if (normalizedBase.startsWith('/')) {
    return `${normalizedBase}${filename}`;
  }
  
  // Otherwise, make it relative to current location
  if (typeof window !== 'undefined') {
    const base = window.location.origin;
    return `${base}/${normalizedBase}${filename}`;
  }
  
  return `${normalizedBase}${filename}`;
}

/**
 * Configure encoder memory initializer paths
 * @param baseUrl - Base URL for .mem files (defaults to auto-detected path)
 */
export function configureEncoderPaths(baseUrl?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = baseUrl || getEncoderBaseUrl();
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;

  // Configure OGG encoder
  (window as any).OggVorbisEncoderConfig = {
    memoryInitializerPrefixURL: normalizedUrl
  };

  // Configure MP3 encoder
  (window as any).Mp3LameEncoderConfig = {
    memoryInitializerPrefixURL: normalizedUrl
  };
}

/**
 * Try multiple paths to find encoder files
 * Useful when auto-detection fails
 */
export async function findEncoderPath(filename: string): Promise<string | null> {
  // Priorizar caminhos do node_modules primeiro
  const possiblePaths = [
    // Primeiro: tentar node_modules (prioridade máxima)
    `/node_modules/web-audio-recorder-ts/lib/${filename}`,
    `./node_modules/web-audio-recorder-ts/lib/${filename}`,
    `../node_modules/web-audio-recorder-ts/lib/${filename}`,
    `../../node_modules/web-audio-recorder-ts/lib/${filename}`,
    // From dist (se os arquivos foram copiados para dist/lib)
    `/node_modules/web-audio-recorder-ts/dist/lib/${filename}`,
    `./node_modules/web-audio-recorder-ts/dist/lib/${filename}`,
    // Auto-detected path (pode apontar para node_modules)
    getEncoderScriptUrl(filename),
    // Para desenvolvimento/demo: try public folder (Vite serves public/ at root)
    `/${filename}`,
    // Direct lib paths (for development or custom setups)
    `/lib/${filename}`,
    `./lib/${filename}`,
    `../lib/${filename}`,
    // CDN or absolute paths (if configured)
    filename.startsWith('http') ? filename : null
  ].filter((path): path is string => path !== null);

  // Try each path
  for (const path of possiblePaths) {
    try {
      const testUrl = path.startsWith('http') 
        ? path 
        : new URL(path, typeof window !== 'undefined' ? window.location.href : 'file://').href;
      
      // Usar GET para verificar se é JavaScript válido (não HTML)
      const response = await fetch(testUrl, { method: 'GET', cache: 'no-cache' });
      if (response.ok) {
        // Verificar se o conteúdo é JavaScript (não HTML)
        const text = await response.text();
        const trimmedText = text.trim();
        
        // Se começar com '<', é HTML (404, etc) - pular este caminho
        if (trimmedText.startsWith('<')) {
          console.warn(`Path ${path} returned HTML instead of JavaScript, skipping...`);
          continue;
        }
        
        // Se parece JavaScript, retornar este caminho
        if (trimmedText.includes('function') || trimmedText.includes('var') || trimmedText.includes('const') || trimmedText.includes('let') || trimmedText.length > 100) {
          console.log(`✅ Found encoder file at: ${path}`);
          return path;
        }
      }
    } catch (e) {
      // Continue to next path
      continue;
    }
  }

  return null;
}
