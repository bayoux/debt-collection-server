import { Module } from '@nestjs/common';
import { Chat2DeskService } from './chat2desk.service';
import { Chat2DeskController } from './chat2desk.controller';

@Module({
  controllers: [Chat2DeskController],
  providers: [Chat2DeskService],
  exports: [Chat2DeskService],
})
export class Chat2DeskModule {}
