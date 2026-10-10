/**
 * Utility to optimize and compress user-selected harvest/produce photos
 * Converts high-resolution camera images (often 5-15MB) into high-quality,
 * lightweight web-ready JPEG images (~100-200KB) before uploading to the server.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.78 } = options;

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Empty image payload'));
      }

      // If file is SVG or already very small (< 100KB), return as is
      if (file.type === 'image/svg+xml' || file.size < 100 * 1024) {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to original data URL if image decoding fails
        resolve(dataUrl);
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale proportionally
          if (width > maxWidth || height > maxHeight) {
            if (width / maxWidth > height / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(dataUrl);
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas compression encountered an issue, using original:', err);
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
