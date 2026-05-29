import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export type PtpStatus = 'pending' | 'kept' | 'broken';

@Entity('ptp_records')
export class PtpRecord {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'debt_case_id' })
  debtCaseId: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @ApiProperty({ example: '2025-06-15' })
  @Column({ type: 'date' })
  promiseDate: string;

  @ApiProperty({ example: 15000.0 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  promisedAmount: number;

  @ApiProperty({ enum: ['pending', 'kept', 'broken'] })
  @Column({ default: 'pending' })
  status: PtpStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  note: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
