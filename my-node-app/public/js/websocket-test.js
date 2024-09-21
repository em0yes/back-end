// // Socket.IO 객체는 CDN으로 로드된 io 객체를 사용
// let socket; // 전역 변수로 선언하여 다른 함수에서도 접근 가능

// // WebSocket 연결 함수
// function connectWebSocket() {
//     // Socket.IO 클라이언트로 서버에 연결 (포트는 Socket.IO 서버의 포트)
//     socket = io('http://localhost:8081'); // CDN으로 로드된 io 객체 사용

//     // 서버에 연결되었을 때
//     socket.on('connect', () => {
//         console.log('Socket.IO 서버와 연결 성공');
//         socket.emit('message', 'Hello from client'); // 서버로 초기 메시지 전송
//     });

//     // 서버로부터 메시지를 수신했을 때
//     socket.on('message', (data) => {
//         console.log('서버로부터 메시지:', data);
//     });

//     // 연결이 종료되었을 때
//     socket.on('disconnect', () => {
//         console.log('Socket.IO 연결 종료');
//     });

//     // 오류가 발생했을 때
//     socket.on('connect_error', (error) => {
//         console.error('Socket.IO 연결 오류:', error);
//     });
// }

// // 메시지를 서버로 전송하는 함수
// function sendMessage() {
//     const messageInput = document.getElementById('messageInput').value; // 입력된 메시지를 가져옴
//     if (socket && socket.connected) { // WebSocket 연결이 되어 있는 경우
//         socket.emit('message', messageInput); // 서버로 메시지 전송
//         console.log('서버로 메시지 전송:', messageInput);
//     } else {
//         console.error('WebSocket 연결이 되어 있지 않습니다.');
//     }
// }
