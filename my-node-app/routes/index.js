/*
    index.js: 라우팅 설정 파일
    클라이언트의 요청을 받아서 해당 요청을 처리할 컨트롤러에 연결
*/

const express = require('express');
const axios = require('axios');

const router = express.Router();
const beaconController = require('../controllers/beaconController');
//const { predictZone } = require('../controllers/flaskController'); // Flask 컨트롤러 함수 연결

router.post('/current_rssi', beaconController.addCurrentRSSI);

// 클라이언트의 요청을 받아서 컨트롤러로 전달
//router.post('/predict-zone', predictZone);

module.exports = router;

