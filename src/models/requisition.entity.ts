import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { RequisitionStatus } from './enums.js';
import { JobPosting } from './jobPosting.entity.js';

@Entity()
export class Requisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  requestedBy: string;

  @Column({ type: 'text', nullable: false })
  justification: string;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    nullable: false
  })
  status: RequisitionStatus;

  @ManyToOne(() => JobPosting, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  jobPosting: JobPosting;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
