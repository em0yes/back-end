const http = require('http'); // HTTP 모듈 불러오기
const socketIO = require('socket.io'); // socket.io 모듈 불러오기
const Beacon = require('../models/beaconQuery'); // Beacon 모듈 불러오기

// 전송되지 않은 데이터를 가져오는 함수
async function fetchNewData() {
    return new Promise((resolve, reject) => {
        Beacon.getUnsentData2((err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// scanner_id별로 최신 데이터를 선택하는 함수
function getLatestDataByScannerId(data) {
    const latestDataByScannerId = {};

    // 각 scanner_id별로 최신 데이터만 저장
    data.forEach(row => {
        const scanner_id = row.scanner_id;
        if (!latestDataByScannerId[scanner_id] || new Date(row.timestamp) > new Date(latestDataByScannerId[scanner_id].timestamp)) {
            latestDataByScannerId[scanner_id] = row;
        }
    });

    return Object.values(latestDataByScannerId); // 최신 데이터 배열 반환
}

// WebSocket 서버 설정 함수
function setupWebSocketClient() {
    const PORT = 8081; // WebSocket 서버 포트 정의

    // HTTP 서버 생성 (WebSocket을 위한 서버)
    const server = http.createServer();

    // Socket.IO 서버 설정 (HTTP 서버에 연결)
    const ioServer = socketIO(server, {
        cors: {
            origin: "http://localhost:3000", // 클라이언트 주소
            methods: ["GET", "POST"]
        }
    });

    ioServer.on('connection', (socket) => {
        console.log('🚀 Client connected via WebSocket! 🚀');

        // 주기적으로 DB에서 전송되지 않은 데이터를 가져와 클라이언트로 전송
        const interval = setInterval(() => {
            fetchNewData().then(newData => {
                if (newData.length > 0) {
                    // scanner_id별로 최신 데이터만 선택
                    const latestData = getLatestDataByScannerId(newData);
                    
                    // 각 최신 데이터를 클라이언트로 전송
                    latestData.forEach(data => {
                        socket.emit('newData', JSON.stringify(data));

                        // 해당 데이터의 send_flag 업데이트
                        Beacon.updateSendFlag2([data.timestamp], (err) => {
                            if (err) {
                                console.error('Error updating send_flag:', err);
                            } else {
                                console.log(`send_flag updated for timestamp: ${data.timestamp}`);
                            }
                        });
                    });
                }
            }).catch(error => {
                console.error('Error fetching data:', error);
            });
        }, 5000); // 5초마다 데이터 확인

        socket.on('disconnect', () => {
            console.log('🦕 Client disconnected 🦕');
            clearInterval(interval); // 클라이언트가 연결을 끊으면 주기적 데이터 전송 중지
        });
    });

    console.log('WebSocket server setup complete.');

    // WebSocket 서버 실행
    server.listen(PORT, () => {
        console.log(`WebSocket server is running on port ${PORT}`);
    });
}

module.exports = setupWebSocketClient;
