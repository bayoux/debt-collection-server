import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('debtors')
export class Debtor {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @Column()
  fullName: string;

  @ApiProperty({ example: '+996700123456' })
  @Column({ unique: true })
  phone: string;

  @ApiPropertyOptional({ format: 'email', nullable: true })
  @Column({ nullable: true })
  email: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true })
  whatsappNumber: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true })
  telegramId: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
