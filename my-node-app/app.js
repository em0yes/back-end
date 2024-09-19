require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const setupWebSocketClient = require('./utils/websocketClient.js'); // 수정된 웹소켓 클라이언트 모듈 불러오기

const app = express();
const server = http.createServer(app); // HTTP 서버 생성

app.use(bodyParser.json());
app.use('/api', require('./routes/index.js')); // 라우팅

// public 폴더의 파일을 정적 파일로 제공
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('BeaconMap 애플리케이션이 실행 중입니다.');
});

// WebSocket 클라이언트 설정 호출
setupWebSocketClient();

server.listen(8080, () => {
    console.log('Server running on port 8080');
});
