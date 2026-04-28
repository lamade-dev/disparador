import './config/env';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import instancesRouter from './modules/instances/instances.router';
import contactsRouter from './modules/contacts/contacts.router';
import campaignsRouter from './modules/campaigns/campaigns.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import webhooksRouter from './modules/webhooks/webhooks.router';
import dispatchConfigRouter from './modules/dispatch-config/dispatch-config.router';
import { startSendWorker } from './services/queue/workers/send.worker';
import { startAnalysisWorker } from './services/queue/workers/analysis.worker';

const app = express();
const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
});

let _io: SocketServer;
export function getIO(): SocketServer {
  return _io;
}

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }
  socket.on('disconnect', () => {});
});

_io = io;

const corsOptions = { origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', allowedHeaders: '*' };
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/instances', instancesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/dispatch-config', dispatchConfigRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler as any);

const PORT = parseInt(env.PORT, 10);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startSendWorker();
  startAnalysisWorker();
  console.log('⚙️  Workers started');
});

export { app, httpServer };
