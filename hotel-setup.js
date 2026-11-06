const sesion = obtenerSesion();
if (!sesion || !sesion.email) {
  window.location.replace('index.html');
}

const hotelExistente = obtenerHotel();
if (hotelExistente && hotelExistente.id) {
  window.location.replace('dashboard.html');
}

conectarBotonTema(document.getElementById('btn-tema'));

const etiqueta = document.getElementById('usuario-nombre');
if (etiqueta && sesion) {
  etiqueta.textContent = `Hola, ${primerNombre(sesion.name)}`;
}

const form = document.getElementById('form-hotel');
const errorBox = document.getElementById('hotel-error');
const submitBtn = document.getElementById('btn-crear-hotel');

function mostrarError(mensaje) {
  errorBox.hidden = !mensaje;
  errorBox.textContent = mensaje || '';
}

function hotelLocal(payload, roomsCount) {
  const tipos = ['Standard', 'Deluxe doble', 'Suite superior', 'Vista al mar'];
  const rooms = Array.from({ length: roomsCount }, (_, i) => ({
    id: i + 1,
    number: String(100 + i + 1),
    type: tipos[i % tipos.length],
    status: 'Disponible'
  }));

  return {
    hotel: {
      id: Date.now(),
      user_id: payload.user_id,
      user_email: payload.user_email,
      name: payload.name,
      location: payload.location,
      address: payload.address,
      rooms_count: roomsCount,
      phone: payload.phone,
      hotel_type: payload.hotel_type,
      description: payload.description
    },
    rooms
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarError('');

  const roomsCount = Number(document.getElementById('hotel-habitaciones').value);
  const payload = {
    user_id: sesion.id,
    user_email: sesion.email,
    name: document.getElementById('hotel-nombre').value.trim(),
    location: document.getElementById('hotel-ubicacion').value.trim(),
    address: document.getElementById('hotel-direccion').value.trim(),
    rooms_count: roomsCount,
    phone: document.getElementById('hotel-telefono').value.trim(),
    hotel_type: document.getElementById('hotel-tipo').value,
    description: document.getElementById('hotel-descripcion').value.trim()
  };

  if (!payload.name || !payload.location || !roomsCount) {
    mostrarError('Completá nombre, ubicación y cantidad de habitaciones.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando hotel...';

  let resultado = null;

  try {
    const response = await fetch('/api/hotel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.ok && data.hotel) {
      resultado = data;
    } else if (data && data.error && response.status < 500) {
      mostrarError(data.error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear mi hotel';
      return;
    }
  } catch {
    resultado = null;
  }

  if (!resultado) {
    resultado = hotelLocal(payload, roomsCount);
  }

  guardarHotel({ ...resultado.hotel, rooms: resultado.rooms || [] });
  window.location.href = 'dashboard.html';
});
