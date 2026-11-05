START TRANSACTION;

INSERT INTO Users
    (user_id, full_name, email, password_hash, role)
VALUES
    (1, 'Cole Gibeau', 'cole@example.com',
     'DEMO_ACCOUNT_DISABLED', 'END_USER'),
    (2, 'Demo Driver', 'driver@example.com',
     'DEMO_ACCOUNT_DISABLED', 'DRIVER'),
    (3, 'Demo Operator', 'operator@example.com',
     'DEMO_ACCOUNT_DISABLED', 'OPERATOR');

INSERT INTO Buildings (building_id, building_name)
VALUES
    (1, 'CSU'),
    (2, 'Armstrong Hall'),
    (3, 'Memorial Library'),
    (4, 'Wissink Hall');

-- Locker numbers are unique within each building.
INSERT INTO Lockers (building_id, locker_number)
SELECT building_id, 'L100' FROM Buildings
UNION ALL
SELECT building_id, 'L105' FROM Buildings
UNION ALL
SELECT building_id, 'L110' FROM Buildings
UNION ALL
SELECT building_id, 'L115' FROM Buildings;

INSERT INTO Vehicles (vehicle_id, vehicle_code)
VALUES (1, 'eCart-12');

INSERT INTO Packages (
    tracking_number,
    recipient_user_id,
    locker_id,
    weight_lbs,
    length_in,
    width_in,
    height_in,
    priority
)
VALUES
    (
        'PKG1001',
        1,
        (SELECT locker_id FROM Lockers
         WHERE building_id = 1 AND locker_number = 'L105'),
        5.50, 12.00, 8.00, 6.00,
        'medium'
    ),
    (
        'PKG1002',
        1,
        (SELECT locker_id FROM Lockers
         WHERE building_id = 3 AND locker_number = 'L110'),
        2.25, 10.00, 6.00, 4.00,
        'high'
    );

-- Record the operator's initial package entries.
INSERT INTO TransitEvents (
    package_id,
    changed_by_user_id,
    status
)
SELECT package_id, 3, status
FROM Packages
WHERE tracking_number IN ('PKG1001', 'PKG1002');

INSERT INTO DeliveryPreferences (
    user_id,
    building_id,
    delivery_location,
    notify_transit,
    notify_delivered
)
VALUES (1, 1, 'locker', TRUE, TRUE);

COMMIT;