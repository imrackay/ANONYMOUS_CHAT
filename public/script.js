const socket = io();

// Elements
const loginScreen = document.getElementById('login-screen');
const waitingScreen = document.getElementById('waiting-screen');
const chatScreen = document.getElementById('chat-screen');
const joinBtn = document.getElementById('join-btn');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const genderSelect = document.getElementById('gender');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const partnerInfo = document.getElementById('partner-info');

// State
let currentScreen = 'login';
let isConnected = false;

// Functions
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    switch(screenName) {
        case 'login':
            loginScreen.classList.add('active');
            break;
        case 'waiting':
            waitingScreen.classList.add('active');
            break;
        case 'chat':
            chatScreen.classList.add('active');
            messageInput.focus();
            break;
    }
    currentScreen = screenName;
}

function validateForm() {
    const name = nameInput.value.trim();
    const age = parseInt(ageInput.value);
    const gender = genderSelect.value;
    
    if (!name || name.length < 2) {
        alert('กรุณาใส่ชื่อเล่น (อย่างน้อย 2 ตัวอักษร)');
        return false;
    }
    
    if (!age || age < 13 || age > 99) {
        alert('กรุณาใส่อายุที่ถูกต้อง (13-99 ปี)');
        return false;
    }
    
    if (!gender) {
        alert('กรุณาเลือกเพศ');
        return false;
    }
    
    return true;
}

function addMessage(message, type = 'received', timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const messageText = document.createElement('div');
    messageText.textContent = message;
    messageDiv.appendChild(messageText);
    
    if (timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = timestamp;
        messageDiv.appendChild(timeDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    // แสดงข้อความของตัวเอง
    addMessage(message, 'sent', new Date().toLocaleTimeString('th-TH'));
    
    // ส่งข้อความไปยัง server
    socket.emit('send-message', message);
    
    // ล้าง input
    messageInput.value = '';
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    if (!validateForm()) return;
    
    const userData = {
        name: nameInput.value.trim(),
        age: parseInt(ageInput.value),
        gender: genderSelect.value
    };
    
    showScreen('waiting');
    socket.emit('join-chat', userData);
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Socket Events
socket.on('waiting-for-partner', () => {
    showScreen('waiting');
});

socket.on('chat-started', (data) => {
    isConnected = true;
    showScreen('chat');
    partnerInfo.textContent = `คุยกับ: ${data.partnerInfo}`;
    addSystemMessage('เชื่อมต่อสำเร็จ! เริ่มการสนทนาได้เลย');
    addSystemMessage('หมายเหตุ: การสนทนานี้จะไม่ถูกบันทึก');
});

socket.on('receive-message', (data) => {
    addMessage(data.message, 'received', data.timestamp);
});

socket.on('partner-disconnected', () => {
    isConnected = false;
    addSystemMessage('คู่สนทนาออกจากห้องแล้ว');
    addSystemMessage('รีเฟรชหน้าเว็บเพื่อหาคู่สนทนาใหม่');
});

// เมื่อเชื่อมต่อขาด
socket.on('disconnect', () => {
    isConnected = false;
    if (currentScreen === 'chat') {
        addSystemMessage('การเชื่อมต่อขาด กรุณารีเฟรชหน้าเว็บ');
    }
});

// เมื่อเชื่อมต่อใหม่
socket.on('connect', () => {
    console.log('Connected to server');
});

// ป้องกันการรีเฟรชโดยไม่ตั้งใจ
window.addEventListener('beforeunload', (e) => {
    if (isConnected) {
        e.preventDefault();
        e.returnValue = '';
    }
});