const express = require("express"); //import the express framework
const { createServer } = require("http"); //import the http module
const { Server } = require("socket.io"); //import the socket IO library


const app = express(); //create an instance of the express application
const httpServer = createServer(app); //create a http server using the express application
//create a socket IO server and attach to http server with a cors policy
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});


//create an object which will function as a dictionary to store user information, maps user ids to socket ids
const users = {}; // ex: { userId: socketId }

//create an object which will function as a dictionary to store user room memberships, maps socket ids to room names
const userRooms = {}; // ex: { socketId: [roomName1, roomName2, etc] }

//event handler for when a client connects to server
io.on("connection", (socket) => {
  console.log("new connection " + socket.id);

    //event handler for registering a user with their socket id
    socket.on('registerUser', (userId) => {// client needs to emit the 'registerUser' event to the server and send userId
      users[userId] = socket.id; // Store the socket ID for the specific user
      console.log(`User ${userId} registered`);
    });


  //event handler for joining a room
  socket.on('joinRoom', (roomName) => {// client needs to emit the 'joinRoom' event to the server and send roomName
    socket.join(roomName); // join specified room
    if (!userRooms[socket.id]) {
      userRooms[socket.id] = []; // initialize room list for the user if not already
    }
    userRooms[socket.id].push(roomName); // add the room to the users room list
    console.log(`${socket.id} joined room: ${roomName}`);
  });


  //event handler for sending a message within a room
  socket.on('roomMessage', (data) => { // client needs to emit the 'roomMessage' event to the server and send data object that contains roomName and message
    const { roomName, message } = data;
    console.log(`Message received in room ${roomName}: ${message}`);
    // broadcast the message to all clients/sockets in the room
    io.to(roomName).emit('roomMessage', message);
  });


  //event handler for sending a personal message to another user
  socket.on('personalMessage', (data) => {  // client needs to emit the 'personalMessage' event to the server and send data object containing toUserId and message
    const { toUserId, message } = data; //client-side is sending an object with these two properties(toUserid and message) via friends list
    const toSocketId = users[toUserId]; // users[] and toUserId then used to get socket id of recipient

    if (toSocketId) //if the socket Id exists on server
    {
      console.log(`Personal message from ${socket.id} to ${toUserId}: ${message}`); //log transaction on console
      //send the personal message to the recipient user
      io.to(toSocketId).emit('personalMessage', message);
    } 
    else 
    {
      console.log(`User ${toUserId} not found`);  //if the socketId doesnt exist on the server
    }
  });


  //event handler for handling disconnection
  socket.on("disconnect", (reason) => { //client needs to emit 'disconnect' event to server and send reason
    //log that a user (client/socket) has disconnected along with the reason
    console.log(`${socket.id} disconnected: ${reason}`);

    //get list of room names user was part of from userRooms object
    const userRoomsList = userRooms[socket.id];

    //check if user was part of any rooms
    if (userRoomsList) 
    {
      //iterate through each room user was part of
      userRoomsList.forEach(roomName => {
        //remove user from current room
        socket.leave(roomName);
      });
    }

    //remove users room information from userRooms object
    delete userRooms[socket.id];

    //find user id associated with socket id from the users object
    const userId = Object.keys(users).find(key => users[key] === socket.id);

    //check if user id was found
    if (userId) {
      //if a user id was found, delete it from users object
      delete users[userId];
    }
  });

});
  console.log("SERVER RUNNING");
//start server and listen on given port in brackets
httpServer.listen(3000);