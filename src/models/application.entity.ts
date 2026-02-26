import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { ApplicationStatus } from './enums.js';
import { Candidate } from './candidate.entity.js';
import { JobPosting } from './jobPosting.entity.js';

@Entity()
export class Application {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({
        type: 'enum',
        enum: ApplicationStatus,
        nullable: false,
    })
    status: ApplicationStatus;

    @Column({ type: 'float', nullable: true })
    aiScore: number | null;

    @Column({ type: 'text', nullable: true })
    aiSummary: string | null;

    @ManyToOne(() => Candidate, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    candidate: Candidate;

    @ManyToOne(() => JobPosting, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    jobPosting: JobPosting;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
