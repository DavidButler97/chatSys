const express = require("express"); //import the express framework
const { createServer } = require("http"); //import the http module
const { Server } = require("socket.io"); //import the socket IO library


const app = express(); //create an instance of the express application
const httpServer = createServer(app); //create a http server using the express application
//create a socket IO server and attach to http server
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

// event handler for when a client connects to server
io.on("connection", (socket) => {
    console.log("new connection " + socket.id);


    //event handler for incoming message eventName


    socket.on('message' , (data) => {
        console.log('message recieved from client: ' + data);


        //one to one OR message to a specific socket (specific client)
        io.to(socket.id).emit('message' , 'response sending out');
    });


    //event handler for when a client disconnects from the socket IO server, includes reason why
    socket.on("disconnect", (reason) => {
        console.log("disconnected " + reason);
      });
  });


  console.log("SERVER RUNNING");
//start server and listen on given port in brackets
httpServer.listen(3000);