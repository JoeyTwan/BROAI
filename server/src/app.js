import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import usageRoutes from './routes/usage.js';

const app = express();

app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean),
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ai', chatRoutes);
app.use('/api/usage', usageRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '服务器异常' });
});

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});


