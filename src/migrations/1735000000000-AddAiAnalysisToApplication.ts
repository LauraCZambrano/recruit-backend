import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAiAnalysisToApplication1735000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'application',
            new TableColumn({
                name: 'aiAnalysis',
                type: 'json',
                isNullable: true,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('application', 'aiAnalysis');
    }
}
