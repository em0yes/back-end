const connection = require('../config/db');

const Beacon = {};

// 전송되지 않은 비콘 데이터를 가져오는 함수
Beacon.getUnsentData = (callback) => {
    const query = 'SELECT * FROM current_rssi_measurements WHERE send_flag = FALSE ORDER BY timestamp ASC LIMIT 18';
    connection.query(query, callback);
};

// 전송된 데이터의 send_flag를 true로 업데이트하는 함수
Beacon.updateSendFlag = function(ids, callback) {
    const query = 'UPDATE current_rssi_measurements SET send_flag = TRUE WHERE id IN (?)';
    connection.query(query, [ids], (err, result) => { // connection 객체 사용
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
};



// 예측 결과를 estimated_locations 테이블에 삽입하는 함수
Beacon.insertEstimatedLocation = (data, callback) => {
    const query = 'INSERT INTO estimated_locations (scanner_id, floor, zone, timestamp) VALUES (?, ?, ?, ?)';
    const values = [data.scanner_id, data.floor, data.zone, data.timestamp];
    connection.query(query, values, callback);
};


// 전송된 데이터의 send_flag를 true로 업데이트하는 함수
Beacon.updateSendFlag2 = function(timestamp, callback) {
    const query = 'UPDATE estimated_locations SET send_flag = TRUE WHERE timestamp IN (?)';
    connection.query(query, [timestamp], (err, result) => { // connection 객체 사용
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
};


// 전송되지 않은 비콘 데이터를 가져오는 함수
// Beacon.getUnsentData2 = (callback) => {
//     const query = 'SELECT * FROM estimated_locations WHERE send_flag = FALSE ORDER BY timestamp ASC LIMIT 18';
//     connection.query(query, callback);
// };

Beacon.getUnsentData2 = (callback) => {
    const query = `
        SELECT el.*, bs.worker
        FROM estimated_locations el
        JOIN beacon_scanners bs ON el.scanner_id = bs.id
        WHERE el.send_flag = FALSE
        ORDER BY el.timestamp ASC
        LIMIT 18;
    `;
    connection.query(query, callback);
};

module.exports = Beacon;
