/* eslint-disable import/no-extraneous-dependencies */
import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';

dotenv.config();

const SOCKET_PORT = 8080;
const app = express();
const server = createServer(
    {
        key: readFileSync(process.env.KEY),
        cert: readFileSync(process.env.CERT),
    },
    app,
);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true,
    },
});
app.use(cors());

io.on('connection', (socket) => {
    socket.on('update', ({ update }) => {
        if (update) io.emit('update');
    });
});

server.listen(SOCKET_PORT || 8080, () => console.log(`Socket listen on ${SOCKET_PORT || 8080}`));
