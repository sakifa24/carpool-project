const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

exports.register = async (req, res) => {
  try {
    const { university_id, name, email, phone, password } = req.body;

    if (!university_id || !name || !email || !password) {
      return res.status(400).json({ error: 'University ID, name, email, and password are required.' });
    }

    // Check existing email or university_id
    const existing = await db.query(
      'SELECT student_id FROM student WHERE email = ? OR university_id = ?',
      [email, university_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A student with this email or University ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO student (university_id, name, email, phone, password, credibility_score)
       VALUES (?, ?, ?, ?, ?, 5.00)`,
      [university_id, name, email, phone || null, hashedPassword]
    );

    const studentId = result.insertId;

    const token = jwt.sign(
      { student_id: studentId, university_id, email, name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student registered successfully!',
      token,
      user: {
        student_id: studentId,
        university_id,
        name,
        email,
        phone,
        credibility_score: 5.00
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const students = await db.query(
      'SELECT * FROM student WHERE email = ?',
      [email]
    );

    if (students.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const student = students[0];
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        student_id: student.student_id,
        university_id: student.university_id,
        email: student.email,
        name: student.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        student_id: student.student_id,
        university_id: student.university_id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        credibility_score: student.credibility_score
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const studentId = req.user.student_id;

    const students = await db.query(
      'SELECT student_id, university_id, name, email, phone, credibility_score, created_at FROM student WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = students[0];

    // Get count of rides hosted and joined
    const hostedRides = await db.query(
      'SELECT COUNT(*) as count FROM ride_group WHERE host_id = ?',
      [studentId]
    );
    const joinedRides = await db.query(
      'SELECT COUNT(*) as count FROM rider WHERE student_id = ?',
      [studentId]
    );

    // Get received reviews
    const reviews = await db.query(
      `SELECT r.review_id, r.rating_point, r.comment, r.created_at,
              s.name as reviewer_name, s.university_id as reviewer_uid
       FROM review r
       JOIN student s ON r.reviewer_id = s.student_id
       WHERE r.reviewed_student_id = ?
       ORDER BY r.created_at DESC`,
      [studentId]
    );

    res.json({
      student,
      stats: {
        hosted_count: hostedRides[0].count,
        joined_count: joinedRides[0].count,
        review_count: reviews.length
      },
      reviews
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Error fetching profile.' });
  }
};

exports.listDemoStudents = async (req, res) => {
  try {
    const students = await db.query(
      'SELECT student_id, university_id, name, email, phone, credibility_score FROM student ORDER BY student_id ASC LIMIT 10'
    );
    res.json(students);
  } catch (err) {
    console.error('List demo students error:', err);
    res.status(500).json({ error: 'Failed to list demo accounts.' });
  }
};

exports.quickSwitchUser = async (req, res) => {
  try {
    const { student_id } = req.body;
    const students = await db.query(
      'SELECT * FROM student WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = students[0];
    const token = jwt.sign(
      {
        student_id: student.student_id,
        university_id: student.university_id,
        email: student.email,
        name: student.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: `Switched user to ${student.name}`,
      token,
      user: {
        student_id: student.student_id,
        university_id: student.university_id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        credibility_score: student.credibility_score
      }
    });
  } catch (err) {
    console.error('Quick switch error:', err);
    res.status(500).json({ error: 'Failed to switch user.' });
  }
};
