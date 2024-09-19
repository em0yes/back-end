function connectWebSocket() {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = function() {
        console.log('WebSocket 연결 성공');
        socket.send('Hello from client');
    };

    socket.onmessage = function(event) {
        console.log('서버로부터 메시지:', event.data);
    };

    socket.onclose = function() {
        console.log('WebSocket 연결 종료');
    };

    socket.onerror = function(error) {
        console.error('WebSocket 오류:', error);
    };
}
