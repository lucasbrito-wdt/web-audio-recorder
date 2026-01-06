/**
 * Demo page for Web Audio Recorder
 */

// Note: In a real build, these would be imported from the built package
// For demo purposes, we'll use relative imports
import {
  WebAudioRecorderWav,
  WebAudioRecorderOgg,
  WebAudioRecorderMp3,
  loadOggVorbisEncoder,
  loadMp3LameEncoder
} from '../src/index';

type AudioFormat = 'wav' | 'ogg' | 'mp3';

// Cache de encoders carregados
const loadedEncoders = {
  ogg: false,
  mp3: false
};

// UI Elements
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const formatSelect = document.getElementById('format') as HTMLSelectElement;
const statusIndicator = document.getElementById('statusIndicator') as HTMLSpanElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;
const audioPlayer = document.getElementById('audioPlayer') as HTMLDivElement;
const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const sampleRateSpan = document.getElementById('sampleRate') as HTMLSpanElement;
const channelsSpan = document.getElementById('channels') as HTMLSpanElement;
const durationSpan = document.getElementById('duration') as HTMLSpanElement;

// State
let audioContext: AudioContext | null = null;
let recorder: WebAudioRecorderWav | WebAudioRecorderOgg | WebAudioRecorderMp3 | null = null;
let stream: MediaStream | null = null;
let currentBlob: Blob | null = null;
let startTime: number = 0;

// Initialize
async function init() {
  try {
    // Request microphone access
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create audio context
    audioContext = new AudioContext();
    
    // Update UI with audio context info
    sampleRateSpan.textContent = audioContext.sampleRate.toString();
    channelsSpan.textContent = '2';
    
    updateStatus('ready', 'Pronto para gravar');
    startBtn.disabled = false;
  } catch (error) {
    console.error('Error initializing:', error);
    updateStatus('error', `Erro: ${(error as Error).message}`);
    alert('Não foi possível acessar o microfone. Verifique as permissões.');
  }
}

