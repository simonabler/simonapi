import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LockGroupMember } from './lock-group.member.entity';

@Entity('lock_groups')
export class LockGroup {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ nullable: true }) description?: string;
  @OneToMany(() => LockGroupMember, m => m.group, { cascade: true })
  members!: LockGroupMember[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
