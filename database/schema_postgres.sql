-- =========================================================
-- CARPOOL MANAGEMENT SYSTEM - POSTGRESQL DATABASE SCHEMA
-- Target Database: PostgreSQL 12+
-- =========================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS chat_message CASCADE;
DROP TABLE IF EXISTS chat_participant CASCADE;
DROP TABLE IF EXISTS chat_room CASCADE;
DROP TABLE IF EXISTS match_request CASCADE;
DROP TABLE IF EXISTS rider CASCADE;
DROP TABLE IF EXISTS ride_request CASCADE;
DROP TABLE IF EXISTS ride_stop CASCADE;
DROP TABLE IF EXISTS ride_group CASCADE;
DROP TABLE IF EXISTS vehicle CASCADE;
DROP TABLE IF EXISTS student CASCADE;

-- =========================================================
-- TABLE: student
-- =========================================================
CREATE TABLE student (
    student_id         SERIAL PRIMARY KEY,
    university_id      VARCHAR(50)  NOT NULL UNIQUE,
    name               VARCHAR(100) NOT NULL,
    email              VARCHAR(150) NOT NULL UNIQUE,
    phone              VARCHAR(20)  NULL,
    password           VARCHAR(255) NOT NULL,
    credibility_score  NUMERIC(4,2) NOT NULL DEFAULT 5.00,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_student_credibility
        CHECK (credibility_score BETWEEN 0.00 AND 5.00)
);

-- =========================================================
-- TABLE: vehicle
-- =========================================================
CREATE TABLE vehicle (
    vehicle_id         SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    default_capacity   INT NOT NULL,
    vehicle_type       VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('auto', 'cng', 'car')),
    max_group_size     INT NOT NULL,
    fare_split_enable  BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_vehicle_capacity
        CHECK (default_capacity > 0),

    CONSTRAINT chk_vehicle_group_size
        CHECK (max_group_size > 0)
);

