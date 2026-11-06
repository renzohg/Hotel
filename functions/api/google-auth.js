import { ensureSchema, hotelPorEmail, json } from './_db.js';

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { credential, userData } = body;

    let payload = null;
    if (credential) {
      payload = decodeJwtPayload(credential);
    }
    if (!payload && userData) {
      payload = userData;
    }

    if (!payload || !payload.email) {
      return json({ error: 'No se recibió un correo electrónico válido de Google.' }, 400);
    }

    const email = String(payload.email).trim().toLowerCase();
    const name = payload.name ? String(payload.name).trim() : email.split('@')[0];

    await ensureSchema(env.DB);

    // 1. Buscar si ya existe el usuario registrado con ese email
    let user = await env.DB.prepare(
      'SELECT id, name, birthdate, city, email FROM users WHERE email = ?'
    ).bind(email).first();

    // 2. Si no existe, insertar un nuevo registro con contraseña por defecto
    if (!user) {
      const inserted = await env.DB.prepare(`
        INSERT INTO users (name, birthdate, city, email, password)
        VALUES (?, ?, ?, ?, ?)
      `).bind(name, '', '', email, 'oauth:google').run();

      user = await env.DB.prepare(
        'SELECT id, name, birthdate, city, email FROM users WHERE email = ?'
      ).bind(email).first();

      if (!user) {
        user = {
          id: inserted?.meta?.last_row_id ?? Date.now(),
          name,
          email,
          city: '',
          birthdate: ''
        };
      }
    }

    // 3. Consultar si ya tiene un hotel creado
    let hotel = null;
    try {
      hotel = await hotelPorEmail(env.DB, email);
    } catch {
      hotel = null;
    }

    return json({
      ok: true,
      message: 'Autenticación con Google exitosa.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        city: user.city || '',
        birthdate: user.birthdate || ''
      },
      hotel
    }, 200);
  } catch (error) {
    return json({ error: 'Error al procesar autenticación con Google.', detalle: error.message }, 500);
  }
}
