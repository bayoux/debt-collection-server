import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { IntegrationConfig } from '../integrations/entities/integration-config.entity';
import { DebtCase } from '../debt-cases/entities/debt-case.entity';
import { PtpRecord } from '../ptp/entities/ptp-record.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';
import { Chat2DeskModule } from '../chat2desk/chat2desk.module';
import { NikitaModule } from '../nikita/nikita.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate, NotificationLog, IntegrationConfig, DebtCase, PtpRecord]),
    EmailModule,
    TelegramModule,
    Chat2DeskModule,
    NikitaModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
