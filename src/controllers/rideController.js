const db = require('../config/db');

exports.searchRides = async (req, res) => {
  try {
    const { destination, pickup, vehicle_type, date } = req.query;

    let sql = `
      SELECT 
        rg.ride_group_id,
        rg.departure_time,
        rg.max_capacity,
        rg.current_count,
        (rg.max_capacity - rg.current_count) AS seats_available,
        rg.status,
        rg.total_fare,
        rg.notes,
        rg.created_at,
        v.vehicle_id,
        v.name AS vehicle_name,
        v.vehicle_type,
        s.student_id AS host_id,
        s.name AS host_name,
        s.university_id AS host_university_id,
        s.credibility_score AS host_credibility,
        s.phone AS host_phone,
        p_stop.location_name AS pickup_location,
        d_stop.location_name AS dropoff_location
      FROM ride_group rg
      JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
      JOIN student s ON rg.host_id = s.student_id
      LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
      LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
      WHERE rg.status = 'open' 
        AND rg.current_count < rg.max_capacity
    `;

    const params = [];

    // Filter by destination / dropoff
    if (destination && destination.trim() !== '') {
      sql += ` AND LOWER(d_stop.location_name) LIKE LOWER(?)`;
      params.push(`%${destination.trim()}%`);
    }

    // Filter by pickup
    if (pickup && pickup.trim() !== '') {
      sql += ` AND LOWER(p_stop.location_name) LIKE LOWER(?)`;
      params.push(`%${pickup.trim()}%`);
    }

    // Filter by vehicle type (auto, cng, car)
    if (vehicle_type && vehicle_type !== 'all' && vehicle_type.trim() !== '') {
      sql += ` AND v.vehicle_type = ?`;
      params.push(vehicle_type.trim().toLowerCase());
    }

    // Filter by date if supplied (YYYY-MM-DD)
    if (date && date.trim() !== '') {
      sql += ` AND DATE(rg.departure_time) = DATE(?)`;
      params.push(date.trim());
    }

    sql += ` ORDER BY rg.departure_time ASC, s.credibility_score DESC`;

    const rides = await db.query(sql, params);

    // Calculate dynamic fare shares
    const ridesWithSplit = rides.map(r => {
      const currentShare = (r.total_fare / r.current_count).toFixed(2);
      const nextShare = (r.total_fare / (r.current_count + 1)).toFixed(2);
      const fullShare = (r.total_fare / r.max_capacity).toFixed(2);

      return {
        ...r,
        fare_details: {
          total_fare: r.total_fare,
          current_fare_per_person: parseFloat(currentShare),
          next_joiner_fare: parseFloat(nextShare),
          min_fare_at_capacity: parseFloat(fullShare)
        }
      };
    });

    res.json({
      count: ridesWithSplit.length,
      rides: ridesWithSplit
    });
  } catch (err) {
    console.error('Search rides error:', err);
    res.status(500).json({ error: 'Failed to search rides.' });
  }
};

