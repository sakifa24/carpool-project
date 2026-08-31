-- =========================================================
-- CARPOOL MANAGEMENT SYSTEM - POSTGRESQL POPULATION DATA
-- Target Database: PostgreSQL 12+
-- Password for all seed users: "password123"
-- =========================================================

-- 1. STUDENTS
INSERT INTO student
    (university_id, name, email, phone, password, credibility_score)
VALUES
    ('2026001', 'Aisha Rahman', 'aisha@bracu.ac.bd', '01710000001',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.80),

    ('2026002', 'Rahim Ahmed', 'rahim@bracu.ac.bd', '01710000002',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.50),

    ('2026003', 'Karim Hasan', 'karim@bracu.ac.bd', '01710000003',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.70),

    ('2026004', 'Nusrat Jahan', 'nusrat@bracu.ac.bd', '01710000004',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.90),

    ('2026005', 'Tanvir Hossain', 'tanvir@bracu.ac.bd', '01710000005',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.20),

    ('2026006', 'Sadia Islam', 'sadia@bracu.ac.bd', '01710000006',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.60),

    ('2026007', 'Fahim Chowdhury', 'fahim@bracu.ac.bd', '01710000007',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.30),

    ('2026008', 'Mim Akter', 'mim@bracu.ac.bd', '01710000008',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.75),

    ('2026009', 'Shafin Islam', 'shafin@bracu.ac.bd', '01710000009',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.10),

    ('2026010', 'Tania Sultana', 'tania@bracu.ac.bd', '01710000010',
     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.85);

-- 2. VEHICLES
INSERT INTO vehicle
    (vehicle_id, name, default_capacity, vehicle_type, max_group_size, fare_split_enable)
VALUES
    (1, 'Auto Rickshaw', 3, 'auto', 3, TRUE),
    (2, 'CNG Auto',      3, 'cng',  3, TRUE),
    (3, 'Sedan Car',     4, 'car',  4, TRUE);

-- 3. RIDE GROUPS
INSERT INTO ride_group
    (ride_group_id, departure_time, max_capacity, current_count, status, total_fare, vehicle_id, host_id, notes)
VALUES
    (1, '2026-08-26 14:30:00', 3, 2, 'open', 180.00, 1, 1, 'Leaving from gate 1, looking for 1 more person to split.'),
    (2, '2026-08-26 15:00:00', 3, 1, 'open', 210.00, 2, 2, 'Fast CNG ride to Dhanmondi 27.'),
    (3, '2026-08-26 15:30:00', 4, 2, 'open', 300.00, 3, 3, 'AC Sedan, comfortable commute.'),
    (4, '2026-08-26 16:00:00', 3, 1, 'open', 240.00, 2, 4, 'Going via Gulshan 1 & 2.'),
    (5, '2026-08-26 16:30:00', 4, 1, 'open', 350.00, 3, 5, 'Uttara Sector 7 via Airport Road.'),
    (6, '2026-08-26 17:00:00', 3, 1, 'open', 200.00, 1, 6, 'Quick dropoff at Banani 11.'),
    (7, '2026-08-25 10:30:00', 4, 3, 'completed', 250.00, 3, 7, 'Mirpur 10 roundabout.');

-- 4. RIDE STOPS
INSERT INTO ride_stop
    (ride_group_id, stop_order, location_name, stop_type)
VALUES
    (1, 1, 'BRAC University', 'pickup'),
    (1, 2, 'Dhanmondi', 'dropoff'),
    (2, 1, 'BRAC University', 'pickup'),
    (2, 2, 'Dhanmondi', 'dropoff'),
    (3, 1, 'BRAC University', 'pickup'),
    (3, 2, 'Dhanmondi', 'dropoff'),
    (4, 1, 'BRAC University', 'pickup'),
    (4, 2, 'Gulshan', 'dropoff'),
    (5, 1, 'BRAC University', 'pickup'),
    (5, 2, 'Uttara', 'dropoff'),
    (6, 1, 'BRAC University', 'pickup'),
    (6, 2, 'Banani', 'dropoff'),
    (7, 1, 'BRAC University', 'pickup'),
    (7, 2, 'Mirpur', 'dropoff');

-- 5. RIDERS
INSERT INTO rider
    (student_id, ride_group_id)
VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7),
    (8, 1), (10, 3), (8, 7), (9, 7);

-- 6. RIDE REQUESTS
INSERT INTO ride_request
    (ride_request_id, student_id, ride_group_id, fare_share, status, pickup_point, dropoff_point)
