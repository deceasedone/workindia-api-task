const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db'); 
const { apiKeyAuth, authenticateUser } = require('./middleware'); 
require('dotenv').config();

const app = express();
app.use(express.json());

// Register a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Add a new train
app.post('/api/trains', apiKeyAuth, async (req, res) => {
  const { name, source_station_id, destination_station_id, total_seats } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO trains (name, source_station_id, destination_station_id, total_seats) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, source_station_id, destination_station_id, total_seats]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seat availability between source and destination
app.get('/api/trains/availability', async (req, res) => {
  const { source, destination } = req.query;
  try {
    const query = `
      SELECT 
        t.id,
        t.name,
        t.total_seats,
        t.total_seats - COUNT(b.id) AS available_seats
      FROM trains t
      LEFT JOIN bookings b ON t.id = b.train_id
      WHERE t.source_station_id = $1 AND t.destination_station_id = $2
      GROUP BY t.id, t.name, t.total_seats
    `;
    const result = await pool.query(query, [source, destination]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book a seat
app.post('/api/bookings', authenticateUser, async (req, res) => {
  const { train_id } = req.body;
  const userId = req.user.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the train row to prevent concurrent bookings
    const trainResult = await client.query(
      'SELECT total_seats FROM trains WHERE id = $1 FOR UPDATE',
      [train_id]
    );
    if (trainResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Train not found' });
    }

    const totalSeats = trainResult.rows[0].total_seats;
    const countResult = await client.query(
      'SELECT COUNT(*) FROM bookings WHERE train_id = $1',
      [train_id]
    );
    const bookedSeats = parseInt(countResult.rows[0].count, 10);

    if (bookedSeats >= totalSeats) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No seats available' });
    }

    await client.query(
      'INSERT INTO bookings (user_id, train_id) VALUES ($1, $2)',
      [userId, train_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Booking successful' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get booking details
app.get('/api/bookings/:id', authenticateUser, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      [bookingId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
