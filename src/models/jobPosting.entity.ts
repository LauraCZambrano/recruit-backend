import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { JobPostingStatus } from './enums';

@Entity()
export class JobPosting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: false })
    title: string;

    @Column({ type: 'varchar', nullable: false })
    department: string;

    @Column({ type: 'text', nullable: false })
    description: string;

    @Column({ type: 'varchar', nullable: true })
    salaryRange: string | null;

    @Column({ type: 'varchar', nullable: false })
    location: string;

    @Index()
    @Column({
        type: 'enum',
        enum: JobPostingStatus,
        nullable: false,
    })
    status: JobPostingStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
