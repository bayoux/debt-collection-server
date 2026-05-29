import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PtpRecord } from './entities/ptp-record.entity';
import { PtpService } from './ptp.service';
import { PtpController } from './ptp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PtpRecord])],
  controllers: [PtpController],
  providers: [PtpService],
  exports: [PtpService],
})
export class PtpModule {}
