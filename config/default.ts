import dotenv from 'dotenv';

dotenv.config();

export default {
    port: Number.parseInt(process.env.PORT ?? '8000', 10),
    origin: process.env.ORIGIN,
    node_env: process.env.NODE_ENV,
    dbConfig: {
        db: process.env.DB_TYPE,
        user: process.env.DB_USERNAME,
        pass: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    },
    api: {
        prefix: process.env.API_PREFIX,
    },
};
