// Web de boda · Sara y Pablo — comportamiento de la página
(() => {
  'use strict';

  const BODA = new Date('2027-05-01T12:30:00+02:00').getTime();
  const IBAN = '[IBAN pendiente]';
  const COLORES_PETALO = ['#F4B6CF', '#E98AB1', '#F1E0A0', '#F7C9DA', '#D9729E', '#F4B6CF', '#F1E0A0', '#E98AB1'];
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const dos = (n) => String(n).padStart(2, '0');
  const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Invitación: el slug va en la ruta (/ana-y-luis) o en ?i= ----------

  function leerSlug() {
    const porParametro = new URLSearchParams(location.search).get('i');
    if (porParametro) return porParametro.trim().toLowerCase();
    const ultimo = location.pathname.split('/').filter(Boolean).pop() || '';
    if (/\.[a-z0-9]+$/i.test(ultimo)) return '';
    return decodeURIComponent(ultimo).toLowerCase();
  }

  const slug = leerSlug();
  const invitacion = (window.INVITADOS || {})[slug] || null;
  const solo = !!invitacion && invitacion.personas.length === 1;

  $('#saludo').textContent = invitacion ? invitacion.hola : '¡Hola!';
  $('#titulo-confirmar').textContent = !invitacion || solo ? '¿Nos confirmas?' : '¿Nos confirmáis?';

  // ---------- Cuenta atrás ----------

  const cuenta = { dias: $('#cd-dias'), horas: $('#cd-horas'), min: $('#cd-min'), seg: $('#cd-seg') };

  function actualizarCuenta() {
    const falta = Math.max(0, BODA - Date.now());
    cuenta.dias.textContent = Math.floor(falta / 864e5);
    cuenta.horas.textContent = dos(Math.floor(falta / 36e5) % 24);
    cuenta.min.textContent = dos(Math.floor(falta / 6e4) % 60);
    cuenta.seg.textContent = dos(Math.floor(falta / 1e3) % 60);
  }

  actualizarCuenta();
  setInterval(actualizarCuenta, 1000);

  // ---------- Aparición de bloques al hacer scroll ----------

  const revelables = $$('.revelar');
  if ('IntersectionObserver' in window && !sinMovimiento) {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        observador.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revelables.forEach((el) => observador.observe(el));
  } else {
    revelables.forEach((el) => el.classList.add('visible'));
  }

  // ---------- Nuestra historia: un capítulo por tramo de scroll ----------

  const pista = $('#pista');
  const escena = $('#escena');
  const capitulos = $$('.capitulo');
  const puntos = $$('#puntos span');
  const folio = $('#folio');
  const sigue = $('#sigue');
  let activo = -1;
  let pendiente = 0;

  function mostrarCapitulo(i) {
    if (i === activo) return;
    activo = i;
    capitulos.forEach((c, k) => {
      c.classList.toggle('activo', k === i);
      c.classList.toggle('pasado', k < i);
      c.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    puntos.forEach((p, k) => p.classList.toggle('activo', k === i));
    folio.textContent = dos(i + 1) + ' / ' + dos(capitulos.length);
    sigue.classList.toggle('oculto', i === capitulos.length - 1);
  }

  function medirHistoria() {
    pendiente = 0;
    const caja = pista.getBoundingClientRect();
    const recorrido = Math.max(1, caja.height - escena.offsetHeight);
    const progreso = Math.min(1, Math.max(0, -caja.top / recorrido));
    mostrarCapitulo(Math.min(capitulos.length - 1, Math.floor(progreso * capitulos.length)));
  }

  const alMover = () => { if (!pendiente) pendiente = requestAnimationFrame(medirHistoria); };
  window.addEventListener('scroll', alMover, { passive: true });
  window.addEventListener('resize', alMover);
  medirHistoria();

  // ---------- Confirmación de asistencia ----------

  const formulario = $('#formulario');
  const exito = $('#exito');

  if (!invitacion) {
    $('#aviso-enlace').hidden = false;
  } else {
    formulario.hidden = false;
    $('#formulario-nombre').textContent = invitacion.saludo;

    const respuestas = {};
    const lista = $('#personas');
    const botonEnviar = $('#enviar');
    const falta = $('#falta');

    lista.innerHTML = invitacion.personas.map((nombre, i) => {
      respuestas[nombre] = {};
      const n = escapar(nombre);
      return `
<fieldset class="persona" data-nombre="${n}">
<legend>${n}</legend>
<div class="persona-campos">
<div class="campo">
<p class="etiqueta">${solo ? '¿Vienes?' : '¿Viene?'}</p>
<div class="opciones">
<button type="button" class="opcion" data-campo="asiste" data-valor="si" aria-pressed="false">Sí, allí estaré</button>
<button type="button" class="opcion" data-campo="asiste" data-valor="no" aria-pressed="false">No podré</button>
</div>
</div>
<div class="persona-extra" hidden>
<div class="campo">
<label class="etiqueta" for="alergias-${i}">Alergias o intolerancias</label>
<input class="entrada" id="alergias-${i}" type="text" placeholder="Ninguna / gluten, marisco…" autocomplete="off">
</div>
<div class="campo">
<p class="etiqueta">${solo ? '¿Usarás el autobús?' : '¿Usará el autobús?'}</p>
<div class="opciones">
<button type="button" class="opcion" data-campo="bus" data-valor="si" aria-pressed="false">Sí</button>
<button type="button" class="opcion" data-campo="bus" data-valor="no" aria-pressed="false">No</button>
</div>
</div>
</div>
</div>
</fieldset>`;
    }).join('');

    function actualizarFormulario() {
      $$('.persona', lista).forEach((fs) => {
        const r = respuestas[fs.dataset.nombre];
        $$('.opcion', fs).forEach((b) => b.setAttribute('aria-pressed', String(r[b.dataset.campo] === b.dataset.valor)));
        $('.persona-extra', fs).hidden = r.asiste !== 'si';
      });
      const pendientes = invitacion.personas.filter((n) => !respuestas[n].asiste || (respuestas[n].asiste === 'si' && !respuestas[n].bus));
      botonEnviar.disabled = pendientes.length > 0;
      falta.hidden = pendientes.length === 0;
      falta.textContent = 'Falta por completar: ' + pendientes.join(', ') + '.';
    }

    lista.addEventListener('click', (e) => {
      const boton = e.target.closest('.opcion');
      if (!boton) return;
      respuestas[boton.closest('.persona').dataset.nombre][boton.dataset.campo] = boton.dataset.valor;
      actualizarFormulario();
    });

    botonEnviar.addEventListener('click', () => {
      const datos = {
        slug,
        cancion: $('#cancion').value.trim(),
        personas: invitacion.personas.map((nombre, i) => {
          const r = respuestas[nombre];
          const viene = r.asiste === 'si';
          return { nombre, asiste: r.asiste, bus: viene ? r.bus : '', alergias: viene ? $('#alergias-' + i).value.trim() : '' };
        })
      };
      // v1: todavía no se guarda en ningún sitio (en la v2 se enviará al Google Sheet).
      console.info('[v1] Respuesta sin guardar:', datos);

      const nadieViene = datos.personas.every((p) => p.asiste === 'no');
      $('#exito-texto').textContent = nadieViene
        ? 'Os echaremos de menos. ¡Gracias por avisarnos!'
        : (solo ? 'Ya queda un día menos para verte.' : 'Ya queda un día menos para veros.');
      lanzarPetalos();
      formulario.hidden = true;
      exito.hidden = false;
      exito.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
    });

    $('#modificar').addEventListener('click', () => {
      exito.hidden = true;
      formulario.hidden = false;
    });

    actualizarFormulario();
  }

  function lanzarPetalos() {
    const icono = $('#exito-icono');
    $$('.estallido', icono).forEach((el) => el.remove());
    if (sinMovimiento) return;
    COLORES_PETALO.forEach((color, i) => {
      const giro = document.createElement('span');
      giro.className = 'estallido';
      giro.setAttribute('aria-hidden', 'true');
      giro.style.transform = `rotate(${i * 45}deg)`;
      const petalo = document.createElement('i');
      petalo.style.background = color;
      giro.appendChild(petalo);
      icono.insertBefore(giro, icono.firstChild);
    });
  }

  // ---------- Lista de bodas: el sobre ----------

  const sobre = $('#sobre');
  const abrirSobre = $('#abrir-sobre');
  const copiar = $('#copiar-iban');

  abrirSobre.addEventListener('click', () => {
    sobre.classList.add('abierto');
    abrirSobre.hidden = true;
    $('#toca-sobre').hidden = true;
    copiar.hidden = false;
  });

  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(IBAN);
    } catch (err) {
      // Sin permiso de portapapeles: el IBAN sigue visible para copiarlo a mano.
    }
    $('#copiar-texto').textContent = '¡Copiado!';
  });
})();
