import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  uploadFile(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'elemental-pro', resource_type: 'auto' },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            if (error.http_code === 400) {
              return reject(new BadRequestException(`Archivo no válido: ${error.message}`));
            }
            return reject(new InternalServerErrorException('Error al subir el archivo. Intenta nuevamente.'));
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }
}
