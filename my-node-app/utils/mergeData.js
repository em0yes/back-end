// 병합 로직
function mergeData(data) {
    const merged = {
        TimeStamp: data[0].timestamp, // 가장 첫 번째 데이터의 타임스탬프 사용
        scanner_id: data[0].scanner_id,
        B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, // 기본값 0으로 초기화
    };

    // 데이터 매핑
    data.forEach(({ fixed_beacon_id, rssi }) => {
        merged[`B${fixed_beacon_id}`] = rssi;
    });

    return merged;
}

module.exports = mergeData;
