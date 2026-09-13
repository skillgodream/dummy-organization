import express from 'express';
import { setupRoutes } from '../src/api/routes.js';

const app = express();
app.use(express.json());

setupRoutes(app);

export default app;
