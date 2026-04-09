'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'bookings.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT NOT NULL,
    preferredDate TEXT NOT NULL,
    preferredTime TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt INTEGER NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO bookings (id, firstName, lastName, phone, email, service, preferredDate, preferredTime, message, status, createdAt)
  VALUES (@id, @firstName, @lastName, @phone, @email, @service, @preferredDate, @preferredTime, @message, @status, @createdAt)
`);

const getByIdStmt = db.prepare('SELECT * FROM bookings WHERE id = ?');

const updateStatusStmt = db.prepare('UPDATE bookings SET status = ? WHERE id = ?');

/**
 * Save a new booking (status = 'pending').
 */
function saveBooking(booking) {
  insertStmt.run(booking);
}

/**
 * Retrieve a booking by ID.
 */
function getBookingById(id) {
  return getByIdStmt.get(id) || null;
}

/**
 * Update booking status to 'confirmed' or 'declined'.
 */
function updateBookingStatus(id, status) {
  updateStatusStmt.run(status, id);
}

module.exports = { saveBooking, getBookingById, updateBookingStatus };
