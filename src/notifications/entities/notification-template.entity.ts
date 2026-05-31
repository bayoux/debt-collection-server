import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type NotificationChannel = 'whatsapp' | 'sms' | 'telegram' | 'email';

@Entity('notification_templates')
export class NotificationTemplate {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Напоминание DPD 1-7 дней' })
  @Column()
  name: string;

  @ApiProperty({ enum: ['whatsapp', 'sms', 'telegram', 'email'] })
  @Column()
  channel: NotificationChannel;

  @ApiPropertyOptional({ example: 'Уведомление о задолженности', description: 'Тема письма (только для email)' })
  @Column({ nullable: true })
  subject: string;

  @ApiProperty({ example: 'Уважаемый {{full_name}}, у вас задолженность {{amount}} сом.' })
  @Column({ type: 'text' })
  body: string;

  @ApiPropertyOptional({ example: 'ru' })
  @Column({ default: 'ru' })
  language: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
