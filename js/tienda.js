/* Malva Brunch · pedido, buscador, modo oscuro, visor de fotos y "volver arriba" */

const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Productos de la carta (para el buscador y el pedido) ---------- */
const PRODUCTOS = [
  ['Tostada de aguacate y tomate', 3.8, 'comidas', 'salada', 'salada-tostada-aguacate'],
  ['Tortitas con frutos rojos', 4.5, 'comidas', 'dulce', 'dulce-tortitas'],
  ['Bocadillo de jamón', 4.2, 'comidas', 'salada', 'salada-bocadillo'],
  ['Gofres con frutos rojos', 4.8, 'comidas', 'dulce', 'dulce-gofres'],
  ['Bowl de fruta y granola', 5.5, 'comidas', 'saludable', 'saludable-bowls'],
  ['Croissants variados', 3.9, 'comidas', 'mixta', 'mixta-croissants'],
  ['Refresco de frutos rojos', 2.8, 'bebidas', 'gaseosa', 'gaseosa-frutos-rojos'],
  ['Café latte', 2.2, 'bebidas', 'cafe', 'cafe-latte'],
  ['Batido de fresa', 3.5, 'bebidas', 'zumo', 'zumo-fresa'],
  ['Batido de frutos del bosque', 3.8, 'bebidas', 'zumo', 'zumo-frutos-del-bosque'],
  ['Combinados y copas', 6.5, 'bebidas', 'alcohol', 'alcohol-copas'],
  ['Capuchino con canela', 2.4, 'bebidas', 'cafe', 'cafe-capuchino'],
].map(([nombre, precio, pagina, categoria, img]) => ({ nombre, precio, pagina, categoria, img }));

const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Paneles (buscador, pedido, foto): se abren y se cierran igual ---------- */
document.querySelectorAll('[data-abrir]').forEach((b) =>
  b.addEventListener('click', () => document.getElementById(b.dataset.abrir)?.showModal()));
document.querySelectorAll('dialog').forEach((d) => {
  d.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // clic fuera = cerrar
});

/* ---------- Mi pedido: se guarda en el navegador y se envía por WhatsApp ---------- */
const CLAVE_PEDIDO = 'pedido-malva';
let pedido = {};
try { pedido = JSON.parse(localStorage.getItem(CLAVE_PEDIDO)) || {}; } catch { pedido = {}; }

function guardarPedido() {
  try { localStorage.setItem(CLAVE_PEDIDO, JSON.stringify(pedido)); } catch { /* sin almacenamiento */ }
  pintarPedido();
}

function cambiarCantidad(nombre, cambio) {
  pedido[nombre] = (pedido[nombre] || 0) + cambio;
  if (pedido[nombre] <= 0) delete pedido[nombre];
  guardarPedido();
}

function pintarPedido() {
  const lineas = Object.entries(pedido)
    .map(([nombre, cantidad]) => ({ ...PRODUCTOS.find((p) => p.nombre === nombre), cantidad }))
    .filter((l) => l.precio);
  const unidades = lineas.reduce((t, l) => t + l.cantidad, 0);
  const total = lineas.reduce((t, l) => t + l.cantidad * l.precio, 0);

  document.querySelectorAll('[data-contador]').forEach((c) => { c.textContent = unidades; c.hidden = !unidades; });

  const lista = document.getElementById('lineas-pedido');
  if (!lista) return;
  lista.innerHTML = lineas.length
    ? lineas.map((l) => `
      <li>
        <img src="img/${l.img}.jpg" alt="" width="56" height="40">
        <span class="linea-nombre">${l.nombre}<small>${euros(l.precio)}</small></span>
        <span class="cantidad">
          <button type="button" data-menos="${l.nombre}" aria-label="Quitar uno de ${l.nombre}">−</button>
          <b>${l.cantidad}</b>
          <button type="button" data-mas="${l.nombre}" aria-label="Añadir uno de ${l.nombre}">+</button>
        </span>
      </li>`).join('')
    : '<li class="vacio">Todavía no has añadido nada. Pulsa «+ Añadir» en la carta.</li>';
  document.getElementById('total-pedido').textContent = euros(total);

  const enviar = document.getElementById('enviar-pedido');
  const texto = `Hola, quiero hacer este pedido:\n${lineas.map((l) => `• ${l.cantidad} x ${l.nombre}`).join('\n')}\nTotal: ${euros(total)}`;
  enviar.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  enviar.classList.toggle('desactivado', !lineas.length);
  enviar.setAttribute('aria-disabled', String(!lineas.length));
  document.getElementById('vaciar-pedido').hidden = !lineas.length;
}

