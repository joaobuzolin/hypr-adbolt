/**
 * Video transcoding via ffmpeg.wasm (single-thread).
 *
 * Lazy-loads the WASM core (~25MB) only when actually called — most uploads
 * don't need it (display, HTML5, well-formed videos). The core is cached at
 * module level so repeated transcodes in the same session don't re-fetch.
 *
 * Why single-thread (não multi-thread como eu tinha colocado primeiro):
 * o core-mt tem bug conhecido (https://github.com/ffmpegwasm/ffmpeg.wasm/issues/772)
 * onde ffmpeg.exec trava em 0% no Chromium quando o filter inclui `scale=...`.
 * Como o caso de uso aqui é justamente reduzir 1080p → 720p via scale, o multi-thread
 * fica 100% inservível pros usuários da operação que rodam Chrome/Edge.
 * Single-thread roda mais devagar (~3x) mas é estável. Compensamos parcialmente
 * com preset `ultrafast`.
 *
 * Why client-side: avoids round-trips to Supabase storage for files that will
 * be discarded anyway, and gives the user immediate feedback. Para vídeos
 * de até 30s em laptops modernos, transcode termina em 15-40s.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VIDEO_TRANSCODE_TARGET } from '@/types';

// CDN base for ffmpeg-core single-thread build. Pinning version a major.minor
// pra evitar surprise upgrades (já caí nessa: o core-mt v0.12.10 trava em 0%).
const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

// Cached singleton — loading the WASM is expensive (~25MB download + compile),
// no reason to do it twice.
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Loads ffmpeg.wasm core. Idempotent — concurrent calls share the same load.
 */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLog) {
      ffmpeg.on('log', ({ message }) => onLog(message));
    }
    // Single-thread não precisa de workerURL nem SharedArrayBuffer.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export interface TranscodeProgress {
  phase: 'loading-core' | 'reading' | 'transcoding' | 'finalizing';
  /** 0..1 — só `transcoding` tem progresso real, demais fases são marcos */
  progress: number;
  message: string;
}

export interface TranscodeResult {
  file: File;
  durationMs: number;
  inputSize: number;
  outputSize: number;
}

/**
 * Transcoda um vídeo pro target padrão da AdBolt (1280x720 max, H.264 baseline,
 * 2.5 Mbps, AAC 128 kbps, faststart). Mantém o aspect ratio original — só
 * reduz se exceder 1280x720, nunca aumenta.
 */
export async function transcodeVideo(
  input: File,
  onProgress?: (p: TranscodeProgress) => void,
): Promise<TranscodeResult> {
  const t0 = performance.now();

  onProgress?.({ phase: 'loading-core', progress: 0, message: 'Carregando ffmpeg…' });
  const ffmpeg = await getFFmpeg();

  const progressHandler = ({ progress }: { progress: number }) => {
    const clamped = Math.max(0, Math.min(1, progress));
    onProgress?.({ phase: 'transcoding', progress: clamped, message: `Transcodando ${Math.round(clamped * 100)}%` });
  };
  ffmpeg.on('progress', progressHandler);

  try {
    const inputName = 'in.' + (input.name.split('.').pop() || 'mp4').toLowerCase();
    const outputName = 'out.mp4';

    onProgress?.({ phase: 'reading', progress: 0, message: 'Preparando arquivo…' });
    await ffmpeg.writeFile(inputName, await fetchFile(input));

    const { maxWidth, maxHeight, videoBitrateKbps, audioBitrateKbps, profile, level } = VIDEO_TRANSCODE_TARGET;

    const scaleFilter = `scale='min(${maxWidth},iw)':'-2':force_original_aspect_ratio=decrease,scale='-2':'min(${maxHeight},ih)'`;

    const args = [
      '-i', inputName,
      '-c:v', 'libx264',
      '-profile:v', profile,
      '-level', level,
      // ultrafast pra compensar o single-thread — perde ~10% de eficiência
      // de compressão vs `fast`/`medium`, mas roda 2-3x mais rápido. Necessário
      // pra UX aceitável em vídeo 1080p de 30s sem multi-thread.
      '-preset', 'ultrafast',
      '-b:v', `${videoBitrateKbps}k`,
      '-maxrate', `${videoBitrateKbps}k`,
      '-bufsize', `${videoBitrateKbps * 2}k`,
      '-vf', scaleFilter,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', `${audioBitrateKbps}k`,
      '-ar', '48000',
      '-ac', '2',
      '-movflags', '+faststart',
      '-y',
      outputName,
    ];

    onProgress?.({ phase: 'transcoding', progress: 0, message: 'Transcodando 0%' });
    await ffmpeg.exec(args);

    onProgress?.({ phase: 'finalizing', progress: 1, message: 'Finalizando…' });
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    const outputName2 = input.name.replace(/\.[^.]+$/, '') + '_optimized.mp4';
    const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' });
    const file = new File([blob], outputName2, { type: 'video/mp4', lastModified: Date.now() });

    return {
      file,
      durationMs: Math.round(performance.now() - t0),
      inputSize: input.size,
      outputSize: file.size,
    };
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}

/**
 * Pré-carrega o core sem transcodar nada. Útil pra "warm up" enquanto o usuário
 * ainda está olhando a UI antes de clicar Otimizar.
 */
export function preloadFFmpeg(): void {
  void getFFmpeg();
}
