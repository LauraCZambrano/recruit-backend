import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Candidate } from './candidate.entity.js';

@Entity()
export class TalentPool {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ManyToOne(() => Candidate, { nullable: false })
    @JoinColumn()
    candidate: Candidate;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
