//addCurrentRSSI 
//수신데이터를 current_rssi_measurements에 insert하는 작업
const connection = require('../config/db');

exports.addCurrentRSSI = (req, res) => {
    const { macAddress, rssi, deviceId, azimuth } = req.body;

    // fixed_beacons 테이블에서 해당 macAddress와 일치하는 beacon ID 가져오기
    const query1 = 'SELECT id FROM fixed_beacons WHERE mac_address = ?';
    connection.query(query1, [macAddress], (error, results) => {
        if (error) {
            console.error('Fixed beacon 조회 오류:', error);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length === 0) {
            console.error('고정 비콘을 찾을 수 없습니다.');
            res.status(404).send('Fixed beacon not found');
            return;
        }

        const fixedBeaconId = results[0].id;

        // beacon_scanners 테이블에서 해당 deviceId와 일치하는 scanner ID 가져오기
        const query2 = 'SELECT id FROM beacon_scanners WHERE mac_address = ?';
        connection.query(query2, [deviceId], (error, results) => {
            if (error) {
                console.error('Beacon scanner 조회 오류:', error);
                res.status(500).send('Internal Server Error');
                return;
            }

            if (results.length === 0) {
                console.error('Beacon scanner를 찾을 수 없습니다.');
                res.status(404).send('Beacon scanner not found');
                return;
            }

            const scannerId = results[0].id;

            //current_rssi_measurements 테이블에 데이터 삽입 (중복 처리 없이 단순 삽입)
            const query3 = 'INSERT INTO current_rssi_measurements (scanner_id, fixed_beacon_id, rssi) VALUES (?, ?, ?)';
            connection.query(query3, [scannerId, fixedBeaconId, rssi], (error, results) => {
                if (error) {
                    console.error('데이터 삽입 오류:', error);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                //console.log('current_rssi_measurements 테이블에 데이터 삽입 성공:\n', fixedBeaconId ,'번 비콘 : ', rssi, '\n비콘 스캐너 : ', scannerId , '번');
                res.status(200).send('Data inserted successfully');
            });

        });
    });
};
