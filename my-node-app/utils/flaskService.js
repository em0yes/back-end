// utils/flaskService.js
const axios = require('axios');

// Flask 서버로 예측 요청을 보내는 함수
async function sendToFlask(transformedData) {
    try {
        const response = await axios.post('http://localhost:5000/predict', {
            features: transformedData  // 실시간 비콘 데이터를 전송
        });

        const predictedZone = response.data.predicted_zone;
        return predictedZone;
    } catch (error) {
        console.error('Error sending data to Flask server:', error);
        throw new Error('Flask 서버로 데이터 전송 중 오류가 발생했습니다.');
    }
}

module.exports = { sendToFlask };
