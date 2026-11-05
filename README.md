# 🛒 SuperSoria

> **Comparador de precios inteligente y cesta de la compra para todos los supermercados de Soria (Castilla y León, España)**  
> 47.000+ productos monitorizados en Mercadona, Dia, Alcampo, E.Leclerc, Lupa y Lidl. Motor de scraping diario automatizado con GitHub Actions y app móvil Android (Capacitor).

---

## 📍 Supermercados de Soria Monitoreados

La aplicación se centra estrictamente en los establecimientos y comercios presentes en **Soria capital y provincia** (excluyendo cadenas que no tienen hipermercado en Soria como Carrefour):

| Supermercado | Ubicación en Soria | Código Postal | Integración / Scraping |
| :--- | :--- | :--- | :--- |
| **Mercadona** | C/ Eduardo Saavedra / C/ José Luis Palomar | 42004 / 42003 | API REST Oficial Soria en tiempo real (CP 42001) |
| **Dia** | C/ Aguirre / Avda. Valladolid / C/ Sagunto | 42002 / 42004 | API REST Storefront Soria (búsqueda y ofertas) |
| **Lupa Supermercados** | Pl. Mariano Granados (Centro) / Almazán / El Burgo | 42002 / 42200 | Conector de catálogo y marcas locales |
| **Lidl** | Avda. de Valladolid | 42004 | Conector de marcas propias y descuentos |
| **E.Leclerc** | Hipermercado Polígono Las Casas / Leclerc Express | 42005 / 42003 | Catálogo local soriano + productos típicos |
| **Alcampo** | CC Camaretas (Golmayo / Soria) | 42190 | Registrado en la base de datos |
| **Calservi** | C/ Francisco de Soto (Supermercado local soriano) | 42004 | Registrado en la base de datos |

---

## 🚀 Características Principales

1. **Comparador de Precios en Soria:**
   - Detecta al instante qué supermercado de Soria tiene cada producto más barato.
   - Cálculo automático del ahorro potencial en euros y desglose por establecimiento.
   - Búsqueda en vivo por categorías o texto libre (ej: *"leche"*, *"aceite"*, *"torreznos"*, *"mantequilla"*).

2. **Lista de la Compra Inteligente:**
   - **Ordenación por pasillo (aisleOrder):** clasifica automáticamente los artículos en la ruta óptima de compra (Fruta y Verdura ➔ Panadería ➔ Frescos ➔ Lácteos ➔ Despensa ➔ Bebidas ➔ Limpieza).
   - **Comparativa de la cesta completa:** calcula el coste total estimado de tu lista en Mercadona vs Dia vs Lupa vs Lidl vs Leclerc para indicarte dónde te sale más económica la compra semanal.
   - Sincronización instantánea mediante código compartido (`shareCode`).

3. **Arquitectura Backend & Scraping:**
   - **Node.js + TypeScript + Express.**
   - **Prisma ORM con base de datos SQLite autocontenida** (`prisma/dev.db`), sin dependencias externas ni configuraciones complejas.
   - **Scrapers modulares** con mapeador inteligente de categorías y registro de auditoría (`ScrapeLog`).
   - **CRON planificado** para actualización automática diaria a las 04:00 AM.
   - **Panel Web / PWA embebido** en `http://localhost:3000` con Tailwind CSS para usarlo cómodamente desde el móvil o el ordenador.

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Accede desde tu navegador a:
* **Panel de la App:** [http://localhost:3000](http://localhost:3000)
* **API REST:** [http://localhost:3000/api](http://localhost:3000/api)

### 2. Ejecutar Scrapers Manualmente por Terminal
```bash
# Ejecutar scraping de Mercadona Soria
npm run scrape:mercadona

# Ejecutar scraping de Dia Soria
npm run scrape:dia

# Ejecutar todos los scrapers de Soria a la vez
npm run scrape:all
```

### 3. Inspeccionar la Base de Datos Visualmente
```bash
npm run prisma:studio
```
Abre una interfaz gráfica en `http://localhost:5555` para ver y editar productos, precios y supermercados.

---

## 📡 Endpoints de la API REST

### Supermercados y Categorías
* `GET /api/supermarkets` — Listado de todos los supermercados de Soria y número de precios registrados.
* `GET /api/categories` — Secciones ordenadas por pasillo inteligente con conteo de productos.
* `GET /api/stats` — Resumen global de productos, precios y ofertas en Soria.

### Productos y Precios
* `GET /api/products?q=leche&category=lacteos-huevos&supermarket=mercadona-saavedra` — Búsqueda y filtrado de productos con mejor precio calculado.
* `GET /api/products/:id/compare` — Comparativa detallada de precios de un producto entre todos los supermercados de Soria.

### Listas de la Compra
* `GET /api/lists/:shareCode` — Obtener lista agrupada por pasillo y estimación del coste total de la cesta en cada supermercado.
* `POST /api/lists/:shareCode/items` — Añadir artículo (asociado a un producto del catálogo o personalizado).
* `PATCH /api/items/:id/toggle` — Marcar / desmarcar como comprado.
* `DELETE /api/items/:id` — Eliminar artículo.

### Scrapers en Vivo
* `POST /api/scrapers/run` — Lanzar scraping para un supermercado o para todos.
* `GET /api/scrapers/logs` — Historial de ejecuciones y auditoría.
