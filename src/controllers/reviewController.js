const db = require('../config/db');

exports.createReview = async (req, res) => {
  try {
    const reviewerId = req.user.student_id;
    const { ride_group_id, reviewed_student_id, rating_point, comment } = req.body;

    if (!ride_group_id || !reviewed_student_id || !rating_point) {
      return res.status(400).json({ error: 'Ride ID, reviewed student, and rating point are required.' });
    }

    const rating = parseInt(rating_point);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    if (reviewerId === reviewed_student_id) {
      return res.status(400).json({ error: 'You cannot rate yourself.' });
    }

    // Verify both were riders in this ride
    const riderCheck = await db.query(
      `SELECT student_id FROM rider WHERE ride_group_id = ? AND student_id IN (?, ?)`,
      [ride_group_id, reviewerId, reviewed_student_id]
    );

    if (riderCheck.length < 2) {
      return res.status(400).json({ error: 'Both students must have participated in this ride to review each other.' });
    }

    // Check if already reviewed
    const existing = await db.query(
      `SELECT * FROM review WHERE ride_group_id = ? AND reviewer_id = ? AND reviewed_student_id = ?`,
      [ride_group_id, reviewerId, reviewed_student_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a review for this student for this ride.' });
    }

    // Insert review
    await db.query(
      `INSERT INTO review (ride_group_id, reviewer_id, reviewed_student_id, rating_point, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [ride_group_id, reviewerId, reviewed_student_id, rating, comment || null]
    );

    // Dynamic Recalculation of student's credibility score
    const allRatings = await db.query(
      `SELECT AVG(rating_point) as avg_score, COUNT(*) as total_reviews
       FROM review
       WHERE reviewed_student_id = ?`,
      [reviewed_student_id]
    );

    if (allRatings.length > 0 && allRatings[0].avg_score !== null) {
      const newScore = parseFloat(allRatings[0].avg_score).toFixed(2);
      await db.query(
        `UPDATE student SET credibility_score = ? WHERE student_id = ?`,
        [newScore, reviewed_student_id]
      );
    }

    res.status(201).json({
      message: 'Review submitted successfully and credibility score updated!'
    });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
};

exports.getStudentReviews = async (req, res) => {
  try {
    const { student_id } = req.params;

    const reviews = await db.query(
      `SELECT 
        r.review_id,
        r.rating_point,
        r.comment,
        r.created_at,
        r.ride_group_id,
        s.name as reviewer_name,
        s.university_id as reviewer_uid,
        v.name as vehicle_name
       FROM review r
       JOIN student s ON r.reviewer_id = s.student_id
       JOIN ride_group rg ON r.ride_group_id = rg.ride_group_id
       JOIN vehicle v ON rg.vehicle_id = v.vehicle_id
       WHERE r.reviewed_student_id = ?
       ORDER BY r.created_at DESC`,
      [student_id]
    );

    res.json(reviews);
  } catch (err) {
    console.error('Get student reviews error:', err);
    res.status(500).json({ error: 'Failed to retrieve reviews.' });
  }
};
