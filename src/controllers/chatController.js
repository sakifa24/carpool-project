const db = require('../config/db');

exports.getChatRoom = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    const { ride_group_id } = req.params;

    // Fetch chat room
    const rooms = await db.query(
      `SELECT cr.*, rg.departure_time, rg.total_fare, rg.current_count, rg.status as ride_status,
              v.name as vehicle_name,
              p_stop.location_name as pickup_location,
              d_stop.location_name as dropoff_location
       FROM chat_room cr
       JOIN ride_group rg ON cr.ride_group_id = rg.ride_group_id
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
       LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
       WHERE cr.ride_group_id = ?`,
      [ride_group_id]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Chat room not found for this ride.' });
    }

    const room = rooms[0];

    // Check if caller is a participant
    const participants = await db.query(
      `SELECT cp.*, s.name, s.university_id, s.credibility_score, s.phone
       FROM chat_participant cp
       JOIN student s ON cp.student_id = s.student_id
       WHERE cp.chat_room_id = ?`,
      [room.chat_room_id]
    );

    const isMember = participants.some(p => p.student_id === studentId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a participant of this ride group chat.' });
    }

    // Fetch messages
    const messages = await db.query(
      `SELECT cm.message_id, cm.content, cm.timestamp, cm.student_id,
              s.name as sender_name, s.university_id as sender_uid, s.credibility_score as sender_credibility
       FROM chat_message cm
       JOIN student s ON cm.student_id = s.student_id
       WHERE cm.chat_room_id = ?
       ORDER BY cm.timestamp ASC`,
      [room.chat_room_id]
    );

    res.json({
      room,
      participants,
      messages
    });
  } catch (err) {
    console.error('Get chat room error:', err);
    res.status(500).json({ error: 'Failed to retrieve group chat.' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    const { chat_room_id, content } = req.body;

    if (!chat_room_id || !content || content.trim() === '') {
      return res.status(400).json({ error: 'Chat room ID and message content are required.' });
    }

    // Check membership
    const membership = await db.query(
      `SELECT * FROM chat_participant WHERE chat_room_id = ? AND student_id = ?`,
      [chat_room_id, studentId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to send messages to this chat room.' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await db.query(
      `INSERT INTO chat_message (chat_room_id, student_id, content, timestamp)
       VALUES (?, ?, ?, ?)`,
      [chat_room_id, studentId, content.trim(), now]
    );

    res.status(201).json({
      message_id: result.insertId,
      chat_room_id,
      student_id: studentId,
      sender_name: req.user.name,
      content: content.trim(),
      timestamp: now
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};

exports.getMyChatRooms = async (req, res) => {
  try {
    const studentId = req.user.student_id;

    const rooms = await db.query(
      `SELECT 
        cr.chat_room_id,
        cr.ride_group_id,
        rg.departure_time,
        rg.status as ride_status,
        v.name as vehicle_name,
        p_stop.location_name as pickup_location,
        d_stop.location_name as dropoff_location,
        (
          SELECT content FROM chat_message 
          WHERE chat_room_id = cr.chat_room_id 
          ORDER BY timestamp DESC LIMIT 1
        ) as last_message,
        (
          SELECT timestamp FROM chat_message 
          WHERE chat_room_id = cr.chat_room_id 
          ORDER BY timestamp DESC LIMIT 1
        ) as last_message_time
       FROM chat_participant cp
       JOIN chat_room cr ON cp.chat_room_id = cr.chat_room_id
       JOIN ride_group rg ON cr.ride_group_id = rg.ride_group_id
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       LEFT JOIN ride_stop p_stop ON rg.ride_group_id = p_stop.ride_group_id AND p_stop.stop_type = 'pickup'
       LEFT JOIN ride_stop d_stop ON rg.ride_group_id = d_stop.ride_group_id AND d_stop.stop_type = 'dropoff'
       WHERE cp.student_id = ?
       ORDER BY rg.departure_time DESC`,
      [studentId]
    );

    res.json(rooms);
  } catch (err) {
    console.error('Get my chat rooms error:', err);
    res.status(500).json({ error: 'Failed to retrieve your chat rooms.' });
  }
};
