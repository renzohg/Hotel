CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT DEFAULT '',
  rooms_count INTEGER NOT NULL,
  phone TEXT DEFAULT '',
  hotel_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  number TEXT NOT NULL,
  type TEXT DEFAULT 'Standard',
  status TEXT DEFAULT 'disponible'
);
