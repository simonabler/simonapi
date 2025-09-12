import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LockProviderType } from '../core/lock.types';

@Entity('locks')
export class LockEntityDB {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ type: 'enum', enum: LockProviderType }) providerType!: LockProviderType;
  @Column({ type: 'jsonb', default: {} }) providerConfig!: Record<string, any>;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
