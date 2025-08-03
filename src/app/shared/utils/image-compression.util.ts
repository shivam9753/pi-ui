export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

export interface CompressedImage {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class ImageCompressionUtil {
  static async compressImage(
    file: File, 
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImage> {
    const {
      maxWidth = 1200,
      maxHeight = 800,
      quality = 0.8,
      outputFormat = 'jpeg'
    } = options;

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

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: `image/${outputFormat}`,
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
          `image/${outputFormat}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to create thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }
}