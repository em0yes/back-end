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

                            // 같은 데이터가 큐에 이미 있는지 확인하여 중복 삽입 방지
                            if (!scannerQueues[scanner_id].some(item => item.id === row.id)) {
                                // 스캐너별 큐에 데이터 추가
                                scannerQueues[scanner_id].push(row);
                                console.log(`스캐너 ${scanner_id}에 데이터 추가됨:`, row);
                            }

                            if (scannerQueues[scanner_id].length >= 10) {
                                // 7개 쌓이면 Flask로 전송
                                console.log(`스캐너 ${scanner_id}의 데이터 10개를 Flask로 전송합니다.`);
                                sendToFlask(socket, scannerQueues[scanner_id], scanner_id);

                                //큐에서 가장 오래된 데이터 한 개만 삭제
                                //scannerQueues[scanner_id].shift();
                                //scannerQueues[scanner_id].shift();

                                scannerQueues[scanner_id].splice(0, 2); // 0번 인덱스부터 두 개의 데이터 제거

                            }
                        });
                    }
                });
            } catch (error) {
                console.error('데이터 처리 중 오류 발생:', error);
            }
        }, 1000); // 1초마다 새로운 데이터 확인
    });


    socket.on('message', (data) => {
        const predictedData = JSON.parse(data); 
        console.log('🥑 Flask로부터 받은 예측 결과:', predictedData.zone, '🥑' );
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
            "B1": 0, "B2": 0, "B3": 0, "B4": 0, "B5": 0 // 필요한 비콘 ID만 포함
        };
        
        if ([1, 2, 3, 4, 5].includes(row.fixed_beacon_id)) {
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
