import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentActivityLog } from './entities/agent-activity-log.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { DebtCase } from '../debt-cases/entities/debt-case.entity';
import { PtpRecord } from '../ptp/entities/ptp-record.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentActivityLog, NotificationLog, DebtCase, PtpRecord]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
