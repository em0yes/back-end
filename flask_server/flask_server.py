from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import json
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # CORS 미들웨어 설정

socketio = SocketIO(app, cors_allowed_origins="*")  # 모든 출처 허용

print(f"현재 실행 경로: {os.getcwd()}")
# 현재 실행 경로 확인
base_path = os.path.dirname(os.path.realpath(__file__))  # 현재 파일의 절대 경로
# 모델과 인코더 파일이 있는 상대 경로 설정
# model_path = os.path.join(base_path, '0910_aver_model.pkl')
# encoder_path = os.path.join(base_path, '0910_label_encoder.pkl')

model_path = os.path.join(base_path, 'RF_model.pkl')
encoder_path = os.path.join(base_path, 'RF_encoder.pkl')

print(f"모델 파일 경로: {model_path}")  # 경로가 올바른지 출력
print(f"인코더 파일 경로: {encoder_path}")

# 모델과 인코더 로드
with open(model_path, 'rb') as model_file:
    model = pickle.load(model_file)

with open(encoder_path, 'rb') as encoder_file:
    label_encoder = pickle.load(encoder_file)

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
        if isinstance(data, list) and len(data) == 5:  # 5개의 데이터가 들어왔는지 확인
            # 각 B1~B18의 값을 평균내기 위한 배열 초기화
            beacon_averages = {f'B{i}': [] for i in range(1, 19)}
            scanner_id = None  # scanner_id 저장

            # 5개의 데이터에서 B1~B18 값을 추출하여 평균을 계산
            for beacon_data in data:
                if scanner_id is None:
                    scanner_id = beacon_data.get('scanner_id', None)  # scanner_id 설정
                for i in range(1, 19):
                    beacon_id = f'B{i}'
                    beacon_averages[beacon_id].append(beacon_data[beacon_id])

            # B1~B18의 평균값 계산
            averaged_data = [np.mean(beacon_averages[f'B{i}']) for i in range(1, 19)]

            # 모델에 입력하기 위해 배열로 변환
            model_input = np.array([averaged_data])

            # 모델을 사용하여 예측
            predicted_class = model.predict(model_input)
            predicted_zone = label_encoder.inverse_transform(predicted_class)[0]  # 예측된 구역

            print(f"Predicted zone: {predicted_zone}")

            # 예측된 데이터를 Node.js 서버로 전송
            predicted_result = {
                'scanner_id': scanner_id,  # 받은 scanner_id를 사용
                'floor': 1,                # 예시로 1층
                'zone': predicted_zone     # 모델이 예측한 구역
            }

            # 클라이언트에게 예측된 데이터를 전송
            emit('message', json.dumps(predicted_result))

        else:
            print("5개의 데이터가 입력되지 않았습니다.")
    except json.JSONDecodeError as e:
        print('Failed to parse message as JSON:', str(e))

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
