# from flask import Flask
# from flask_socketio import SocketIO, emit
# from flask_cors import CORS
# import os
# import json
# import pickle
# import numpy as np
# import pandas as pd
# from pykalman import KalmanFilter

# # Flask 애플리케이션 초기화
# app = Flask(__name__)
# CORS(app)  # CORS(Cross-Origin Resource Sharing) 허용
# socketio = SocketIO(app, cors_allowed_origins="*")  # 실시간 통신을 위한 SocketIO 설정

# # 모델 파일 경로 설정
# base_path = os.path.dirname(os.path.realpath(__file__))
# model_path = os.path.join(base_path, 'best_rf_model.pkl')

# # 학습된 모델 로드
# try:
#     print(f"모델 파일 경로: {model_path}")
#     with open(model_path, 'rb') as model_file:
#         model = pickle.load(model_file)  # 저장된 모델 파일 로드
# except Exception as e:
#     print(f"모델 로드 중 오류 발생: {str(e)}")
#     model = None  # 모델 로드 실패 시 None으로 초기화

# # RSSI 처리 클래스 정의
# class RSSIProcessor:
#     """
#     RSSI 데이터를 처리하고 필터링 및 정규화를 수행하는 클래스.
#     """

#     @staticmethod
#     def apply_kalman_filter(data):
#         """
#         Kalman 필터를 적용하여 RSSI 데이터를 필터링.
#         """
#         kf = KalmanFilter(initial_state_mean=0, n_dim_obs=1)  # Kalman 필터 초기화
#         filtered_data = []

#         # 각 비콘 컬럼에 대해 Kalman 필터 적용
#         for i in range(data.shape[1]):
#             beacon_data = data[:, i]
#             mask = beacon_data != 0  # 관측값이 0이 아닌 경우만 필터링
#             smoothed_state_means, _ = kf.em(beacon_data[mask], n_iter=10).smooth(beacon_data[mask])

#             # 필터링된 데이터를 원래 형태로 복원
#             filtered_column = np.full(beacon_data.shape, -200.0)  # 기본값 -200으로 초기화
#             filtered_column[mask] = smoothed_state_means.flatten()
#             filtered_data.append(filtered_column)

#         return np.array(filtered_data).T  # 결과를 원래 형태로 변환

#     @staticmethod
#     def custom_normalization(data, min_value=-200, max_value=0):
#         """
#         데이터를 0~1 범위로 정규화.
#         """
#         return (data - min_value) / (max_value - min_value)

# # 실시간 데이터 처리 함수
# def process_real_time_data(data):
#     """
#     수신된 실시간 데이터를 처리하여 Kalman 필터와 정규화를 적용.
#     """
#     beacon_columns = ['B1', 'B2', 'B3', 'B4', 'B5']  # RSSI 데이터를 포함하는 컬럼명
#     df = pd.DataFrame(data)  # JSON 데이터를 DataFrame으로 변환

#     # RSSI 데이터 추출
#     rssi_data = df[beacon_columns].values

#     # Kalman 필터와 정규화 적용
#     filtered_rssi = RSSIProcessor.apply_kalman_filter(rssi_data)
#     filtered_rssi[filtered_rssi == 0] = -200  # 0 값을 -200으로 대체
#     normalized_rssi = RSSIProcessor.custom_normalization(filtered_rssi)

#     return normalized_rssi

# # 클라이언트 연결 이벤트 처리
# @socketio.on('connect')
# def handle_connect():
#     """
#     클라이언트가 서버에 연결되었을 때 호출되는 이벤트 핸들러.
#     """
#     print('Client connected')

# # # 메시지 수신 및 처리
# # @socketio.on('message')
# # def handle_message(message=None):
# #     """
# #     클라이언트로부터 수신된 메시지를 처리.
# #     메시지는 RSSI 데이터로 구성된 JSON 형식이어야 함.
# #     """
# #     try:
# @app.route('/debug', methods=['POST'])
# def debug():
#     """
#     디버깅용 엔드포인트: 하드코딩된 데이터를 처리.
#     """
#     try:
#         # 하드코딩된 테스트 데이터
#         test_data = [
#             {"TimeStamp": "2024-11-25T07:50:00Z", "scanner_id": 1, "B1": -50, "B2": -60, "B3": -70, "B4": -80, "B5": -90},
#             {"TimeStamp": "2024-11-25T07:50:01Z", "scanner_id": 1, "B1": -45, "B2": -55, "B3": -65, "B4": -75, "B5": -85},
#             {"TimeStamp": "2024-11-25T07:50:02Z", "scanner_id": 1, "B1": -48, "B2": -58, "B3": -68, "B4": -78, "B5": -88},
#             {"TimeStamp": "2024-11-25T07:50:03Z", "scanner_id": 1, "B1": -46, "B2": -56, "B3": -66, "B4": -76, "B5": -86},
#             {"TimeStamp": "2024-11-25T07:50:04Z", "scanner_id": 1, "B1": -49, "B2": -59, "B3": -69, "B4": -79, "B5": -89},
#             {"TimeStamp": "2024-11-25T07:50:05Z", "scanner_id": 1, "B1": -47, "B2": -57, "B3": -67, "B4": -77, "B5": -87},
#             {"TimeStamp": "2024-11-25T07:50:06Z", "scanner_id": 1, "B1": -51, "B2": -61, "B3": -71, "B4": -81, "B5": -91},
#             {"TimeStamp": "2024-11-25T07:50:07Z", "scanner_id": 1, "B1": -52, "B2": -62, "B3": -72, "B4": -82, "B5": -92},
#             {"TimeStamp": "2024-11-25T07:50:08Z", "scanner_id": 1, "B1": -53, "B2": -63, "B3": -73, "B4": -83, "B5": -93},
#             {"TimeStamp": "2024-11-25T07:50:09Z", "scanner_id": 1, "B1": -54, "B2": -64, "B3": -74, "B4": -84, "B5": -94}
#         ]

