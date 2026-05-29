import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from './permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'agent' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ example: 'Front-line collection agent' })
  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;
}
