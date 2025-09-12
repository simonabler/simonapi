import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('access_links')
export class AccessLink {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) slug!: string;
  @Column() tokenHash!: string;
  @Column({ type: 'timestamptz' }) validFrom!: Date;
  @Column({ type: 'timestamptz' }) validTo!: Date;
  @Column({ type: 'uuid', array: true, default: () => 'ARRAY[]::uuid[]' }) allowedLockIds!: string[];
  @Column({ type: 'uuid', array: true, default: () => 'ARRAY[]::uuid[]' }) allowedGroupIds!: string[];
  @Column({ type: 'int', nullable: true }) maxUses?: number;
  @Column({ type: 'int', default: 0 }) usedCount!: number;
  @Column({ default: false }) requirePin!: boolean;
  @Column({ nullable: true }) pinHash?: string;
  @Column({ default: false }) revoked!: boolean;
  @Column({ nullable: true }) note?: string;
  @Column({ nullable: true }) createdByUserId?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
