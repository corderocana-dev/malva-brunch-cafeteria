/* Malva Brunch · interacción de la web (sin librerías) */

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Carrusel principal: la foto central grande y las laterales veladas ---------- */
function iniciarCarruselLocal(carrusel) {
  const diapositivas = [...carrusel.querySelectorAll('.diapositiva')];
  const puntos = carrusel.querySelector('.puntos');
  const total = diapositivas.length;
  let actual = 0;
  let temporizador = null;

  // Un punto por foto
  diapositivas.forEach((_, i) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.setAttribute('aria-label', `Ver foto ${i + 1} de ${total}`);
    boton.addEventListener('click', () => mostrar(i));
    puntos.appendChild(boton);
  });

  const CLASES = ['activa', 'anterior', 'siguiente', 'anterior-2', 'siguiente-2'];

  function mostrar(indice) {
    actual = (indice + total) % total;
    diapositivas.forEach((d, i) => {
      // Distancia a la foto actual, contando "en círculo" (-2 … 2)
      let dist = (i - actual + total) % total;
      if (dist > total / 2) dist -= total;
      d.classList.remove(...CLASES);
      const clase = { 0: 'activa', '-1': 'anterior', 1: 'siguiente', '-2': 'anterior-2', 2: 'siguiente-2' }[dist];
      if (clase) d.classList.add(clase);
      d.setAttribute('aria-hidden', dist !== 0);
    });
    [...puntos.children].forEach((p, i) => p.setAttribute('aria-current', i === actual));
  }

  const siguiente = () => mostrar(actual + 1);
  const anterior = () => mostrar(actual - 1);

  carrusel.querySelector('.flecha-siguiente').addEventListener('click', () => { siguiente(); reiniciar(); });
  carrusel.querySelector('.flecha-anterior').addEventListener('click', () => { anterior(); reiniciar(); });

  // Pulsar una foto lateral la trae al centro
  diapositivas.forEach((d, i) => d.addEventListener('click', () => { if (i !== actual) { mostrar(i); reiniciar(); } }));

  // Deslizar con el dedo en el móvil
  let inicioX = null;
  carrusel.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
  carrusel.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) { dx < 0 ? siguiente() : anterior(); reiniciar(); }
    inicioX = null;
  });

  // Teclado: flechas izquierda/derecha cuando el carrusel tiene el foco
  carrusel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { siguiente(); reiniciar(); }
    if (e.key === 'ArrowLeft') { anterior(); reiniciar(); }
  });

  // Avance automático cada 5 s (se pausa con el ratón encima o con el foco dentro)
  function reiniciar() {
    clearInterval(temporizador);
    if (!reducirMovimiento) temporizador = setInterval(siguiente, 5000);
  }
  carrusel.addEventListener('mouseenter', () => clearInterval(temporizador));
  carrusel.addEventListener('mouseleave', reiniciar);
  carrusel.addEventListener('focusin', () => clearInterval(temporizador));
  carrusel.addEventListener('focusout', reiniciar);

  mostrar(0);
  reiniciar();
}

/* ---------- 2. Carrusel de tarjetas: las flechas hacen girar las tarjetas en bucle ---------- */
function iniciarCarruselTarjetas(carrusel) {
  const pista = carrusel.querySelector('.pista');
  let ocupado = false;

  const paso = () => {
    const tarjeta = pista.firstElementChild;
    const hueco = parseFloat(getComputedStyle(pista).columnGap) || 0;
    return tarjeta.getBoundingClientRect().width + hueco;
  };

  // Ejecuta fn cuando termina la animación de la pista. Si el navegador no la anima
  // (pestaña en segundo plano, movimiento reducido), se ejecuta igualmente a los 600 ms.
  function alTerminar(fn) {
    let hecho = false;
    const terminar = (e) => {
      if (hecho || (e && e.target !== pista)) return; // ignora animaciones de dentro de las tarjetas
      hecho = true;
      pista.removeEventListener('transitionend', terminar);
      fn();
    };
    pista.addEventListener('transitionend', terminar);
    setTimeout(terminar, reducirMovimiento ? 0 : 600);
  }

  // Coloca la pista sin animación
  function colocar(x) {
    pista.style.transition = 'none';
    pista.style.transform = `translateX(${x}px)`;
    pista.offsetHeight; // fuerza el repintado antes de volver a animar
    pista.style.transition = '';
  }

  function mover(direccion) {
    if (ocupado || pista.children.length < 2) return;
    ocupado = true;
    const distancia = paso();

    if (direccion === 1) {
      // Se desplaza a la izquierda y después la primera tarjeta pasa al final
      pista.style.transform = `translateX(${-distancia}px)`;
      alTerminar(() => {
        pista.appendChild(pista.firstElementChild);
        colocar(0);
        ocupado = false;
      });
    } else {
      // La última tarjeta pasa al principio y la pista entra desde la izquierda
      pista.prepend(pista.lastElementChild);
      colocar(-distancia);
      pista.style.transform = 'translateX(0)';
      alTerminar(() => { ocupado = false; });
    }
  }

  carrusel.querySelector('.flecha-siguiente').addEventListener('click', () => mover(1));
  carrusel.querySelector('.flecha-anterior').addEventListener('click', () => mover(-1));

  let inicioX = null;
  carrusel.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
  carrusel.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) mover(dx < 0 ? 1 : -1);
    inicioX = null;
  });
}