-- =========================================================
-- TABLE: ride_group
-- =========================================================
CREATE TABLE ride_group (
    ride_group_id   SERIAL PRIMARY KEY,
    departure_time  TIMESTAMP NOT NULL,
    max_capacity    INT NOT NULL,
    current_count   INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')),
    total_fare      NUMERIC(10,2) NOT NULL,
    vehicle_id      INT NOT NULL,
    host_id         INT NOT NULL,
    notes           VARCHAR(255) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ridegroup_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicle(vehicle_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_ridegroup_host
        FOREIGN KEY (host_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_ridegroup_capacity
        CHECK (max_capacity > 0),

    CONSTRAINT chk_ridegroup_current_count
        CHECK (current_count >= 0),

    CONSTRAINT chk_ridegroup_count_capacity
        CHECK (current_count <= max_capacity),

    CONSTRAINT chk_ridegroup_fare
        CHECK (total_fare >= 0)
);

-- =========================================================
-- TABLE: ride_stop
-- =========================================================
CREATE TABLE ride_stop (
    stop_id          SERIAL PRIMARY KEY,
    ride_group_id    INT NOT NULL,
    stop_order       INT NOT NULL,
    location_name    VARCHAR(150) NOT NULL,
    stop_type        VARCHAR(20) NOT NULL CHECK (stop_type IN ('pickup', 'dropoff')),

    CONSTRAINT fk_stop_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_stop_order
        CHECK (stop_order > 0),

    CONSTRAINT uq_ridegroup_stop_order
        UNIQUE (ride_group_id, stop_order)
);

-- =========================================================
-- TABLE: ride_request
-- =========================================================
CREATE TABLE ride_request (
    ride_request_id  SERIAL PRIMARY KEY,
    student_id       INT NOT NULL,
    ride_group_id    INT NOT NULL,
    fare_share       NUMERIC(10,2) NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    pickup_point     VARCHAR(150) NULL,
    dropoff_point    VARCHAR(150) NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_riderequest_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_riderequest_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_ride_request_fare
        CHECK (fare_share IS NULL OR fare_share >= 0),

    CONSTRAINT uq_student_ride_request
        UNIQUE (student_id, ride_group_id)
);

-- =========================================================
-- TABLE: rider
-- =========================================================
CREATE TABLE rider (
    rider_id        SERIAL PRIMARY KEY,
    student_id      INT NOT NULL,
    ride_group_id   INT NOT NULL,
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rider_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_rider_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_rider_student_group
        UNIQUE (student_id, ride_group_id)
);

-- =========================================================
-- TABLE: match_request (AUTO MATCHING ENGINE)
-- =========================================================
CREATE TABLE match_request (
    match_request_id SERIAL PRIMARY KEY,
    student_id       INT NOT NULL,
    pickup_location  VARCHAR(150) NOT NULL,
    destination      VARCHAR(150) NOT NULL,
    preferred_vehicle VARCHAR(20) NOT NULL DEFAULT 'any'
                    CHECK (preferred_vehicle IN ('auto', 'cng', 'car', 'any')),
    target_time      TIMESTAMP NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'matched', 'expired', 'cancelled')),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_matchrequest_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- =========================================================
-- TABLE: chat_room (Group Chat linked to ride_group_id)
-- =========================================================
CREATE TABLE chat_room (
    chat_room_id     SERIAL PRIMARY KEY,
    ride_group_id    INT NOT NULL UNIQUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatroom_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- =========================================================
-- TABLE: chat_participant
-- =========================================================
CREATE TABLE chat_participant (
    chat_room_id  INT NOT NULL,
    student_id    INT NOT NULL,
    joined_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (chat_room_id, student_id),

    CONSTRAINT fk_chatparticipant_room
        FOREIGN KEY (chat_room_id)
        REFERENCES chat_room(chat_room_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_chatparticipant_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- =========================================================
-- TABLE: chat_message
-- =========================================================
CREATE TABLE chat_message (
    message_id    SERIAL PRIMARY KEY,
    chat_room_id  INT NOT NULL,
    student_id    INT NOT NULL,
    content       TEXT NOT NULL,
    timestamp     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatmessage_room
        FOREIGN KEY (chat_room_id)
        REFERENCES chat_room(chat_room_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_chatmessage_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- =========================================================
-- TABLE: payment
-- =========================================================
CREATE TABLE payment (
    payment_id       SERIAL PRIMARY KEY,
    student_id       INT NOT NULL,
    ride_group_id    INT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    fare             NUMERIC(10,2) NOT NULL,
    payment_method   VARCHAR(20) NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'bkash', 'nagad')),
    paid_at          TIMESTAMP NULL,

    CONSTRAINT fk_payment_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_payment_fare
        CHECK (fare >= 0)
);

-- =========================================================
-- TABLE: review
-- =========================================================
CREATE TABLE review (
    review_id            SERIAL PRIMARY KEY,
    ride_group_id        INT NOT NULL,
    reviewer_id          INT NOT NULL,
    reviewed_student_id  INT NOT NULL,
    rating_point         SMALLINT NOT NULL CHECK (rating_point BETWEEN 1 AND 5),
    comment              TEXT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_ridegroup
        FOREIGN KEY (ride_group_id)
        REFERENCES ride_group(ride_group_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_review_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_review_reviewed
        FOREIGN KEY (reviewed_student_id)
        REFERENCES student(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_review_per_ride
        UNIQUE (ride_group_id, reviewer_id, reviewed_student_id)
);

-- Indexes
CREATE INDEX idx_ride_stop_location ON ride_stop (location_name, stop_type);
CREATE INDEX idx_ride_group_status_time ON ride_group (status, departure_time);
CREATE INDEX idx_match_request_active ON match_request (status, destination, target_time);
CREATE INDEX idx_chat_message_room_time ON chat_message (chat_room_id, timestamp);
