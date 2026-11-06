// ==========================================
// 1. CAMBIO DE TEMA (DARK / LIGHT MODE)
// ==========================================
const botonTema = document.getElementById('btn-tema');

const temaGuardado = localStorage.getItem('tema');
if (temaGuardado === 'claro') {
  document.documentElement.setAttribute('data-theme', 'claro');
}

if (botonTema) {
  botonTema.addEventListener('click', () => {
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


// ==========================================
// 2. MENÚ NAVEGACIÓN HAMBURGUESA
// ==========================================
const botonMenu = document.getElementById('btn-menu');
const menuNavegacion = document.getElementById('nav-menu');

if (botonMenu && menuNavegacion) {
  const iconoMenu = botonMenu.querySelector('i');

  const cerrarMenu = () => {
    menuNavegacion.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.setAttribute('aria-label', 'Abrir menú');
    if (iconoMenu) iconoMenu.classList.replace('fa-xmark', 'fa-bars');
  };

  botonMenu.addEventListener('click', () => {
    const estaAbierto = menuNavegacion.classList.toggle('abierto');
    botonMenu.setAttribute('aria-expanded', String(estaAbierto));
    botonMenu.setAttribute('aria-label', estaAbierto ? 'Cerrar menú' : 'Abrir menú');
    if (iconoMenu) {
      iconoMenu.classList.replace(estaAbierto ? 'fa-bars' : 'fa-xmark', estaAbierto ? 'fa-xmark' : 'fa-bars');
    }
  });

  menuNavegacion.querySelectorAll('a, #btn-logout').forEach((enlace) => {
    enlace.addEventListener('click', cerrarMenu);
  });
}


// ==========================================
// 3. SLIDER SECCIÓN HERO
// ==========================================
const heroSlider = document.querySelector('.hero-slider');

if (heroSlider) {
  const heroTrack = heroSlider.querySelector('.hero-track');
  const heroDots = [...heroSlider.querySelectorAll('.hero-punto')];
  let index = 0;

  const mostrarSlide = (i) => {
    index = (i + heroTrack.children.length) % heroTrack.children.length;
    heroTrack.style.transform = `translateX(-${index * 100}%)`;
    heroDots.forEach((dot, pos) => {
      dot.classList.toggle('activo', pos === index);
      dot.setAttribute('aria-pressed', String(pos === index));
    });
  };

  heroSlider.addEventListener('click', (e) => {
    const paso = e.target.closest('[data-carrusel-paso]')?.dataset.carruselPaso;
    const punto = e.target.closest('.hero-punto')?.dataset.carruselIndice;

    if (paso) mostrarSlide(index + Number(paso));
    if (punto) mostrarSlide(Number(punto));
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => mostrarSlide(index + 1), 5000);
  }
}


// ==========================================
// 4. CONTROL DEL MODAL DE AUTENTICACIÓN
// ==========================================
const modalAuth = document.getElementById('modal-auth');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const modalTitulo = document.getElementById('modal-titulo');
const modalSubtitulo = document.getElementById('modal-subtitulo');
const camposLogin = document.getElementById('campos-login');
const camposRegistro = document.getElementById('campos-registro');
const btnSubmitModal = document.getElementById('btn-submit-modal');
const botonesAcceso = document.querySelectorAll('a[href="#entrar"], .enlace-entrar');

function abrirModal(e) {
  if (e) e.preventDefault();

  const esRegistro = e.currentTarget.dataset.action === 'register' || 
                     e.currentTarget.textContent.toLowerCase().includes('crear');

  if (esRegistro) {
    modalTitulo.textContent = 'Crear cuenta';
    modalSubtitulo.textContent = 'Completa tus datos para registrar tu hotel';
    camposLogin.style.display = 'none';
    camposRegistro.style.display = 'block';
    btnSubmitModal.textContent = 'Registrarse';
  } else {
    modalTitulo.textContent = 'Iniciar Sesión';
    modalSubtitulo.textContent = 'Ingresa a tu cuenta para gestionar tu hotel';
    camposRegistro.style.display = 'none';
    camposLogin.style.display = 'block';
    btnSubmitModal.textContent = 'Ingresar';
  }

  modalAuth.classList.add('activo');
  modalAuth.setAttribute('aria-hidden', 'false');

  // Inicializar o renderizar botón nativo de Google cuando se abre el modal
  setTimeout(inicializarGoogleOAuth, 50);
}

function cerrarModal() {
  modalAuth.classList.remove('activo');
  modalAuth.setAttribute('aria-hidden', 'true');
}

// ==========================================
// 4.1. GOOGLE IDENTITY SERVICES (OAUTH 2.0)
// ==========================================
const GOOGLE_CLIENT_ID = '885551405334-q379sp2874vf0a579k8e3f6gmg26lj2e.apps.googleusercontent.com';

function decodificarJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function manejarRespuestaGoogle(response) {
  if (!response || !response.credential) return;

  const payloadDecodificado = decodificarJWT(response.credential);

  try {
    let data = null;
    try {
      const res = await fetch('/api/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          userData: payloadDecodificado
        })
      });

      data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Error al autenticarse con Google.');
        return;
      }
    } catch (errRed) {
      // Fallback local en caso de entorno estático sin Cloudflare Functions activo
      if (payloadDecodificado && payloadDecodificado.email) {
        data = {
          ok: true,
          user: {
            id: Date.now(),
            name: payloadDecodificado.name || payloadDecodificado.email.split('@')[0],
            email: payloadDecodificado.email.toLowerCase(),
            city: '',
            birthdate: ''
          },
          hotel: obtenerHotel()
        };
      }
    }

    if (data && data.user) {
      iniciarSesion(data.user, data.hotel || null);
      pintarNavbarAutenticada(data.user);
      cerrarModal();
      window.location.href = rutaTrasAutenticacion(data.hotel);
    } else {
      alert(data?.message || 'Operación exitosa con Google.');
      cerrarModal();
    }
  } catch (error) {
    alert('Error al procesar la autenticación con Google.');
  }
}

