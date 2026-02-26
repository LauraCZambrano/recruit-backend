import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity()
export class Evaluation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: false })
    category: string;

    @Column({ type: 'int', nullable: false })
    score: number;

    @Column({ type: 'text', nullable: true })
    feedback: string | null;

    @ManyToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    application: Application;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
