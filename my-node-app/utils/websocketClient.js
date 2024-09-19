const WebSocket = require('ws'); // ws 모듈 불러오기

// WebSocket 서버 설정 함수
function setupWebSocketClient(server) {
    // WebSocket 서버 생성
    const wss = new WebSocket.Server({ server });

    // 클라이언트가 연결됐을 때 실행되는 이벤트
    wss.on('connection', (ws) => { 
        console.log('🚀server-client websocket connect!🚀');

        // 클라이언트로부터 메시지를 받았을 때 처리
        ws.on('message', (message) => {
            console.log(`Received message from web client: ${message}`);
            // 클라이언트로 다시 응답 보내기 (필요한 경우)
            ws.send('Server received your message');
        });

        // 클라이언트와의 연결이 종료되었을 때 처리
        ws.on('close', () => { 
            console.log('🦕Web client disconnected🦕');
        });
    });

    console.log('WebSocket server setup complete.');
}

module.exports = setupWebSocketClient;