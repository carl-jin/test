import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AccountStatusEnum } from '../types';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar' })
  twoFactorCode: string;

  @Column({ type: 'varchar', default: AccountStatusEnum.WAITING })
  status: AccountStatusEnum;

  @Column({ type: 'varchar', default: '' })
  logs: string;

  @Column({ type: 'int', default: 0 })
  lastLoginTimestamp: number;
}
