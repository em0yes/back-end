const connection = require('../config/db');

// 작업자 검색
exports.searchWorker = (req, res) => {
    const { worker } = req.query;

    // beacon_scanners 테이블에서 worker에 해당하는 id 찾기
    connection.query('SELECT id FROM beacon_scanners WHERE worker = ?', [worker], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (results.length === 0) {
            console.log("해당 작업자가 존재하지 않습니다.");
            return res.status(404).json({ message: '해당 작업자와 연결된 비콘 스캐너가 없습니다.' });
        }

        const scannerId = results[0].id;

        // estimated_locations 테이블에서 해당 scanner_id의 최신 레코드 조회 (2분 이내)
        connection.query(
            `SELECT scanner_id, floor, zone, timestamp
             FROM estimated_locations
             WHERE scanner_id = ? AND timestamp >= (NOW() - INTERVAL 2 MINUTE)
             ORDER BY timestamp DESC LIMIT 1`,
            [scannerId],
            (error, locationResults) => {
                if (error) {
                    console.error('서버 오류가 발생했습니다.');
                    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
                }

                if (locationResults.length === 0) {
                    console.log('해당 스캐너 ID의 2분 이내 위치 정보가 없습니다.');
                    return res.status(404).json({ message: '해당 스캐너 ID의 2분 이내 위치 정보가 없습니다.' });
                }

                res.status(200).json({ scanner: locationResults[0] });
            }
        );
    });
};

// 스캐너 - 작업자 매핑(get 요청)
exports.getWorkerMapping = (req, res) => {
    connection.query('SELECT id, worker FROM beacon_scanners', (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (results.length === 0) {
            console.error('비콘 스캐너 정보가 없습니다.');
            return res.status(404).json({ message: '비콘 스캐너 정보가 없습니다.' });
        }
        console.log("스캐너아이디 -  작업자 : ", results);
        res.status(200).json(results);
    });
};


// 스캐너 - 작업자 매핑 수정(==save)
exports.saveWorker = (req, res) => {
    console.log(req.body);
    const { scanner_id, worker } = req.body;
    console.log("스캐너 아이디: ", scanner_id, "\n작업자: ", worker);

    connection.query('UPDATE beacon_scanners SET worker = ? WHERE id = ?', [worker, scanner_id], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (results.affectedRows === 0) {
            console.error('해당 id의 비콘 스캐너를 찾을 수 없습니다.');
            return res.status(404).json({ message: '해당 id의 비콘 스캐너를 찾을 수 없습니다.' });
        }
        console.error('성공적으로 스캐너와 작업자를 맵핑하였습니다.');

        res.status(200).json({ message: '작업자 정보가 성공적으로 업데이트되었습니다.' });
    });
};
