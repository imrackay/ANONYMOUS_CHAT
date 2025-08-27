const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// เก็บข้อมูลผู้ใช้ที่รอคู่แชท
let waitingUsers = [];
let activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เมื่อผู้ใช้ส่งข้อมูลส่วนตัว
  socket.on('join-chat', (userData) => {
    socket.userData = userData;
    
    // หาคู่แชท
    if (waitingUsers.length > 0) {
      // จับคู่กับคนที่รออยู่
      const partner = waitingUsers.shift();
      const roomId = uuidv4();
      
      // สร้างห้องแชท
      socket.join(roomId);
      partner.join(roomId);
      
      activeRooms.set(socket.id, { roomId, partnerId: partner.id });
      activeRooms.set(partner.id, { roomId, partnerId: socket.id });
      
      // แจ้งทั้งคู่ว่าเจอคู่แชทแล้ว
      socket.emit('chat-started', { 
        partnerId: partner.id,
        partnerInfo: `${partner.userData.name}, ${partner.userData.age} ปี, ${partner.userData.gender}`
      });
      partner.emit('chat-started', { 
        partnerId: socket.id,
        partnerInfo: `${userData.name}, ${userData.age} ปี, ${userData.gender}`
      });
      
    } else {
      // รอคู่แชท
      waitingUsers.push(socket);
      socket.emit('waiting-for-partner');
    }
  });

  // ส่งข้อความ
  socket.on('send-message', (message) => {
    const roomInfo = activeRooms.get(socket.id);
    if (roomInfo) {
      socket.to(roomInfo.roomId).emit('receive-message', {
        message: message,
        timestamp: new Date().toLocaleTimeString('th-TH')
      });
    }
  });

  // ออกจากแชท
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // ลบออกจากคิวรอ
    waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    
    // แจ้งคู่แชทว่าออกไปแล้ว
    const roomInfo = activeRooms.get(socket.id);
    if (roomInfo) {
      socket.to(roomInfo.roomId).emit('partner-disconnected');
      activeRooms.delete(socket.id);
      activeRooms.delete(roomInfo.partnerId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});