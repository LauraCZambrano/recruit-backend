import { Express } from 'express';
import expressLoader from './express';
import Logger from '../utils/pino';

const index = async ({ app } : { app: Express }) => {
  expressLoader({ app });
  Logger.info('-- Express loaded');
};
export default index;
