import { ensureSchema, hotelPorEmail, habitacionesPorHotel, json } from './_db.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) return json({ error: 'Falta el correo.' }, 400);

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ ok: true, rooms: [] });

    const rooms = await habitacionesPorHotel(env.DB, hotel.id);
    return json({ ok: true, rooms });
  } catch (error) {
    return json({ error: 'Error al obtener habitaciones.', detalle: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { email, number, type, status } = body;

    if (!email || !number) {
      return json({ error: 'Faltan campos obligatorios (número/nombre de habitación).' }, 400);
    }

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ error: 'Hotel no encontrado.' }, 404);

    const estadoFinal = status || 'Disponible';
    const tipoFinal = type || 'Standard';

    const insertResult = await env.DB.prepare(`
      INSERT INTO rooms (hotel_id, number, type, status)
      VALUES (?, ?, ?, ?)
      RETURNING id, hotel_id, number, type, status
    `).bind(hotel.id, String(number).trim(), tipoFinal.trim(), estadoFinal.trim()).first();

    // Actualizar rooms_count en el hotel
    await env.DB.prepare(`
      UPDATE hotels SET rooms_count = (SELECT COUNT(*) FROM rooms WHERE hotel_id = ?) WHERE id = ?
    `).bind(hotel.id, hotel.id).run();

    return json({ ok: true, room: insertResult }, 201);
  } catch (error) {
    return json({ error: 'Error al crear habitación.', detalle: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { id, number, type, status } = body;

    if (!id) return json({ error: 'Falta el id de la habitación.' }, 400);

    await ensureSchema(env.DB);

    const updates = [];
    const binds = [];

    if (number !== undefined) {
      updates.push('number = ?');
      binds.push(String(number).trim());
    }
    if (type !== undefined) {
      updates.push('type = ?');
      binds.push(String(type).trim());
    }
    if (status !== undefined) {
      updates.push('status = ?');
      binds.push(String(status).trim());
    }

    if (!updates.length) return json({ error: 'No hay campos para actualizar.' }, 400);

    binds.push(id);

    const room = await env.DB.prepare(`
      UPDATE rooms SET ${updates.join(', ')} WHERE id = ?
      RETURNING id, hotel_id, number, type, status
    `).bind(...binds).first();

    return json({ ok: true, room });
  } catch (error) {
    return json({ error: 'Error al actualizar habitación.', detalle: error.message }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return json({ error: 'Falta el id de la habitación.' }, 400);

    await ensureSchema(env.DB);

    const room = await env.DB.prepare('SELECT hotel_id FROM rooms WHERE id = ?').bind(id).first();
    await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run();

    if (room?.hotel_id) {
      await env.DB.prepare(`
        UPDATE hotels SET rooms_count = (SELECT COUNT(*) FROM rooms WHERE hotel_id = ?) WHERE id = ?
      `).bind(room.hotel_id, room.hotel_id).run();
    }

    return json({ ok: true, message: 'Habitación eliminada.' });
  } catch (error) {
    return json({ error: 'Error al eliminar habitación.', detalle: error.message }, 500);
  }
}
