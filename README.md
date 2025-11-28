# 🛰️ ViaVisión — Plataforma de Inteligencia de Riesgo Vial

**Análisis Integrado de Siniestralidad Vial en Calarcá (2021–2025)**
**Datos al Ecosistema 2025**
**Autores:** [Elizabeth Garces Isaza](https://github.com/egarcesi) · [Gabriel Garzón](https://github.com/Gabo30-p) · [Jairo Acevedo](https://github.com/jairo-ds)

---

## 📌 Descripción General

ViaVisión es una plataforma web diseñada para integrar información crítica del territorio y generar **perfiles de riesgo vial** para la toma de decisiones basada en evidencia. El proyecto articula datos abiertos de **accidentalidad, puntos críticos y parque automotor** del municipio de Calarcá, permitiendo visualizar correlaciones esenciales en los tramos con mayor riesgo.

La solución está optimizada para facilitar a las entidades de Calarcá la **focalización territorial**, el posible diseño de **intervenciones precisas** y la ejecución de acciones en infraestructura, control vehicular y cultura ciudadana.

---

## 🎯 Objetivo General

Articular y analizar de forma inmediata los datos abiertos de siniestralidad (accidentes y puntos críticos) y de registro vehicular (parque automotor) para generar **perfiles de riesgo específicos** que permitan focalizar estrategias de seguridad vial, optimizando recursos y alineándose con los pilares del PNSV.

---

## 🧭 Objetivos Específicos

**OE1. Infraestructura y Vehículos:** Crear una matriz de cruce que priorice tramos donde confluyen alta siniestralidad y características críticas del parque automotor.

**OE2. Comunicación de Corresponsabilidad:** Identificar actores viales de mayor riesgo para campañas hiper‑focalizadas.

**OE3. Habilidades y Destrezas:** Determinar causas frecuentes de accidentalidad por tipo de vehículo para mejorar programas de formación.

---

## 🚀 Impacto Esperado

### **Infraestructura y Vehículos**

* Priorización con evidencia para mantenimiento, señalización y semaforización.
* Enfoque inteligente de operativos de control técnico‑mecánico.

### **Cultura Ciudadana y Corresponsabilidad**

* Mensajes de precisión basados en actor, hora y factor concurrente.
* Eliminación de campañas genéricas.

---

## 📊 Datos Utilizados

### **1. Vehículos matriculados 2020–2022 (Datos Abiertos)**

Fuente: [https://www.datos.gov.co/resource/bj7e-xc9g.json](https://www.datos.gov.co/resource/bj7e-xc9g.json)

Incluye: clase, modelo, tipo, antigüedad y características del parque automotor.

### **2. Accidentes Calarcá (2021–2025)**

Dataset en formato `.csv` con ubicación, tipo de vehículo implicado, hora, severidad y factores concurrentes.

### **3. Puntos de Intervención (Oficina TIC Alcalá)**

Capa georreferenciada con puntos de intervención vial.

### **4. Scripts ETL y generación de gráficos**

Procesados en **Google Colab**, con limpieza, cruces básicos y análisis exploratorio.

---

## 🗺️ Características de la Plataforma

* Mapa interactivo con Leaflet + capa satelital.
* Visualización de puntos críticos según riesgo.
* Cruces dinámicos: antigüedad del vehículo × accidentalidad × actor vial.
* Dashboard integrado con estadísticas, gráficos y filtros.
* Interfaz moderna, dark/light mode, animaciones.
* Desarrollado con **Vite** para un frontend rápido y modular.

---

## ⚙️ Tecnologías Utilizadas

* **Vite + JavaScript/HTML/CSS**
* **Leaflet** para mapas interactivos
* **Recharts** para visualizaciones
* **Python (Colab)** para ETL
* **GitHub Pages** para despliegue

---

## 🛠️ Instalación y Ejecución Local

```bash
# Clonar el repositorio
git clone https://github.com/TU-USUARIO/viavision.git
cd viavision

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Generar build de producción
npm run build
```

---

## 🌐 Despliegue en GitHub Pages

Este proyecto usa el plugin **vite-plugin-gh-pages**.


## 👥 Colaboradores

* **[Elizabeth Garces Isaza](https://github.com/egarcesi)** – Análisis, diseño, visualización, integración de datos.
* **[Gabriel Garzón](https://github.com/Gabo30-p)** – ETL, análisis y generación de gráficos.
* **[Jairo Acevedo](https://github.com/jairo-ds)** – Depuración, estructura y soporte analítico.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**, permitiendo uso abierto, modificación y redistribución con atribución a los autores.

---

## 📬 Contacto

¿Tienes preguntas o propuestas de mejora? ¡Bienvenido cualquier aporte al repositorio!

---

**ViaVisión** – Inteligencia de riesgo vial para decisiones con evidencia.
