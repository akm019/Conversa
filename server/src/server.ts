import http from 'http';
import app from './app';
import { config } from './config';
import { initSocketServer } from './socket';

const server = http.createServer(app);

initSocketServer(server);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
