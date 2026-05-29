import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationTemplate } from '../../notifications/entities/notification-template.entity';

export type TaskStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

@Entity('scheduled_tasks')
export class ScheduledTask {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'debt_case_id' })
  debtCaseId: string;

  @ApiProperty({ type: () => NotificationTemplate })
  @ManyToOne(() => NotificationTemplate, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @ApiProperty({ enum: ['whatsapp', 'sms', 'telegram', 'email'] })
  @Column()
  channel: string;

  @ApiProperty()
  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @ApiProperty({ enum: ['pending', 'sent', 'cancelled', 'failed'] })
  @Column({ default: 'pending' })
  taskStatus: TaskStatus;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
