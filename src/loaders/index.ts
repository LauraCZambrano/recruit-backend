import { Express } from 'express';
import expressLoader from './express';
import { dbLoader } from './db';
import Logger from '../utils/pino';

const index = async ({ app }: { app: Express }) => {
    await dbLoader();
    Logger.info('-- DB loaded');

    expressLoader({ app });
    Logger.info('-- Express loaded');
};
export default index;
