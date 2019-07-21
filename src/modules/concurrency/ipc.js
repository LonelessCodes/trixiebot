const info = require("../../info");
const log = require("../../log").namespace("ipc");
const uuid = require("uuid");
const ipc = require("node-ipc");

ipc.config.silent = true;
ipc.config.id = info.DEV ? "trixiedev" : "trixiebot";
ipc.config.retry = 1000;
ipc.config.logger = log.bind(log);

ipc.serve();

const server = ipc.server;

server.connected = false;
server.started = false;

server.promiseStart = new Promise(resolve => {

    server.on("start", () => {
        server.started = true;

        server.on("connect", socket => {
            server.connected = true;
            ipc.log(`## connected to ${socket.id} ##`, ipc.config.delay);
        });

        server.on("socket.disconnect", (socket, socketId) => {
            if (server.sockets.length !== 0) return;

            server.connected = false;
            ipc.log(`## disconnected from ${socketId} ##`);
        });
        
        resolve();
    });
    
});

server.start();

function getSocket() {
    if (server.sockets.length === 0) return null;
    return server.sockets[server.sockets.length - 1]; // getting the newest connected socket
}

const oldEmit = server.emit.bind(server);
function emit(message_bus, ...data) {
    oldEmit(getSocket(), message_bus, ...data);
}
server.emit = emit.bind(server);

server.answer = function answer(message_bus, callback) {
    server.on(message_bus, async (message, socket) => {
        const { id, data } = message;

        const response = await callback(data);
        oldEmit(socket, message_bus, {
            id,
            data: response
        });
    });
};

server.awaitAnswer = function awaitAnswer(message_bus, data) {
    return new Promise((resolve, reject) => {
        const socket = getSocket();
        if (!socket) reject();

        const id = uuid.v1();

        const handler = (message, sock) => {
            if (message.id !== id) return;
            if (sock.id !== socket.id) return;

            server.off(message_bus, handler);
            resolve(message.data);
        };
        server.on(message_bus, handler);

        oldEmit(socket, message_bus, {
            id,
            data
        });
    });
};

module.exports = server;
