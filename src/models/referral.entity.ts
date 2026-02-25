import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { ReferralStatus } from './enums.js';
import { Candidate } from './candidate.entity.js';
import { JobPosting } from './jobPosting.entity.js';

@Entity()
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  referrerId: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    nullable: false
  })
  status: ReferralStatus;

  @ManyToOne(() => Candidate, { nullable: false })
  @JoinColumn()
  candidate: Candidate;

  @ManyToOne(() => JobPosting, { nullable: false })
  @JoinColumn()
  jobPosting: JobPosting;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