VALUES
    (1, 8, 1, 90.00, 'accepted', 'Main Gate', 'Dhanmondi 32'),
    (2, 10, 3, 150.00, 'accepted', 'Campus Gate 2', 'Dhanmondi 8/A'),
    (3, 8, 7, 83.33, 'accepted', 'Campus Hub', 'Mirpur 10'),
    (4, 9, 7, 83.33, 'accepted', 'Campus Hub', 'Mirpur 10'),
    (5, 9, 2, 105.00, 'pending', 'BRACU Library Road', 'Dhanmondi 27'),
    (6, 6, 4, 120.00, 'rejected', 'BRACU Entrance', 'Gulshan 2'),
    (7, 8, 5, 175.00, 'cancelled', 'BRACU', 'Uttara 7');

-- 7. CHAT ROOMS & PARTICIPANTS
INSERT INTO chat_room (chat_room_id, ride_group_id) VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7);

INSERT INTO chat_participant (chat_room_id, student_id) VALUES
    (1, 1), (1, 8),
    (2, 2),
    (3, 3), (3, 10),
    (4, 4), (5, 5), (6, 6),
    (7, 7), (7, 8), (7, 9);

-- 8. CHAT MESSAGES
INSERT INTO chat_message (chat_room_id, student_id, content, timestamp) VALUES
    (1, 1, 'Hey everyone! I will be at the main gate at 2:25 PM.', '2026-08-26 14:00:00'),
    (1, 8, 'Got it Aisha! I have a white backpack. See you there.', '2026-08-26 14:05:00'),
    (1, 1, 'Awesome! Auto fare will be 90 tk each.', '2026-08-26 14:06:00'),
    (3, 3, 'Hello Tania! Meeting point is gate 2 parking.', '2026-08-26 15:00:00'),
    (3, 10, 'Thanks Karim! On my way.', '2026-08-26 15:02:00'),
    (7, 7, 'Thanks for riding together everyone! Safe travel.', '2026-08-25 11:30:00'),
    (7, 8, 'Thanks Fahim bhai, great ride!', '2026-08-25 11:31:00');

-- 9. PAYMENTS
INSERT INTO payment (student_id, ride_group_id, status, fare, payment_method, paid_at) VALUES
    (8, 1, 'completed', 90.00, 'bkash', '2026-08-26 14:15:00'),
    (10, 3, 'pending', 150.00, 'cash', NULL),
    (8, 7, 'completed', 83.33, 'bkash', '2026-08-25 11:25:00'),
    (9, 7, 'completed', 83.33, 'nagad', '2026-08-25 11:28:00');

-- 10. REVIEWS
INSERT INTO review (ride_group_id, reviewer_id, reviewed_student_id, rating_point, comment) VALUES
    (7, 8, 7, 5, 'Fahim is an amazing driver and very punctual!'),
    (7, 9, 7, 5, 'Smooth driving and pleasant conversation.'),
    (7, 7, 8, 5, 'Mim arrived right on time at the pickup spot.'),
    (7, 7, 9, 4, 'Friendly co-passenger.');

-- 11. MATCH REQUESTS
INSERT INTO match_request (student_id, pickup_location, destination, preferred_vehicle, target_time, status) VALUES
    (9, 'BRAC University', 'Dhanmondi', 'cng', '2026-08-26 15:15:00', 'active'),
    (6, 'BRAC University', 'Banani', 'auto', '2026-08-26 17:00:00', 'matched');

-- Reset sequences for auto-increment in Postgres
SELECT setval('student_student_id_seq', (SELECT MAX(student_id) FROM student));
SELECT setval('vehicle_vehicle_id_seq', (SELECT MAX(vehicle_id) FROM vehicle));
SELECT setval('ride_group_ride_group_id_seq', (SELECT MAX(ride_group_id) FROM ride_group));
SELECT setval('ride_stop_stop_id_seq', (SELECT MAX(stop_id) FROM ride_stop));
SELECT setval('ride_request_ride_request_id_seq', (SELECT MAX(ride_request_id) FROM ride_request));
SELECT setval('match_request_match_request_id_seq', (SELECT MAX(match_request_id) FROM match_request));
SELECT setval('chat_room_chat_room_id_seq', (SELECT MAX(chat_room_id) FROM chat_room));
SELECT setval('chat_message_message_id_seq', (SELECT MAX(message_id) FROM chat_message));
SELECT setval('payment_payment_id_seq', (SELECT MAX(payment_id) FROM payment));
SELECT setval('review_review_id_seq', (SELECT MAX(review_id) FROM review));
