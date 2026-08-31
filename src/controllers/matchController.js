const db = require('../config/db');

exports.findAutoMatches = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    const { destination, pickup_location, preferred_vehicle, target_time, save_if_not_found } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required for matching.' });
    }

    const pickup = pickup_location && pickup_location.trim() !== '' ? pickup_location.trim() : 'BRAC University';
    const vehiclePref = preferred_vehicle && ['auto', 'cng', 'car'].includes(preferred_vehicle.toLowerCase()) 
      ? preferred_vehicle.toLowerCase() 
      : 'any';
    const targetDateTime = target_time || new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Find matching open ride groups
    let rideSql = `
      SELECT 
        rg.ride_group_id,
        rg.departure_time,
        rg.max_capacity,
        rg.current_count,
        (rg.max_capacity - rg.current_count) AS seats_available,
        rg.total_fare,
        rg.status,
        rg.notes,
        v.vehicle_id,
        v.name AS vehicle_name,
        v.vehicle_type,
        s.student_id AS host_id,
        s.name AS host_name,
        s.university_id AS host_university_id,
        s.credibility_score AS host_credibility,
        p_stop.location_name AS pickup_location,
        d_stop.location_name AS dropoff_location
      FROM ride_group rg
      JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
      JOIN student s ON rg.host_id = s.student_id
      LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
      LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
      WHERE rg.status = 'open' 
        AND rg.current_count < rg.max_capacity
        AND rg.host_id != ?
        AND LOWER(d_stop.location_name) LIKE LOWER(?)
    `;

    const rideParams = [studentId, `%${destination.trim()}%`];

    if (vehiclePref !== 'any') {
      rideSql += ` AND v.vehicle_type = ?`;
      rideParams.push(vehiclePref);
    }

    rideSql += ` ORDER BY s.credibility_score DESC, rg.departure_time ASC`;

    const matchingRides = await db.query(rideSql, rideParams);

    // Compute match score and estimated fare share for each
    const scoredRides = matchingRides.map(ride => {
      const farePerPerson = (ride.total_fare / (ride.current_count + 1)).toFixed(2);
      
      // Calculate match percentage
      let score = 70;
      if (vehiclePref !== 'any' && ride.vehicle_type === vehiclePref) score += 15;
      if (ride.host_credibility >= 4.5) score += 15;

      return {
        ...ride,
        match_score: `${score}%`,
        estimated_fare_share: parseFloat(farePerPerson)
      };
    });

    // 2. Find matching co-riders (other students looking for same destination)
    let coRiderSql = `
      SELECT 
        mr.match_request_id,
        mr.student_id,
        mr.pickup_location,
        mr.destination,
        mr.preferred_vehicle,
        mr.target_time,
        mr.created_at,
        s.name AS student_name,
        s.university_id,
        s.credibility_score,
        s.phone
      FROM match_request mr
      JOIN student s ON mr.student_id = s.student_id
      WHERE mr.status = 'active'
        AND mr.student_id != ?
        AND LOWER(mr.destination) LIKE LOWER(?)
    `;

    const coRiders = await db.query(coRiderSql, [studentId, `%${destination.trim()}%`]);

    // 3. Save as active match request if requested or if no immediate match
    let savedRequestId = null;
    if (save_if_not_found) {
      // Check if user already has an active request for this destination
      const existing = await db.query(
        `SELECT match_request_id FROM match_request WHERE student_id = ? AND status = 'active' AND LOWER(destination) = LOWER(?)`,
        [studentId, destination.trim()]
      );

      if (existing.length === 0) {
        const insertRes = await db.query(
          `INSERT INTO match_request (student_id, pickup_location, destination, preferred_vehicle, target_time, status)
           VALUES (?, ?, ?, ?, ?, 'active')`,
          [studentId, pickup, destination.trim(), vehiclePref, targetDateTime]
        );
        savedRequestId = insertRes.insertId;
      } else {
        savedRequestId = existing[0].match_request_id;
      }
    }

    res.json({
      query: {
        destination,
        pickup_location: pickup,
        preferred_vehicle: vehiclePref,
        target_time: targetDateTime
      },
      match_summary: {
        open_rides_found: scoredRides.length,
        co_riders_found: coRiders.length,
        match_request_id: savedRequestId
      },
      recommended_rides: scoredRides,
      co_riders: coRiders
    });
  } catch (err) {
    console.error('Auto match error:', err);
    res.status(500).json({ error: 'Failed to run auto-match engine.' });
  }
};

exports.getActiveRequests = async (req, res) => {
  try {
    const requests = await db.query(
      `SELECT 
        mr.*,
        s.name AS student_name,
        s.university_id,
        s.credibility_score
       FROM match_request mr
       JOIN student s ON mr.student_id = s.student_id
       WHERE mr.status = 'active'
       ORDER BY mr.created_at DESC`
    );

    res.json(requests);
  } catch (err) {
    console.error('Get active match requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve active match requests.' });
  }
};

exports.cancelMatchRequest = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    const { id } = req.params;

    await db.query(
      `UPDATE match_request SET status = 'cancelled' WHERE match_request_id = ? AND student_id = ?`,
      [id, studentId]
    );

    res.json({ message: 'Match request cancelled successfully.' });
  } catch (err) {
    console.error('Cancel match request error:', err);
    res.status(500).json({ error: 'Failed to cancel match request.' });
  }
};
