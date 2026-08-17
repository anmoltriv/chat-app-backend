import express from 'express';
import roomRouter from './routes/room.routes.js';

const app = express();

app.use(express.json());


app.use('/api/auth',authRouter);

