import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity()
export class Candidate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: false })
    firstName: string;

    @Column({ type: 'varchar', nullable: false })
    lastName: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', nullable: false, unique: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', nullable: true })
    resumeUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    linkedinUrl: string | null;

    @Column({ type: 'simple-array', nullable: false, default: [] })
    skills: string[];

    @Column({ type: 'int', nullable: false })
    experienceYears: number;

    @Column({ type: 'varchar', nullable: false })
    location: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
