/* ============================================================
   VIAVISIÓN – APP.JS COMPLETO Y FUNCIONAL
   Tablas con Tabulator + Mapas + Gráficas + Filtros Globales
============================================================ */

/* ------------------------------
   1. URLs RAW DE GITHUB
------------------------------ */
const URL_ACCIDENTES =
  "https://raw.githubusercontent.com/egarcesi/ViaVision-Calarca/refs/heads/main/data/accidentes.json";
const URL_PUNTOS =
  "https://raw.githubusercontent.com/egarcesi/ViaVision-Calarca/refs/heads/main/data/puntos_intervencion.json";
const URL_SCORE =
  "https://raw.githubusercontent.com/egarcesi/ViaVision-Calarca/refs/heads/main/data/score-vehiculos.json";

/* ------------------------------ */
let accidentes = [];
let puntosIntervencion = [];
let scoreData = [];

let tablaScore;
let tablaFactor;
let tablaIndice;

let mapaInicializado = false;
let marcadoresCapa;
let hexCapa;

let map;

/* ============================================================
   2. INICIALIZAR SISTEMA
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Cargar datos
    accidentes = await fetch(URL_ACCIDENTES).then(r => r.json());
    puntosIntervencion = await fetch(URL_PUNTOS).then(r => r.json());
    scoreData = await fetch(URL_SCORE).then(r => r.json());

    console.log("✔ Datos cargados correctamente:", {
      accidentes: accidentes.length,
      puntos: puntosIntervencion.length,
      score: scoreData.length
    });

    // Normalización ligera: asegurar tipos y campos mínimos
    accidentes = accidentes.map(normalizeAccidente);
    scoreData = scoreData.map(normalizeScore);
    puntosIntervencion = puntosIntervencion.map(normalizePunto);

    inicializarMapa();
    actualizarMapa(accidentes); // inicial con toda la data

    generarTablaScore(scoreData);
    generarTablaFactorPorcentaje(); // tabla con datos fijos porcentuales
    generarTablaIndiceRiesgo(); // tabla con índice de riesgo que nos diste

    llenarFiltros();

    // Inicializar gráficas con todos los accidentes
    actualizarGraficas(accidentes);

    // Aplicar color-scale a las tablas HTML (factor porcentaje)
    aplicarColorEscalaTabla("tablaFactorPorcentaje", 1);
    aplicarColorEscalaTabla("tablaIndiceRiesgo", 5); // Índice de Riesgo columna 5 (0-based)
  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
});

/* ============================================================
   Helpers de normalización
============================================================ */
function normalizeAccidente(a) {
  // devolver copia con tipos correctos y campos esperados
  const copy = Object.assign({}, a);
  // Lat/Long numéricos
  copy.Latitud = numberOrNull(a.Latitud);
  copy.Longitud = numberOrNull(a.Longitud);
  // year/month/day as numbers if present
  copy.year = numberOrNull(a.year);
  copy.month = numberOrNull(a.month);
  copy.day = numberOrNull(a.day);
  // fecha: intentar parsear a ISO si posible
  if (!copy.fecha && a.fecha) copy.fecha = a.fecha;
  // asegurar strings
  copy.gravedad = copy.gravedad ? String(copy.gravedad).toUpperCase() : "";
  copy.tipo_vehiculo = copy.tipo_vehiculo ? String(copy.tipo_vehiculo).toUpperCase() : "";
  // genero (podría venir como genero_involucrados)
  copy.genero = (a.genero || a.genero_involucrados || "").toString();
  // cantidad hombres/mujeres
  copy.cantidad_hombres = numberOrZero(a.cantidad_hombres);
  copy.cantidad_mujeres = numberOrZero(a.cantidad_mujeres);
  // SCORE_ACCIDENTE si existe
  if (a.SCORE_ACCIDENTE !== undefined) copy.SCORE_ACCIDENTE = Number(a.SCORE_ACCIDENTE);
  return copy;
}

function normalizeScore(s) {
  const copy = Object.assign({}, s);
  copy.tipo_vehiculo = copy.tipo_vehiculo ? String(copy.tipo_vehiculo).toUpperCase() : "";
  copy.veh_principal = copy.veh_principal ? String(copy.veh_principal).toUpperCase() : (copy.tipo_vehiculo || "");
  copy.FACTOR_OBSOLESCENCIA = numberOrZero(copy.FACTOR_OBSOLESCENCIA);
  copy.SCORE_ACCIDENTE = numberOrZero(copy.SCORE_ACCIDENTE);
  return copy;
}

