CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('END_USER', 'DRIVER', 'OPERATOR') NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Buildings (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE Lockers (
    locker_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    locker_number VARCHAR(20) NOT NULL,
    UNIQUE (building_id, locker_number),
    FOREIGN KEY (building_id) REFERENCES Buildings(building_id)
) ENGINE=InnoDB;

CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_code VARCHAR(30) NOT NULL UNIQUE,
    low_battery_reported BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE Packages (
    package_id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(7) NOT NULL UNIQUE,
    recipient_user_id INT NOT NULL,
    driver_user_id INT NULL,
    vehicle_id INT NULL,
    locker_id INT NOT NULL,
    weight_lbs DECIMAL(6,2) NOT NULL,
    length_in DECIMAL(6,2) NOT NULL,
    width_in DECIMAL(6,2) NOT NULL,
    height_in DECIMAL(6,2) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent')
        NOT NULL DEFAULT 'low',
    status ENUM(
        'AVAILABLE', 'CLAIMED', 'LOADED', 'EN_ROUTE', 'DELIVERED'
    ) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipient_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (driver_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    FOREIGN KEY (locker_id) REFERENCES Lockers(locker_id),

    CHECK (weight_lbs > 0 AND weight_lbs <= 150),
    CHECK (length_in > 0),
    CHECK (width_in > 0),
    CHECK (height_in > 0)
) ENGINE=InnoDB;

CREATE TABLE TransitEvents (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    changed_by_user_id INT NOT NULL,
    status ENUM(
        'AVAILABLE', 'CLAIMED', 'LOADED', 'EN_ROUTE', 'DELIVERED'
    ) NOT NULL,
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (package_id) REFERENCES Packages(package_id),
    FOREIGN KEY (changed_by_user_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;

CREATE TABLE DeliveryConfirmations (
    confirmation_id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    signed_name VARCHAR(100) NOT NULL,
    confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (package_id) REFERENCES Packages(package_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;

CREATE TABLE DeliveryPreferences (
    user_id INT PRIMARY KEY,
    building_id INT NOT NULL,
    delivery_location ENUM('room', 'locker') NOT NULL DEFAULT 'locker',
    room_number VARCHAR(20) NULL,
    notify_transit BOOLEAN NOT NULL DEFAULT FALSE,
    notify_delivered BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (building_id) REFERENCES Buildings(building_id)
) ENGINE=InnoDB;