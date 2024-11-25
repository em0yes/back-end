const io = require('socket.io-client');
const Beacon = require('../models/beaconQuery'); // DB 쿼리 함수

const scannerQueues = {};  // scanner_id별로 원본 데이터를 저장할 객체
const mergedQueues = {};   // scanner_id별로 병합된 데이터를 저장할 객체

// Socket.IO 클라이언트 설정
function setupWebSocketFlask() {
    const socket = io('http://localhost:5000'); // Flask Socket.IO 서버 연결

    socket.on('connect', () => {
        console.log('🌵 Flask Socket.IO 서버에 연결되었습니다 🌵');

        // 주기적으로 DB에서 데이터를 처리
        setInterval(() => processUnsentData(socket), 1000); // 1초마다 실행
    });

    socket.on('message', (data) => {
        const predictedData = JSON.parse(data);
        console.log('🥑 Flask로부터 받은 예측 결과:', predictedData.zone, '🥑');
        Beacon.insertEstimatedLocation(
            {
                scanner_id: predictedData.scanner_id,
                floor: predictedData.floor,
                zone: predictedData.zone,
                timestamp: new Date(),
            },
            (err) => {
                if (err) {
                    console.error('estimated_locations 테이블에 삽입 중 오류 발생:', err);
                }
            }
        );
    });

    socket.on('close', () => {
        console.log('Flask WebSocket 서버와의 연결이 종료되었습니다.');
    });

    socket.on('error', (error) => {
        console.error('WebSocket 오류 발생:', error);
    });
}

// 병합 로직: 4개의 데이터를 병합하여 하나의 f 생성
function mergeData(dataRows) {
    const merged = { timestamp: dataRows[0].timestamp, ids: [] }; // ids 초기화
    const beaconKeys = ['B1', 'B2', 'B3', 'B4', 'B5'];

    beaconKeys.forEach((key) => {
        let latestValue = 0; // 기본값
        dataRows.forEach((row) => {
            if (row.fixed_beacon_id === parseInt(key.replace('B', '')) && row.rssi !== 0) {
                latestValue = row.rssi;
                if (!merged.ids.includes(row.id)) { // 중복 방지
                    merged.ids.push(row.id);
                }
            }
        });
        merged[key] = latestValue;
    });

    return merged;
}





// Flask 서버로 데이터 전송
function sendToFlask(socket, mergedDataQueue, scanner_id) {
    const dataToSend = {
        scanner_id: scanner_id,
        data: [...mergedDataQueue],
    };

    const beaconData = JSON.stringify(dataToSend);
    console.log(`📡 스캐너 ${scanner_id}의 병합된 데이터를 Flask로 전송 중:`, beaconData);

    socket.emit('message', beaconData);

    // `ids`에서 중복 제거 후 send_flag 업데이트
    const ids = [...new Set(mergedDataQueue.flatMap((row) => row.ids || []))]; // 중복 제거
    if (ids.length === 0) {
        console.log(`⚠️ 스캐너 ${scanner_id}: 업데이트할 ID가 없습니다. send_flag 업데이트를 건너뜁니다.`);
        return;
    }

    Beacon.updateSendFlag(ids, (updateErr) => {
        if (updateErr) {
            console.error(`❌ 스캐너 ${scanner_id}: send_flag 업데이트 중 오류 발생:`, updateErr);
        } else {
            console.log(`✅ 스캐너 ${scanner_id}: send_flag가 다음 ID에 대해 업데이트됨: ${ids}`);
        }
    });

    // 병합된 데이터 제거 (큐 초기화)
    mergedQueues[scanner_id].splice(0, mergedDataQueue.length);

    console.log(`🧹 스캐너 ${scanner_id}의 병합된 데이터 큐 초기화. 현재 큐 상태:`, mergedQueues[scanner_id]);
}



// 주기적으로 DB에서 새로운 데이터를 확인
function processUnsentData(socket) {
    Beacon.getUnsentData((err, result) => {
        if (err) {
            console.error('데이터 가져오기 중 오류 발생:', err);
            return;
        }

        if (result.length > 0) {
            const idsToUpdate = [];

            result.forEach((row) => {
                const scanner_id = row.scanner_id;
                if (!scannerQueues[scanner_id]) {
                    scannerQueues[scanner_id] = [];
                }
                if (!mergedQueues[scanner_id]) {
                    mergedQueues[scanner_id] = [];
                }

                // 같은 데이터가 큐에 이미 있는지 확인하여 중복 삽입 방지
                if (!scannerQueues[scanner_id].some((item) => item.id === row.id)) {
                    scannerQueues[scanner_id].push(row);
                    console.log(`스캐너 ${scanner_id}에 데이터 추가됨:`, row);
                    idsToUpdate.push(row.id); // 업데이트할 ID 저장

                    // 4개의 데이터가 쌓이면 병합
                    if (scannerQueues[scanner_id].length >= 4) {
                        const mergedData = mergeData(scannerQueues[scanner_id].splice(0, 4));
                        console.log(`스캐너 ${scanner_id}에서 병합된 데이터 생성:`, mergedData);
                        mergedQueues[scanner_id].push(mergedData);
                    }
                }

                // 병합된 데이터가 10개 이상이면 Flask로 전송
                if (mergedQueues[scanner_id].length >= 10) {
                    console.log(`📡 스캐너 ${scanner_id}의 병합된 데이터 10개를 Flask로 전송합니다.`);
                    sendToFlask(socket, mergedQueues[scanner_id].splice(0, 10), scanner_id);
                }
            });

            // DB에서 가져온 데이터의 send_flag 업데이트
            if (idsToUpdate.length > 0) {
                Beacon.updateSendFlag(idsToUpdate, (updateErr) => {
                    if (updateErr) {
                        console.error(`❌ send_flag 업데이트 중 오류 발생:`, updateErr);
                    } else {
                        console.log(`✅ 다음 ID의 send_flag가 업데이트됨: ${idsToUpdate}`);
                    }
                });
            }
        }
    });
}


module.exports = setupWebSocketFlask;