// Un solo "escuchador" para todos los botones (también los que crea el buscador)
document.addEventListener('click', (e) => {
  const anadir = e.target.closest('[data-producto]');
  if (anadir) {
    cambiarCantidad(anadir.dataset.producto, 1);
    anadir.textContent = '✓ Añadido';
    setTimeout(() => { anadir.textContent = '+ Añadir'; }, 1200);
  }
  const mas = e.target.closest('[data-mas]');
  const menos = e.target.closest('[data-menos]');
  if (mas) cambiarCantidad(mas.dataset.mas, 1);
  if (menos) cambiarCantidad(menos.dataset.menos, -1);
});
document.getElementById('enviar-pedido')?.addEventListener('click', (e) => {
  if (!Object.keys(pedido).length) e.preventDefault();
});
document.getElementById('vaciar-pedido')?.addEventListener('click', () => {
  if (window.confirm('¿Vaciar el pedido?')) { pedido = {}; guardarPedido(); }
});
// Si se cambia el pedido en otra pestaña, se actualiza aquí también
window.addEventListener('storage', (e) => {
  if (e.key !== CLAVE_PEDIDO) return;
  try { pedido = JSON.parse(e.newValue) || {}; } catch { pedido = {}; }
  pintarPedido();
});
pintarPedido();

/* ---------- Buscador (ignora tildes y mayúsculas) ---------- */
const buscador = document.getElementById('buscador');
const resultados = document.getElementById('resultados');
function buscar() {
  const q = sinTildes(buscador.value.trim());
  const encontrados = q
    ? PRODUCTOS.filter((p) => sinTildes(`${p.nombre} ${p.categoria} ${p.pagina}`).includes(q))
    : PRODUCTOS;
  resultados.innerHTML = encontrados.length
    ? encontrados.map((p) => `
      <li>
        <img src="img/${p.img}.jpg" alt="" width="56" height="40">
        <a class="linea-nombre" href="${p.pagina}.html#${p.categoria}">${p.nombre}<small>${euros(p.precio)}</small></a>
        <button type="button" class="anadir" data-producto="${p.nombre}">+ Añadir</button>
      </li>`).join('')
    : '<li class="vacio">No hay productos con ese nombre.</li>';
}
buscador?.addEventListener('input', buscar);
document.getElementById('panel-buscar')?.addEventListener('close', () => { buscador.value = ''; });
document.querySelector('[data-abrir="panel-buscar"]')?.addEventListener('click', () => { buscar(); buscador.focus(); });

/* ---------- Modo oscuro (se recuerda; el <head> lo aplica antes de pintar) ---------- */
const botonTema = document.getElementById('cambiar-tema');
function pintarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  if (!botonTema) return;
  botonTema.setAttribute('aria-pressed', String(oscuro));
  botonTema.querySelector('.icono-tema').textContent = oscuro ? '☀️' : '🌙';
  botonTema.querySelector('.herramienta-texto').textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
}
botonTema?.addEventListener('click', () => {
  const oscuro = document.documentElement.dataset.tema !== 'oscuro';
  if (oscuro) document.documentElement.dataset.tema = 'oscuro';
  else delete document.documentElement.dataset.tema;
  try { localStorage.setItem('tema-malva', oscuro ? 'oscuro' : 'claro'); } catch { /* sin almacenamiento */ }
  pintarTema();
});
pintarTema();

/* ---------- Ampliar las fotos de la carta ---------- */
const visor = document.getElementById('visor');
document.querySelectorAll('.ampliar').forEach((b) => b.addEventListener('click', () => {
  const img = b.querySelector('img');
  const foto = document.getElementById('visor-img');
  foto.src = img.src;
  foto.alt = img.alt;
  document.getElementById('visor-texto').textContent = b.closest('figure').querySelector('figcaption').textContent;
  visor.showModal();
}));

/* ---------- Botón "volver arriba" ---------- */
const arriba = document.getElementById('volver-arriba');
window.addEventListener('scroll', () => { arriba.hidden = window.scrollY < 600; }, { passive: true });
arriba?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: movimientoReducido ? 'auto' : 'smooth' }));
