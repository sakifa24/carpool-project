

DROP DATABASE IF EXISTS carpool_db;
CREATE DATABASE carpool_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE carpool_db;


CREATE TABLE student (
    student_id        INT AUTO_INCREMENT PRIMARY KEY,
    university_id     VARCHAR(50)  NOT NULL UNIQUE,
    name              VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    phone             VARCHAR(20)  NULL,
    password          VARCHAR(255) NOT NULL,          -- bcrypt hash
    credibility_score  DECIMAL(4,2) NOT NULL DEFAULT 5.00,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE vehicle (
    vehicle_id         INT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    default_capacity   INT NOT NULL,
    vehicle_type       VARCHAR(50)  NOT NULL,   -- e.g. sedan, SUV, van
    max_group_size     INT NOT NULL,
    fare_split_enable  BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;


CREATE TABLE ride_group (
    ride_group_id   INT AUTO_INCREMENT PRIMARY KEY,
    departure_time  DATETIME NOT NULL,
    max_capacity    INT NOT NULL,
    current_count   INT NOT NULL DEFAULT 0,
    status          ENUM('open','full','in_progress','completed','cancelled')
                        NOT NULL DEFAULT 'open',
    total_fare      DECIMAL(10,2) NULL,
    vehicle_id      INT NOT NULL,
    host_id         INT NOT NULL,

    CONSTRAINT fk_ridegroup_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_ridegroup_host
        FOREIGN KEY (host_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE rider (
    rider_id       INT AUTO_INCREMENT PRIMARY KEY,
    student_id     INT NOT NULL,
    ride_group_id  INT NOT NULL,
    joined_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rider_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_rider_ridegroup
        FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

   
    CONSTRAINT uq_rider_student_group UNIQUE (student_id, ride_group_id)
) ENGINE=InnoDB;


CREATE TABLE ride_request (
    ride_request_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id       INT NOT NULL,
    ride_group_id    INT NOT NULL,
    fare_share       DECIMAL(10,2) NULL,
    status           ENUM('pending','accepted','rejected','cancelled')
                          NOT NULL DEFAULT 'pending',
    direction        VARCHAR(255) NOT NULL,
    departure_time   DATETIME NOT NULL,

    CONSTRAINT fk_riderequest_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_riderequest_ridegroup
        FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Table: payment
-- Purpose: A payment made by a student that settles exactly
--          one ride request.
-- Relationships:
--   - MAKES:   student (1) -> payment (N)
--   - SETTLES: payment (1) -> ride_request (1)
-- ---------------------------------------------------------
CREATE TABLE payment (
    payment_id       INT AUTO_INCREMENT PRIMARY KEY,
    student_id       INT NOT NULL,
    ride_request_id  INT NOT NULL UNIQUE,   -- enforces 1:1 with ride_request
    status           ENUM('pending','completed','failed','refunded')
                          NOT NULL DEFAULT 'pending',
    fare             DECIMAL(10,2) NOT NULL,
    paid_at          TIMESTAMP NULL,

    CONSTRAINT fk_payment_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_payment_riderequest
        FOREIGN KEY (ride_request_id) REFERENCES ride_request(ride_request_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Table: review
-- Purpose: A review written by a student.
-- Relationships:
--   - WRITES: student (1) -> review (N)
-- Note: No target entity per diagram (Stage 1 assumption #2).
-- ---------------------------------------------------------
CREATE TABLE review (
    review_id     INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    rating_point  TINYINT NOT NULL,
    comment       TEXT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT chk_review_rating CHECK (rating_point BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Table: chat_message
-- Purpose: A chat message sent by a student.
-- Relationships:
--   - SENDS: student (1) -> chat_message (N)
-- Note: No ride_group FK per diagram (Stage 1 assumption #3).
-- ---------------------------------------------------------
CREATE TABLE chat_message (
    message_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT NOT NULL,
    content     TEXT NOT NULL,
    timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatmessage_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ride_stop (
    stop_id       INT AUTO_INCREMENT PRIMARY KEY,
    ride_group_id INT NOT NULL,
    stop_order    INT NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    stop_type     ENUM('pickup','dropoff') NOT NULL,
    CONSTRAINT fk_stop_ridegroup
        FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE INDEX idx_ridegroup_status ON ride_group(status);
CREATE INDEX idx_riderequest_status ON ride_request(status);
CREATE INDEX idx_payment_status ON payment(status);