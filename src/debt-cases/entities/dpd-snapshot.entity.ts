import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DebtCase } from './debt-case.entity';

@Entity('dpd_snapshots')
export class DpdSnapshot {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'debt_case_id' })
  debtCaseId: string;

  @ManyToOne(() => DebtCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debt_case_id' })
  debtCase: DebtCase;

  @ApiProperty({ example: 7 })
  @Column()
  dpdValue: number;

  @ApiProperty({ example: '2025-05-31' })
  @Column({ type: 'date' })
  snapshotDate: string;
}
