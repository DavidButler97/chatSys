const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
//io is socket
const port = 3000;

// server-side
io.on("connection", (socket) => {
    console.log("new connection");

    //handle incoming messages from client
    io.on('message' , (data) => {
        console.log('message recieved from client');
        io.emit('message' , 'gone through');
    });


    io.on("disconnect", () => {
        console.log("disconnected");
      });
  });
  
  server.listen(port, () => {

    console.log('server running on port 3000');

  });