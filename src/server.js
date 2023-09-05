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

//will function as a dictionary to store user room memberships, maps socket ids to room names
const userRooms = {}; // ex: { socketId: [roomName1, roomName2, etc] }

const globalChat = 'Global'; //default room name

//event handler for when a client connects to server
io.on("connection", (socket) => {
  console.log("new connection " + socket.id);

  //join the global room when a client connects
  socket.join(globalChat);

  if (!userRooms[socket.id]) 
  {
    userRooms[socket.id] = []; //initialize room list for the user if not already
  }

  userRooms[socket.id].push(globalChat); //add the global room to the users room list
  console.log(`player with socket id: ${socket.id} joined room: ${globalChat}`);


  //event handler for registering a user with their socket id
  socket.on('registerUser', (userId) => {//client needs to emit the 'registerUser' event to the server and send userId
    users[userId] = socket.id; //store the socket ID for the specific user
    console.log(`User ${userId} registered`);
  });

  //event handler for creating a new room/channel
  socket.on('createRoom', (roomName) => {

    //find user id associated with socket id from the users object
    const userId = Object.keys(users).find(key => users[key] === socket.id);

    if (!io.sockets.adapter.rooms.has(roomName)) //if a room with the provided room name doesnt exist already
    {
      socket.join(roomName); //create the new room with the creator in it
      console.log(`Room ${roomName} created by user ${userId}`);
    } 
    else 
    {
      console.log(`Room ${roomName} already exists`);
    }
  });

  //event handler for deleting a room/channel
  socket.on('deleteRoom', (roomName) => {
    // Check if the room exists in the socket.io adapter's rooms collection
    if (io.sockets.adapter.rooms.has(roomName)) 
    {
      //iterate through each socket ID within the room
      io.sockets.adapter.rooms.get(roomName).forEach(socketId => {
        const userSocket = io.sockets.sockets.get(socketId); //get the socket instance associated with the socket ID (accessing sockets Map object of the io.sockets object and calling its get method)
        if (userSocket) //if the socket instance exists 
        {
          userSocket.leave(roomName);//make user leave specified room
          console.log(`User ${userSocket.id} removed from room: ${roomName}`);
        }
      });
      console.log(`Room ${roomName} deleted`);
    } 
    else 
    {
      console.log(`Room ${roomName} does not exist`);
    }
  });




  //event handler for joining a room
  socket.on('joinRoom', (roomName) => {// client needs to emit the 'joinRoom' event to the server and send roomName
    socket.join(roomName); // join specified room
    if (!userRooms[socket.id]) {
      userRooms[socket.id] = []; // initialize room list for the user if not already
    }
    userRooms[socket.id].push(roomName); // add the room to the users room list
    const userId = Object.keys(users).find(key => users[key] === socket.id);
    console.log(`${userId} joined room: ${roomName}`);
  });

  //event handler for removing user from room
  socket.on('removeUserFromRoom', (data) => {
    const { userIdToBeRemovedFromRoom, roomName } = data; //extract userId and roomName from data object sent by client
    const socketIdToBeRemovedFromRoom = users[userIdToBeRemovedFromRoom]; //get the socket ID associated with the user ID
    if (socketIdToBeRemovedFromRoom)
    { 
      const userSocketToBeRemovedFromRoom = io.sockets.sockets.get(socketIdToBeRemovedFromRoom); //get the socket instance associated with the socket ID
      if (userSocketToBeRemovedFromRoom)
      { 
        userSocketToBeRemovedFromRoom.leave(roomName);

        //remove the room from the user's room list
        const userRoomList = userRooms[socketIdToBeRemovedFromRoom]; //get the user's room list from the userRooms object
        if (userRoomList) 
        { 
          const roomIndex = userRoomList.indexOf(roomName); //find the index of the roomName using the indexOf method
          if (roomIndex !== -1) 
          { //(indexOf returns -1 if the value is not found)
            userRoomList.splice(roomIndex, 1); //remove the room from the user's room list, starting at the roomIndex and removing 1 element
            console.log(`Room ${roomName} removed from user ${userIdToBeRemovedFromRoom}'s room list`);
          }
        }

        console.log(`User ${userIdToBeRemovedFromRoom} removed from room: ${roomName}`);
      }
    }
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
      const fromUserId = Object.keys(users).find(key => users[key] === socket.id); //find user id associated with socket id from the users object
      console.log(`Personal message from ${fromUserId} to ${toUserId}: ${message}`); //log transaction on console
      //send the personal message to the recipient user
      io.to(toSocketId).emit('personalMessage', message);
    } 
    else 
    {
      console.log(`User ${toUserId} not online`);  //if the socketId doesnt exist on the server
    }
  }); // how will we handle sending messages to people offline if we have to


  //event handler for handling disconnection
  socket.on("disconnect", (reason) => { //client needs to emit 'disconnect' event to server and send reason

    //find user id associated with socket id from the users object
    const userId = Object.keys(users).find(key => users[key] === socket.id);

    //log that a user (client/socket) has disconnected along with the reason
    console.log(`${userId} disconnected: ${reason}`);

    //get list of room names user was part of from userRooms object
    const userRoomsList = userRooms[socket.id];

    //check if user was part of any rooms
    if (userRoomsList) 
    {
      //iterate through each room user was part of
      userRoomsList.forEach(roomName => {
        //remove user from current room
        socket.leave(roomName);
        console.log(`${userId} successfully removed from room: ${roomName}`);
      });
    }

    //remove users room information from userRooms object
    delete userRooms[socket.id];

    //check if user id was found
    if (userId) 
    {//if a user id was found, delete it from users object
      delete users[userId];
      console.log(`${userId} was successfully removed from users dictionary`);
    }
  });

});
  console.log("SERVER RUNNING");
//start server and listen on given port in brackets
httpServer.listen(3000);