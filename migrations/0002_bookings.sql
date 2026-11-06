CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  room_id INTEGER,
  room_number TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Confirmada',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
