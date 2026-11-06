// ==========================================================================
// DASHBOARD CONTROLLER - JUANA'S HOTEL
// 100% Dinámico, Gestión de Habitaciones y Reservas (Cloudflare D1 + LocalSync)
// ==========================================================================

const sesion = obtenerSesion();
if (!sesion || !sesion.email) {
  window.location.replace('index.html');
}

let hotel = obtenerHotel();
if (!hotel) {
  window.location.replace('hotel-setup.html');
}

// Conectar tema y logout
conectarBotonTema(document.getElementById('btn-tema'));

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    cerrarSesionCompleta();
    window.location.href = 'index.html';
  });
}

// Claves de almacenamiento local para sincronización y modo offline
const CLAVE_ROOMS = `hotel_rooms_${hotel.id || 'default'}`;
const CLAVE_BOOKINGS = `hotel_bookings_${hotel.id || 'default'}`;

// Estado en memoria (100% dinámico, inicia vacío hasta cargar)
let estadoHabitaciones = [];
let estadoReservas = [];
let filtroHabitaciones = 'todas';
let filtroReservas = 'todas';

// ==========================================================================
// UTILIDADES
// ==========================================================================
function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(valor) || 0).replace('US$', '$');
}

function obtenerIniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/);
  if (!partes.length || !partes[0]) return 'H';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

// Guardar en localStorage
function persistirLocalmente() {
  try {
    localStorage.setItem(CLAVE_ROOMS, JSON.stringify(estadoHabitaciones));
    localStorage.setItem(CLAVE_BOOKINGS, JSON.stringify(estadoReservas));
  } catch (err) {
    console.warn('Error al guardar en almacenamiento local:', err);
  }
}

// Cargar desde localStorage
function cargarLocalmente() {
  try {
    const rawR = localStorage.getItem(CLAVE_ROOMS);
    if (rawR) {
      estadoHabitaciones = JSON.parse(rawR);
    } else if (hotel.rooms && hotel.rooms.length) {
      estadoHabitaciones = hotel.rooms.map(r => ({ ...r, status: r.status || 'Disponible' }));
    } else {
      estadoHabitaciones = [];
    }

    const rawB = localStorage.getItem(CLAVE_BOOKINGS);
    estadoReservas = rawB ? JSON.parse(rawB) : [];
  } catch {
    estadoHabitaciones = [];
    estadoReservas = [];
  }
}

