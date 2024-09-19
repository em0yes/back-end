/*
    index.js: 라우팅 설정 파일
    클라이언트의 요청을 받아서 해당 요청을 처리할 컨트롤러에 연결
*/

const express = require('express');
const axios = require('axios');

const router = express.Router();
const beaconController = require('../controllers/beaconController');

router.post('/current_rssi', beaconController.addCurrentRSSI);


module.exports = router;

