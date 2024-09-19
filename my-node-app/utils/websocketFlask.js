//const WebSocket = require('ws');
const io = require('socket.io-client');
const Beacon = require('../models/beaconQuery'); // DB 쿼리 함수

// Socket.IO 클라이언트 설정
function setupWebSocketFlask() {
    const socket = io('http://localhost:5000');  // Flask Socket.IO 서버 연결

    socket.on('connect', () => {
        console.log('Connected to Flask Socket.IO server');

        // 주기적으로 DB에서 새로운 데이터를 확인
        setInterval(async () => {
            try {
                Beacon.getUnsentData((err, result) => {
                    if (err) {
                        console.error('Error fetching data:', err);
                        return;
                    }

                    // 새로운 데이터가 있으면 처리
                    if (result.length > 0) {
                        // 데이터를 변환하는 로직
                        let beaconRow = {
                            "TimeStamp": result[0].timestamp,  // 최신 데이터의 타임스탬프
                            "scanner_id": result[0].scanner_id, // scanner_id 추가
                            "B1": 0, "B2": 0, "B3": 0, "B4": 0, "B5": 0, "B6": 0,
                            "B7": 0, "B8": 0, "B9": 0, "B10": 0, "B11": 0,
                            "B12": 0, "B13": 0, "B14": 0, "B15": 0, "B16": 0,
                            "B17": 0, "B18": 0
                        };

                        result.forEach(row => {
                            // 고정 비콘 ID에 맞춰 RSSI 값을 할당
                            if (row.fixed_beacon_id >= 1 && row.fixed_beacon_id <= 18) {
                                beaconRow[`B${row.fixed_beacon_id}`] = row.rssi;
                            }
                        });

                        const transformedData = [beaconRow]; // 배열에 변환된 데이터를 담음
                        const beaconData = JSON.stringify(transformedData); // JSON 문자열로 변환

                        console.log('Sending transformed data to Flask:', beaconData);
                        socket.emit('message', beaconData); // Socket.IO로 데이터 전송
                        
                        // 데이터 전송 후 `send_flag`를 true로 업데이트
                        const ids = result.map(row => row.id); // 전송한 데이터의 ID들
                        Beacon.updateSendFlag(ids, (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating send_flag:', updateErr);
                            } else {
                                console.log(`send_flag updated for IDs: ${ids}`);
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('Error processing data:', error);
            }
        }, 1000); // 1초마다 새로운 데이터 확인
    });

    // Flask 서버로부터 예측된 데이터 수신
    socket.on('message', (data) => {
        console.log('Received from Flask:', data);
        const predictedData = JSON.parse(data); // 수신된 데이터를 JSON으로 파싱

        // 예측 결과를 estimated_locations 테이블에 삽입
        const estimatedData = {
            scanner_id: predictedData.scanner_id,
            floor: predictedData.floor,
            zone: predictedData.zone,
            timestamp: new Date()
        };

        Beacon.insertEstimatedLocation(estimatedData, (insertErr) => {
            if (insertErr) {
                console.error('Error inserting into estimated_locations:', insertErr);
            } else {
                console.log('Predicted zone inserted into estimated_locations');
            }
        });
    });

    socket.on('close', () => {
        console.log('Disconnected from Flask WebSocket server');
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

module.exports = setupWebSocketFlask;
