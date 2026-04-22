import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
          cb(new BadRequestException('Solo se permiten imágenes (jpg, png, webp, gif)') as any, false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
    NotificationsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
