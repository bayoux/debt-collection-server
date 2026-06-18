import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtCase } from './entities/debt-case.entity';
import { DpdSnapshot } from './entities/dpd-snapshot.entity';
import { Debtor } from '../debtors/entities/debtor.entity';
import { DebtCasesService } from './debt-cases.service';
import { DebtCasesController } from './debt-cases.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DebtCase, DpdSnapshot, Debtor])],
  controllers: [DebtCasesController],
  providers: [DebtCasesService],
  exports: [DebtCasesService],
})
export class DebtCasesModule {}
