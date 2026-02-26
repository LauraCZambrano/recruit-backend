import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { OnboardingStatus } from './enums.js';
import { Application } from './application.entity.js';

@Entity()
export class Onboarding {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'jsonb', nullable: false })
    tasks: Record<string, any>;

    @Column({
        type: 'enum',
        enum: OnboardingStatus,
        nullable: false,
    })
    status: OnboardingStatus;

    @OneToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    application: Application;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