exports.createRide = async (req, res) => {
  try {
    const hostId = req.user.student_id;
    const {
      departure_time,
      vehicle_id,
      max_capacity,
      total_fare,
      pickup_location,
      dropoff_location,
      notes
    } = req.body;

    if (!departure_time || !vehicle_id || !max_capacity || !total_fare || !pickup_location || !dropoff_location) {
      return res.status(400).json({ error: 'Please provide all required ride details (departure time, vehicle, capacity, fare, pickup, dropoff).' });
    }

    // Verify vehicle
    const vehicles = await db.query('SELECT * FROM vehicle WHERE vehicle_id = ?', [vehicle_id]);
    if (vehicles.length === 0) {
      return res.status(400).json({ error: 'Invalid vehicle selected.' });
    }

    const capacity = parseInt(max_capacity);
    const fare = parseFloat(total_fare);

    // 1. Insert Ride Group (current_count = 1 for host)
    const rideResult = await db.query(
      `INSERT INTO ride_group 
       (departure_time, max_capacity, current_count, status, total_fare, vehicle_id, host_id, notes)
       VALUES (?, ?, 1, 'open', ?, ?, ?, ?)`,
      [departure_time, capacity, fare, vehicle_id, hostId, notes || null]
    );

    const rideGroupId = rideResult.insertId;

    // 2. Insert Stops
    await db.query(
      `INSERT INTO ride_stop (ride_group_id, stop_order, location_name, stop_type)
       VALUES (?, 1, ?, 'pickup')`,
      [rideGroupId, pickup_location.trim()]
    );

    await db.query(
      `INSERT INTO ride_stop (ride_group_id, stop_order, location_name, stop_type)
       VALUES (?, 2, ?, 'dropoff')`,
      [rideGroupId, dropoff_location.trim()]
    );

    // 3. Insert Host into Rider table
    await db.query(
      `INSERT INTO rider (student_id, ride_group_id)
       VALUES (?, ?)`,
      [hostId, rideGroupId]
    );

    // 4. Create Group Chat Room
    const chatResult = await db.query(
      `INSERT INTO chat_room (ride_group_id) VALUES (?)`,
      [rideGroupId]
    );
    const chatRoomId = chatResult.insertId;

    // 5. Add Host as Chat Participant
    await db.query(
      `INSERT INTO chat_participant (chat_room_id, student_id) VALUES (?, ?)`,
      [chatRoomId, hostId]
    );

    // 6. Check for matching active match_requests and notify or mark them
    const matchingRequests = await db.query(
      `SELECT mr.*, s.name as requester_name 
       FROM match_request mr
       JOIN student s ON mr.student_id = s.student_id
       WHERE mr.status = 'active' 
         AND LOWER(mr.destination) LIKE LOWER(?)
         AND mr.student_id != ?`,
      [`%${dropoff_location.trim()}%`, hostId]
    );

    res.status(201).json({
      message: 'Ride group created successfully!',
      ride_group_id: rideGroupId,
      chat_room_id: chatRoomId,
      auto_matches_found: matchingRequests.length,
      matching_requests: matchingRequests
    });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: 'Failed to create ride group.' });
  }
};

exports.getRideDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const rides = await db.query(
      `SELECT 
        rg.*,
        v.name AS vehicle_name,
        v.vehicle_type,
        s.name AS host_name,
        s.university_id AS host_university_id,
        s.credibility_score AS host_credibility,
        s.phone AS host_phone,
        s.email AS host_email,
        cr.chat_room_id
      FROM ride_group rg
      JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
      JOIN student s ON rg.host_id = s.student_id
      LEFT JOIN chat_room cr ON rg.ride_group_id = cr.ride_group_id
      WHERE rg.ride_group_id = ?`,
      [id]
    );

    if (rides.length === 0) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const ride = rides[0];

    // Get stops
    const stops = await db.query(
      `SELECT * FROM ride_stop WHERE ride_group_id = ? ORDER BY stop_order ASC`,
      [id]
    );

    // Get confirmed riders
    const riders = await db.query(
      `SELECT r.*, s.name, s.university_id, s.credibility_score, s.phone, s.email
       FROM rider r
       JOIN student s ON r.student_id = s.student_id
       WHERE r.ride_group_id = ?`,
      [id]
    );

    // Get pending requests (if host or requester)
    const requests = await db.query(
      `SELECT rr.*, s.name, s.university_id, s.credibility_score, s.phone
       FROM ride_request rr
       JOIN student s ON rr.student_id = s.student_id
       WHERE rr.ride_group_id = ?
       ORDER BY rr.created_at DESC`,
      [id]
    );

    // Fare split breakdown
    const currentCount = ride.current_count;
    const totalFare = ride.total_fare;
    const splitPerPerson = currentCount > 0 ? (totalFare / currentCount).toFixed(2) : totalFare;

    res.json({
      ride,
      stops,
      riders,
      requests,
      fare_split: {
        total_fare: totalFare,
        current_count: currentCount,
        fare_per_person: parseFloat(splitPerPerson)
      }
    });
  } catch (err) {
    console.error('Get ride details error:', err);
    res.status(500).json({ error: 'Failed to retrieve ride details.' });
  }
};

