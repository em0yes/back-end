from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import json
import pickle
import numpy as np
from pykalman import KalmanFilter
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 모델 로드
base_path = os.path.dirname(os.path.realpath(__file__))
model_path = os.path.join(base_path, 'best_rf_model.pkl')
try:
    print(f"모델 파일 경로: {model_path}")
    with open(model_path, 'rb') as model_file:
        model = pickle.load(model_file)
except FileNotFoundError:
    print(f"모델 파일을 찾을 수 없습니다: {model_path}")
    model = None

class RSSIProcessor:
    def __init__(self):
        self.kalman_filters = None

    def initialize_kalman_filters(self, num_beacons):
        self.kalman_filters = [KalmanFilter(initial_state_mean=0, n_dim_obs=1) for _ in range(num_beacons)]

    def apply_kalman_filter(self, data):
        if data.shape[1] != len(self.kalman_filters):
            print("칼만 필터 초기화")
            self.initialize_kalman_filters(data.shape[1])
        filtered_data = []
        for i, kf in enumerate(self.kalman_filters):
            beacon_data = data[:, i]
            mask = beacon_data != 0
            if np.any(mask):
                try:
                    smoothed_state_means, _ = kf.em(beacon_data[mask], n_iter=1).smooth(beacon_data[mask])
                    filtered_column = np.full(beacon_data.shape, -200.0)
                    filtered_column[mask] = smoothed_state_means.flatten()
                except Exception as e:
                    print(f"Kalman filter failed: {e}")
                    filtered_column = np.full(beacon_data.shape, -200.0)
            else:
                filtered_column = np.full(beacon_data.shape, -200.0)
            filtered_data.append(filtered_column)
        return np.array(filtered_data).T

    @staticmethod
    def custom_normalization(data, min_value=-200, max_value=0):
        return (data - min_value) / (max_value - min_value)

class RealTimeProcessor:
    def __init__(self, window_size):
        self.window_size = window_size
        self.buffer = []
        self.rssi_processor = RSSIProcessor()

    def process_data(self, data):
        self.buffer.extend(data)
        if len(self.buffer) >= self.window_size:
            current_window = self.buffer[-self.window_size:]
            try:
                rssi_data = np.array([[d.get(f'B{i+1}', -200) for i in range(5)] for d in current_window])
                filtered_rssi = self.rssi_processor.apply_kalman_filter(rssi_data)
                normalized_rssi = self.rssi_processor.custom_normalization(filtered_rssi)
                return normalized_rssi
            except Exception as e:
                print(f"Data processing error: {e}")
                return None
        return None

real_time_processor = RealTimeProcessor(window_size=10)

@socketio.on('connect')
def handle_connect():
    print('클라이언트 연결됨')

@socketio.on('disconnect')
def handle_disconnect():
    print('클라이언트 연결 해제됨')

@socketio.on('message')
def handle_message(message):
    try:
        data = json.loads(message)
        if isinstance(data, list) and len(data) > 0:
            processed_data = real_time_processor.process_data(data)
            if processed_data is not None:
                prediction = model.predict([processed_data.flatten()])[0]
                result = {
                    'scanner_id': data[-1].get('scanner_id', -1),
                    'floor': 3,
                    'zone': int(prediction),
                    'timestamp': data[-1].get('TimeStamp', 'unknown')
                }
                emit('message', json.dumps(result))
            else:
                print("Not enough data for prediction.")
    except Exception as e:
        print(f"Error during message handling: {e}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
