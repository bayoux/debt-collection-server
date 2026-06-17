import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('integration_configs')
export class IntegrationConfig {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: ['whatsapp', 'sms', 'telegram', 'email', 'chat2desk'] })
  @Column()
  channel: string;

  @ApiProperty({ example: 'ch2d' })
  @Column()
  provider: string;

  @Column({ select: false })
  apiKey: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true })
  webhookUrl: string;

  @ApiProperty({ default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
