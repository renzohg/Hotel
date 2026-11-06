const CLAVE_SESION = 'usuario_hotel';
const CLAVE_HOTEL = 'hotel_usuario';

function primerNombre(nombreCompleto) {
  const nombre = String(nombreCompleto || '').trim();
  return nombre.split(/\s+/)[0] || 'Usuario';
}

function leerJSON(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(clave);
    return null;
  }
}

function obtenerSesion() {
  return leerJSON(CLAVE_SESION);
}

function obtenerHotel() {
  return leerJSON(CLAVE_HOTEL);
}

function guardarHotel(hotel) {
  if (!hotel) {
    localStorage.removeItem(CLAVE_HOTEL);
    return;
  }
  localStorage.setItem(CLAVE_HOTEL, JSON.stringify(hotel));
}

function iniciarSesion(usuario, hotel) {
  const sesion = {
    id: usuario.id ?? null,
    name: usuario.name,
    email: usuario.email,
    city: usuario.city || '',
    birthdate: usuario.birthdate || ''
  };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  if (hotel) {
    guardarHotel(hotel);
  } else {
    guardarHotel(null);
  }
  return sesion;
}

function cerrarSesionCompleta() {
  localStorage.removeItem(CLAVE_SESION);
  localStorage.removeItem(CLAVE_HOTEL);
}

function rutaTrasAutenticacion(hotel) {
  const hotelActivo = hotel || obtenerHotel();
  return hotelActivo && hotelActivo.id ? 'dashboard.html' : 'hotel-setup.html';
}

function aplicarTemaGuardado() {
  const temaGuardado = localStorage.getItem('tema');
  if (temaGuardado === 'claro') {
    document.documentElement.setAttribute('data-theme', 'claro');
  }
}

function conectarBotonTema(boton) {
  if (!boton) return;
  boton.addEventListener('click', () => {
    const esClaro = document.documentElement.getAttribute('data-theme') === 'claro';
    if (esClaro) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('tema', 'oscuro');
    } else {
      document.documentElement.setAttribute('data-theme', 'claro');
      localStorage.setItem('tema', 'claro');
    }
  });
}

aplicarTemaGuardado();
