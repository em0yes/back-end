const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


// 작업자 검색
router.post('/search', userController.login);

// 스캐너-작업자 매핑
router.post('/setworker', userController.login)

module.exports = router;
