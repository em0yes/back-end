const db = require('../config/db');
const { sendToFlask } = require('../utils/flaskService');

// 실시간 데이터를 받아서 처리하는 함수
async function predictZone(req, res) {
    try {
        // 1. 아직 전송되지 않은 데이터만 가져오기 (sent_flag = FALSE)
        const result = await db.query('SELECT * FROM current_rssi_measurements WHERE sent_flag = FALSE ORDER BY timestamp ASC LIMIT 18');

        if (!result.length) {
            return res.status(400).json({ error: 'No new beacon data available' });
        }

        // 데이터를 변환하는 로직
        const transformedData = [];
        let beaconRow = {
            "TimeStamp": result[0].timestamp,  // 최신 데이터의 타임스탬프
            "B1": 0, "B2": 0, "B3": 0, "B4": 0, "B5": 0, "B6": 0, "B7": 0, "B8": 0,
            "B9": 0, "B10": 0, "B11": 0, "B12": 0, "B13": 0, "B14": 0, "B15": 0,
            "B16": 0, "B17": 0, "B18": 0
        };

        result.forEach(row => {
            beaconRow[`B${row.fixed_beacon_id}`] = row.rssi;
        });

        transformedData.push(beaconRow);

        // 2. 변환된 데이터를 Flask 서버로 전송하여 예측 요청
        const predictedZone = await sendToFlask(transformedData);

        // 3. 예측 결과를 클라이언트에 전송
        res.json({
            success: true,
            predictedZone: predictedZone,
        });

        // 4. 전송된 데이터의 sent_flag를 TRUE로 업데이트
        const ids = result.map(row => row.id);
        await db.query('UPDATE current_rssi_measurements SET sent_flag = TRUE WHERE id IN (?)', [ids]);

    } catch (error) {
        console.error('Error processing prediction request:', error);
        res.status(500).json({ error: '예측 요청 중 오류가 발생했습니다.' });
    }
}

module.exports = { predictZone };
