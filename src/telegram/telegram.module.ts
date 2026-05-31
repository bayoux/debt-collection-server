import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Debtor } from '../debtors/entities/debtor.entity';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramUpdate } from './telegram.update';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        token: cfg.get<string>('TELEGRAM_BOT_TOKEN', ''),
      }),
    }),
    TypeOrmModule.forFeature([Debtor]),
  ],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
