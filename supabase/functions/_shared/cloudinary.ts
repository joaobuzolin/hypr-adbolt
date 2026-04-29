/**
 * Cloudinary helper — transcoding de vídeos via API REST.
 *
 * Usado pelo `dsp-xandr-asset` (e potencialmente outros DSPs no futuro) pra
 * normalizar vídeos com bitrate alto antes de enviar pra Xandr/DV360. A UI
 * manual da Xandr transcoda no upload; a API `/creative-vast` não. Sem isso,
 * vídeos > ~5 Mbps geram VAST com MediaFile inservivel pro player do publisher.
 *
 * Fluxo de uso:
 *   1. `cloudinaryUpload(blob, opts)` → { publicId, secureUrl }
 *   2. `cloudinaryTransformedUrl(publicId, transform)` → URL do output transcoded
 *   3. fetch dessa URL devolve o arquivo. Cloudinary processa lazy (primeira
 *      request gera, depois cacheia).
 *   4. `cloudinaryDelete(publicId)` opcional pra liberar storage do free tier.
 *
 * Secrets requeridos no Supabase Edge Function env:
 *   - CLOUDINARY_CLOUD_NAME
 *   - CLOUDINARY_API_KEY
 *   - CLOUDINARY_API_SECRET
 */

const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

export function cloudinaryConfigured(): boolean {
  return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

/**
 * Gera SHA-1 dos params + api_secret no formato que Cloudinary aceita.
 * Spec: https://cloudinary.com/documentation/signatures
 */
async function generateSignature(params: Record<string, string>): Promise<string> {
  // Cloudinary requer params ordenados alfabeticamente, separados por &, sem api_key/file/signature
  const filtered = Object.entries(params)
    .filter(([k]) => k !== 'api_key' && k !== 'file' && k !== 'signature' && k !== 'resource_type')
    .filter(([, v]) => v !== '' && v !== undefined && v !== null);
  filtered.sort(([a], [b]) => a.localeCompare(b));
  const toSign = filtered.map(([k, v]) => `${k}=${v}`).join('&') + CLOUDINARY_API_SECRET;
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
}

/**
 * Upload de um Blob/Uint8Array pro Cloudinary como vídeo.
 * Retorna o `public_id` que vai ser usado pra construir a URL de transformação.
 */
export async function cloudinaryUploadVideo(
  blob: Blob,
  fileName: string,
  opts: { folder?: string; publicIdSuffix?: string } = {},
): Promise<CloudinaryUploadResult> {
  if (!cloudinaryConfigured()) {
    throw new Error('Cloudinary não configurado: falta CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET nos secrets do Supabase');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // public_id único pra evitar colisão. Não inclui extensão (Cloudinary detecta).
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const publicId = `${opts.folder || 'adbolt'}/${baseName}_${timestamp}_${opts.publicIdSuffix || Math.random().toString(36).slice(2, 8)}`;

  const params: Record<string, string> = {
    timestamp: String(timestamp),
    public_id: publicId,
    overwrite: 'true',
  };
  const signature = await generateSignature(params);

  const fd = new FormData();
  fd.append('file', blob, fileName);
  fd.append('api_key', CLOUDINARY_API_KEY!);
  fd.append('timestamp', params.timestamp);
  fd.append('public_id', params.public_id);
  fd.append('overwrite', params.overwrite);
  fd.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
  const res = await fetch(url, { method: 'POST', body: fd });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(`Cloudinary upload: resposta inválida (${res.status}): ${text.substring(0, 300)}`); }
  if (!res.ok) {
    const errMsg = (data?.error as { message?: string })?.message || JSON.stringify(data);
    throw new Error(`Cloudinary upload falhou (${res.status}): ${errMsg}`);
  }

  return {
    publicId: data.public_id as string,
    secureUrl: data.secure_url as string,
    resourceType: data.resource_type as string,
    format: data.format as string,
    bytes: data.bytes as number,
    durationSec: data.duration as number | undefined,
    width: data.width as number | undefined,
    height: data.height as number | undefined,
  };
}

export interface VideoTranscodeOptions {
  /** Largura máxima em pixels. Vídeo é redimensionado mantendo aspect ratio se exceder. */
  maxWidth?: number;
  /** Altura máxima em pixels. */
  maxHeight?: number;
  /** Bitrate alvo do vídeo em kbps. */
  videoBitrateKbps?: number;
  /** Bitrate alvo do áudio em kbps. */
  audioBitrateKbps?: number;
}

/**
 * Constrói a URL de transformação Cloudinary pra um vídeo já uploaded.
 *
 * Output: MP4 com H.264 baseline, faststart (moov no início), bitrate-constrained.
 * Esses params batem com a spec recomendada pra hosted video da Xandr (1280×720
 * @ 2500 kbps no topo da escala) e funcionam em qualquer player web/mobile.
 */
export function cloudinaryTranscodedUrl(publicId: string, opts: VideoTranscodeOptions = {}): string {
  const maxW = opts.maxWidth ?? 1280;
  const maxH = opts.maxHeight ?? 720;
  const vBitrate = opts.videoBitrateKbps ?? 2500;
  const aBitrate = opts.audioBitrateKbps ?? 128;

  // Transformações Cloudinary, em ordem:
  //   c_limit + w_X + h_Y → reduz pra caber em maxW×maxH mantendo aspect ratio
  //   vc_h264:baseline:3.1 → codec H.264 Baseline Level 3.1 (compat universal)
  //   br_Xk → video bitrate target em kbps
  //   ac_aac + br_Yk → audio AAC com bitrate especificado
  //   q_auto:good → qualidade Cloudinary auto-tuned, prevenindo ringing
  //   f_mp4 → força output MP4
  //   fl_attachment ou similar pra faststart é via `streaming_profile`,
  //     mas o output MP4 do Cloudinary já vem com moov atom no início.
  const transformations = [
    `c_limit,w_${maxW},h_${maxH}`,
    `vc_h264:baseline:3.1`,
    `br_${vBitrate}k`,
    `ac_aac`,
    `q_auto:good`,
    `f_mp4`,
  ].join('/');

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${transformations}/${publicId}.mp4`;
}

/**
 * Apaga um asset do Cloudinary pra liberar quota. Não-fatal se falhar
 * (creative já foi criado na Xandr, asset Cloudinary fica órfão mas inofensivo).
 */
export async function cloudinaryDelete(publicId: string): Promise<void> {
  if (!cloudinaryConfigured()) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const signature = await generateSignature(params);

  const fd = new FormData();
  fd.append('public_id', publicId);
  fd.append('timestamp', params.timestamp);
  fd.append('api_key', CLOUDINARY_API_KEY!);
  fd.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/destroy`;
  await fetch(url, { method: 'POST', body: fd });
}
