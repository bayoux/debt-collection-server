import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { IntegrationConfig } from '../integrations/entities/integration-config.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate, NotificationLog, IntegrationConfig]),
    EmailModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
