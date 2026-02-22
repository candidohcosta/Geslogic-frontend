// frontend/src/utils/electron-file.ts
export function guessMimeFromExt(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
    log: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

export async function fileFromElectronPath(absPath: string): Promise<File | null> {
  if (!('electron' in window) || !window.electron?.readSupportFile) return null;

  const parts = absPath.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1];
  const mime = guessMimeFromExt(name);

  const ab = await window.electron.readSupportFile(absPath);
  if (!ab) return null;

  const uint8 = ab instanceof ArrayBuffer ? new Uint8Array(ab) : new Uint8Array(0);
  const blob = new Blob([uint8], { type: mime });
  return new File([blob], name, { type: mime, lastModified: Date.now() });
}

