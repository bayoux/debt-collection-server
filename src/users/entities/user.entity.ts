import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'agent_ivanov' })
  @Column({ unique: true })
  username: string;

  @ApiProperty({ example: 'ivanov@bank.kg', format: 'email' })
  @Column({ unique: true })
  email: string;

  @ApiHideProperty()
  @Exclude()
  @Column()
  passwordHash: string;

  @ApiProperty({ type: () => [Role] })
  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  // ── helpers ─────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }

  async validatePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }

  /** Convenience: collect all permission codenames from all roles */
  get permissions(): string[] {
    if (!this.roles) return [];
    return [
      ...new Set(this.roles.flatMap((r) => r.permissions?.map((p) => p.codename) ?? [])),
    ];
  }
}