// ==========================================================================
// CARGA Y SINCRONIZACIÓN CON EL BACKEND (Cloudflare Pages + D1)
// ==========================================================================
async function sincronizarDatos() {
  cargarLocalmente();
  actualizarTodoElDashboard();

  try {
    // 1. Obtener dashboard unificado o habitaciones + reservas
    const res = await fetch(`/api/dashboard?email=${encodeURIComponent(sesion.email)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.hotel) {
        if (data.hotel.name) {
          hotel.name = data.hotel.name;
          guardarHotel(data.hotel);
        }
        if (Array.isArray(data.rooms)) {
          estadoHabitaciones = data.rooms;
        }
        if (Array.isArray(data.bookings)) {
          estadoReservas = data.bookings;
        }
        persistirLocalmente();
        actualizarTodoElDashboard();
      }
    }
  } catch (err) {
    // Si no hay API disponible, se opera de forma fluida con LocalStorage
    console.log('Operando con almacenamiento local:', err);
  }
}

// ==========================================================================
// CÁLCULO DE INGRESOS Y MÉTRICAS (Requerimiento 5)
// ==========================================================================
function calcularMetricas() {
  const totalHab = estadoHabitaciones.length;
  const libres = estadoHabitaciones.filter(r => (r.status || '').toLowerCase() === 'disponible').length;
  const ocupadas = estadoHabitaciones.filter(r => (r.status || '').toLowerCase() === 'ocupada').length;
  const mantenimiento = estadoHabitaciones.filter(r => (r.status || '').toLowerCase().includes('mantenimiento')).length;

  // Suma total acumulada de reservas (excluye canceladas)
  const reservasValidas = estadoReservas.filter(b => b.status !== 'Cancelada');
  const totalIngresos = reservasValidas.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalReservas = estadoReservas.length;

  const porcentajeOcupacion = totalHab > 0 ? Math.round((ocupadas / totalHab) * 100) : 0;

  return {
    totalIngresos,
    totalReservas,
    totalHab,
    libres,
    ocupadas,
    mantenimiento,
    porcentajeOcupacion
  };
}

function renderizarMetricas() {
  const m = calcularMetricas();

  // 1. Total de Ingresos
  const kpiIngresos = document.getElementById('kpi-ingresos');
  if (kpiIngresos) kpiIngresos.textContent = formatoMoneda(m.totalIngresos);

  const kpiIngresosDelta = document.getElementById('kpi-ingresos-delta');
  if (kpiIngresosDelta) {
    kpiIngresosDelta.textContent = m.totalReservas > 0
      ? `Acumulado de ${m.totalReservas} reserva${m.totalReservas > 1 ? 's' : ''}`
      : 'Sin ingresos registrados aún';
  }

  // 2. Habitaciones Ocupadas vs Libres
  const kpiOcupacion = document.getElementById('kpi-ocupacion');
  if (kpiOcupacion) {
    kpiOcupacion.textContent = `${m.ocupadas} / ${m.libres}`;
  }

  const kpiOcupacionDelta = document.getElementById('kpi-ocupacion-delta');
  if (kpiOcupacionDelta) {
    kpiOcupacionDelta.textContent = m.totalHab > 0
      ? `${m.porcentajeOcupacion}% ocupación (${m.ocupadas} ocupada${m.ocupadas !== 1 ? 's' : ''}, ${m.libres} libre${m.libres !== 1 ? 's' : ''})`
      : 'No hay habitaciones registradas';
  }

  // 3. Total de Reservas
  const kpiReservas = document.getElementById('kpi-reservas');
  if (kpiReservas) kpiReservas.textContent = m.totalReservas;

  const kpiReservasDelta = document.getElementById('kpi-reservas-delta');
  if (kpiReservasDelta) {
    kpiReservasDelta.textContent = m.totalReservas > 0
      ? `${estadoReservas.filter(b => b.status === 'Confirmada').length} confirmada(s)`
      : 'Sin reservas cargadas';
  }
}

// ==========================================================================
// RENDERIZADO DE LA VISTA RESUMEN (Gráfico dinámico + Reservas recientes)
// ==========================================================================
function renderizarResumen() {
  const listaRecientes = document.getElementById('lista-reservas-recientes');
  const emptyResumen = document.getElementById('reservas-empty-resumen');
  const chartEl = document.getElementById('chart-ocupacion');
  const chartEmpty = document.getElementById('chart-empty-msg');

  // Nombre en Sidebar
  const brandEl = document.getElementById('sidebar-brand-name');
  if (brandEl) brandEl.textContent = hotel.name || "Juana's Hotel";

  // Reservas recientes (máximo 4)
  const recientes = [...estadoReservas].slice(0, 4);

  if (!recientes.length) {
    if (listaRecientes) listaRecientes.innerHTML = '';
    if (emptyResumen) emptyResumen.hidden = false;
  } else {
    if (emptyResumen) emptyResumen.hidden = true;
    if (listaRecientes) {
      listaRecientes.innerHTML = recientes.map(res => {
        const claseEstado = (res.status || 'confirmada').toLowerCase();
        return `
          <li class="dash-reserva">
            <span class="dash-avatar">${obtenerIniciales(res.guest_name)}</span>
            <div>
              <strong>${escaparHTML(res.guest_name)}</strong>
              <small>${escaparHTML(res.room_number)} · ${formatoMoneda(res.amount)}</small>
              <span class="dash-estado ${claseEstado}">${escaparHTML(res.status)}</span>
            </div>
          </li>
        `;
      }).join('');
    }
  }

  // Gráfico semanal dinámico
  if (!estadoReservas.length) {
    if (chartEl) chartEl.innerHTML = Array(7).fill('<div class="dash-bar" style="height: 14px;"></div>').join('');
    if (chartEmpty) chartEmpty.hidden = false;
  } else {
    if (chartEmpty) chartEmpty.hidden = true;
    // Calcular distribución de reservas según días de la semana (Lun a Dom)
    const conteoDias = [0, 0, 0, 0, 0, 0, 0];
    estadoReservas.forEach(b => {
      if (b.check_in) {
        const f = new Date(b.check_in + 'T00:00:00');
        if (!isNaN(f.getTime())) {
          const diaIndex = (f.getDay() + 6) % 7; // Convertir 0 (Dom) a 6, 1 (Lun) a 0
          conteoDias[diaIndex] += 1;
        }
      }
    });

    const max = Math.max(...conteoDias, 1);
    if (chartEl) {
      chartEl.innerHTML = conteoDias.map((val, i) => {
        const altura = Math.max(16, Math.round((val / max) * 160));
        const esSabado = i === 5;
        const destacada = esSabado && val > 0 ? ' destacada' : '';
        return `<div class="dash-bar${destacada}" style="height:${altura}px;" title="${val} reserva(s)"></div>`;
      }).join('');
    }
  }
}

// ==========================================================================
// 3. MÓDULO DE GESTIÓN DE HABITACIONES (Requerimiento 3)
// ==========================================================================
function renderizarHabitaciones() {
  const contenedor = document.getElementById('lista-habitaciones');
  const emptySeccion = document.getElementById('habitaciones-empty');

  // Contadores de filtros
  const m = calcularMetricas();
  const cTodas = document.getElementById('cnt-hab-todas');
  const cLibres = document.getElementById('cnt-hab-libres');
  const cOcup = document.getElementById('cnt-hab-ocupadas');
  const cMant = document.getElementById('cnt-hab-mant');

  if (cTodas) cTodas.textContent = m.totalHab;
  if (cLibres) cLibres.textContent = m.libres;
  if (cOcup) cOcup.textContent = m.ocupadas;
  if (cMant) cMant.textContent = m.mantenimiento;

  // Filtrado
  const filtradas = estadoHabitaciones.filter(hab => {
    if (filtroHabitaciones === 'todas') return true;
    return (hab.status || '').toLowerCase() === filtroHabitaciones.toLowerCase();
  });

  if (!estadoHabitaciones.length) {
    if (contenedor) contenedor.innerHTML = '';
    if (emptySeccion) emptySeccion.hidden = false;
    return;
  }

  if (emptySeccion) emptySeccion.hidden = true;

  if (!filtradas.length) {
    if (contenedor) {
      contenedor.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #82828e;">
          No hay habitaciones con estado <strong>"${filtroHabitaciones}"</strong>.
        </div>
      `;
    }
    return;
  }

  if (contenedor) {
    contenedor.innerHTML = filtradas.map(hab => {
      const estadoActual = hab.status || 'Disponible';
      let claseBadge = 'disponible';
      if (estadoActual.toLowerCase() === 'ocupada') claseBadge = 'ocupada';
      if (estadoActual.toLowerCase().includes('mantenimiento')) claseBadge = 'mantenimiento';

      return `
        <article class="dash-room-card" data-room-id="${hab.id}">
          <div class="dash-room-head">
            <div class="dash-room-info">
              <h3>Habitación ${escaparHTML(hab.number)}</h3>
              <span>${escaparHTML(hab.type || 'Standard')}</span>
            </div>
            <span class="dash-badge-status ${claseBadge}">${escaparHTML(estadoActual)}</span>
          </div>

          <!-- Selector rápido de estado en 1 clic -->
          <div>
            <span class="dash-status-switcher-label">Cambio rápido de estado:</span>
            <div class="dash-status-switcher" role="group" aria-label="Cambiar estado">
              <button type="button" 
                      class="dash-status-btn ${estadoActual === 'Disponible' ? 'activo-disponible' : ''}" 
                      onclick="cambiarEstadoHabitacion(${hab.id}, 'Disponible')">
                ✓ Libre
              </button>
              <button type="button" 
                      class="dash-status-btn ${estadoActual === 'Ocupada' ? 'activo-ocupada' : ''}" 
                      onclick="cambiarEstadoHabitacion(${hab.id}, 'Ocupada')">
                ● Ocupada
              </button>
              <button type="button" 
                      class="dash-status-btn ${estadoActual === 'En Mantenimiento' ? 'activo-mantenimiento' : ''}" 
                      onclick="cambiarEstadoHabitacion(${hab.id}, 'En Mantenimiento')">
                ⚙ Mant.
              </button>
            </div>
          </div>

          <div class="dash-room-actions">
            <button type="button" class="dash-btn-icon" title="Editar habitación" onclick="abrirModalEditarHab(${hab.id})">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button type="button" class="dash-btn-icon del" title="Eliminar habitación" onclick="eliminarHabitacion(${hab.id})">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
        </article>
      `;
    }).join('');
  }
}