function normalizePunto(p) {
  const copy = Object.assign({}, p);
  copy.Latitud = numberOrNull(p.Latitud);
  copy.Longitud = numberOrNull(p.Longitud);
  return copy;
}

function numberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
function numberOrZero(v) {
  const n = numberOrNull(v);
  return n === null ? 0 : n;
}

/* ============================================================
   3. MAPA LEAFLET
============================================================ */
function inicializarMapa() {
  if (mapaInicializado) return;

  // Centro solicitado
  map = L.map("map", { preferCanvas: true }).setView([4.529549, -75.638781], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  marcadoresCapa = L.layerGroup().addTo(map);
  hexCapa = L.layerGroup().addTo(map);

  // Añadir capa de puntos de intervención (estrellas)
  const puntosLayer = L.layerGroup();
  puntosIntervencion.forEach(p => {
    if (p.Latitud && p.Longitud) {
      const popup = `<b>${p.Direccion || p.Direccion || "Punto"}</b><br>${p.Afectacion || ""}<br>${p.Categoria || ""}`;
      L.marker([p.Latitud, p.Longitud], {
        icon: L.icon({
          iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
          iconSize: [25,41], iconAnchor: [12,41]
        })
      }).bindPopup(popup).addTo(puntosLayer);
    }
  });
  puntosLayer.addTo(map);

  mapaInicializado = true;
}

/* ============================================================
   4. ACTUALIZAR MAPA CON FILTROS
============================================================ */
function actualizarMapa(data) {
  if (!mapaInicializado) inicializarMapa();

  marcadoresCapa.clearLayers();
  hexCapa.clearLayers();

  const res = 9;
  const hexCount = {};

  data.forEach(a => {
    if (!a.Latitud || !a.Longitud) return;

    const color =
      a.gravedad === "MUERTO" ? "#b10026" :
      a.gravedad === "HERIDO" ? "#f76824" : "#4daf4a";

    L.circleMarker([a.Latitud, a.Longitud], {
      radius: 5,
      color: color,
      fillOpacity: 0.9
    })
      .bindPopup(`
        <b>${a.tipo_accidente || "Siniestro"}</b><br>
        Vehículo: ${a.tipo_vehiculo || "N/A"}<br>
        Gravedad: ${a.gravedad || "N/A"}<br>
        Fecha: ${a.fecha || "N/A"}
      `)
      .addTo(marcadoresCapa);

    // hex
    try {
      const hex = h3.latLngToCell(Number(a.Latitud), Number(a.Longitud), res);
      hexCount[hex] = (hexCount[hex] || 0) + 1;
    } catch (e) {
      // ignore coordinates invalidas
    }
  });

  // Dibujar polígonos hex
  Object.keys(hexCount).forEach(hex => {
    try {
      const boundary = h3.cellToBoundary(hex, true); // [[lat,lng],...]
      const latlngs = boundary.map(p => [p[0], p[1]]);
      const count = hexCount[hex];
      const color = count > 20 ? "#800026" : count > 10 ? "#f16913" : count > 3 ? "#ffd92f" : "#ffffb2";

      L.polygon(latlngs, {
        color: color,
        weight: 1,
        fillOpacity: 0.25
      }).addTo(hexCapa);
    } catch (e) {
      // no dibujar si falla
    }
  });

  // ajustar bounds si hay marcadores
  const allMarkers = marcadoresCapa.getLayers();
  if (allMarkers.length > 0) {
    const g = new L.featureGroup(allMarkers);
    try { map.fitBounds(g.getBounds().pad(0.12)); } catch (e) {}
  }
}

/* ============================================================
   5. TABULATOR – TABLA DINÁMICA (SCORE)
============================================================ */
function generarTablaScore(data) {
  tablaScore = new Tabulator("#tablaScore", {
    data: data,
    layout: "fitColumns",
    pagination: "local",
    paginationSize: 12,
    height: "360px",
    columns: [
      { title: "ID", field: "Id", width: 60 },
      { title: "Fecha", field: "fecha", headerFilter:"input" },
      { title: "Vehículo", field: "tipo_vehiculo", headerFilter:"input" },
      { title: "Gravedad", field: "gravedad", headerFilter:"select", headerFilterParams:{ "": "Todas", "SOLO DAÑOS":"SOLO DAÑOS", "HERIDO":"HERIDO", "MUERTO":"MUERTO"} },
      { title: "Tipo Accidente", field: "tipo_accidente", headerFilter:"input" },
      { title: "Score", field: "SCORE_ACCIDENTE", formatter:"money", formatterParams:{precision:4} }
    ],
    initialSort: [{ column: "SCORE_ACCIDENTE", dir: "desc" }],
    tooltips:true,
    placeholder:"No hay datos"
  });
}

function actualizarTablaScore(data) {
  if (tablaScore) tablaScore.setData(data);
}

/* ============================================================
   6. TABLA FACTOR (%) – HTML simple + color-scale
   (los datos se toman de lo que nos diste)
============================================================ */
function generarTablaFactorPorcentaje(){
  // Si ya existe en HTML, Tabulator no es necesario — dejarla en HTML y aplicar color scale.
  // Pero aquí también la convertimos a Tabulator para interactividad opcional.
  const rows = [
    {veh:"AUTOMOVIL", val:71.25},{veh:"BUS", val:82.57},{veh:"BUSETA", val:92.65},
    {veh:"CAMION", val:75.39},{veh:"CAMIONETA", val:70.08},{veh:"CAMPERO", val:90.37},
    {veh:"CICLOMOTOR", val:66.67},{veh:"CUATRIMOTO", val:100.00},{veh:"MAQUINARIA AGRICOLA", val:100.00},
    {veh:"MAQUINARIA INDUSTRIAL", val:100.00},{veh:"MICROBUS", val:80.00},{veh:"MINITRACTOR", val:0.00},
    {veh:"MOTOCARRO", val:6.00},{veh:"MOTOCICLETA", val:53.02},{veh:"MOTOTRICICLO", val:100.00},
    {veh:"REMOLQUE", val:25.00},{veh:"SEMIREMOQLUE", val:50.00},{veh:"TRACTO CAMION", val:61.72},
    {veh:"VOLQUETA", val:85.07}
  ];

  // Reemplaza la tabla HTML por Tabulator para flexibilidad
  if (document.getElementById("tablaFactorPorcentaje")) {
    // crear Tabulator
    tablaFactor = new Tabulator("#tablaFactorPorcentaje", {
      data: rows,
      layout: "fitColumns",
      columns: [
        {title:"Tipo de Vehículo", field:"veh"},
        {title:"Factor (%)", field:"val", formatter:"progress", formatterParams:{min:0, max:100}, tooltip: true}
      ],
      height:"280px",
      placeholder:"No hay datos"
    });

    // aplicar colores a las celdas manualmente (transformar despues de render)
    tablaFactor.on("dataLoaded", function(){
      const min = Math.min(...rows.map(r=>r.val));
      const max = Math.max(...rows.map(r=>r.val));
      // recorrer DOM de Tabulator y colorear columna val
      const tableEl = document.querySelector("#tablaFactorPorcentaje .tabulator-tableholder");
      if (!tableEl) return;
      const cells = document.querySelectorAll("#tablaFactorPorcentaje .tabulator-cell[data-field='val']");
      cells.forEach(c => {
        const v = parseFloat(c.innerText);
        c.style.backgroundColor = colorScalePercent(v, min, max);
        c.style.color = "#000";
      });
    });
  }
}

/* ============================================================
   7. TABLA ÍNDICE DE RIESGO (tabla estática con tus valores)
   la convertimos en Tabulator para dinamismo y color
============================================================ */
function generarTablaIndiceRiesgo(){
  const rows = [
    {veh:"MOTO", num:603, sev:2.42, parque:9107, obso:0.65, riesgo:100.00},
    {veh:"BUS", num:15, sev:2.11, parque:292, obso:0.85, riesgo:44.35},
    {veh:"CAMION", num:26, sev:1.97, parque:1081, obso:0.69, riesgo:30.88},
    {veh:"CAMIONETA", num:38, sev:1.88, parque:1357, obso:0.70, riesgo:26.62},
    {veh:"AUTOMOVIL", num:139, sev:1.72, parque:3965, obso:0.71, riesgo:25.58},
    {veh:"VOLQUETA", num:4, sev:1.67, parque:134, obso:0.85, riesgo:14.33},
    {veh:"BICICLETA", num:25, sev:2.09, parque:0, obso:0.00, riesgo:8.75},
    {veh:"TRACTOCAMION", num:17, sev:1.94, parque:1, obso:0.00, riesgo:0.00},
  ];

  tablaIndice = new Tabulator("#tablaIndiceRiesgo", {
    data: rows,
    layout: "fitColumns",
    height: "300px",
    columns: [
      {title:"Tipo de Vehículo", field:"veh"},
      {title:"N° Accidentes", field:"num", hozAlign:"center"},
      {title:"Severidad Promedio", field:"sev", hozAlign:"center"},
      {title:"Parque Automotor", field:"parque", hozAlign:"center"},
      {title:"Obsolescencia Promedio", field:"obso", hozAlign:"center"},
      {title:"Índice de Riesgo (0–100)", field:"riesgo", hozAlign:"center", formatter: cell => {
        // crear badge y color según valor
        const v = Number(cell.getValue());
        const bg = colorScalePercent(v, 0, 100);
        return `<div style="padding:6px 8px;border-radius:6px;background:${bg};font-weight:600">${v.toFixed(2)}</div>`;
      }}
    ]
  });
}

/* ============================================================
   8. FILTROS GLOBALMENTE APLICADOS
============================================================ */
function llenarFiltros() {
  const selectVeh = document.querySelector("#tipo_vehiculo");
  const selectYear = document.querySelector("#year");

  // limpiar
  selectVeh.innerHTML = `<option value="">Todos</option>`;
  selectYear.innerHTML = `<option value="">Todos</option>`;

  const vehiculosSet = new Set(accidentes.map(a => a.tipo_vehiculo).filter(Boolean));
  [...vehiculosSet].sort().forEach(v => {
    selectVeh.insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`);
  });

  const yearsSet = new Set(accidentes.map(a => a.year).filter(Boolean));
  [...yearsSet].sort().forEach(y => {
    selectYear.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  });

  // listeners
  document.querySelector("#tipo_vehiculo").addEventListener("change", applyFilters);
  document.querySelector("#gravedad").addEventListener("change", applyFilters);
  document.querySelector("#year").addEventListener("change", applyFilters);
  document.querySelector("#btnLimpiar").addEventListener("click", () => {
    document.querySelector("#tipo_vehiculo").value = "";
    document.querySelector("#gravedad").value = "";
    document.querySelector("#year").value = "";
    applyFilters();
  });
}

function applyFilters() {
  const veh = document.querySelector("#tipo_vehiculo").value;
  const grav = document.querySelector("#gravedad").value;
  const year = document.querySelector("#year").value;

  const filtrado = accidentes.filter(a => {
    return (
      (veh === "" || a.tipo_vehiculo === veh) &&
      (grav === "" || a.gravedad === grav) &&
      (year === "" || String(a.year) === String(year))
    );
  });

  // actualizar UI
  actualizarTablaScore(filtrado);
  actualizarMapa(filtrado);
  actualizarGraficas(filtrado);
}

/* ============================================================
   9. GRÁFICAS: cálculo y render (día, mes, género)
============================================================ */
function generarEstadisticas(data) {
  // porDia: 1..31
  const porDia = Array(31).fill(0);
  const porMes = Array(12).fill(0);
  let hombres = 0, mujeres = 0;

  data.forEach(d => {
    // fecha robusta: soporta "1/1/2021 0:00" o "2021-01-01"
    if (d.fecha) {
      let dt = tryParseDate(d.fecha);
      if (dt) {
        const dia = dt.getDate();
        const mes = dt.getMonth(); // 0..11
        porDia[dia - 1] = (porDia[dia - 1] || 0) + 1;
        porMes[mes] = (porMes[mes] || 0) + 1;
      }
    }
    // genero: preferimos sumar cantidad_hombres/mujeres si existen
    hombres += numberOrZero(d.cantidad_hombres || d.cantidad_hombre || d.hombres);
    mujeres += numberOrZero(d.cantidad_mujeres || d.cantidad_mujer || d.mujeres);
    // fallback: si no hay contadores, usar campo genero
    if (!d.cantidad_hombres && !d.cantidad_mujeres && d.genero) {
      const g = d.genero.toString().toUpperCase();
      if (g.includes("MASC") || g === "H" || g.includes("MASCULINO")) hombres++;
      if (g.includes("FEM") || g === "M" || g.includes("FEMENINO")) mujeres++;
    }
  });

  return { porDia, porMes, hombres, mujeres };
}

function tryParseDate(s) {
  if (!s) return null;
  // intentar parseo robusto
  // Si es número timestamp
  if (!isNaN(Number(s))) return new Date(Number(s));
  // limpiar backslashes
  s = String(s).replace(/\\/g, "");
  // intenta Date constructor
  let d = new Date(s);
  if (isValidDate(d)) return d;
  // intentar formato D/M/YYYY HH:MM
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yy = Number(m[3]);
    d = new Date(yy, mm, dd);
    if (isValidDate(d)) return d;
  }
  return null;
}
function isValidDate(d) { return d instanceof Date && !isNaN(d.getTime()); }

/* Chart instances */
let grafDia, grafMes, grafGenero;

function actualizarGraficas(dataFiltrada) {
  const stats = generarEstadisticas(dataFiltrada);
  const porDia = stats.porDia;
  const porMes = stats.porMes;
  const hombres = stats.hombres;
  const mujeres = stats.mujeres;

  // Dia
  if (grafDia) grafDia.destroy();
  grafDia = new Chart(document.getElementById("graficaAccidentesDia"), {
    type: "bar",
    data: {
      labels: [...Array(31).keys()].map(i => i + 1),
      datasets: [{ label: "Accidentes", data: porDia, backgroundColor: "#196F9A" }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Mes
  if (grafMes) grafMes.destroy();
  grafMes = new Chart(document.getElementById("graficaAccidentesMes"), {
    type: "bar",
    data: {
      labels: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
      datasets: [{ label: "Accidentes", data: porMes, backgroundColor: "#f76824" }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Genero
  if (grafGenero) grafGenero.destroy();
  grafGenero = new Chart(document.getElementById("graficaGenero"), {
    type: "bar",
    data: {
      labels: ["Hombres", "Mujeres"],
      datasets: [{ label: "Involucrados", data: [hombres, mujeres], backgroundColor: ["#4daf4a", "#ff6384"] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/* ============================================================
   10. UTIL: escala de color (percent y generic)
============================================================ */
function colorScalePercent(v, min, max) {
  // v in 0..100
  const ratio = (v - min) / (max - min || 1);
  // rojo -> blanco: use linear interpolation
  const r = 255;
  const g = Math.round(255 * (1 - ratio));
  const b = Math.round(255 * (1 - ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

function colorScale(value, min, max) {
  // same as before but for float ranges
  let ratio = (value - min) / (max - min || 1);
  ratio = Math.min(1, Math.max(0, ratio));
  const red = 255;
  const green = Math.floor(255 * (1 - ratio));
  const blue = Math.floor(255 * (1 - ratio));
  return `rgb(${red},${green},${blue})`;
}

/* ============================================================
   11. APLICAR COLOR ESCALA A TABLAS HTML (genérico)
============================================================ */
function aplicarColorEscalaTabla(idTabla, indexValor) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return;
  const tbody = tabla.querySelector("tbody");
  if (!tbody) return;
  const filas = Array.from(tbody.rows);
  const valores = filas.map(f => parseFloat(f.cells[indexValor].innerText || 0));
  const minV = Math.min(...valores);
  const maxV = Math.max(...valores);

  filas.forEach(fila => {
    const v = parseFloat(fila.cells[indexValor].innerText || 0);
    fila.cells[indexValor].style.backgroundColor = colorScale(v, minV, maxV);
  });
}

/* ============================================================
   12. UTIL: parseFloat safe
============================================================ */
function parseFloatSafe(v){
  const n = Number(String(v).replace("%","").replace(",",".")); return Number.isNaN(n)?0:n;
}

/* ============================================================
   FIN del app.js
============================================================ */
