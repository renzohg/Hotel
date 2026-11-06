import { ensureSchema, hotelPorEmail, habitacionesPorHotel, reservasPorHotel, json } from './_db.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return json({ error: 'Falta el correo.' }, 400);

    await ensureSchema(env.DB);
    const hotel = await hotelPorEmail(env.DB, email);
    if (!hotel) return json({ ok: true, hotel: null });

    const rooms = await habitacionesPorHotel(env.DB, hotel.id);
    const bookings = await reservasPorHotel(env.DB, hotel.id);

    // Métricas 100% dinámicas calculadas sobre la base de datos real
    const totalHabitaciones = rooms.length;
    const ocupadas = rooms.filter(r => (r.status || '').toLowerCase() === 'ocupada').length;
    const disponibles = rooms.filter(r => (r.status || '').toLowerCase() === 'disponible').length;
    const mantenimiento = rooms.filter(r => (r.status || '').toLowerCase().includes('mantenimiento')).length;

    // Suma acumulada de ingresos de reservas válidas
    const reservasValidas = bookings.filter(b => b.status !== 'Cancelada');
    const totalIngresos = reservasValidas.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const totalReservas = bookings.length;

    const porcentajeOcupacion = totalHabitaciones > 0 ? Math.round((ocupadas / totalHabitaciones) * 100) : 0;

    return json({
      ok: true,
      hotel,
      rooms,
      bookings,
      metrics: {
        totalRevenue: totalIngresos,
        totalBookings: totalReservas,
        totalRooms: totalHabitaciones,
        occupiedRooms: ocupadas,
        availableRooms: disponibles,
        maintenanceRooms: mantenimiento,
        occupancyPercentage: porcentajeOcupacion,
        recentReservations: bookings.slice(0, 5)
      }
    });
  } catch (error) {
    return json({ error: 'Error al cargar datos del dashboard.', detalle: error.message }, 500);
  }
}
