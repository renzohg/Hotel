import { ensureSchema, hotelPorEmail, habitacionesPorHotel, json } from './_db.js';

const TIPOS_HABITACION = ['Standard', 'Deluxe doble', 'Suite superior', 'Vista al mar'];

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return json({ error: 'Falta el correo.' }, 400);

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ ok: true, hotel: null });

    const rooms = await habitacionesPorHotel(env.DB, hotel.id);
    return json({ ok: true, hotel, rooms });
  } catch (error) {
    return json({ error: 'Error interno del servidor.' }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const {
      user_id,
      user_email,
      name,
      location,
      address,
      rooms_count,
      phone,
      hotel_type,
      description
    } = body;

    if (!user_email || !name || !location || !rooms_count) {
      return json({ error: 'Completá nombre, ubicación y cantidad de habitaciones.' }, 400);
    }

    const cantidad = Number(rooms_count);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 200) {
      return json({ error: 'La cantidad de habitaciones debe ser un número entre 1 y 200.' }, 400);
    }

    await ensureSchema(env.DB);

    const email = String(user_email).toLowerCase();
    const existente = await hotelPorEmail(env.DB, email);
    if (existente) {
      const rooms = await habitacionesPorHotel(env.DB, existente.id);
      return json({ ok: true, hotel: existente, rooms });
    }

    const hotel = await env.DB.prepare(`
      INSERT INTO hotels (user_id, user_email, name, location, address, rooms_count, phone, hotel_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, user_id, user_email, name, location, address, rooms_count, phone, hotel_type, description, created_at
    `).bind(
      user_id || null,
      email,
      name.trim(),
      location.trim(),
      address?.trim() || '',
      cantidad,
      phone?.trim() || '',
      hotel_type?.trim() || '',
      description?.trim() || ''
    ).first();

    const inserts = [];
    for (let i = 1; i <= cantidad; i += 1) {
      const numero = String(100 + i);
      const tipo = TIPOS_HABITACION[(i - 1) % TIPOS_HABITACION.length];
      inserts.push(
        env.DB.prepare('INSERT INTO rooms (hotel_id, number, type, status) VALUES (?, ?, ?, ?)')
          .bind(hotel.id, numero, tipo, 'Disponible')
      );
    }
    if (inserts.length) await env.DB.batch(inserts);

    const rooms = await habitacionesPorHotel(env.DB, hotel.id);
    return json({ ok: true, hotel, rooms }, 201);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return json({ error: 'Ya existe un hotel asociado a esta cuenta.' }, 409);
    }
    return json({ error: 'Error interno del servidor.' }, 500);
  }
}
