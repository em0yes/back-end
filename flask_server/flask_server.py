from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import json
import pickle
import numpy as np
from pykalman import KalmanFilter

# Flask 애플리케이션 초기화
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 모델 파일 경로 설정
base_path = os.path.dirname(os.path.realpath(__file__))
model_path = os.path.join(base_path, 'best_rf_model.pkl')

# 학습된 모델 로드
try:
    print(f"모델 파일 경로: {model_path}")
    with open(model_path, 'rb') as model_file:
        model = pickle.load(model_file)
except Exception as e:
    print(f"모델 로드 중 오류 발생: {str(e)}")
    model = None

# RSSI 처리 클래스 정의
class RSSIProcessor:
    """RSSI 데이터를 처리하고 필터링 및 정규화를 수행하는 클래스."""

    def __init__(self):
        self.kalman_filters = None

    def initialize_kalman_filters(self, num_beacons):
        """칼만 필터를 각 비콘에 대해 초기화."""
        self.kalman_filters = [KalmanFilter(initial_state_mean=0, n_dim_obs=1) for _ in range(num_beacons)]

    def apply_kalman_filter(self, data):
        """Kalman 필터를 적용하여 실시간 데이터를 필터링."""
        if self.kalman_filters is None:
            self.initialize_kalman_filters(data.shape[1])

        # 결측치 처리: 0 값을 -200으로 변환
        data[data == 0] = -200

        filtered_data = []
        for i, kf in enumerate(self.kalman_filters):
            beacon_data = data[:, i]
            mask = beacon_data != -200  # 유효한 데이터만 필터링

            if np.any(mask):  # 유효한 데이터가 있는 경우만 처리
                try:
                    smoothed_state_means, _ = kf.em(beacon_data[mask], n_iter=1).smooth(beacon_data[mask])
                    filtered_column = np.full(beacon_data.shape, -200.0)  # 기본값 -200으로 초기화
                    filtered_column[mask] = smoothed_state_means.flatten()
                except Exception as e:
                    print(f"Kalman filter failed for beacon {i}: {e}")
                    filtered_column = np.full(beacon_data.shape, -200.0)
            else:
                # 유효한 데이터가 없는 경우 기본값 사용
                filtered_column = np.full(beacon_data.shape, -200.0)

            filtered_data.append(filtered_column)

        return np.array(filtered_data).T

    @staticmethod
    def custom_normalization(data, min_value=-200, max_value=0):
        """데이터를 0~1 범위로 정규화."""
        return (data - min_value) / (max_value - min_value)

# 실시간 데이터 처리 클래스
class RealTimeProcessor:
    def __init__(self, window_size):
        self.window_size = window_size
        self.buffer = []
        self.rssi_processor = RSSIProcessor()

    def process_data(self, data):
        """
        데이터를 버퍼에 추가하고, 10개의 데이터가 쌓이면 처리 후 버퍼를 초기화.
        """
        self.buffer.extend(data)  # 새로 들어온 데이터를 버퍼에 추가
        if len(self.buffer) >= self.window_size:
            # 버퍼가 10개 이상의 데이터를 가진 경우
            current_batch = self.buffer[:self.window_size]  # 첫 10개의 데이터를 가져옴
            self.buffer = self.buffer[self.window_size:]  # 처리된 데이터를 버퍼에서 제거

            try:
                # RSSI 데이터를 추출
                rssi_data = np.array([[d[f'B{i+1}'] for i in range(5)] for d in current_batch])

                # Kalman 필터와 정규화 적용
                filtered_rssi = self.rssi_processor.apply_kalman_filter(rssi_data)
                normalized_rssi = self.rssi_processor.custom_normalization(filtered_rssi)

                return normalized_rssi.flatten()  # 1차원 배열로 변환하여 반환
            except KeyError as e:
                print(f"Missing expected RSSI keys in data: {e}")
                return None
            except Exception as e:
                print(f"Error processing real-time data: {e}")
                return None
        else:
            # 데이터가 부족한 경우
            print(f"Not enough data for processing. Current buffer size: {len(self.buffer)}")
            return None

# 실시간 프로세서 초기화
real_time_processor = RealTimeProcessor(window_size=10)

# 클라이언트 연결 이벤트 처리
@socketio.on('connect')
def handle_connect():
    print('Client connected')

# 메시지 수신 및 처리
@socketio.on('message')
def handle_message(message):
    try:
        # JSON 데이터 파싱
        parsed_message = json.loads(message)
        scanner_id = parsed_message.get('scanner_id', None)
        data = parsed_message.get('data', [])

        if scanner_id is None or not isinstance(data, list) or len(data) == 0:
            raise ValueError("Invalid message: 'scanner_id' or 'data' is missing or empty.")

        print(f"📩 Received data from scanner {scanner_id}: {data}")

        # 실시간 데이터 처리
        processed_data = real_time_processor.process_data(data)
        if processed_data is not None:
            # 모델 예측 수행
            prediction = model.predict([processed_data])[0]  # 1차원 배열로 예측

            # 결과 생성 및 전송
            result = {
                'scanner_id': scanner_id,
                'floor': 3,
                'zone': int(prediction),
                'timestamp': data[-1].get('timestamp', 'unknown')
            }
            print(f"📤 Sending prediction result: {result}")
            emit('message', json.dumps(result))  # 결과를 클라이언트로 전송
        else:
            print("Not enough data for prediction.")
    except Exception as e:
        print(f"An error occurred during processing: {str(e)}")

# 클라이언트 연결 해제 이벤트 처리
@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# 서버 실행
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
