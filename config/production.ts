import dotenv from 'dotenv';

const envFound = dotenv.config();
if (envFound.error) {
    // This error should crash whole process

    throw new Error('-- .env file not found --');
}

export default {
    port: Number.parseInt(process.env.PORT ?? '8000', 10),
    origin: process.env.ORIGIN,
    dbConfig: {
        db: process.env.DB_TYPE_PROD,
        user: process.env.DB_USERNAME_PROD,
        pass: process.env.DB_PASSWORD_PROD,
        name: process.env.DB_NAME_PROD,
        host: process.env.DB_HOST_PROD,
        port: process.env.DB_PORT_PROD,
    },
    api: {
        prefix: process.env.API_PREFIX,
    },
};
