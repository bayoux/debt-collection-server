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

@Entity('agent_activity_logs')
export class AgentActivityLog {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'debt_case_id', nullable: true })
  debtCaseId: string;

  @ApiProperty({ example: 'manual_notification_sent' })
  @Column()
  actionType: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  note: string;
}
