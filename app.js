const boton = document.getElementById('btn-tema');

const temaGuardado = localStorage.getItem('tema');
if (temaGuardado === 'claro') {
    document.documentElement.setAttribute('data-theme', 'claro');
}

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












const botonMenu = document.getElementById('btn-menu');
const menuNavegacion = document.getElementById('nav-menu');
const iconoMenu = botonMenu.querySelector('i');

function cerrarMenu() {
    menuNavegacion.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.setAttribute('aria-label', 'Abrir menú');
    iconoMenu.classList.replace('fa-xmark', 'fa-bars');
}

botonMenu.addEventListener('click', () => {
    const estaAbierto = menuNavegacion.classList.toggle('abierto');
    botonMenu.setAttribute('aria-expanded', String(estaAbierto));
    botonMenu.setAttribute('aria-label', estaAbierto ? 'Cerrar menú' : 'Abrir menú');
    iconoMenu.classList.replace(estaAbierto ? 'fa-bars' : 'fa-xmark', estaAbierto ? 'fa-xmark' : 'fa-bars');
});

menuNavegacion.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', cerrarMenu);
});


