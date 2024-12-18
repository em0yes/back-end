// routes/workerRoutes.js
const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

// 작업자 검색
router.get('/search', workerController.searchWorker);

// 스캐너 - 작업자 매핑
router.patch('/saveworker', workerController.saveWorker);
router.get('/setworker', workerController.getWorkerMapping);

module.exports = router;
