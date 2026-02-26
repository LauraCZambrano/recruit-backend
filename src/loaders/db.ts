import { DataSource, DataSourceOptions } from 'typeorm';
import config from 'config';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Logger from '../utils/pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file retrieves the database configuration from the config package
// and sets up a TypeORM DataSource for PostgreSQL

const dbConfig = config.get<{
    db: string;
    host: string;
    port: string | number;
    user: string;
    pass: string;
    name: string;
}>('dbConfig');

const isDevelopment = config.get<string>('node_env') === 'development';

const sslConfig = isDevelopment
    ? {
          ssl: {
              rejectUnauthorized: false,
          },
      }
    : {};

const options: DataSourceOptions = {
    type: (dbConfig.db || 'postgres') as 'postgres',
    host: dbConfig.host,
    port: Number(dbConfig.port),
    username: dbConfig.user,
    password: dbConfig.pass,
    database: dbConfig.name,
    entities: [path.join(__dirname, '..', 'models', '**', '*.entity{.ts,.js}')],
    synchronize: true, // synchronizes the database with the entities if there are changes
    logging: false, // displays queries in the console
    ...sslConfig,
};

export const AppDataSource = new DataSource(options);

export const dbLoader = async () => {
    try {
        await AppDataSource.initialize();
        Logger.info('-- Data Source has been initialized!');
    } catch (err: any) {
        Logger.error('-- Error during Data Source initialization: %o', err);
        throw err;
    }
};
