import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
