const users = []; // 예시 데이터베이스 (실제 구현에서는 DB 사용)

// 회원가입 로직
exports.register = (req, res) => {
    const { username, password, role } = req.body;

    // 간단한 유효성 검사
    if (!username || !password || !role) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    users.push({ username, password, role });
    res.status(201).json({ message: `${role} 회원가입 성공` });
};

// 로그인 로직
exports.login = (req, res) => {
    const { username, password, role } = req.body;
    const user = users.find(u => u.username === username && u.password === password && u.role === role);

    if (!user) {
        return res.status(400).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    res.status(200).json({ message: `${role} 로그인 성공` });
};