// Create recorder based on format
async function createRecorder(): Promise<WebAudioRecorderWav | WebAudioRecorderOgg | WebAudioRecorderMp3> {
  if (!audioContext) {
    throw new Error('AudioContext not initialized');
  }

  const format = formatSelect.value as AudioFormat;
  const options = {
    onDataAvailable: (event: { data: Blob; timecode: number }) => {
      console.log('Data available:', event);
    },
    onComplete: (event: { blob: Blob; url: string }) => {
      handleRecordingComplete(event.blob, event.url);
    },
    onError: (event: { message: string; error?: Error }) => {
      console.error('Recording error:', event);
      updateStatus('error', `Erro: ${event.message}`);
    }
  };

  switch (format) {
    case 'wav':
      return new WebAudioRecorderWav(audioContext, options);

    case 'ogg':
      // Carregar encoder OGG se ainda não foi carregado
      if (!loadedEncoders.ogg) {
        updateStatus('processing', 'Carregando encoder OGG...');
        // Tentar diferentes caminhos possíveis baseado na configuração do Vite
        // Com publicDir: 'public', os arquivos são servidos na raiz
        const baseUrl = window.location.origin;
        const possiblePaths = [
          '/OggVorbisEncoder.min.js',  // Raiz (publicDir)
          '/lib/OggVorbisEncoder.min.js',  // Caminho explícito (caso não use publicDir)
          `${baseUrl}/OggVorbisEncoder.min.js`  // Absoluto
        ];
        
        let loaded = false;
        let lastError: Error | null = null;
        
        for (const path of possiblePaths) {
          try {
            console.log(`Tentando carregar OggVorbisEncoder de: ${path}`);
            await loadOggVorbisEncoder(path);
            loadedEncoders.ogg = true;
            loaded = true;
            console.log(`✅ OggVorbisEncoder loaded from: ${path}`);
            break;
          } catch (error) {
            lastError = error as Error;
            console.warn(`❌ Failed to load from ${path}:`, error);
            // Continuar tentando próximo caminho
          }
        }
        
        if (!loaded) {
          const errorMsg = `Falha ao carregar encoder OGG.\n\nTentou os seguintes caminhos:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}\n\nÚltimo erro: ${lastError?.message}\n\nCertifique-se de que o arquivo OggVorbisEncoder.min.js está na pasta lib/ e que o Vite está configurado para servir arquivos públicos.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
      return new WebAudioRecorderOgg(audioContext, options, { quality: 0.7 });

    case 'mp3':
      // Carregar encoder MP3 se ainda não foi carregado
      if (!loadedEncoders.mp3) {
        updateStatus('processing', 'Carregando encoder MP3...');
        // Tentar diferentes caminhos possíveis baseado na configuração do Vite
        // Com publicDir: 'public', os arquivos são servidos na raiz
        const baseUrl = window.location.origin;
        const possiblePaths = [
          '/Mp3LameEncoder.min.js',  // Raiz (publicDir)
          '/lib/Mp3LameEncoder.min.js',  // Caminho explícito (caso não use publicDir)
          `${baseUrl}/Mp3LameEncoder.min.js`  // Absoluto
        ];
        
        let loaded = false;
        let lastError: Error | null = null;
        
        for (const path of possiblePaths) {
          try {
            console.log(`Tentando carregar Mp3LameEncoder de: ${path}`);
            await loadMp3LameEncoder(path);
            loadedEncoders.mp3 = true;
            loaded = true;
            console.log(`✅ Mp3LameEncoder loaded from: ${path}`);
            break;
          } catch (error) {
            lastError = error as Error;
            console.warn(`❌ Failed to load from ${path}:`, error);
            // Continuar tentando próximo caminho
          }
        }
        
        if (!loaded) {
          const errorMsg = `Falha ao carregar encoder MP3.\n\nTentou os seguintes caminhos:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}\n\nÚltimo erro: ${lastError?.message}\n\nCertifique-se de que o arquivo Mp3LameEncoder.min.js está na pasta lib/ e que o Vite está configurado para servir arquivos públicos.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
      return new WebAudioRecorderMp3(audioContext, options, { bitrate: 192 });

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

// Start recording
async function startRecording() {
  if (!stream || !audioContext) {
    await init();
    if (!stream || !audioContext) {
      return;
    }
  }

  try {
    // Desabilitar botão enquanto carrega encoder
    startBtn.disabled = true;
    updateStatus('processing', 'Preparando gravação...');

    // Create recorder (pode carregar encoder se necessário)
    recorder = await createRecorder();

    // Start recording
    await recorder.start(stream);
    startTime = Date.now();

    // Update UI
    updateStatus('recording', 'Gravando...');
    stopBtn.disabled = false;
    cancelBtn.disabled = false;
    formatSelect.disabled = true;
  } catch (error) {
    console.error('Error starting recording:', error);
    updateStatus('error', `Erro ao iniciar: ${(error as Error).message}`);
    startBtn.disabled = false;
    formatSelect.disabled = false;
  }
}

// Stop recording
async function stopRecording() {
  if (!recorder) {
    return;
  }

  try {
    updateStatus('processing', 'Processando...');
    stopBtn.disabled = true;
    cancelBtn.disabled = true;

    const blob = await recorder.stop();
    currentBlob = blob;

    const duration = (Date.now() - startTime) / 1000;
    durationSpan.textContent = duration.toFixed(2);

    // Reset UI
    startBtn.disabled = false;
    formatSelect.disabled = false;
  } catch (error) {
    console.error('Error stopping recording:', error);
    updateStatus('error', `Erro ao parar: ${(error as Error).message}`);
    startBtn.disabled = false;
    formatSelect.disabled = false;
  }
}

// Cancel recording
function cancelRecording() {
  if (recorder) {
    recorder.cancel();
    recorder = null;
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  // Reset UI
  updateStatus('ready', 'Gravação cancelada');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  cancelBtn.disabled = true;
  formatSelect.disabled = false;
  audioPlayer.style.display = 'none';
}

// Handle recording complete
function handleRecordingComplete(blob: Blob, url: string) {
  currentBlob = blob;
  
  // Update audio player
  audioElement.src = url;
  audioPlayer.style.display = 'block';
  
  // Update status
  updateStatus('complete', 'Gravação concluída!');
  
  // Reset buttons
  startBtn.disabled = false;
  stopBtn.disabled = true;
  cancelBtn.disabled = true;
  formatSelect.disabled = false;
}

// Download recording
function downloadRecording() {
  if (!currentBlob) {
    return;
  }

  const format = formatSelect.value;
  const extension = format === 'mp3' ? 'mp3' : format === 'ogg' ? 'ogg' : 'wav';
  const mimeType = format === 'mp3' ? 'audio/mpeg' : format === 'ogg' ? 'audio/ogg' : 'audio/wav';
  
  const url = URL.createObjectURL(currentBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recording-${Date.now()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Update status UI
function updateStatus(status: 'ready' | 'recording' | 'processing' | 'complete' | 'error', text: string) {
  statusText.textContent = text;
  statusIndicator.className = 'status-indicator';
  
  switch (status) {
    case 'recording':
      statusIndicator.classList.add('recording');
      break;
    case 'processing':
      statusIndicator.classList.add('processing');
      break;
    case 'complete':
      statusIndicator.classList.add('complete');
      break;
  }
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
cancelBtn.addEventListener('click', cancelRecording);
downloadBtn.addEventListener('click', downloadRecording);

// Initialize on load
init();
