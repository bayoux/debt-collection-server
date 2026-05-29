import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Debtor } from '../../debtors/entities/debtor.entity';
import { User } from '../../users/entities/user.entity';

export type DebtCaseStatus = 'new' | 'in_progress' | 'promised' | 'closed' | 'overdue';

@Entity('debt_cases')
export class DebtCase {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => Debtor })
  @ManyToOne(() => Debtor, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debtor_id' })
  debtor: Debtor;

  @ApiPropertyOptional({ type: () => User, nullable: true })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_agent_id' })
  assignedAgent: User;

  @ApiProperty({ example: 15000.0 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ example: '2025-05-31' })
  @Column({ type: 'date' })
  dueDate: string;

  @ApiProperty({ example: 7, description: 'Days Past Due' })
  @Column({ default: 0 })
  dpd: number;

  @ApiProperty({ enum: ['new', 'in_progress', 'promised', 'closed', 'overdue'] })
  @Column({ default: 'new' })
  status: DebtCaseStatus;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
