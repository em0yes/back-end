const connection = require('../config/db');
const mergeData = require('../utils/mergeData');
const { scannerQueues, mergedDataQueues } = require('../utils/queues');


function handleIncomingData(scannerId, data) {
    // scannerQueues 초기화
    if (!scannerQueues[scannerId]) {
        scannerQueues[scannerId] = [];
    }

    // scannerQueues에 데이터 추가
    scannerQueues[scannerId].push(data);
    console.log(`📥 스캐너 ${scannerId}의 현재 큐:`, scannerQueues[scannerId]);

    // 병합 조건: 4개 이상일 때 병합
    if (scannerQueues[scannerId].length >= 4) {
        const dataToMerge = scannerQueues[scannerId].splice(0, 4); // 4개를 추출 후 제거
        const mergedData = mergeData(dataToMerge);

        // 병합된 데이터를 mergedDataQueues에 추가
        if (!mergedDataQueues[scannerId]) {
            mergedDataQueues[scannerId] = [];
        }
        mergedDataQueues[scannerId].push(mergedData);

        console.log(`✅ 병합된 데이터가 큐에 추가됨:`, mergedData);
        // 병합된 데이터 총 개수 출력
        const totalMergedDataCount = Object.values(mergedDataQueues).reduce(
            (count, queue) => count + queue.length,
            0
        );
        console.log(`📊 현재까지 병합된 총 데이터 개수: ${totalMergedDataCount}`);
    } else {
        console.log(`📋 병합 조건 미달: 스캐너 ${scannerId}의 데이터 수: ${scannerQueues[scannerId].length}`);
    }
}


// `addCurrentRSSI` 함수 내부에서 호출
exports.addCurrentRSSI = async (req, res) => {
    const { macAddress, rssi, deviceId, azimuth } = req.body;

    try {
        const scannerId = await getScannerId(deviceId);
        const fixedBeaconId = await getFixedBeaconId(macAddress);
        const insertResult = await insertRSSIMeasurement(scannerId, fixedBeaconId, rssi);

        console.log(`✅ 데이터 삽입 성공: 스캐너 ID: ${scannerId}, 비콘 ID: ${fixedBeaconId}, RSSI: ${rssi}`);

        // 병합 로직 호출
        handleIncomingData(scannerId, {
            id: insertResult.insertId,
            scanner_id: scannerId,
            fixed_beacon_id: fixedBeaconId,
            rssi: rssi,
            timestamp: new Date(),
        });

        res.status(200).send('Data inserted and queued successfully');
    } catch (error) {
        console.error('❌ 처리 중 오류 발생:', error.message);
        res.status(500).send('Internal Server Error');
    }
};



// 고정 비콘 ID 조회 함수
const getFixedBeaconId = (macAddress) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM fixed_beacons WHERE mac_address = ?';
        connection.query(query, [macAddress], (error, results) => {
            if (error) return reject(error);
            resolve(results.length > 0 ? results[0].id : null);
        });
    });
};

// 스캐너 ID 조회 함수
const getScannerId = (deviceId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM beacon_scanners WHERE mac_address = ?';
        connection.query(query, [deviceId], (error, results) => {
            if (error) return reject(error);
            resolve(results.length > 0 ? results[0].id : null);
        });
    });
};

// current_rssi_measurements 테이블에 데이터 삽입 함수
const insertRSSIMeasurement = (scannerId, fixedBeaconId, rssi) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO current_rssi_measurements (scanner_id, fixed_beacon_id, rssi) VALUES (?, ?, ?)';
        connection.query(query, [scannerId, fixedBeaconId, rssi], (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
};

