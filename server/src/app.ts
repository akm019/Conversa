import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import roomsRouter from './routes/rooms';
import messagesRouter from './routes/messages';
import dmRouter from './routes/dm';
import uploadRouter from './routes/upload';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Serve uploaded files statically
const uploadsDir = path.join(config.dbPath, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api/rooms', roomsRouter);
app.use('/api/rooms', messagesRouter);
app.use('/api/dm', dmRouter);
app.use('/api/upload', uploadRouter);

export default app;
