export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Debes proporcionar email y contraseña.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar usuario en Cloudflare D1
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Credenciales inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar contraseña
    const [saltHex, originalHashHex] = user.password.split(':');
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );

    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== originalHashHex) {
      return new Response(JSON.stringify({ error: 'Credenciales inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let hotel = null;
    try {
      hotel = await env.DB.prepare(
        'SELECT id, user_id, user_email, name, location, address, rooms_count, phone, hotel_type, description, created_at FROM hotels WHERE user_email = ?'
      ).bind(user.email.toLowerCase()).first();
    } catch {
      hotel = null;
    }

    return new Response(JSON.stringify({
      ok: true,
      message: 'Inicio de sesión exitoso.',
      user: { id: user.id, name: user.name, email: user.email, city: user.city },
      hotel
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}