import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('access_events')
export class AccessEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() accessLinkId!: string;
  @Column() lockId!: string;
  @Column({ type: 'varchar' }) action!: 'OPEN' | 'STATUS';
  @Column({ type: 'varchar' }) providerType!: string;
  @Column({ type: 'varchar' }) result!: 'SUCCESS' | 'FAILED';
  @Column({ type: 'text', nullable: true }) message?: string;
  @Column({ type: 'varchar', nullable: true }) ip?: string;
  @Column({ type: 'text', nullable: true }) userAgent?: string;
  @Column({ type: 'varchar', nullable: true }) traceId?: string;
  @CreateDateColumn() createdAt!: Date;
}
