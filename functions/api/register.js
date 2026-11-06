export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { name, birthdate, city, email, password } = body;

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hashear contraseña usando Web Crypto (PBKDF2)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    const storedPassword = `${saltHex}:${hashHex}`;

    const emailNormalizado = email.toLowerCase();

    const inserted = await env.DB.prepare(
      'INSERT INTO users (name, birthdate, city, email, password) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, birthdate || '', city || '', emailNormalizado, storedPassword).run();

    const usuario = await env.DB.prepare(
      'SELECT id, name, birthdate, city, email FROM users WHERE email = ?'
    ).bind(emailNormalizado).first();

    return new Response(JSON.stringify({
      ok: true,
      message: 'Usuario registrado con éxito.',
      user: usuario || {
        id: inserted?.meta?.last_row_id ?? null,
        name,
        birthdate: birthdate || '',
        city: city || '',
        email: emailNormalizado
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'El correo electrónico ya está registrado.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Error interno del servidor.', detalle: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}