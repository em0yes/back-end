from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # CORS 미들웨어 설정

socketio = SocketIO(app, cors_allowed_origins="*")  # 모든 출처 허용

@app.route('/')
def index():
    return 'WebSocket server is running!'

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('message')
def handle_message(message):
    try:
        # 받은 메시지가 JSON 형식이라고 가정하고 파싱
        data = json.loads(message)
        print('Received data:', data)

        # 비콘 데이터 처리 로직
        if isinstance(data, list) and len(data) > 0:
            beacon_data = data[0]  # 첫 번째 데이터 사용 (배열로 전송되므로)
            print(f"Timestamp: {beacon_data['TimeStamp']}")
            for i in range(1, 19):  # B1~B18까지 출력
                beacon_id = f'B{i}'
                print(f'{beacon_id}: {beacon_data[beacon_id]}')

            # Node.js에서 전달된 scanner_id가 있다고 가정
            scanner_id = beacon_data.get('scanner_id', None)
            if scanner_id is None:
                print('scanner_id not found in the message')
                return
            
            # 받은 scanner_id 값을 이용해 predicted_zone 생성
            predicted_zone = {
                'scanner_id': scanner_id,  # 받은 scanner_id를 사용
                'floor': 1,                # 예시로 1층
                'zone': 'Zone A'           # 예측된 구역
            }

            # 클라이언트에게 예측된 데이터를 전송
            emit('message', json.dumps(predicted_zone))

        else:
            print("Received data is not in the expected format")
    except json.JSONDecodeError as e:
        print('Failed to parse message as JSON:', str(e))

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
