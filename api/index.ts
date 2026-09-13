import express from 'express';
import cors from 'cors';
import { setupRoutes } from '../src/api/routes.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

setupRoutes(app);

export default app;