#         # 데이터 처리 (Kalman Filter 및 Normalization)
#         processed_data = process_real_time_data(test_data)
#         print("🌀 전처리된 데이터:\n", processed_data)

#         # 슬라이딩 윈도우 생성
#         window_size = 10
#         sliding_windows = []
#         for i in range(len(processed_data) - window_size + 1):
#             window = processed_data[i:i + window_size].flatten()
#             sliding_windows.append(window)
#         print(f"🔍 윈도우 {i + 1} 데이터:\n", window)  # 이 부분에서 합친 데이터를 출력
#         print(f"📏 슬라이딩 윈도우 생성 완료. 윈도우 개수: {len(sliding_windows)}")

#         # 모델 예측 수행
#         predictions = []
#         for idx, window in enumerate(sliding_windows):
#             prediction = model.predict([window])[0]
#             predictions.append(prediction)
#             print(f"📊 윈도우 {idx + 1} 예측값: {prediction}")

#         # 가장 최근 예측값 생성
#         latest_prediction = predictions[-1] if predictions else -1
#         result = {
#             'scanner_id': test_data[-1]['scanner_id'],
#             'floor': 3,
#             'zone': int(latest_prediction),
#             'timestamp': test_data[-1]['TimeStamp']
#         }
#         print("📤 예측 결과:", result)
#         return result

#     except Exception as e:
#         print(f"🔥 디버깅 처리 중 오류 발생: {str(e)}")
#         return {"error": str(e)}, 500



# # 클라이언트 연결 해제 이벤트 처리
# @socketio.on('disconnect')
# def handle_disconnect():
#     """
#     클라이언트가 서버와의 연결을 해제했을 때 호출되는 이벤트 핸들러.
#     """
#     print('Client disconnected')

# # 서버 실행
# if __name__ == '__main__':
#     socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)

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
    """
    RSSI 데이터를 처리하고 필터링 및 정규화를 수행하는 클래스.
    """
    def __init__(self):
        self.kalman_filters = None

    def initialize_kalman_filters(self, num_beacons):
        """
        칼만 필터를 각 비콘에 대해 초기화.
        """
        self.kalman_filters = [KalmanFilter(initial_state_mean=0, n_dim_obs=1) for _ in range(num_beacons)]

    def apply_kalman_filter(self, data):
        """
        Kalman 필터를 적용하여 실시간 데이터를 필터링.
        """
        if self.kalman_filters is None:
            self.initialize_kalman_filters(data.shape[1])

        filtered_data = []
        for i, kf in enumerate(self.kalman_filters):
            beacon_data = data[:, i]
            mask = beacon_data != 0  # 관측값이 0이 아닌 경우만 필터링
            
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
        """
        데이터를 0~1 범위로 정규화.
        """
        return (data - min_value) / (max_value - min_value)

# 실시간 데이터 처리 클래스
class RealTimeProcessor:
    def __init__(self, window_size):
        self.window_size = window_size
        self.buffer = []
        self.rssi_processor = RSSIProcessor()

    def process_data(self, data):
        """
        데이터를 버퍼에 추가하고, 충분히 쌓이면 칼만 필터와 정규화를 적용한 슬라이딩 윈도우를 반환.
        """
        self.buffer.extend(data)
        if len(self.buffer) >= self.window_size:
            # 최근 window_size개의 데이터를 추출
            current_window = self.buffer[-self.window_size:]
            try:
                rssi_data = np.array([[d[f'B{i+1}'] for i in range(5)] for d in current_window])
                # 칼만 필터와 정규화 적용
                filtered_rssi = self.rssi_processor.apply_kalman_filter(rssi_data)
                normalized_rssi = self.rssi_processor.custom_normalization(filtered_rssi)
                return normalized_rssi
            except KeyError as e:
                print(f"Missing expected RSSI keys in data: {e}")
                return None
            except Exception as e:
                print(f"Error processing real-time data: {e}")
                return None
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
        
        if isinstance(data, list) and len(data) > 0:
            # 실시간 데이터 처리
            processed_data = real_time_processor.process_data(data)
            if processed_data is not None:
                # 모델 예측 수행
                prediction = model.predict([processed_data.flatten()])[0]  # 단일 윈도우 예측
                
                # 결과 생성 및 전송
                result = {
                    'scanner_id': scanner_id,
                    'floor': 3,
                    'zone': int(prediction),
                    'timestamp': data[-1].get('TimeStamp', 'unknown')
                }
                emit('message', json.dumps(result))  # 결과를 클라이언트로 전송
            else:
                print("Not enough data for prediction.")
        else:
            print("Invalid or empty data received.")
    except Exception as e:
        print(f"An error occurred during processing: {str(e)}")

# 클라이언트 연결 해제 이벤트 처리
@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# 서버 실행
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
