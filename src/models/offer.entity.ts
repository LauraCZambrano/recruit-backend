import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity()
export class Offer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    salary: number;

    @Column({ type: 'text', nullable: true })
    benefits: string | null;

    @Column({ type: 'date', nullable: false })
    startDate: Date;

    @OneToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    application: Application;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
