UPDATE fixed_beacons
SET mac_address = '60:98:66:32:CA:74'
WHERE id = 5;

UPDATE fixed_beacons
SET mac_address = '60:98:66:32:8E:28'
WHERE id = 2;


-- UPDATE fixed_beacons
-- SET mac_address = '60:98:66:2F:CF:9F'
-- WHERE id = 5;

-- UPDATE fixed_beacons
-- SET mac_address = '60:98:66:32:B8:EF'
-- WHERE id = 2;

TRUNCATE TABLE current_rssi_measurements;
TRUNCATE TABLE estimated_locations;