function inicializarGoogleOAuth() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: manejarRespuestaGoogle,
    auto_select: false,
    cancel_on_tap_outside: true
  });

  const contenedor = document.getElementById('google-btn-contenedor');
  if (contenedor) {
    const esClaro = document.documentElement.getAttribute('data-theme') === 'claro';
    google.accounts.id.renderButton(contenedor, {
      theme: esClaro ? 'outline' : 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320
    });
  }
}

// Botón de respaldo para invocar el selector de Google One Tap / Prompt
const btnGoogleCustom = document.getElementById('btn-google-custom');
if (btnGoogleCustom) {
  btnGoogleCustom.addEventListener('click', () => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      inicializarGoogleOAuth();
      google.accounts.id.prompt();
    } else {
      alert('Cargando servicio de Google... Intenta nuevamente en unos segundos.');
    }
  });
}

window.addEventListener('load', inicializarGoogleOAuth);

botonesAcceso.forEach(boton => {
  boton.addEventListener('click', abrirModal);
});

if (btnCerrarModal) {
  btnCerrarModal.addEventListener('click', cerrarModal);
}

if (modalAuth) {
  modalAuth.addEventListener('click', (e) => {
    if (e.target === modalAuth) {
      cerrarModal();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalAuth && modalAuth.classList.contains('activo')) {
    cerrarModal();
  }
});


// ==========================================
// 5. CONEXIÓN CON CLOUDFLARE WORKERS (LOGIN & REGISTER)
// ==========================================
const formAuth = document.getElementById('form-auth');

if (formAuth) {
  formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();

    const esRegistro = camposRegistro.style.display !== 'none';
    const endpoint = esRegistro ? '/api/register' : '/api/login';

    // Deshabilitar botón durante el proceso
    const textoOriginal = btnSubmitModal.textContent;
    btnSubmitModal.disabled = true;
    btnSubmitModal.textContent = 'Procesando...';

    let payload = {};

    if (esRegistro) {
      payload = {
        name: document.getElementById('reg-nombre').value.trim(),
        birthdate: document.getElementById('reg-fecha').value,
        city: document.getElementById('reg-ciudad').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value
      };
    } else {
      payload = {
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value
      };
    }

    try {
      let data = null;
      let errorServidor = null;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        data = await response.json();

        if (!response.ok) {
          alert(data?.error || 'Ocurrió un error al procesar la solicitud.');
          return;
        }
      } catch (errConexion) {
        // Fallback local en caso de entorno estático sin Cloudflare Functions activo
        if (esRegistro) {
          data = {
            ok: true,
            user: { id: Date.now(), name: payload.name, email: payload.email, city: payload.city || '', birthdate: payload.birthdate || '' }
          };
        } else {
          const sesionPrevia = obtenerSesion();
          data = {
            ok: true,
            user: (sesionPrevia && sesionPrevia.email === payload.email)
              ? sesionPrevia
              : { id: Date.now(), name: payload.email.split('@')[0], email: payload.email, city: '' },
            hotel: obtenerHotel()
          };
        }
      }

      if (esRegistro && data && data.user) {
        // 1. Luego de registrarse: limpiar hotel previo y llevar directo al formulario de hotel
        iniciarSesion(data.user, null);
        formAuth.reset();
        cerrarModal();
        window.location.href = 'hotel-setup.html';
        return;
      }

      if (data && data.user) {
        // 2. Inicio de sesión: ir directo al dashboard si ya tiene hotel, o al setup si falta configurarlo
        iniciarSesion(data.user, data.hotel || null);
        pintarNavbarAutenticada(data.user);
        formAuth.reset();
        cerrarModal();
        window.location.href = rutaTrasAutenticacion(data.hotel);
      } else {
        alert(data?.message || 'Operación exitosa.');
        formAuth.reset();
        cerrarModal();
      }
    } catch (error) {
      alert('Error de conexión con el servidor. Revisa tu conexión a internet.');
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.textContent = textoOriginal;
    }
  });
}


