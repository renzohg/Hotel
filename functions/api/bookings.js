import { ensureSchema, hotelPorEmail, reservasPorHotel, json } from './_db.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) return json({ error: 'Falta el correo.' }, 400);

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ ok: true, bookings: [] });

    const bookings = await reservasPorHotel(env.DB, hotel.id);
    return json({ ok: true, bookings });
  } catch (error) {
    return json({ error: 'Error al obtener reservas.', detalle: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const {
      email,
      guest_name,
      room_id,
      room_number,
      check_in,
      check_out,
      amount,
      status
    } = body;

    if (!email || !guest_name || !room_number || !check_in || !check_out) {
      return json({ error: 'Completá todos los campos obligatorios de la reserva.' }, 400);
    }

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ error: 'Hotel no encontrado.' }, 404);

    const montoValido = Number(amount) || 0;
    const estadoFinal = status || 'Confirmada';

    const insertResult = await env.DB.prepare(`
      INSERT INTO bookings (hotel_id, guest_name, room_id, room_number, check_in, check_out, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, hotel_id, guest_name, room_id, room_number, check_in, check_out, amount, status, created_at
    `).bind(
      hotel.id,
      String(guest_name).trim(),
      room_id || null,
      String(room_number).trim(),
      String(check_in).trim(),
      String(check_out).trim(),
      montoValido,
      estadoFinal.trim()
    ).first();

    // Si la reserva está confirmada, marcar la habitación como ocupada
    if (estadoFinal === 'Confirmada') {
      if (room_id) {
        await env.DB.prepare('UPDATE rooms SET status = ? WHERE id = ?').bind('Ocupada', room_id).run();
      } else {
        await env.DB.prepare('UPDATE rooms SET status = ? WHERE hotel_id = ? AND number = ?').bind('Ocupada', hotel.id, String(room_number).trim()).run();
      }
    }

    return json({ ok: true, booking: insertResult }, 201);
  } catch (error) {
    return json({ error: 'Error al crear la reserva.', detalle: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { id, status, guest_name, amount } = body;

    if (!id) return json({ error: 'Falta el id de la reserva.' }, 400);

    await ensureSchema(env.DB);

    const bookingPrevia = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!bookingPrevia) return json({ error: 'Reserva no encontrada.' }, 404);

    const updates = [];
    const binds = [];

    if (status !== undefined) {
      updates.push('status = ?');
      binds.push(String(status).trim());
    }
    if (guest_name !== undefined) {
      updates.push('guest_name = ?');
      binds.push(String(guest_name).trim());
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      binds.push(Number(amount) || 0);
    }

    if (!updates.length) return json({ error: 'No hay campos para actualizar.' }, 400);

    binds.push(id);

    const booking = await env.DB.prepare(`
      UPDATE bookings SET ${updates.join(', ')} WHERE id = ?
      RETURNING id, hotel_id, guest_name, room_id, room_number, check_in, check_out, amount, status, created_at
    `).bind(...binds).first();

    // Si se finaliza o cancela la reserva, liberar la habitación asociada
    if (status === 'Finalizada' || status === 'Cancelada') {
      if (bookingPrevia.room_id) {
        await env.DB.prepare('UPDATE rooms SET status = ? WHERE id = ?').bind('Disponible', bookingPrevia.room_id).run();
      } else if (bookingPrevia.room_number) {
        await env.DB.prepare('UPDATE rooms SET status = ? WHERE hotel_id = ? AND number = ?').bind('Disponible', bookingPrevia.hotel_id, bookingPrevia.room_number).run();
      }
    } else if (status === 'Confirmada') {
      if (bookingPrevia.room_id) {
        await env.DB.prepare('UPDATE rooms SET status = ? WHERE id = ?').bind('Ocupada', bookingPrevia.room_id).run();
      }
    }

    return json({ ok: true, booking });
  } catch (error) {
    return json({ error: 'Error al actualizar reserva.', detalle: error.message }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return json({ error: 'Falta el id de la reserva.' }, 400);

    await ensureSchema(env.DB);
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();

    await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();

    // Liberar la habitación
    if (booking?.room_id) {
      await env.DB.prepare('UPDATE rooms SET status = ? WHERE id = ?').bind('Disponible', booking.room_id).run();
    }

    return json({ ok: true, message: 'Reserva eliminada con éxito.' });
  } catch (error) {
    return json({ error: 'Error al eliminar reserva.', detalle: error.message }, 500);
  }
}
