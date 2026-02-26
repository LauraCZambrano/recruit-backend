import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { InterviewType } from './enums.js';
import { Application } from './application.entity.js';

@Entity()
export class Interview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: InterviewType,
        nullable: false,
    })
    type: InterviewType;

    @Column({ type: 'timestamp', nullable: false })
    scheduledAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'int', nullable: true })
    score: number | null;

    @ManyToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    application: Application;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
