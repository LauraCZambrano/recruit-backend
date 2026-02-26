import 'reflect-metadata';
import express from 'express';
import config from 'config';
import logger from './utils/pino';
import loaders from './loaders/index';

const port = config.get<number>('port');
const app = express();

// Disable X-Powered-By header
app.disable('x-powered-by');

// Init loaders
try {
    await loaders({ app });

    const server = app.listen(port, () => {
        logger.info(`
      ######################################
      -  Server listening on port: ${port} -
      ######################################
    `);
    });

    // Handle server errors
    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            logger.error(`ERROR: Port ${port} is already in use`);
        } else {
            logger.error('ERROR: Server error occurred');
            logger.error(err);
        }
        process.exit(1);
    });

} catch (err) {
    logger.error('ERROR: Failed to start server components');
    logger.error(err);
    process.exit(1);
}
