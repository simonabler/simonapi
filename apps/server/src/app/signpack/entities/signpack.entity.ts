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

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  destroyedAt?: Date | null;

  @Column({ type: 'text' })
  status!: SignpackStatus;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

