import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

const ALLOWED_MIME = /^(image\/(jpeg|jpg|png|webp)|application\/pdf)$/;
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const DANGEROUS_DOUBLE_EXT = /\.(exe|php|js|sh|bat|cmd|ps1|py|rb|pl|asp|aspx|jsp|cgi)\./i;

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.test(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten imágenes (jpg, png, webp) y archivos PDF'),
            false,
          );
        }
        if (DANGEROUS_DOUBLE_EXT.test(file.originalname)) {
          return cb(new BadRequestException('Nombre de archivo contiene una extensión peligrosa'), false);
        }
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
        if (!ALLOWED_EXT.has(ext)) {
          return cb(new BadRequestException(`Extensión .${ext} no permitida`), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    }),
    NotificationsModule,
    CloudinaryModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
