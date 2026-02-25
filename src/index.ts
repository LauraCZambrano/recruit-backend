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

  app.listen(port, () => {
    logger.info(`
      ######################################
      -  Server listening on port: ${port} -
      ######################################
    `);
  }).on('error', err => {
    logger.error("ERROR: Error when try to init the server");
    process.exit(1);
  });
} catch (err) {
  logger.error("ERROR: Failed to start server components");
  logger.error(err);
  process.exit(1);
}