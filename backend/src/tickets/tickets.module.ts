import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

const ALLOWED_MIME = /^(image\/(jpeg|jpg|png|webp)|application\/pdf)$/;

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
