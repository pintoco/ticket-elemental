# Elemental Pro — Help Desk System

Sistema de gestión de tickets técnicos SaaS multi-tenant para **Elemental Pro**, empresa chilena especializada en redes, CCTV, fibra óptica y soporte TI.

> **Elemental Pro** es el proveedor de servicios. Las demás empresas (municipalidades, colegios, etc.) son clientes que crean y consultan tickets de soporte.

---

## Índice

1. [Características principales](#características-principales)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura del proyecto](#arquitectura-del-proyecto)
4. [Inicio rápido con Docker](#inicio-rápido-con-docker)
5. [Credenciales de acceso](#credenciales-de-acceso)
6. [Módulos del sistema](#módulos-del-sistema)
7. [Roles y permisos](#roles-y-permisos)
8. [Estados de tickets y flujo](#estados-de-tickets-y-flujo)
9. [SLA por prioridad](#sla-por-prioridad)
10. [API REST](#api-rest)
11. [Variables de entorno](#variables-de-entorno)
12. [Producción en Railway](#producción-en-railway)
13. [Desarrollo local sin Docker](#desarrollo-local-sin-docker)
14. [Comandos útiles](#comandos-útiles)

---

## Características principales

- **Multi-tenant real**: cada empresa ve únicamente sus propios datos. El aislamiento está enforced en el backend en cada query, no solo en el frontend.
- **Gestión completa de tickets**: ciclo de vida con 7 estados, 4 niveles de prioridad, 4 tipos y 8 categorías especializadas en tecnología.
- **SLA automático**: se asigna al crear el ticket según la prioridad. El dashboard muestra cumplimiento, tickets vencidos y horas de retraso.
- **Dashboard con métricas en tiempo real**: KPIs, gráficos de tendencia (30 días), distribución por categoría, carga por técnico y módulo de SLA.
- **Reportes PDF**: generación de informes técnicos completos por ticket (datos, historial, comentarios, SLA, timeline). Se visualizan directamente en el navegador.
- **Gestión de activos**: inventario de equipos por empresa (cámaras, NVR, switches, routers, servidores, UPS, etc.) vinculados a tickets.
- **Sistema de comentarios tipo chat**: con soporte de notas internas (solo visibles por el equipo técnico) y adjuntos de imágenes.
- **Upload de imágenes a Cloudinary**: tickets y comentarios admiten hasta 5 imágenes cada uno, almacenadas permanentemente en la nube.
- **Notificaciones internas + email**: al crear un ticket se notifica por email al equipo técnico, al creador y al técnico asignado (vía Resend).
- **Registro de auditoría**: todas las acciones del sistema quedan registradas con usuario, empresa, timestamp y valores anteriores/nuevos.
- **PWA instalable**: funciona como app en Android y escritorio (Chrome/Edge). Incluye service worker con fallback offline.
- **Diseño responsive mobile-first**: sidebar como drawer en móvil con overlay. Funciona en smartphones y tablets.
- **JWT con refresh automático**: tokens de 15 minutos con refresh transparente de 7 días. Interceptor Axios maneja el ciclo completo.
- **Documentación Swagger**: disponible en `/api/docs` con todos los endpoints documentados.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | NestJS (TypeScript) | 10 |
| Frontend | Next.js App Router + React | 14 / 18 |
| Base de datos | PostgreSQL | 15 |
| ORM | Prisma | 5 |
| Cache | Redis | 7 |
| Autenticación | JWT + Passport.js + Refresh Tokens | — |
| UI / Estilos | TailwindCSS | 3 |
| Gráficos | Recharts | — |
| Estado global | Zustand (con persist) | — |
| Queries / Mutations | TanStack React Query | v5 |
| Formularios | react-hook-form + Zod (frontend) / class-validator (backend) | — |
| Notificaciones UI | react-hot-toast | — |
| Íconos | lucide-react | — |
| Email | Resend (HTTP API) | — |
| Imágenes | Cloudinary (cloud storage) | — |
| PDF | pdfmake | 0.3.x |
| Contenedores | Docker + Docker Compose | — |
| Docs API | Swagger / OpenAPI | — |

---

## Arquitectura del proyecto

```
ticket/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Esquema completo de BD
│   │   └── seed.ts              # Datos de prueba realistas
│   └── src/
│       ├── auth/                # JWT, refresh tokens, guards globales, Passport
│       ├── users/               # CRUD usuarios, multi-tenant, cambio contraseña
│       ├── companies/           # Multi-empresa: create/update/delete con validaciones
│       ├── tickets/             # Core: estados, prioridades, SLA, filtros, paginación
│       ├── comments/            # Chat con notas internas y adjuntos de imágenes
│       ├── assets/              # Inventario de activos tecnológicos por empresa
│       ├── dashboard/           # Métricas en tiempo real + SLA analytics
│       ├── reports/             # Generación de PDF con pdfmake (inline browser view)
│       ├── notifications/       # Notificaciones internas con contador no-leídas
│       ├── audit-logs/          # Registro de auditoría de todas las acciones
│       ├── mail/                # Email transaccional via Resend
│       ├── cloudinary/          # Upload de imágenes a Cloudinary (buffer-based)
│       ├── common/              # Decorators, guards, filters, interceptors
│       └── prisma/              # PrismaModule global
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/login/           # Página de login
        │   └── (dashboard)/
        │       ├── layout.tsx           # Layout principal: sidebar, header, auth guard
        │       ├── dashboard/           # Panel con KPIs, gráficos y SLA
        │       ├── tickets/             # Lista, detalle, nuevo ticket, edición
        │       │   └── [id]/
        │       │       ├── page.tsx     # Detalle + chat comentarios + PDF
        │       │       └── edit/        # Formulario edición pre-cargado
        │       ├── assets/              # CRUD de activos tecnológicos
        │       ├── users/               # Gestión de usuarios (modal create/edit)
        │       ├── companies/           # Gestión de empresas (modal create/edit)
        │       ├── notifications/       # Centro de notificaciones
        │       └── settings/            # Perfil + cambio de contraseña
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx          # Sidebar responsivo (drawer en móvil)
        │   │   └── Header.tsx           # Header con notificaciones y perfil
        │   └── PwaInit.tsx              # Registro del service worker PWA
        ├── lib/
        │   ├── api.ts                   # Axios + interceptor refresh token + API calls
        │   └── utils.ts                 # cn(), formatDate(), STATUS_CONFIG, etc.
        ├── store/
        │   └── auth.store.ts            # Zustand auth store con persist
        ├── types/
        │   └── index.ts                 # Interfaces TypeScript completas
        └── public/
            ├── manifest.json            # PWA manifest
            ├── sw.js                    # Service worker (cache + offline fallback)
            ├── offline.html             # Página offline
            ├── icon.svg                 # Ícono PWA
            └── icon-maskable.svg        # Ícono maskable para Android
```

---

## Inicio rápido con Docker

### Requisitos previos

- Docker Desktop instalado y corriendo
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/pintoco/ticket-elemental.git
cd ticket-elemental

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de entorno)

# 3. Levantar todos los servicios (primera vez, tarda ~3-5 min)
docker-compose up --build -d

# 4. Poblar la base de datos con datos de prueba (solo primera vez)
docker exec ticket_backend npx ts-node prisma/seed.ts

# 5. Acceder al sistema
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/v1
# Swagger: http://localhost:3001/api/docs
```

> **Nota**: El backend ejecuta `prisma db push` automáticamente al iniciar. No necesitas correrlo manualmente.

---

## Credenciales de acceso

| Rol | Email | Contraseña | Empresa |
|-----|-------|------------|---------|
| **SUPER_ADMIN** | ppinto@elementalpro.cl | Admin1234! | Elemental Pro |
| **ADMIN EP** | gerencia@elementalpro.cl | Admin1234! | Elemental Pro |
| **TECHNICIAN 1** | tecnico1@elementalpro.cl | Tecnico1234! | Elemental Pro |
| **TECHNICIAN 2** | tecnico2@elementalpro.cl | Tecnico1234! | Elemental Pro |
| **TECHNICIAN 3** | tecnico3@elementalpro.cl | Tecnico1234! | Elemental Pro |
| **ADMIN La Serena** | admin@laserena.cl | Admin1234! | Municipalidad La Serena |
| **OPERATOR La Serena** | operador@laserena.cl | Operador1234! | Municipalidad La Serena |
| **ADMIN Tierra Amarilla** | admin@tierraamarilla.cl | Admin1234! | Municipalidad Tierra Amarilla |
| **OPERATOR Tierra Amarilla** | operador@tierraamarilla.cl | Operador1234! | Municipalidad Tierra Amarilla |
| **CLIENT SLEP** | ti@slepatacama.cl | Cliente1234! | SLEP Atacama |

---

## Módulos del sistema

### Backend

#### `auth` — Autenticación
- JWT access token (15 min) + refresh token (7 días)
- Guards globales `JwtAuthGuard` y `RolesGuard` registrados como `APP_GUARD`
- Todas las rutas requieren autenticación por defecto; usar `@Public()` para excluirlas
- Estrategias Passport para JWT y refresh
- `TransformInterceptor` envuelve respuestas en `{ success, data, timestamp }`
- `HttpExceptionFilter` formatea errores en `{ success, statusCode, message, errors }`

#### `users` — Gestión de usuarios
- CRUD completo con aislamiento por `companyId`
- Hash bcrypt de contraseñas
- Endpoint separado para cambio de contraseña
- `getTechnicians()`: devuelve TODOS los técnicos del sistema (siempre son de Elemental Pro), sin filtro de empresa — permite que clientes asignen técnicos EP a sus tickets
- Solo `SUPER_ADMIN` puede crear usuarios con rol `TECHNICIAN` o `SUPER_ADMIN`
- Técnicos y super admins solo pueden pertenecer a la empresa con slug `elementalpro`

#### `companies` — Multi-empresa
- CRUD completo; solo `SUPER_ADMIN` puede crear/editar/eliminar empresas
- Eliminación segura: falla si la empresa tiene usuarios o tickets asociados
- El `slug` se genera al crear y no se puede modificar después

#### `tickets` — Core del sistema
- 7 estados, 4 prioridades, 4 tipos, 8 categorías
- SLA asignado automáticamente según prioridad al crear el ticket
- Filtros: estado, prioridad, tipo, categoría, empresa, técnico asignado
- Búsqueda full-text: título, número de ticket, ID cámara, IP
- Paginación con metadatos (total, página, totalPages)
- Upload de hasta 5 imágenes por ticket a Cloudinary (flujo en 2 pasos: crear ticket → subir imágenes)
- `ticketNumber` con formato `EP-YYYY-NNNNN` (zero-padded, ordenamiento lexicográfico = numérico)

#### `comments` — Chat de soporte
- Comentarios públicos (visibles por todos) e internos (solo equipo técnico)
- Upload de hasta 5 imágenes por comentario a Cloudinary
- `isInternal: true` solo visible para `SUPER_ADMIN`, `ADMIN` y `TECHNICIAN`

#### `assets` — Inventario de activos
- Tipos: CAMERA, NVR, DVR, SWITCH, ROUTER, FIBER_LINK, SERVER, UPS, ACCESS_POINT, OTHER
- Estados: ACTIVE, INACTIVE, MAINTENANCE, FAULTY, RETIRED
- Campos: nombre, marca, modelo, número de serie, IP, MAC, ubicación, piso, fechas, notas
- Vinculación a tickets para trazabilidad
- Eliminación protegida: falla si el activo tiene tickets asociados

#### `dashboard` — Métricas y SLA
- Resumen por estado (OPEN, IN_PROGRESS, PENDING, ON_SITE, RESOLVED, VALIDATED, CLOSED)
- Conteo por prioridad (CRITICAL, HIGH)
- Distribución por categoría y empresa (solo SUPER_ADMIN)
- Carga por técnico (top 10)
- Tendencia 30 días (tickets creados vs resueltos por día)
- Tiempo promedio de resolución
- **SLA Analytics**: tickets vencidos con horas de retraso, tasa de cumplimiento de tickets resueltos, top 8 más críticos

#### `reports` — PDF
- Generación de informes técnicos completos con pdfmake 0.3.x
- Fuente Helvetica (built-in PDF, sin archivos de fuente externos)
- Contenido: header con branding, badges de estado/prioridad, grid de información, información técnica (ubicación, IP, activo), timeline de fechas (creado, en terreno, resuelto, validado, cerrado), descripción, comentarios públicos
- SLA calculado inline (cumplido/incumplido con horas de diferencia)
- Se visualiza directamente en el navegador (`Content-Disposition: inline`)

#### `notifications` — Notificaciones internas
- 5 tipos: ticket creado, actualizado, asignado, resuelto, comentario nuevo
- Contador de no leídas con polling cada 30 segundos
- Marcar individualmente o todas como leídas

#### `audit-logs` — Registro de auditoría
- Registro automático de creación, actualización y eliminación
- Guarda usuario, empresa, entidad, acción, valores anteriores y nuevos, timestamp

#### `mail` — Email transaccional
- Usa Resend (HTTP API puerto 443) — Railway bloquea SMTP
- Template HTML responsive con branding Elemental Pro
- Al crear un ticket notifica a: `tecnico@elementalpro.cl`, creador del ticket, técnico asignado
- Fire-and-forget: nunca bloquea la creación del ticket
- Inicialización lazy: si `RESEND_API_KEY` no está configurada, omite envíos con un warning (no crashea el servidor)

#### `cloudinary` — Upload de imágenes
- `CloudinaryService.uploadImage(buffer)`: sube un Buffer a Cloudinary, retorna `secure_url`
- Las URLs almacenadas en BD son absolutas (`https://res.cloudinary.com/...`) — nunca prefijar con la URL del backend
- `MulterModule` usa `memoryStorage()`: los archivos llegan como buffers al controller

---

### Frontend

#### Dashboard
- Fila de 7 KPI cards (uno por estado)
- AreaChart de tendencia 30 días (creados vs resueltos)
- PieChart distribución por categoría
- BarChart carga por técnico
- Sección SLA: tickets vencidos, tasa de cumplimiento, tiempo promedio de resolución
- Tabla de tickets con SLA vencido (badge `+Xh` en rojo/naranja)
- Auto-refresh cada 60 segundos

#### Lista de tickets
- Tabla con badge de prioridad y estado
- Filtros encadenados: estado, prioridad, categoría
- Búsqueda global (título, número, cámara, IP)
- Paginación con navegación
- Ordenados por `ticketNumber` descendente (más recientes primero)
- Botón "Nuevo Ticket" siempre visible

#### Detalle de ticket
- Header con número, título, empresa y botón de descarga PDF
- Sidebar derecho: estado actual, prioridad, asignado, fechas, SLA, ubicación, IP, cámara, activo, etiquetas
- Botón de cambio de estado con transiciones válidas según rol
- Historial de comentarios tipo chat (distingue internos con fondo especial)
- Formulario de nuevo comentario con selector interno/público y upload de imágenes
- Visualización de imágenes adjuntas (tickets y comentarios) con links directos a Cloudinary
- Generación de PDF: abre el informe en nueva pestaña del navegador

#### Activos
- Tabla con tipo de activo (con íconos), estado, IP, empresa, cantidad de tickets
- Filtros por tipo y estado
- Modal create/edit con todos los campos
- Modal de confirmación de eliminación con aviso si tiene tickets asociados

#### Usuarios
- Tabla con rol (badge con colores), empresa, estado activo/inactivo
- Modal de edición: nombre, apellido, teléfono, rol (solo SUPER_ADMIN puede cambiar rol de técnicos)
- Creación: el rol TECHNICIAN solo aparece para SUPER_ADMIN; seleccionarlo auto-fija la empresa a Elemental Pro

#### PWA / Mobile
- Web App Manifest completo con shortcuts (Nuevo Ticket, Mis Tickets)
- Íconos SVG branded (normal + maskable para Android)
- Service worker: cache-first para assets estáticos, network-first para navegación, fallback offline
- Página offline con diseño branded
- Sidebar como drawer en móvil con overlay oscuro y animación de slide
- Header siempre visible con botón hamburger funcional en todos los tamaños

---

## Roles y permisos

| Rol | Dashboard | Tickets | Activos | Usuarios | Empresas | PDF | Admin |
|-----|-----------|---------|---------|----------|----------|-----|-------|
| **SUPER_ADMIN** | Global | Todos | Todos | Todos | ✅ CRUD | ✅ | ✅ |
| **ADMIN** | Su empresa | Su empresa | Su empresa | Su empresa | Solo ver | ✅ | Parcial |
| **TECHNICIAN** | Sus asignados | Asignados | Su empresa | ❌ | ❌ | ✅ | ❌ |
| **OPERATOR** | Su empresa | Su empresa | Solo ver | ❌ | ❌ | ❌ | ❌ |
| **CLIENT** | ❌ | Solo propios | ❌ | ❌ | ❌ | ❌ | ❌ |

**Reglas críticas de aislamiento multi-tenant (backend):**
- `SUPER_ADMIN`: sin filtro de empresa en ninguna query
- Todos los demás: `where: { companyId: requestingUser.companyId }` en cada service
- `TECHNICIAN`: en tickets además filtra `where: { assignedToId: requestingUser.id }`
- `getTechnicians()` NO filtra por empresa — los técnicos son siempre de Elemental Pro y deben ser visibles para todas las empresas cliente

---

## Estados de tickets y flujo

```
OPEN ──→ IN_PROGRESS ──→ ON_SITE ──→ RESOLVED ──→ VALIDATED ──→ CLOSED
  │           │              │            │
  │           └──→ PENDING ──┘            └──→ CLOSED
  │                                        └──→ OPEN (reapertura)
  └──────────────────────────────────────────→ CLOSED
```

| Estado | Descripción |
|--------|-------------|
| `OPEN` | Ticket recibido, pendiente de atender |
| `IN_PROGRESS` | Técnico trabajando remotamente |
| `PENDING` | En espera de información o respuesta del cliente |
| `ON_SITE` | Técnico en terreno (sitio del cliente) |
| `RESOLVED` | Problema resuelto, pendiente de validación |
| `VALIDATED` | Cliente confirmó la resolución |
| `CLOSED` | Ticket cerrado definitivamente |

---

## SLA por prioridad

| Prioridad | SLA | Uso típico |
|-----------|-----|-----------|
| `CRITICAL` | 2 horas | Sistema de seguridad sin imagen, fibra principal cortada |
| `HIGH` | 4 horas | Múltiples cámaras sin imagen, fallo de switch principal |
| `MEDIUM` | 8 horas | Cámara individual sin imagen, configuración errónea |
| `LOW` | 24 horas | Mantención preventiva, ajuste de imagen, limpieza |

El SLA vence contando desde `createdAt`. El dashboard marca en rojo los tickets que superaron el límite y muestra la tasa de cumplimiento de los resueltos.

---

## API REST

**Base URL**: `http://localhost:3001/api/v1`
**Documentación interactiva**: `http://localhost:3001/api/docs`

### Autenticación

```
POST   /auth/login                      Login con email y contraseña
POST   /auth/refresh                    Refrescar access token
POST   /auth/logout                     Cerrar sesión
GET    /auth/profile                    Perfil del usuario autenticado
```

### Tickets

```
GET    /tickets                         Listar tickets (filtros + paginación)
POST   /tickets                         Crear ticket
GET    /tickets/:id                     Obtener ticket por ID
PATCH  /tickets/:id                     Actualizar ticket (estado, asignado, etc.)
DELETE /tickets/:id                     Eliminar ticket (SUPER_ADMIN)
POST   /tickets/:id/attachments         Subir imágenes adjuntas (multipart/form-data)
```

### Comentarios

```
GET    /tickets/:ticketId/comments               Listar comentarios del ticket
POST   /tickets/:ticketId/comments               Crear comentario
PATCH  /tickets/:ticketId/comments/:id           Editar comentario
DELETE /tickets/:ticketId/comments/:id           Eliminar comentario
POST   /tickets/:ticketId/comments/:id/attachments  Subir imágenes al comentario
```

### Activos

```
GET    /assets                          Listar activos (filtros por tipo/estado)
POST   /assets                          Crear activo
GET    /assets/:id                      Obtener activo por ID
PATCH  /assets/:id                      Actualizar activo
DELETE /assets/:id                      Eliminar activo
```

### Usuarios

```
GET    /users                           Listar usuarios
POST   /users                           Crear usuario
GET    /users/:id                       Obtener usuario
PATCH  /users/:id                       Actualizar usuario
DELETE /users/:id                       Eliminar usuario (SUPER_ADMIN)
GET    /users/technicians               Listar técnicos disponibles (cross-empresa)
PATCH  /users/:id/change-password       Cambiar contraseña
```

### Empresas

```
GET    /companies                       Listar empresas
POST   /companies                       Crear empresa (SUPER_ADMIN)
GET    /companies/:id                   Obtener empresa
PATCH  /companies/:id                   Actualizar empresa
DELETE /companies/:id                   Eliminar empresa (SUPER_ADMIN, solo si está vacía)
GET    /companies/stats                 Estadísticas de empresas
```

### Dashboard y Reportes

```
GET    /dashboard/metrics               Métricas completas (filtradas por empresa/rol)
GET    /reports/ticket/:id              Generar PDF del ticket (se abre en el navegador)
```

### Notificaciones

```
GET    /notifications                   Listar notificaciones del usuario
GET    /notifications/unread-count      Cantidad de no leídas
PATCH  /notifications/:id/read          Marcar una como leída
PATCH  /notifications/read-all          Marcar todas como leídas
```

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/ticket_db` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Secret access token (mín. 32 chars) | `tu-secret-muy-largo` |
| `JWT_REFRESH_SECRET` | Secret refresh token (mín. 32 chars) | `otro-secret-muy-largo` |
| `JWT_EXPIRES_IN` | Expiración access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token | `7d` |
| `PORT` | Puerto del servidor | `3001` |
| `FRONTEND_URL` | CORS origins (separados por coma) | `http://localhost:3000,https://ticket.elementalpro.cl` |
| `RESEND_API_KEY` | API key de Resend para emails | `re_xxxxxxxxxxxx` |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary | `mi-cloud` |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | `123456789` |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | `AbCdEfGhIjKlMnOp` |

> Si `RESEND_API_KEY` no está configurada, el servidor arranca igualmente y omite el envío de emails con un warning en el log.

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:3001` |

> `NEXT_PUBLIC_API_URL` se resuelve en build time en Next.js. Cambiarla requiere rebuild del frontend.

---

## Producción en Railway

| Servicio | Proyecto Railway | URL |
|----------|-----------------|-----|
| Frontend | worthy-light | https://ticket.elementalpro.cl |
| Backend | ticket-elemental | https://ticket-elemental-production.up.railway.app |

### Variables requeridas en Railway — Backend

```
DATABASE_URL          → PostgreSQL de Railway
REDIS_URL             → Redis de Railway
JWT_SECRET            → string largo aleatorio
JWT_REFRESH_SECRET    → string largo aleatorio diferente
FRONTEND_URL          → https://worthy-light-production-c151.up.railway.app,https://ticket.elementalpro.cl
RESEND_API_KEY        → re_xxxxxxxxxxxx
CLOUDINARY_CLOUD_NAME → nombre del cloud
CLOUDINARY_API_KEY    → api key
CLOUDINARY_API_SECRET → api secret
```

### Variables requeridas en Railway — Frontend

```
NEXT_PUBLIC_API_URL → https://ticket-elemental-production.up.railway.app
```

### Despliegue

El deploy es automático al hacer push a `master`. Railway detecta el `Dockerfile` de cada servicio. El backend ejecuta `prisma db push --accept-data-loss` en cada inicio para mantener el schema sincronizado.

> **CORS multi-origen**: al agregar un nuevo dominio al frontend, añadirlo también a `FRONTEND_URL` en el backend de Railway separado por coma.

---

## Desarrollo local sin Docker

```bash
# Requisitos: Node 20+, PostgreSQL 15, Redis 7

# === Backend ===
cd backend
cp .env.example .env          # configurar DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts    # cargar datos de prueba
npm run start:dev             # servidor en http://localhost:3001

# === Frontend (en otra terminal) ===
cd frontend
cp .env.example .env.local    # configurar NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                   # app en http://localhost:3000
```

---

## Comandos útiles

```bash
# Levantar todo con Docker
docker-compose up --build -d

# Ver logs en tiempo real
docker logs ticket_backend -f
docker logs ticket_frontend -f

# Ejecutar seed (datos de prueba)
docker exec ticket_backend npx ts-node prisma/seed.ts

# Abrir Prisma Studio (GUI de base de datos)
docker exec -it ticket_backend npx prisma studio

# Rebuild solo el backend (después de cambios en backend/)
docker-compose up --build -d backend

# Rebuild solo el frontend (después de cambios en frontend/)
docker-compose up --build -d frontend

# Reiniciar un servicio específico
docker-compose restart backend
docker-compose restart frontend

# Parar todo
docker-compose down

# Parar y eliminar volúmenes (borra la BD)
docker-compose down -v

# Acceder a la shell del contenedor backend
docker exec -it ticket_backend sh

# Ver estado de todos los contenedores
docker-compose ps
```

---

## Notas de implementación

- **`prisma db push` vs migrations**: el proyecto usa `db push` porque no hay archivos de migración generados. Es adecuado para desarrollo y entornos controlados.
- **Fonts en PDF**: se usa Helvetica (fuente built-in de PDF), sin necesidad de archivos de fuente externos — compatible con Railway y cualquier entorno sin sistema de archivos persistente.
- **pdfmake 0.3.x**: se usa la API de alto nivel (`createPdf().getBuffer()`) en lugar del `PdfPrinter` bajo nivel, que requiere un `URLResolver` que no aplica para fuentes built-in.
- **Emails y Railway**: Railway bloquea puertos SMTP outbound (25, 465, 587). Resend usa HTTPS (puerto 443), siempre disponible.
- **Cloudinary URLs**: las URLs de adjuntos se almacenan absolutas en la BD. Nunca prefijarlas con `API_BASE_URL`.
- **Técnicos cross-empresa**: `getTechnicians()` no filtra por empresa — los técnicos siempre son de Elemental Pro y deben ser visibles para cualquier empresa cliente que quiera asignar un ticket.
- **Validación de campos opcionales**: en NestJS, `@IsOptional()` no valida `null`/`undefined` pero sí valida strings vacíos `""`. Al enviar formularios, convertir `""` a `undefined` antes del POST.

---

© 2026 Elemental Pro — Todos los derechos reservados
