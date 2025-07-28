const { Server } = require('socket.io');
let io;

function init(server) {
  io = new Server(server, { cors: { origin: '*' } });
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });
  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { init, getIo };