//http통신에 필요한 비즈니스로직
// 지금은 웹소켓 통신으로 구현했기 때문에 필요는 없음

// const db = require('../config/db');
// const { sendToFlask } = require('../utils/flaskService');
// const Beacon = require('../models/beaconQuery'); // DB 관련 함수

// // 실시간 데이터를 받아서 처리하는 함수
// async function predictZone(req, res) {
//     try {
//         // 1. 아직 전송되지 않은 데이터만 가져오기 (sent_flag = FALSE)
//         const result = await db.query('SELECT * FROM current_rssi_measurements WHERE sent_flag = FALSE ORDER BY timestamp ASC');
//         console.log("Queried data from DB:", result);

//         if (!result.length) {
//             console.log('No new beacon data available');
//             return res.status(400).json({ error: 'No new beacon data available' });
//         }

//         // 데이터를 변환하는 로직
//         const transformedData = [];
//         let beaconRow = {
//             "TimeStamp": result[0].timestamp,  // 최신 데이터의 타임스탬프
//             "B1": 0, "B2": 0, "B3": 0, "B4": 0, "B5": 0, "B6": 0, "B7": 0, "B8": 0,
//             "B9": 0, "B10": 0, "B11": 0, "B12": 0, "B13": 0, "B14": 0, "B15": 0,
//             "B16": 0, "B17": 0, "B18": 0
//         };

//         result.forEach(row => {
//             beaconRow[`B${row.fixed_beacon_id}`] = row.rssi; // 고정 비콘 ID에 맞춰 RSSI 값을 할당
//         });

//         transformedData.push(beaconRow);

//         // 2. 변환된 데이터를 Flask 서버로 전송하여 예측 요청
//         const predictedZone = await sendToFlask(transformedData);

//         // 예측 결과 로그 출력
//         console.log("Received predicted zone from Flask:", predictedZone);
//         console.log("Predicted zone from Flask:", predictedZone);

//         if (!predictedZone) {
//             console.log('Flask server did not return a valid prediction');
//             return res.status(500).json({ error: 'No valid prediction received from Flask' });
//         }

//         // DB에 예측 결과 저장 로직
//         const estimatedData = {
//             scanner_id: result[0].scanner_id, // 예시로 첫 번째 데이터의 scanner_id 사용
//             zone: predictedZone,
//             timestamp: new Date() // 현재 시간
//         };

//         Beacon.insertEstimatedLocation(estimatedData, (err) => {
//             if (err) {
//                 console.error('Error inserting estimated location:', err);
//             } else {
//                 console.log('Estimated location inserted into DB.');
//             }
//         });

//         // 4. 전송된 데이터의 sent_flag를 TRUE로 업데이트
//         const ids = result.map(row => row.id);
//         await db.query('UPDATE current_rssi_measurements SET sent_flag = TRUE WHERE id IN (?)', [ids]);
//         console.log('Updated sent_flag for IDs:', ids);
        
//         // 5. 클라이언트에 성공 메시지 전송
//         res.json({
//             success: true,
//             predictedZone: predictedZone
//         });

//     } catch (error) {
//         console.error('Error processing prediction request:', error);
//         res.status(500).json({ error: '예측 요청 중 오류가 발생했습니다.' });
//     }
// }

// module.exports = { predictZone };
