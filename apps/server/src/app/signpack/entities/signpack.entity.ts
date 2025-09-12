import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SignpackStatus = 'UPLOADED' | 'SIGNED' | 'EXPIRED' | 'DELETED';

@Entity()
export class Signpack {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  accessToken!: string;

  @Column()
  originalName!: string;

  @Column()
  originalPath!: string; // absolute path

  @Column({ nullable: true })
  originalMime?: string;

  @Column({ type: 'integer', nullable: true })
  originalSize?: number;

  @Column({ nullable: true })
  signedName?: string;

  @Column({ nullable: true })
  signedPath?: string; // absolute path

  @Column({ nullable: true })
  signedMime?: string;

  @Column({ type: 'integer', nullable: true })
  signedSize?: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  destroyedAt?: Date | null;

  @Column({ type: 'text' })
  status!: SignpackStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

