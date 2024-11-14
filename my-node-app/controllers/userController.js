const connection = require('../config/db');

// 로그인 로직
exports.login = (req, res) => {
    const { username, password } = req.body;

    try {
        // DB에서 해당 username의 사용자 정보를 가져오기
        connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
            if (error) {
                console.error(error);
                console.log("로그인 실패\n");
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }

            // 사용자가 존재하지 않는 경우
            if (results.length === 0) {
                console.log("로그인 실패 : 해당 아이디 존재하지 않음\n");
                return res.status(400).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
            }

            const user = results[0];

            // 비밀번호 비교
            if (password !== user.password) {
                console.log("로그인 실패 :  비밀번호 불일치\n");
                return res.status(400).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
            }

            // 로그인 성공
            console.log("로그인 성공\n");
            res.status(200).json({ message: 'SUCCESS' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};
