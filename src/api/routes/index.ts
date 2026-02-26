import { Router } from 'express';
import applicationRoutes from './application.routes';

const index = () => {
    const app = Router();

    // Application submission routes
    app.use('/applications', applicationRoutes());

    return app;
};
export default index;
