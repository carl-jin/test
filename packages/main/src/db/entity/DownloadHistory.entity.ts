import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class DownloadHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  filePath: string;

  @Column({ type: 'varchar' })
  accountEmail: string;

  @CreateDateColumn()
  createdAt: Date;
}
