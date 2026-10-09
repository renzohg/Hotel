// Codigo para cambiar theme color


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









// Codigo para abrir y cerrar menu del navbar      (hecho con IA)


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


// Codigo para el slider de la seccion hero       (hecho con IA)

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
            dot.setAttribute('aria-pressed', pos === index);
        });
    };

    heroSlider.addEventListener('click', (e) => {
        const paso = e.target.closest('[data-carrusel-paso]')?.dataset.carruselPaso;
        const punto = e.target.closest('.hero-punto')?.dataset.carruselIndice;

        if (paso) mostrarSlide(index + Number(paso));
        if (punto) mostrarSlide(Number(punto));
    });

    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(() => mostrarSlide(index + 1), 5000);
    }
}


