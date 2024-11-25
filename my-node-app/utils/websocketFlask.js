const io = require('socket.io-client');
const Beacon = require('../models/beaconQuery'); // DB 쿼리 함수
const { mergedDataQueues } = require('../utils/queues'); // 큐 가져오기

function setupWebSocketFlask() {
    const socket = io('http://localhost:5000'); // Flask Socket.IO 서버 연결

    // WebSocket 연결 성공
    socket.on('connect', () => {
        console.log('🌵 Flask Socket.IO 서버에 연결되었습니다 🌵');

        // 병합된 데이터를 Flask로 전송
        setInterval(() => {
            for (const scannerId in mergedDataQueues) {
                const queue = mergedDataQueues[scannerId];
                if (queue.length >= 10) {
                    const dataToSend = queue.slice(0, 10); // 큐의 첫 10개를 가져옴
                    sendToFlask(socket, dataToSend, scannerId, () => {
                        // 전송 성공 후 데이터 제거
                        mergedDataQueues[scannerId] = queue.slice(10); // 전송된 10개 제거
                        console.log(`♻️ 스캐너 ${scannerId}의 큐 상태:`, mergedDataQueues[scannerId].length);
                    });
                } else {
                    console.log(`📋 병합된 데이터가 부족함: 스캐너 ${scannerId}의 데이터 수: ${queue.length}`);
                }
            }
        }, 1000); // 1초마다 실행
    });

    // WebSocket 연결 끊김
    socket.on('disconnect', () => {
        console.warn('❌ Flask WebSocket 서버와의 연결이 끊어졌습니다.');
        
        // 연결 재시도
        setTimeout(() => {
            console.log('🔄 Flask WebSocket 서버에 재연결 시도 중...');
            socket.connect();
        }, 1000); // 1초 후 재시도
    });

    // WebSocket 연결 오류 처리
    socket.on('connect_error', (error) => {
        console.error('❌ Flask WebSocket 서버 연결 오류:', error.message);
    });

    // Flask로부터의 메시지 처리
    socket.on('message', (data) => {
        const predictedData = JSON.parse(data);
        console.log('🥑 Flask로부터 받은 예측 결과:', predictedData.zone);

        // 예측 결과를 DB에 저장
        Beacon.insertEstimatedLocation({
            scanner_id: predictedData.scanner_id,
            floor: predictedData.floor,
            zone: predictedData.zone,
            timestamp: new Date(),
        }, (err) => {
            if (err) {
                console.error('estimated_locations 테이블에 삽입 중 오류 발생:', err);
            } else {
                console.log(`✅ 스캐너 ${predictedData.scanner_id}의 예측 결과가 DB에 저장되었습니다.`);
            }
        });
    });
}

// Flask로 데이터 전송 함수
function sendToFlask(socket, queue, scannerId, callback) {
    if (!socket.connected) {
        console.warn('❌ Flask WebSocket 서버와 연결이 끊어져 데이터 전송 불가');
        return;
    }

    if (!queue || queue.length === 0) {
        console.warn('❌ 전송할 데이터가 없습니다.');
        return;
    }

    console.log(`📤 Flask로 보낼 데이터 (${queue.length}개):`, queue);

    const beaconData = JSON.stringify(queue);

    socket.emit('message', beaconData, (ack) => {
        if (ack) {
            console.log(`✅ Flask에서 데이터 수신 확인`);

            // send_flag 업데이트
            const ids = queue.map(row => row.id);
            Beacon.updateSendFlag(ids, (updateErr) => {
                if (updateErr) {
                    console.error('❌ send_flag 업데이트 중 오류 발생:', updateErr);
                } else {
                    console.log(`♻️ send_flag 업데이트 완료 (ID: ${ids})`);
                }
            });

            if (callback) callback();
        } else {
            console.warn(`❌ Flask 응답 없음. 데이터 전송 실패.`);
        }
    });
}

module.exports = setupWebSocketFlask;
