const io = require('socket.io-client');
const Beacon = require('../models/beaconQuery'); // DB 쿼리 함수

const scannerQueues = {};  // scanner_id별로 큐를 저장할 객체

// Socket.IO 클라이언트 설정
function setupWebSocketFlask() {
    const socket = io('http://localhost:5000');  // Flask Socket.IO 서버 연결

    socket.on('connect', () => { 
        console.log('🌵 Flask Socket.IO 서버에 연결되었습니다 🌵');

        // 주기적으로 DB에서 새로운 데이터를 확인
        setInterval(async () => {
            try {
                Beacon.getUnsentData((err, result) => {
                    if (err) {
                        console.error('데이터 가져오기 중 오류 발생:', err);
                        return;
                    }

                    if (result.length > 0) {
                        result.forEach(row => {
                            const scanner_id = row.scanner_id;
                            if (!scannerQueues[scanner_id]) {
                                scannerQueues[scanner_id] = [];
                            }
                            
                            // 스캐너별 큐에 데이터 추가
                            scannerQueues[scanner_id].push(row);

                            // 큐에 데이터 추가 시 콘솔 출력
                            console.log(`스캐너 ${scanner_id}에 데이터 추가됨:`, row);

                            if (scannerQueues[scanner_id].length === 5) {
                                // 5개 쌓이면 Flask로 전송
                                console.log(`스캐너 ${scanner_id}의 데이터 5개를 Flask로 전송합니다.`);
                                sendToFlask(socket, scannerQueues[scanner_id]);

                                // 큐에서 가장 오래된 데이터 삭제 (FIFO)
                                scannerQueues[scanner_id].shift();
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('데이터 처리 중 오류 발생:', error);
            }
        }, 500); // 0.5초마다 새로운 데이터 확인
    });

    socket.on('message', (data) => {
        const predictedData = JSON.parse(data);
        console.log('Flask로부터 받은 예측 결과:', predictedData);
        Beacon.insertEstimatedLocation({
            scanner_id: predictedData.scanner_id,
            floor: predictedData.floor,
            zone: predictedData.zone,
            timestamp: new Date()
        }, (err) => {
            if (err) {
                console.error('estimated_locations 테이블에 삽입 중 오류 발생:', err);
            }
        });
    });

    socket.on('close', () => {
        console.log('Flask WebSocket 서버와의 연결이 종료되었습니다.');
    });

    socket.on('error', (error) => {
        console.error('WebSocket 오류 발생:', error);
    });
}

// Flask 서버로 데이터 전송
function sendToFlask(socket, queue) {
    const transformedData = queue.map(row => {
        let beaconRow = {
            "TimeStamp": row.timestamp,
            "scanner_id": row.scanner_id,
            "B1": 0, "B2": 0, "B3": 0, "B4": 0, "B5": 0, "B6": 0,
            "B7": 0, "B8": 0, "B9": 0, "B10": 0, "B11": 0,
            "B12": 0, "B13": 0, "B14": 0, "B15": 0, "B16": 0,
            "B17": 0, "B18": 0
        };
        if (row.fixed_beacon_id >= 1 && row.fixed_beacon_id <= 18) {
            beaconRow[`B${row.fixed_beacon_id}`] = row.rssi;
        }
        return beaconRow;
    });

    const beaconData = JSON.stringify(transformedData);
    console.log(`스캐너 ${queue[0].scanner_id}의 데이터를 Flask로 전송 중:`, beaconData);
    socket.emit('message', beaconData);

    // 데이터 전송 후 `send_flag`를 true로 업데이트
    const ids = queue.map(row => row.id);
    Beacon.updateSendFlag(ids, (updateErr) => {
        if (updateErr) {
            console.error('send_flag 업데이트 중 오류 발생:', updateErr);
        } else {
            console.log(`send_flag가 다음 ID에 대해 업데이트됨: ${ids}`);
        }
    });
}

module.exports = setupWebSocketFlask;