exports.requestJoinRide = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    const { ride_group_id, pickup_point, dropoff_point } = req.body;

    if (!ride_group_id) {
      return res.status(400).json({ error: 'Ride Group ID is required.' });
    }

    // Check ride existence and capacity
    const rides = await db.query('SELECT * FROM ride_group WHERE ride_group_id = ?', [ride_group_id]);
    if (rides.length === 0) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const ride = rides[0];

    if (ride.host_id === studentId) {
      return res.status(400).json({ error: 'You are the host of this ride.' });
    }

    if (ride.status !== 'open' || ride.current_count >= ride.max_capacity) {
      return res.status(400).json({ error: 'This ride is full or no longer accepting requests.' });
    }

    // Check if already requested
    const existing = await db.query(
      'SELECT * FROM ride_request WHERE student_id = ? AND ride_group_id = ?',
      [studentId, ride_group_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: `You have already sent a request with status: ${existing[0].status}` });
    }

    // Calculate prospective fare share
    const expectedShare = (ride.total_fare / (ride.current_count + 1)).toFixed(2);

    const result = await db.query(
      `INSERT INTO ride_request 
       (student_id, ride_group_id, fare_share, status, pickup_point, dropoff_point)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [studentId, ride_group_id, expectedShare, pickup_point || null, dropoff_point || null]
    );

    res.status(201).json({
      message: 'Join request sent to the host!',
      request_id: result.insertId,
      estimated_fare: parseFloat(expectedShare)
    });
  } catch (err) {
    console.error('Request join ride error:', err);
    res.status(500).json({ error: 'Failed to request join ride.' });
  }
};

exports.handleRideRequest = async (req, res) => {
  try {
    const hostId = req.user.student_id;
    const { request_id, action } = req.body; // action: 'accept' or 'reject'

    if (!request_id || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request or action. Must be accept or reject.' });
    }

    // Fetch request and verify ride host
    const requests = await db.query(
      `SELECT rr.*, rg.host_id, rg.current_count, rg.max_capacity, rg.total_fare
       FROM ride_request rr
       JOIN ride_group rg ON rr.ride_group_id = rg.ride_group_id
       WHERE rr.ride_request_id = ?`,
      [request_id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Ride request not found.' });
    }

    const reqData = requests[0];

    if (reqData.host_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can accept or reject ride requests.' });
    }

    if (reqData.status !== 'pending') {
      return res.status(400).json({ error: `Request has already been ${reqData.status}.` });
    }

    if (action === 'reject') {
      await db.query(`UPDATE ride_request SET status = 'rejected' WHERE ride_request_id = ?`, [request_id]);
      return res.json({ message: 'Ride request rejected.' });
    }

    // Accept Flow
    if (reqData.current_count >= reqData.max_capacity) {
      return res.status(400).json({ error: 'Cannot accept request. Ride is already at maximum capacity.' });
    }

    const newCount = reqData.current_count + 1;
    const newStatus = newCount >= reqData.max_capacity ? 'full' : 'open';
    const splitFare = (reqData.total_fare / newCount).toFixed(2);

    // 1. Update request status & fare share
    await db.query(
      `UPDATE ride_request SET status = 'accepted', fare_share = ? WHERE ride_request_id = ?`,
      [splitFare, request_id]
    );

    // 2. Insert into rider table
    await db.query(
      `INSERT INTO rider (student_id, ride_group_id) VALUES (?, ?)`,
      [reqData.student_id, reqData.ride_group_id]
    );

    // 3. Update ride_group count & status
    await db.query(
      `UPDATE ride_group SET current_count = ?, status = ? WHERE ride_group_id = ?`,
      [newCount, newStatus, reqData.ride_group_id]
    );

    // 4. Enroll in Group Chat
    const chatRooms = await db.query(
      `SELECT chat_room_id FROM chat_room WHERE ride_group_id = ?`,
      [reqData.ride_group_id]
    );

    if (chatRooms.length > 0) {
      const roomId = chatRooms[0].chat_room_id;
      // Add participant if not already present
      const partCheck = await db.query(
        `SELECT * FROM chat_participant WHERE chat_room_id = ? AND student_id = ?`,
        [roomId, reqData.student_id]
      );
      if (partCheck.length === 0) {
        await db.query(
          `INSERT INTO chat_participant (chat_room_id, student_id) VALUES (?, ?)`,
          [roomId, reqData.student_id]
        );
      }
    }

    // 5. Create pending payment record
    await db.query(
      `INSERT INTO payment (student_id, ride_group_id, status, fare, payment_method)
       VALUES (?, ?, 'pending', ?, 'cash')`,
      [reqData.student_id, reqData.ride_group_id, splitFare]
    );

    res.json({
      message: 'Ride request accepted! Rider added to group and chat room.',
      new_passenger_count: newCount,
      updated_fare_per_person: parseFloat(splitFare)
    });
  } catch (err) {
    console.error('Handle ride request error:', err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const studentId = req.user.student_id;

    // Hosted Rides
    const hosted = await db.query(
      `SELECT 
        rg.*,
        v.name as vehicle_name,
        v.vehicle_type,
        p_stop.location_name as pickup_location,
        d_stop.location_name as dropoff_location,
        cr.chat_room_id,
        (SELECT COUNT(*) FROM ride_request WHERE ride_group_id = rg.ride_group_id AND status = 'pending') as pending_requests_count
       FROM ride_group rg
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
       LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
       LEFT JOIN chat_room cr ON rg.ride_group_id = cr.ride_group_id
       WHERE rg.host_id = ?
       ORDER BY rg.departure_time DESC`,
      [studentId]
    );

    // Joined Rides
    const joined = await db.query(
      `SELECT 
        rg.*,
        v.name as vehicle_name,
        v.vehicle_type,
        s.name as host_name,
        s.credibility_score as host_credibility,
        p_stop.location_name as pickup_location,
        d_stop.location_name as dropoff_location,
        rr.status as my_request_status,
        rr.fare_share,
        cr.chat_room_id
       FROM rider r
       JOIN ride_group rg ON r.ride_group_id = rg.ride_group_id
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       JOIN student s ON rg.host_id = s.student_id
       LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
       LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
       LEFT JOIN ride_request rr ON rr.ride_group_id = rg.ride_group_id AND rr.student_id = ?
       LEFT JOIN chat_room cr ON rg.ride_group_id = cr.ride_group_id
       WHERE r.student_id = ? AND rg.host_id != ?
       ORDER BY rg.departure_time DESC`,
      [studentId, studentId, studentId]
    );

    // Pending requests sent by student
    const sentPending = await db.query(
      `SELECT 
        rr.*,
        rg.departure_time,
        rg.total_fare,
        s.name as host_name,
        v.name as vehicle_name,
        p_stop.location_name as pickup_location,
        d_stop.location_name as dropoff_location
       FROM ride_request rr
       JOIN ride_group rg ON rr.ride_group_id = rg.ride_group_id
       JOIN student s ON rg.host_id = s.student_id
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
       LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
       WHERE rr.student_id = ? AND rr.status = 'pending'
       ORDER BY rr.created_at DESC`,
      [studentId]
    );

    res.json({
      hosted,
      joined,
      pending_requests: sentPending
    });
  } catch (err) {
    console.error('Get my rides error:', err);
    res.status(500).json({ error: 'Failed to retrieve your rides.' });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const hostId = req.user.student_id;
    const { ride_group_id, status } = req.body;

    const allowed = ['open', 'in_progress', 'completed', 'cancelled'];
    if (!ride_group_id || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid ride group ID or status.' });
    }

    const rides = await db.query('SELECT host_id FROM ride_group WHERE ride_group_id = ?', [ride_group_id]);
    if (rides.length === 0) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    if (rides[0].host_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can update ride status.' });
    }

    await db.query('UPDATE ride_group SET status = ? WHERE ride_group_id = ?', [status, ride_group_id]);

    res.json({
      message: `Ride status updated to '${status}'.`,
      ride_group_id,
      status
    });
  } catch (err) {
    console.error('Update ride status error:', err);
    res.status(500).json({ error: 'Failed to update ride status.' });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await db.query('SELECT * FROM vehicle ORDER BY vehicle_id ASC');
    res.json(vehicles);
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ error: 'Failed to retrieve vehicles.' });
  }
};
