-- UPDATE fixed_beacons
-- SET mac_address = '60:98:66:32:CA:74'
-- WHERE id = 5;

UPDATE fixed_beacons
SET mac_address = '60:98:66:2F:CF:9F'
WHERE id = 5;

TRUNCATE TABLE current_rssi_measurements;
TRUNCATE TABLE estimated_locations;