const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


// 관리자 로그인
router.post('/login', userController.login);

// 관리자 비밀번호 변경
router.post('/changepw', userController.login);

module.exports = router;