// Cambio rápido de estado en 1 clic
window.cambiarEstadoHabitacion = async function(id, nuevoEstado) {
  const hab = estadoHabitaciones.find(h => h.id == id);
  if (!hab) return;

  hab.status = nuevoEstado;
  persistirLocalmente();
  actualizarTodoElDashboard();

  try {
    await fetch('/api/rooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nuevoEstado })
    });
  } catch (err) {
    console.log('Actualizado localmente:', err);
  }
};

window.eliminarHabitacion = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta habitación?')) return;

  estadoHabitaciones = estadoHabitaciones.filter(h => h.id != id);
  persistirLocalmente();
  actualizarTodoElDashboard();

  try {
    await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
  } catch (err) {
    console.log('Eliminado localmente:', err);
  }
};

// ==========================================================================
// 4. MÓDULO DE GESTIÓN DE RESERVAS (Requerimiento 4)
// ==========================================================================
function renderizarReservas() {
  const tbody = document.getElementById('tbody-reservas');
  const emptySeccion = document.getElementById('reservas-empty-seccion');
  const tablaWrapper = document.querySelector('.dash-tabla-wrapper');

  // Contadores
  const cTodas = document.getElementById('cnt-res-todas');
  const cConf = document.getElementById('cnt-res-conf');
  const cPend = document.getElementById('cnt-res-pend');
  const cFin = document.getElementById('cnt-res-fin');
  const cCanc = document.getElementById('cnt-res-canc');

  if (cTodas) cTodas.textContent = estadoReservas.length;
  if (cConf) cConf.textContent = estadoReservas.filter(r => r.status === 'Confirmada').length;
  if (cPend) cPend.textContent = estadoReservas.filter(r => r.status === 'Pendiente').length;
  if (cFin) cFin.textContent = estadoReservas.filter(r => r.status === 'Finalizada').length;
  if (cCanc) cCanc.textContent = estadoReservas.filter(r => r.status === 'Cancelada').length;

  if (!estadoReservas.length) {
    if (tbody) tbody.innerHTML = '';
    if (tablaWrapper) tablaWrapper.hidden = true;
    if (emptySeccion) emptySeccion.hidden = false;
    return;
  }

  if (tablaWrapper) tablaWrapper.hidden = false;
  if (emptySeccion) emptySeccion.hidden = true;

  const filtradas = estadoReservas.filter(b => {
    if (filtroReservas === 'todas') return true;
    return (b.status || '').toLowerCase() === filtroReservas.toLowerCase();
  });

  if (tbody) {
    if (!filtradas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px; color: #82828e;">
            No hay reservas con estado <strong>"${filtroReservas}"</strong>.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtradas.map(b => {
      const claseEstado = (b.status || 'confirmada').toLowerCase();
      const estaActiva = b.status === 'Confirmada' || b.status === 'Pendiente';

      return `
        <tr>
          <td>
            <div class="dash-huesped-cell">
              <span class="dash-avatar" style="width: 32px; height: 32px; font-size: 0.7rem;">
                ${obtenerIniciales(b.guest_name)}
              </span>
              <span>${escaparHTML(b.guest_name)}</span>
            </div>
          </td>
          <td><strong>Hab. ${escaparHTML(b.room_number)}</strong></td>
          <td>${escaparHTML(b.check_in)}</td>
          <td>${escaparHTML(b.check_out)}</td>
          <td><strong>${formatoMoneda(b.amount)}</strong></td>
          <td>
            <span class="dash-tag-status ${claseEstado}">${escaparHTML(b.status)}</span>
          </td>
          <td>
            <div class="dash-tabla-acciones">
              ${estaActiva ? `
                <button type="button" class="dash-btn-finalizar" onclick="cambiarEstadoReserva(${b.id}, 'Finalizada')" title="Finalizar estadía y liberar habitación">
                  <i class="fa-solid fa-check"></i> Finalizar
                </button>
                <button type="button" class="dash-btn-cancelar" onclick="cambiarEstadoReserva(${b.id}, 'Cancelada')" title="Cancelar reserva">
                  <i class="fa-solid fa-ban"></i> Cancelar
                </button>
              ` : ''}
              <button type="button" class="dash-btn-icon del" onclick="eliminarReserva(${b.id})" title="Eliminar del registro">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.cambiarEstadoReserva = async function(id, nuevoEstado) {
  const res = estadoReservas.find(b => b.id == id);
  if (!res) return;

  res.status = nuevoEstado;

  // Si se finaliza o cancela, liberar la habitación asociada
  if (nuevoEstado === 'Finalizada' || nuevoEstado === 'Cancelada') {
    const habAsociada = estadoHabitaciones.find(h => h.id == res.room_id || String(h.number) === String(res.room_number));
    if (habAsociada && habAsociada.status === 'Ocupada') {
      habAsociada.status = 'Disponible';
    }
  }

  persistirLocalmente();
  actualizarTodoElDashboard();

  try {
    await fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nuevoEstado })
    });
  } catch (err) {
    console.log('Actualizado localmente:', err);
  }
};

window.eliminarReserva = async function(id) {
  if (!confirm('¿Deseas eliminar esta reserva?')) return;

  estadoReservas = estadoReservas.filter(b => b.id != id);
  persistirLocalmente();
  actualizarTodoElDashboard();

  try {
    await fetch(`/api/bookings?id=${id}`, { method: 'DELETE' });
  } catch (err) {
    console.log('Eliminado localmente:', err);
  }
};

// ==========================================================================
// MODAL DE HABITACIONES (CREAR / EDITAR)
// ==========================================================================
const modalHab = document.getElementById('modal-habitacion');
const formHab = document.getElementById('form-habitacion');
const btnCerrarModalHab = document.getElementById('btn-cerrar-modal-hab');
const btnCancelarModalHab = document.getElementById('btn-cancelar-modal-hab');
const modalHabTitulo = document.getElementById('modal-hab-titulo');

function abrirModalNuevaHab() {
  formHab.reset();
  document.getElementById('hab-edit-id').value = '';
  modalHabTitulo.textContent = 'Nueva Habitación';
  modalHab.classList.add('activo');
  modalHab.setAttribute('aria-hidden', 'false');
  document.getElementById('hab-numero').focus();
}

window.abrirModalEditarHab = function(id) {
  const hab = estadoHabitaciones.find(h => h.id == id);
  if (!hab) return;

  document.getElementById('hab-edit-id').value = hab.id;
  document.getElementById('hab-numero').value = hab.number;
  document.getElementById('hab-tipo').value = hab.type || 'Standard';
  document.getElementById('hab-estado').value = hab.status || 'Disponible';

  modalHabTitulo.textContent = `Editar Habitación ${hab.number}`;
  modalHab.classList.add('activo');
  modalHab.setAttribute('aria-hidden', 'false');
};

function cerrarModalHab() {
  modalHab.classList.remove('activo');
  modalHab.setAttribute('aria-hidden', 'true');
}

if (formHab) {
  formHab.addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = document.getElementById('hab-edit-id').value;
    const number = document.getElementById('hab-numero').value.trim();
    const type = document.getElementById('hab-tipo').value;
    const status = document.getElementById('hab-estado').value;

    if (!number) {
      alert('Por favor ingresá un número o nombre para la habitación.');
      return;
    }

    if (editId) {
      // Edición
      const hab = estadoHabitaciones.find(h => h.id == editId);
      if (hab) {
        hab.number = number;
        hab.type = type;
        hab.status = status;
      }
      persistirLocalmente();
      actualizarTodoElDashboard();
      cerrarModalHab();

      try {
        await fetch('/api/rooms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, number, type, status })
        });
      } catch (err) {
        console.log('Guardado localmente');
      }
    } else {
      // Creación
      const nuevaHab = {
        id: Date.now(),
        hotel_id: hotel.id,
        number,
        type,
        status
      };
      estadoHabitaciones.unshift(nuevaHab);
      persistirLocalmente();
      actualizarTodoElDashboard();
      cerrarModalHab();

      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: sesion.email, number, type, status })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.room) {
            nuevaHab.id = data.room.id;
            persistirLocalmente();
          }
        }
      } catch (err) {
        console.log('Guardado localmente');
      }
    }
  });
}

if (btnCerrarModalHab) btnCerrarModalHab.addEventListener('click', cerrarModalHab);
if (btnCancelarModalHab) btnCancelarModalHab.addEventListener('click', cerrarModalHab);

// Botones para abrir modal habitación
const btnAbrirModalHab = document.getElementById('btn-abrir-modal-hab');
const btnResumenNuevaHab = document.getElementById('btn-resumen-nueva-hab');
const btnEmptyCrearHab = document.getElementById('btn-empty-crear-hab');
if (btnAbrirModalHab) btnAbrirModalHab.addEventListener('click', abrirModalNuevaHab);
if (btnResumenNuevaHab) btnResumenNuevaHab.addEventListener('click', abrirModalNuevaHab);
if (btnEmptyCrearHab) btnEmptyCrearHab.addEventListener('click', abrirModalNuevaHab);

// ==========================================================================
// MODAL DE RESERVAS (REGISTRO MANUAL)
// ==========================================================================
const modalRes = document.getElementById('modal-reserva');
const formRes = document.getElementById('form-reserva');
const btnCerrarModalRes = document.getElementById('btn-cerrar-modal-res');
const btnCancelarModalRes = document.getElementById('btn-cancelar-modal-res');
const selectHabReserva = document.getElementById('res-habitacion');
const avisoHabReserva = document.getElementById('res-hab-aviso');

function poblarSelectHabitaciones() {
  if (!selectHabReserva) return;
  selectHabReserva.innerHTML = '<option value="">Seleccioná una habitación...</option>';

  if (!estadoHabitaciones.length) {
    if (avisoHabReserva) avisoHabReserva.textContent = 'Primero debes crear al menos una habitación.';
    return;
  }
  if (avisoHabReserva) avisoHabReserva.textContent = '';

  estadoHabitaciones.forEach(hab => {
    const opt = document.createElement('option');
    opt.value = hab.id;
    opt.dataset.number = hab.number;
    const esLibre = (hab.status || '').toLowerCase() === 'disponible';
    opt.textContent = `Hab. ${hab.number} (${hab.type || 'Standard'}) - ${hab.status}`;
    if (!esLibre) {
      opt.textContent += ' [Actualmente ocupada/mantenimiento]';
    }
    selectHabReserva.appendChild(opt);
  });
}

function abrirModalNuevaReserva() {
  if (formRes) formRes.reset();
  poblarSelectHabitaciones();

  // Fechas por defecto: checkin hoy, checkout mañana
  const hoy = new Date().toISOString().split('T')[0];
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inputIn = document.getElementById('res-checkin');
  const inputOut = document.getElementById('res-checkout');
  if (inputIn) inputIn.value = hoy;
  if (inputOut) inputOut.value = manana;

  modalRes.classList.add('activo');
  modalRes.setAttribute('aria-hidden', 'false');
  document.getElementById('res-huesped').focus();
}

function cerrarModalRes() {
  modalRes.classList.remove('activo');
  modalRes.setAttribute('aria-hidden', 'true');
}

if (formRes) {
  formRes.addEventListener('submit', async (e) => {
    e.preventDefault();

    const huesped = document.getElementById('res-huesped').value.trim();
    const habId = selectHabReserva.value;
    const habSeleccionada = estadoHabitaciones.find(h => h.id == habId);
    const habNumero = habSeleccionada ? habSeleccionada.number : (selectHabReserva.selectedOptions[0]?.dataset?.number || '');

    const checkIn = document.getElementById('res-checkin').value;
    const checkOut = document.getElementById('res-checkout');
    const monto = Number(document.getElementById('res-monto').value) || 0;
    const estado = document.getElementById('res-estado').value || 'Confirmada';

    if (!huesped || !habId || !checkIn || !checkOut.value) {
      alert('Por favor completá todos los campos requeridos de la reserva.');
      return;
    }

    if (new Date(checkOut.value) <= new Date(checkIn)) {
      alert('La fecha de Check-out debe ser posterior a la fecha de Check-in.');
      return;
    }

    const nuevaReserva = {
      id: Date.now(),
      hotel_id: hotel.id,
      guest_name: huesped,
      room_id: Number(habId),
      room_number: habNumero,
      check_in: checkIn,
      check_out: checkOut.value,
      amount: monto,
      status: estado,
      created_at: new Date().toISOString()
    };

    estadoReservas.unshift(nuevaReserva);

    // Si la reserva está confirmada, marcar la habitación como ocupada automáticamente
    if (estado === 'Confirmada' && habSeleccionada) {
      habSeleccionada.status = 'Ocupada';
    }

    persistirLocalmente();
    actualizarTodoElDashboard();
    cerrarModalRes();

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sesion.email,
          guest_name: huesped,
          room_id: Number(habId),
          room_number: habNumero,
          check_in: checkIn,
          check_out: checkOut.value,
          amount: monto,
          status: estado
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.booking) {
          nuevaReserva.id = data.booking.id;
          persistirLocalmente();
        }
      }
    } catch (err) {
      console.log('Guardado localmente:', err);
    }
  });
}

if (btnCerrarModalRes) btnCerrarModalRes.addEventListener('click', cerrarModalRes);
if (btnCancelarModalRes) btnCancelarModalRes.addEventListener('click', cerrarModalRes);

// Botones para abrir modal reserva
const btnAbrirModalRes = document.getElementById('btn-abrir-modal-reserva');
const btnResumenNuevaRes = document.getElementById('btn-resumen-nueva-reserva');
const btnEmptyCrearRes = document.getElementById('btn-empty-crear-reserva');
const btnEmptyPrimRes = document.getElementById('btn-empty-primera-reserva');

if (btnAbrirModalRes) btnAbrirModalRes.addEventListener('click', abrirModalNuevaReserva);
if (btnResumenNuevaRes) btnResumenNuevaRes.addEventListener('click', abrirModalNuevaReserva);
if (btnEmptyCrearRes) btnEmptyCrearRes.addEventListener('click', abrirModalNuevaReserva);
if (btnEmptyPrimRes) btnEmptyPrimRes.addEventListener('click', abrirModalNuevaReserva);

// Cerrar modales con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModalHab();
    cerrarModalRes();
  }
});

// ==========================================================================
// FILTROS
// ==========================================================================
document.querySelectorAll('[data-filtro-hab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filtro-hab]').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroHabitaciones = btn.dataset.filtroHab;
    renderizarHabitaciones();
  });
});

document.querySelectorAll('[data-filtro-res]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filtro-res]').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroReservas = btn.dataset.filtroRes;
    renderizarReservas();
  });
});

// ==========================================================================
// NAVEGACIÓN ENTRE VISTAS DEL DASHBOARD
// ==========================================================================
function mostrarVista(nombre) {
  document.querySelectorAll('.dash-vista').forEach(vista => {
    vista.classList.toggle('activo', vista.id === `vista-${nombre}`);
  });
  document.querySelectorAll('.dash-nav-item[data-vista]').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.vista === nombre);
  });
}

document.querySelectorAll('[data-vista]').forEach(btn => {
  btn.addEventListener('click', () => mostrarVista(btn.dataset.vista));
});

// ==========================================================================
// ACTUALIZACIÓN GLOBAL
// ==========================================================================
function actualizarTodoElDashboard() {
  renderizarMetricas();
  renderizarResumen();
  renderizarHabitaciones();
  renderizarReservas();
}

// Iniciar aplicación
sincronizarDatos();
