import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { LockGroup } from './lock-group.entity';
import { LockEntityDB } from './lock.entity';

@Entity('lock_group_members')
@Unique(['groupId', 'lockId'])
export class LockGroupMember {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() groupId!: string;
  @Column() lockId!: string;

  @ManyToOne(() => LockGroup, g => g.members, { onDelete: 'CASCADE' })
  group!: LockGroup;

  @ManyToOne(() => LockEntityDB, { onDelete: 'CASCADE' })
  lock!: LockEntityDB;
}
