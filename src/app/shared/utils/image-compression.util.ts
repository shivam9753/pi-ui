export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp' | 'avif';
  fallbackFormat?: 'jpeg' | 'webp';
}

export interface CompressedImage {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class ImageCompressionUtil {
  // Check AVIF support
  static isAVIFSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  static async compressImage(
    file: File, 
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImage> {
    const {
      maxWidth = 1200,
      maxHeight = 800,
      quality = 0.8,
      outputFormat = 'avif',
      fallbackFormat = 'webp'
    } = options;

    // Check if AVIF is requested and supported
    const useAVIF = outputFormat === 'avif' && this.isAVIFSupported();
    const finalFormat = useAVIF ? 'avif' : (outputFormat === 'avif' ? fallbackFormat : outputFormat);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx!.drawImage(img, 0, 0, width, height);

        // For AVIF, use higher quality since it's more efficient
        const finalQuality = finalFormat === 'avif' ? Math.min(quality + 0.1, 1) : quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Generate appropriate filename
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const filename = `${originalName}.${finalFormat}`;

            const compressedFile = new File([blob], filename, {
              type: `image/${finalFormat}`,
              lastModified: Date.now()
            });

            const compressionRatio = ((file.size - blob.size) / file.size) * 100;

            // Create data URL for preview
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                file: compressedFile,
                dataUrl: e.target!.result as string,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: Math.round(compressionRatio)
              });
            };
            reader.readAsDataURL(compressedFile);
          },
          `image/${finalFormat}`,
          finalQuality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Compress to AVIF with optimal settings
  static async compressToAVIF(
    file: File,
    options: Omit<ImageCompressionOptions, 'outputFormat'> = {}
  ): Promise<CompressedImage> {
    return this.compressImage(file, {
      ...options,
      outputFormat: 'avif',
      quality: options.quality || 0.85, // Higher quality for AVIF
      fallbackFormat: 'webp'
    });
  }

  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    return validTypes.includes(file.type);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async createThumbnail(file: File, size: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        // Calculate crop dimensions for square thumbnail
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;

        ctx!.drawImage(img, x, y, minDimension, minDimension, 0, 0, size, size);
        
        // Try AVIF first, fallback to WebP, then JPEG
        if (this.isAVIFSupported()) {
          resolve(canvas.toDataURL('image/avif', 0.85));
        } else {
          resolve(canvas.toDataURL('image/webp', 0.8) || canvas.toDataURL('image/jpeg', 0.8));
        }
      };

      img.onerror = () => reject(new Error('Failed to create thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Get format info for display
  static getFormatInfo(format: string): { name: string; description: string; quality: string } {
    switch (format) {
      case 'avif':
        return {
          name: 'AVIF',
          description: 'Next-gen format with superior compression',
          quality: 'Excellent'
        };
      case 'webp':
        return {
          name: 'WebP',
          description: 'Modern format with good compression',
          quality: 'Very Good'
        };
      case 'jpeg':
        return {
          name: 'JPEG',
          description: 'Standard format with wide compatibility',
          quality: 'Good'
        };
      case 'png':
        return {
          name: 'PNG',
          description: 'Lossless format for graphics',
          quality: 'Lossless'
        };
      default:
        return {
          name: format.toUpperCase(),
          description: 'Unknown format',
          quality: 'Unknown'
        };
    }
  }
}

// Helper function for easy AVIF compression
// New function for WebP compression with 250KB target
export async function compressImageToWebP(
  file: File,
  targetSizeKB: number = 250,
  options: Omit<ImageCompressionOptions, 'outputFormat'> = {}
): Promise<CompressedImage> {
  const targetBytes = targetSizeKB * 1024;
  let quality = options.quality || 0.8;
  let result: CompressedImage;

  // Initial compression
  result = await ImageCompressionUtil.compressImage(file, {
    ...options,
    outputFormat: 'webp',
    quality: quality
  });

  // If still too large, reduce quality iteratively
  let attempts = 0;
  const maxAttempts = 5;
  
  while (result.compressedSize > targetBytes && attempts < maxAttempts && quality > 0.3) {
    quality -= 0.1;
    attempts++;
    
    result = await ImageCompressionUtil.compressImage(file, {
      ...options,
      outputFormat: 'webp',
      quality: quality
    });
  }

  return result;
}

// Helper function for easy AVIF compression (legacy support)
export async function compressImageToAVIF(
  file: File,
  options: Omit<ImageCompressionOptions, 'outputFormat'> = {}
): Promise<CompressedImage> {
  return ImageCompressionUtil.compressToAVIF(file, options);
}

// New helper function for space-efficient WebP compression
export async function compressImageForUpload(
  file: File,
  options: {
    targetSizeKB?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<CompressedImage> {
  const {
    targetSizeKB = 250,
    maxWidth = 1200,
    maxHeight = 1200
  } = options;

  return compressImageToWebP(file, targetSizeKB, {
    maxWidth,
    maxHeight
  });
}