/* ---------- 3. Carta: al elegir una categoría se resaltan sus productos ---------- */
function iniciarCarta(carta) {
  const botones = [...carta.querySelectorAll('.categorias button')];
  const galeria = carta.querySelector('.galeria');
  const productos = [...galeria.querySelectorAll('li')];
  const verTodo = carta.querySelector('.ver-todo');

  function filtrar(categoria) {
    botones.forEach((b) => b.setAttribute('aria-pressed', b.dataset.categoria === categoria));
    galeria.classList.toggle('filtrando', Boolean(categoria));
    productos.forEach((p) => p.classList.toggle('coincide', p.dataset.categoria === categoria));
    verTodo.hidden = !categoria;
    // La dirección refleja la categoría (se puede compartir el enlace)
    history.replaceState(null, '', categoria ? `#${categoria}` : location.pathname);
  }

  botones.forEach((b) => b.addEventListener('click', () => {
    const yaActiva = b.getAttribute('aria-pressed') === 'true';
    filtrar(yaActiva ? null : b.dataset.categoria);
  }));
  verTodo.addEventListener('click', () => filtrar(null));

  // Si se llega con #categoria (por ejemplo desde los destacados de la portada)
  const desdeEnlace = location.hash.slice(1);
  if (botones.some((b) => b.dataset.categoria === desdeEnlace)) filtrar(desdeEnlace);
}

/* ---------- 4. Sugerencias y quejas: prepara un email con el mensaje ---------- */
function iniciarFormulario(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    const asunto = `${datos.get('tipo')} · ${datos.get('nombre')}`;
    const cuerpo = `${datos.get('mensaje')}\n\n${datos.get('nombre')}${datos.get('email') ? ` (${datos.get('email')})` : ''}`;
    window.location.href = `mailto:${form.dataset.para}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    form.querySelector('.nota-envio').hidden = false;
  });
}

document.querySelectorAll('.carrusel-local').forEach(iniciarCarruselLocal);
document.querySelectorAll('.carrusel-tarjetas').forEach(iniciarCarruselTarjetas);
document.querySelectorAll('.carta').forEach(iniciarCarta);
document.querySelectorAll('form[data-para]').forEach(iniciarFormulario);

// Año actual en el pie
document.querySelectorAll('.anio').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- 5. ¿Abierto ahora? Según el horario y la hora de Sevilla ---------- */
// [hora de apertura, hora de cierre] en minutos; domingo = 0
const HORARIO = {
  1: [450, 1200], 2: [450, 1200], 3: [450, 1200], 4: [450, 1200], 5: [450, 1200], // L-V 7:30-20:00
  6: [540, 840], 0: [540, 840],                                                    // S-D 9:00-14:00
};
const formatoHora = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

function actualizarEstado() {
  const cartel = document.getElementById('estado-local');
  if (!cartel) return;
  // Hora en España, aunque el visitante esté en otro país
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const [abre, cierra] = HORARIO[ahora.getDay()];
  const abierto = minutos >= abre && minutos < cierra;

  let texto;
  if (abierto) texto = `Abierto ahora · cierra a las ${formatoHora(cierra)}`;
  else if (minutos < abre) texto = `Cerrado · abre hoy a las ${formatoHora(abre)}`;
  else texto = `Cerrado · abre mañana a las ${formatoHora(HORARIO[(ahora.getDay() + 1) % 7][0])}`;

  cartel.innerHTML = `<a href="info.html#pedidos"><span class="punto"></span>${texto}</a>`;
  cartel.classList.toggle('abierto', abierto);
  cartel.hidden = false;
}
actualizarEstado();
setInterval(actualizarEstado, 60000);
