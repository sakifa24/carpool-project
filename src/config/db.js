const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let dbType = 'sqlite';
let sqlDb = null;
let mysqlPool = null;
let dbFilePath = null;
let isInitialized = false;

async function initDatabase() {
  if (isInitialized) return;

  const useMySQL = process.env.DB_TYPE === 'mysql';

  if (useMySQL) {
    try {
      const mysql = require('mysql2/promise');
      mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'carpool_db',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      dbType = 'mysql';
      isInitialized = true;
      console.log('Connected to MySQL Database: carpool_db');
      return;
    } catch (err) {
      console.warn('MySQL initialization failed, falling back to embedded SQLite:', err.message);
    }
  }

  // Fallback to pure WebAssembly SQLite (sql.js)
  try {
    const SQL = await initSqlJs();
    const dbDir = path.join(__dirname, '..', '..', 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbFilePath = path.join(dbDir, 'carpool.sqlite');
    let exists = fs.existsSync(dbFilePath);

    if (exists) {
      const filebuffer = fs.readFileSync(dbFilePath);
      sqlDb = new SQL.Database(filebuffer);
      console.log('Loaded existing SQLite database:', dbFilePath);
    } else {
      sqlDb = new SQL.Database();
      console.log('Initializing new SQLite database from schema & population data...');
      seedSQLite(sqlDb);
      saveDbToDisk();
    }

    dbType = 'sqlite';
    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

function saveDbToDisk() {
  if (sqlDb && dbFilePath) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  }
}

function seedSQLite(db) {
  // Create tables in SQLite compatible syntax
  db.exec(`
    CREATE TABLE IF NOT EXISTS student (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password TEXT NOT NULL,
      credibility_score REAL NOT NULL DEFAULT 5.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicle (
      vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_capacity INTEGER NOT NULL,
      vehicle_type TEXT CHECK(vehicle_type IN ('auto', 'cng', 'car')) NOT NULL,
      max_group_size INTEGER NOT NULL,
      fare_split_enable INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ride_group (
      ride_group_id INTEGER PRIMARY KEY AUTOINCREMENT,
      departure_time DATETIME NOT NULL,
      max_capacity INTEGER NOT NULL,
      current_count INTEGER NOT NULL DEFAULT 1,
      status TEXT CHECK(status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')) NOT NULL DEFAULT 'open',
      total_fare REAL NOT NULL,
      vehicle_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id),
      FOREIGN KEY (host_id) REFERENCES student(student_id)
    );

    CREATE TABLE IF NOT EXISTS ride_stop (
      stop_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_group_id INTEGER NOT NULL,
      stop_order INTEGER NOT NULL,
      location_name TEXT NOT NULL,
      stop_type TEXT CHECK(stop_type IN ('pickup', 'dropoff')) NOT NULL,
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ride_request (
      ride_request_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      ride_group_id INTEGER NOT NULL,
      fare_share REAL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled')) NOT NULL DEFAULT 'pending',
      pickup_point TEXT,
      dropoff_point TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rider (
      rider_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      ride_group_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE,
      UNIQUE(student_id, ride_group_id)
    );

    CREATE TABLE IF NOT EXISTS match_request (
      match_request_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      pickup_location TEXT NOT NULL,
      destination TEXT NOT NULL,
      preferred_vehicle TEXT CHECK(preferred_vehicle IN ('auto', 'cng', 'car', 'any')) NOT NULL DEFAULT 'any',
      target_time DATETIME NOT NULL,
      status TEXT CHECK(status IN ('active', 'matched', 'expired', 'cancelled')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_room (
      chat_room_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_group_id INTEGER NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_participant (
      chat_room_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_room_id, student_id),
      FOREIGN KEY (chat_room_id) REFERENCES chat_room(chat_room_id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_message (
      message_id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_room_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_room_id) REFERENCES chat_room(chat_room_id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      ride_group_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'refunded')) NOT NULL DEFAULT 'pending',
      fare REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'bkash', 'nagad')) NOT NULL DEFAULT 'cash',
      paid_at DATETIME,
      FOREIGN KEY (student_id) REFERENCES student(student_id),
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review (
      review_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_group_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewed_student_id INTEGER NOT NULL,
      rating_point INTEGER CHECK(rating_point BETWEEN 1 AND 5) NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ride_group_id) REFERENCES ride_group(ride_group_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_student_id) REFERENCES student(student_id) ON DELETE CASCADE,
      UNIQUE(ride_group_id, reviewer_id, reviewed_student_id)
    );
  `);

  // Seed initial students
  const seedStudents = [
    ['2026001', 'Aisha Rahman', 'aisha@bracu.ac.bd', '01710000001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.80],
    ['2026002', 'Rahim Ahmed', 'rahim@bracu.ac.bd', '01710000002', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.50],
    ['2026003', 'Karim Hasan', 'karim@bracu.ac.bd', '01710000003', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.70],
    ['2026004', 'Nusrat Jahan', 'nusrat@bracu.ac.bd', '01710000004', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.90],
    ['2026005', 'Tanvir Hossain', 'tanvir@bracu.ac.bd', '01710000005', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.20],
    ['2026006', 'Sadia Islam', 'sadia@bracu.ac.bd', '01710000006', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.60],
    ['2026007', 'Fahim Chowdhury', 'fahim@bracu.ac.bd', '01710000007', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.30],
    ['2026008', 'Mim Akter', 'mim@bracu.ac.bd', '01710000008', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.75],
    ['2026009', 'Shafin Islam', 'shafin@bracu.ac.bd', '01710000009', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.10],
    ['2026010', 'Tania Sultana', 'tania@bracu.ac.bd', '01710000010', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 4.85]
  ];
  for (const s of seedStudents) {
    db.run('INSERT INTO student (university_id, name, email, phone, password, credibility_score) VALUES (?, ?, ?, ?, ?, ?)', s);
  }

  // Seed vehicles
  const seedVehicles = [
    [1, 'Auto Rickshaw', 3, 'auto', 3, 1],
    [2, 'CNG Auto', 3, 'cng', 3, 1],
    [3, 'Sedan Car', 4, 'car', 4, 1]
  ];
  for (const v of seedVehicles) {
    db.run('INSERT INTO vehicle (vehicle_id, name, default_capacity, vehicle_type, max_group_size, fare_split_enable) VALUES (?, ?, ?, ?, ?, ?)', v);
  }

  // Seed ride groups
  const seedRides = [
    [1, '2026-08-26 14:30:00', 3, 2, 'open', 180.00, 1, 1, 'Leaving from gate 1, looking for 1 more person to split.'],
    [2, '2026-08-26 15:00:00', 3, 1, 'open', 210.00, 2, 2, 'Fast CNG ride to Dhanmondi 27.'],
    [3, '2026-08-26 15:30:00', 4, 2, 'open', 300.00, 3, 3, 'AC Sedan, comfortable commute.'],
    [4, '2026-08-26 16:00:00', 3, 1, 'open', 240.00, 2, 4, 'Going via Gulshan 1 & 2.'],
    [5, '2026-08-26 16:30:00', 4, 1, 'open', 350.00, 3, 5, 'Uttara Sector 7 via Airport Road.'],
    [6, '2026-08-26 17:00:00', 3, 1, 'open', 200.00, 1, 6, 'Quick dropoff at Banani 11.'],
    [7, '2026-08-25 10:30:00', 4, 3, 'completed', 250.00, 3, 7, 'Mirpur 10 roundabout.']
  ];
  for (const r of seedRides) {
    db.run('INSERT INTO ride_group (ride_group_id, departure_time, max_capacity, current_count, status, total_fare, vehicle_id, host_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', r);
  }

  // Seed stops
  const seedStops = [
    [1, 1, 'BRAC University', 'pickup'],
    [1, 2, 'Dhanmondi', 'dropoff'],
    [2, 1, 'BRAC University', 'pickup'],
    [2, 2, 'Dhanmondi', 'dropoff'],
    [3, 1, 'BRAC University', 'pickup'],
    [3, 2, 'Dhanmondi', 'dropoff'],
    [4, 1, 'BRAC University', 'pickup'],
    [4, 2, 'Gulshan', 'dropoff'],
    [5, 1, 'BRAC University', 'pickup'],
    [5, 2, 'Uttara', 'dropoff'],
    [6, 1, 'BRAC University', 'pickup'],
    [6, 2, 'Banani', 'dropoff'],
    [7, 1, 'BRAC University', 'pickup'],
    [7, 2, 'Mirpur', 'dropoff']
  ];
  for (const st of seedStops) {
    db.run('INSERT INTO ride_stop (ride_group_id, stop_order, location_name, stop_type) VALUES (?, ?, ?, ?)', st);
  }

  // Seed riders
  const seedRiders = [
    [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7],
    [8, 1], [10, 3], [8, 7], [9, 7]
  ];
  for (const rd of seedRiders) {
    db.run('INSERT INTO rider (student_id, ride_group_id) VALUES (?, ?)', rd);
  }

  // Seed ride requests
  const seedRequests = [
    [1, 8, 1, 90.00, 'accepted', 'Main Gate', 'Dhanmondi 32'],
    [2, 10, 3, 150.00, 'accepted', 'Campus Gate 2', 'Dhanmondi 8/A'],
    [3, 8, 7, 83.33, 'accepted', 'Campus Hub', 'Mirpur 10'],
    [4, 9, 7, 83.33, 'accepted', 'Campus Hub', 'Mirpur 10'],
    [5, 9, 2, 105.00, 'pending', 'BRACU Library Road', 'Dhanmondi 27'],
    [6, 6, 4, 120.00, 'rejected', 'BRACU Entrance', 'Gulshan 2'],
    [7, 8, 5, 175.00, 'cancelled', 'BRACU', 'Uttara 7']
  ];
  for (const rq of seedRequests) {
    db.run('INSERT INTO ride_request (ride_request_id, student_id, ride_group_id, fare_share, status, pickup_point, dropoff_point) VALUES (?, ?, ?, ?, ?, ?, ?)', rq);
  }

  // Seed chat rooms & participants
  for (let i = 1; i <= 7; i++) {
    db.run('INSERT INTO chat_room (chat_room_id, ride_group_id) VALUES (?, ?)', [i, i]);
  }
  const seedParts = [
    [1, 1], [1, 8],
    [2, 2],
    [3, 3], [3, 10],
    [4, 4],
    [5, 5],
    [6, 6],
    [7, 7], [7, 8], [7, 9]
  ];
  for (const p of seedParts) {
    db.run('INSERT INTO chat_participant (chat_room_id, student_id) VALUES (?, ?)', p);
  }

  // Seed chat messages
  const seedMsgs = [
    [1, 1, 'Hey everyone! I will be at the main gate at 2:25 PM.', '2026-08-26 14:00:00'],
    [1, 8, 'Got it Aisha! I have a white backpack. See you there.', '2026-08-26 14:05:00'],
    [1, 1, 'Awesome! Auto fare will be 90 tk each.', '2026-08-26 14:06:00'],
    [3, 3, 'Hello Tania! Meeting point is gate 2 parking.', '2026-08-26 15:00:00'],
    [3, 10, 'Thanks Karim! On my way.', '2026-08-26 15:02:00'],
    [7, 7, 'Thanks for riding together everyone! Safe travel.', '2026-08-25 11:30:00'],
    [7, 8, 'Thanks Fahim bhai, great ride!', '2026-08-25 11:31:00']
  ];
  for (const m of seedMsgs) {
    db.run('INSERT INTO chat_message (chat_room_id, student_id, content, timestamp) VALUES (?, ?, ?, ?)', m);
  }

  // Seed payments
  const seedPayments = [
    [8, 1, 'completed', 90.00, 'bkash', '2026-08-26 14:15:00'],
    [10, 3, 'pending', 150.00, 'cash', null],
    [8, 7, 'completed', 83.33, 'bkash', '2026-08-25 11:25:00'],
    [9, 7, 'completed', 83.33, 'nagad', '2026-08-25 11:28:00']
  ];
  for (const py of seedPayments) {
    db.run('INSERT INTO payment (student_id, ride_group_id, status, fare, payment_method, paid_at) VALUES (?, ?, ?, ?, ?, ?)', py);
  }

  // Seed reviews
  const seedReviews = [
    [7, 8, 7, 5, 'Fahim is an amazing driver and very punctual!'],
    [7, 9, 7, 5, 'Smooth driving and pleasant conversation.'],
    [7, 7, 8, 5, 'Mim arrived right on time at the pickup spot.'],
    [7, 7, 9, 4, 'Friendly co-passenger.']
  ];
  for (const rv of seedReviews) {
    db.run('INSERT INTO review (ride_group_id, reviewer_id, reviewed_student_id, rating_point, comment) VALUES (?, ?, ?, ?, ?)', rv);
  }

  // Seed match requests
  const seedMatches = [
    [9, 'BRAC University', 'Dhanmondi', 'cng', '2026-08-26 15:15:00', 'active'],
    [6, 'BRAC University', 'Banani', 'auto', '2026-08-26 17:00:00', 'matched']
  ];
  for (const mt of seedMatches) {
    db.run('INSERT INTO match_request (student_id, pickup_location, destination, preferred_vehicle, target_time, status) VALUES (?, ?, ?, ?, ?, ?)', mt);
  }

  console.log('SQLite database seeded successfully.');
}

async function query(sql, params = []) {
  if (!isInitialized) {
    await initDatabase();
  }

  if (dbType === 'mysql') {
    const [results] = await mysqlPool.execute(sql, params);
    return results;
  } else {
    // sql.js execution
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA')) {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } else {
      sqlDb.run(sql, params);
      
      // Get last inserted id & changes
      const idResult = sqlDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
      let insertId = 0;
      let affectedRows = 0;
      if (idResult.length > 0 && idResult[0].values.length > 0) {
        insertId = idResult[0].values[0][0];
        affectedRows = idResult[0].values[0][1];
      }

      saveDbToDisk();

      return {
        insertId,
        affectedRows
      };
    }
  }
}

module.exports = {
  initDatabase,
  query,
  getDbType: () => dbType
};
