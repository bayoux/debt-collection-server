import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationTemplate } from './notification-template.entity';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

@Entity('notification_logs')
export class NotificationLog {
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

  @ApiProperty({ enum: ['queued', 'sent', 'delivered', 'failed'] })
  @Column({ default: 'queued' })
  status: NotificationStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true, type: 'timestamp' })
  sentAt: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Сырой ответ от провайдера' })
  @Column({ nullable: true, type: 'text' })
  responseRaw: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
