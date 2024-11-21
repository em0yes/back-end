from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import json
import pickle
import numpy as np
import pandas as pd
from pykalman import KalmanFilter

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 모델 로드
base_path = os.path.dirname(os.path.realpath(__file__))
model_path = os.path.join(base_path, 'train_model_nodir.pkl')

try:
    print(f"모델 파일 경로: {model_path}")
    with open(model_path, 'rb') as model_file:
        model = pickle.load(model_file)
except Exception as e:
    print(f"모델 로드 중 오류 발생: {str(e)}")
    model = None

# 칼만 필터 생성 함수
def create_kalman_filter(state_mean=-65, state_covariance=1, obs_covariance=0.3, trans_covariance=0.3):
    return KalmanFilter(
        initial_state_mean=state_mean,
        initial_state_covariance=state_covariance,
        transition_matrices=[[1]],
        observation_matrices=[[1]],
        observation_covariance=obs_covariance,
        transition_covariance=trans_covariance
    )

# 칼만 필터 적용 함수
def apply_kalman_filter(series, kf):
    series_filtered = series.replace(0, np.nan)
    if series_filtered.dropna().empty:
        return pd.Series([-200], index=series.index)
    filtered_state_means, _ = kf.smooth(series_filtered.dropna().values)
    filtered_series = pd.Series(filtered_state_means.flatten(), index=series_filtered.dropna().index)
    filtered_series = filtered_series.reindex(series.index).interpolate().fillna(-200).round(2)
    return filtered_series

# 지수 이동평균 함수
def exponential_moving_average(data, alpha=0.2):
    filtered_data = [data.iloc[0]]  # 첫 번째 값 유지
    for i in range(1, len(data)):
        new_value = alpha * data.iloc[i] + (1 - alpha) * filtered_data[i - 1]
        filtered_data.append(new_value)
    return pd.Series(filtered_data, index=data.index)

# 정규화 함수
def custom_normalization(data, min_value=-200, max_value=-40):
    return (data - min_value) / (max_value - min_value)

# 데이터 처리 함수 (테스트 코드에서 이동 평균, 칼만 필터, 정규화까지 반영)
def process_data(df):
    # 이동 평균 계산 (최근 10개 데이터 기준)
    for col in ['B1', 'B2', 'B3', 'B4', 'B5']:
        rolling_mean = df[col].rolling(window=10, min_periods=1).mean()
        rolling_mean = rolling_mean.apply(lambda x: -200 if x == 0 else x)  # 평균값이 0이면 -200으로 대체
        df[col] = rolling_mean

    # 칼만 필터 및 지수 이동평균 적용
    for col in ['B1', 'B2', 'B3', 'B4', 'B5']:
        initial_mean = df[col].replace(0, np.nan).dropna().iloc[0] if not df[col].replace(0, np.nan).dropna().empty else -65
        kf = create_kalman_filter(state_mean=initial_mean)
        filtered_series = apply_kalman_filter(df[col], kf)
        df[col] = exponential_moving_average(filtered_series, alpha=0.2)

    # 정규화 적용
    for col in ['B1', 'B2', 'B3', 'B4', 'B5']:
        df[col] = custom_normalization(df[col])

    return df

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('message')
def handle_message(message):
    try:
        data = json.loads(message)
        if isinstance(data, list) and len(data) > 0:
            feature_names = ['B1', 'B2', 'B3', 'B4', 'B5']
            df = pd.DataFrame(data)

            # 데이터 확인
            # print(f"Received DataFrame: {df}")

            # 데이터 전처리
            df = process_data(df)
            # 각 컬럼의 평균 계산
            averaged_row = df[feature_names].mean().to_frame().T
            averaged_row['scanner_id'] = df['scanner_id'].iloc[0]  # 동일한 scanner_id 사용
            averaged_row['TimeStamp'] = df['TimeStamp'].iloc[-1]  # 가장 최근 타임스탬프 사용

            # 모델 예측
            model_input = averaged_row[feature_names].fillna(0)  # 모델에 필요한 입력값 구성
            predicted_zone = model.predict(model_input)
            predicted_zone = int(predicted_zone)  # NumPy 데이터를 Python int로 변환
            result = {
                'scanner_id': int(averaged_row['scanner_id'].iloc[0]),  # 필요한 경우 int 변환
                'floor': 3,  # 하드코딩된 층 정보
                'zone': predicted_zone,
                'timestamp': str(averaged_row['TimeStamp'].iloc[0])  # 날짜를 문자열로 변환
            }

            # 예측 결과 출력
            print(f"Predicted Zone: {predicted_zone}")

            emit('message', json.dumps(result))
        else:
            print("Received invalid data structure or empty list.")
    except Exception as e:
        print(f"An error occurred during processing: {str(e)}")

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
