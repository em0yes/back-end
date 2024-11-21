from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import json
import pickle
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 현재 실행 경로 확인
base_path = os.path.dirname(os.path.realpath(__file__))
model_path = os.path.join(base_path, 'train_model_nodir.pkl')

# 모델 로드
try:
    print(f"모델 파일 경로: {model_path}")
    with open(model_path, 'rb') as model_file:
        model = pickle.load(model_file)
except Exception as e:
    print(f"모델 로드 중 오류 발생: {str(e)}")
    model = None

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
        if isinstance(data, list) and len(data) == 10:  # 데이터가 10개 들어왔는지 확인
            beacon_averages = {'B1': [], 'B2': [], 'B3': [], 'B4': [], 'B5': []}
            scanner_id = None  # scanner_id 저장

            # 10개의 데이터에서 B1, B2, B3, B4, B5 값을 추출하여 평균을 계산
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

            # 학습 때 사용된 feature 이름을 동일하게 사용
            feature_names = ['B1', 'B2', 'B3', 'B4', 'B5']
            model_input = pd.DataFrame([averaged_data], columns=feature_names)

            # 모델을 사용하여 예측
            predicted_zone = model.predict(model_input)[0]  # 예측된 구역

            # 예측된 데이터를 Node.js 서버로 전송
            predicted_result = {
                'scanner_id': int(scanner_id),  # scanner_id를 int로 변환
                'floor': 3,                     # 3층으로 고정
                'zone': int(predicted_zone),    # 예측된 zone 값을 int로 변환
                'mean': [float(val) for val in averaged_data]  # 평균값을 float로 변환
            }

            # 클라이언트에게 예측된 데이터를 전송
            emit('message', json.dumps(predicted_result))
        else:
            print("10개의 데이터가 입력되지 않았습니다.")
    except json.JSONDecodeError as e:
        print('Failed to parse message as JSON:', str(e))
    except Exception as e:
        print(f"데이터 처리 중 오류 발생: {str(e)}")


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
