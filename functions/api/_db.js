export async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
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
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL,
        number TEXT NOT NULL,
        type TEXT DEFAULT 'Standard',
        status TEXT DEFAULT 'Disponible'
      )
    `),
    db.prepare(`
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
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birthdate TEXT DEFAULT '',
        city TEXT DEFAULT '',
        email TEXT NOT NULL UNIQUE,
        password TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function hotelPorEmail(db, email) {
  return db.prepare(
    'SELECT id, user_id, user_email, name, location, address, rooms_count, phone, hotel_type, description, created_at FROM hotels WHERE user_email = ?'
  ).bind(email.toLowerCase()).first();
}

export async function habitacionesPorHotel(db, hotelId) {
  const result = await db.prepare(
    'SELECT id, hotel_id, number, type, status FROM rooms WHERE hotel_id = ? ORDER BY id DESC'
  ).bind(hotelId).all();
  return result.results || [];
}

export async function reservasPorHotel(db, hotelId) {
  const result = await db.prepare(
    'SELECT id, hotel_id, guest_name, room_id, room_number, check_in, check_out, amount, status, created_at FROM bookings WHERE hotel_id = ? ORDER BY id DESC'
  ).bind(hotelId).all();
  return result.results || [];
}
