/**
 * Compress and convert an image File to a base64 data URL.
 * Resizes large images and compresses as JPEG to stay within localStorage limits.
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.7; // JPEG quality (0-1)

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Calculate scaled dimensions
        let { width, height } = img;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Draw to canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback: return original without compression
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Use JPEG for photos (smaller), PNG for transparency
        const isPng = file.type === 'image/png';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(mimeType, isPng ? undefined : QUALITY);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