// ==========================================
// 6. GESTIÓN DE SESIÓN (localStorage)
// ==========================================
const bloqueVisitante = document.getElementById('auth-visitante');
const bloqueUsuario = document.getElementById('auth-usuario');
const etiquetaNombre = document.getElementById('usuario-nombre');
const botonLogout = document.getElementById('btn-logout');
const botonPanel = document.getElementById('btn-panel');
const navLinkPanel = document.getElementById('nav-link-panel');

function actualizarEnlacePanel() {
  const destino = rutaTrasAutenticacion();
  const hotel = obtenerHotel();
  if (botonPanel) {
    botonPanel.href = destino;
    const texto = botonPanel.querySelector('span');
    if (texto) texto.textContent = hotel ? 'Panel de administración' : 'Configurar hotel';
  }
  if (navLinkPanel && document.body.classList.contains('sesion-activa')) {
    navLinkPanel.href = destino;
  }
}

function pintarNavbarAutenticada(usuario) {
  if (etiquetaNombre) {
    etiquetaNombre.textContent = `Hola, ${primerNombre(usuario.name)}`;
  }

  if (bloqueVisitante) bloqueVisitante.hidden = true;
  if (bloqueUsuario) bloqueUsuario.hidden = false;
  document.body.classList.add('sesion-activa');
  actualizarEnlacePanel();
}

function pintarNavbarVisitante() {
  if (etiquetaNombre) etiquetaNombre.textContent = 'Hola';
  if (bloqueVisitante) bloqueVisitante.hidden = false;
  if (bloqueUsuario) bloqueUsuario.hidden = true;
  document.body.classList.remove('sesion-activa');
  if (navLinkPanel) navLinkPanel.href = '#dashboard';
}

function cerrarSesion() {
  cerrarSesionCompleta();
  pintarNavbarVisitante();
}

function restaurarSesion() {
  const sesion = obtenerSesion();
  if (sesion && sesion.name && sesion.email) {
    pintarNavbarAutenticada(sesion);
  } else {
    pintarNavbarVisitante();
  }
}

if (botonLogout) {
  botonLogout.addEventListener('click', cerrarSesion);
}

document.addEventListener('DOMContentLoaded', restaurarSesion);
restaurarSesion();


