from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import json
import pickle
import numpy as np
import pandas as pd  # pandas 추가
import os

app = Flask(__name__)
CORS(app)  # CORS 미들웨어 설정

socketio = SocketIO(app, cors_allowed_origins="*")  # 모든 출처 허용

print(f"현재 실행 경로: {os.getcwd()}")
# 현재 실행 경로 확인
base_path = os.path.dirname(os.path.realpath(__file__))  # 현재 파일의 절대 경로
model_path = os.path.join(base_path, 'RF_model1009.pkl')
encoder_path = os.path.join(base_path, 'RF_encoder1009.pkl')


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
            beacon_averages = {'B1': [], 'B2': [], 'B3': [], 'B4': [], 'B5': []}
            scanner_id = None  # scanner_id 저장

            # 5개의 데이터에서 B1, B2, B3, B4, B5 값을 추출하여 평균을 계산
            for beacon_data in data:
                if scanner_id is None:
                    scanner_id = beacon_data.get('scanner_id', None)  # scanner_id 설정
                for beacon_id in ['B1', 'B2', 'B3', 'B4', 'B5']:
                    beacon_value = beacon_data[beacon_id]
                    if beacon_value != 0:  # 0을 결측치로 간주하고 제외
                        beacon_averages[beacon_id].append(beacon_value)

            # 평균값 계산 (0이 아닌 값들만 사용, 0은 결측치)
            averaged_data = [np.mean(beacon_averages[beacon_id]) if len(beacon_averages[beacon_id]) > 0 else 0 
                             for beacon_id in ['B1', 'B2', 'B3', 'B4', 'B5']]
            #print(f"5개 비콘의 평균 데이터 (0 제외): {averaged_data}")

            # 학습 때 사용된 feature 이름을 동일하게 사용
            feature_names = ['B1', 'B2', 'B3', 'B4', 'B5']
            model_input = pd.DataFrame([averaged_data], columns=feature_names)  # 입력 데이터를 DataFrame으로 변환

            # 모델을 사용하여 예측
            predicted_class = model.predict(model_input)
            predicted_zone = label_encoder.inverse_transform(predicted_class)[0]  # 예측된 구역

            # 예측된 데이터를 Node.js 서버로 전송
            predicted_result = {
                'scanner_id': scanner_id,  # 받은 scanner_id를 사용
                'floor': 3,                # 일단은 3층
                'zone': predicted_zone,     # 모델이 예측한 구역
                'mean': averaged_data
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
