# Elemental Pro — Help Desk / Service Desk System

Sistema de gestión de tickets técnicos para empresas de servicios tecnológicos. Especializado en redes, CCTV, fibra óptica y soporte TI.

---

## Inicio rápido

```bash
# 1. Clonar y entrar al proyecto
cd ticket

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todo el sistema
docker-compose up --build -d

# 4. Ejecutar seed (primera vez)
docker exec ticket_backend npm run setup
```

Acceder en: **http://localhost:3000**

---

## Credenciales de acceso

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Super Admin** | admin@elementalpro.cl | Admin1234! |
| **Admin EP** | gerencia@elementalpro.cl | Admin1234! |
| **Técnico 1** | tecnico1@elementalpro.cl | Tecnico1234! |
| **Técnico 2** | tecnico2@elementalpro.cl | Tecnico1234! |
| **Técnico 3** | tecnico3@elementalpro.cl | Tecnico1234! |
| **Admin La Serena** | admin@laserena.cl | Admin1234! |
| **Operador La Serena** | operador@laserena.cl | Operador1234! |
| **Admin Tierra Amarilla** | admin@tierraamarilla.cl | Admin1234! |
| **Operador Tierra Amarilla** | operador@tierraamarilla.cl | Operador1234! |
| **Cliente SLEP** | ti@slepatacama.cl | Cliente1234! |

---

## Arquitectura

```
ticket/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── auth/         # JWT + Refresh Tokens
│   │   ├── users/        # Gestión de usuarios
│   │   ├── companies/    # Multi-tenant
│   │   ├── tickets/      # Core del sistema
│   │   ├── comments/     # Comentarios tipo chat
│   │   ├── dashboard/    # Métricas en tiempo real
│   │   ├── notifications/
│   │   ├── audit-logs/
│   │   └── prisma/       # ORM
│   └── prisma/
│       ├── schema.prisma # Esquema de BD
│       └── seed.ts       # Datos de prueba
│
├── frontend/             # Next.js 14 App Router
│   └── src/app/
│       ├── (auth)/login/     # Login page
│       └── (dashboard)/      # App principal
│           ├── dashboard/    # Panel con gráficos
│           ├── tickets/      # Lista + Detalle + Crear
│           ├── users/        # Gestión de usuarios
│           ├── companies/    # Multi-empresa
│           ├── notifications/
│           └── settings/
│
├── docker-compose.yml    # Orquestación Docker
└── .env.example
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10 (TypeScript) |
| Frontend | Next.js 14 (App Router, React 18) |
| Base de datos | PostgreSQL 15 |
| ORM | Prisma 5 |
| Autenticación | JWT + Refresh Tokens (bcryptjs) |
| Cache/Colas | Redis 7 |
| UI | TailwindCSS 3 |
| Gráficos | Recharts |
| Estado global | Zustand |
| Queries | TanStack React Query |
| Validación | Class-validator + Zod |
| Email | Resend (HTTP API) |
| Contenedores | Docker + Docker Compose |
| Docs API | Swagger/OpenAPI |

---

## Módulos del sistema

### Backend (NestJS)

**auth** — Autenticación JWT con refresh tokens. Estrategias Passport para JWT y refresh. Guards globales para autenticación y roles.

**users** — CRUD completo con aislamiento multi-tenant. Hash bcrypt de contraseñas. Cambio de contraseña. Gestión de técnicos disponibles. Los roles TECHNICIAN y SUPER_ADMIN solo pueden pertenecer a Elemental Pro (validado en backend y restringido en frontend).

**companies** — Gestión multi-empresa. Cada empresa tiene sus propios usuarios y tickets completamente aislados. Solo SUPER_ADMIN puede crear empresas.

**tickets** — Core del sistema. Estados: OPEN → IN_PROGRESS → PENDING → RESOLVED → CLOSED. Prioridades con SLA automático. Filtros avanzados con paginación. Historial completo.

**comments** — Sistema de comentarios tipo chat con soporte de notas internas (solo visibles por técnicos). Marca de lectura.

**dashboard** — Métricas en tiempo real: tickets por estado, prioridad, categoría, empresa y técnico. Tendencia 30 días. Tiempo promedio de resolución.

**notifications** — Notificaciones internas con contador de no leídas. Tipos: creación, actualización, asignación, resolución, comentario.

**audit-logs** — Registro de todas las acciones del sistema con usuario, empresa, valores anteriores y nuevos.

**mail** — Notificaciones por email al crear tickets. Usa Resend (HTTP API) para compatibilidad con Railway. Envía a: `tecnico@elementalpro.cl`, creador del ticket y técnico asignado.

### Frontend (Next.js)

**Login** — Diseño profesional con panel informativo. Quick-access para demo. Validación con Zod. Tokens en cookies seguras.

**Dashboard** — Panel operacional con KPIs, gráficos de tendencia (AreaChart), distribución por categoría (PieChart), carga por técnico (BarChart), tickets recientes. Actualización automática cada 60 segundos.

**Tickets List** — Tabla con filtros por estado, prioridad y categoría. Búsqueda global (título, número, cámara, IP). Paginación. Indicadores visuales de prioridad y estado.

**Ticket Detail** — Vista completa con historial tipo chat, cambio de estado con transiciones válidas, sidebar con toda la información técnica (ubicación, IP, cámara, SLA). Soporte de notas internas.

**New Ticket** — Formulario completo con campos técnicos especializados. Asignación de técnico. Sistema de etiquetas.

**Users** — Gestión de usuarios con activación/desactivación. Creación con modal. Filtro por búsqueda. Solo SUPER_ADMIN puede crear Técnicos (siempre asignados a Elemental Pro).

**Companies** — Vista de empresas con estadísticas de usuarios y tickets.

---

## Roles y permisos

| Rol | Empresa | Puede crear tickets | Puede editar | Puede ver todo | Gestión usuarios | Gestión empresas |
|-----|---------|---------------------|--------------|----------------|------------------|------------------|
| SUPER_ADMIN | Elemental Pro | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | Cualquiera | ✅ | ✅ | ✅ (su empresa) | ✅ (su empresa) | ❌ |
| TECHNICIAN | **Solo Elemental Pro** | ✅ | ✅ (asignados) | Solo asignados | ❌ | ❌ |
| OPERATOR | Empresa cliente | ✅ | ❌ | Su empresa | ❌ | ❌ |
| CLIENT | Empresa cliente | ✅ | ❌ | Propios | ❌ | ❌ |

> **Nota**: Los roles `TECHNICIAN` y `SUPER_ADMIN` solo pueden pertenecer a Elemental Pro. El backend rechaza cualquier intento de crearlos en otra empresa. En el frontend, solo el SUPER_ADMIN ve la opción "Técnico" y la empresa se fija automáticamente a Elemental Pro.

---

## SLA por prioridad

| Prioridad | SLA |
|-----------|-----|
| CRITICAL | 2 horas |
| HIGH | 4 horas |
| MEDIUM | 8 horas |
| LOW | 24 horas |

---

## API Documentation

Swagger disponible en: `http://localhost:3001/api/docs`

Endpoints principales:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/dashboard/metrics`
- `GET /api/v1/tickets`
- `POST /api/v1/tickets`
- `PATCH /api/v1/tickets/:id`
- `POST /api/v1/tickets/:id/comments`
- `GET /api/v1/users`
- `GET /api/v1/companies`

---

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| DATABASE_URL | Conexión PostgreSQL | postgresql://... |
| REDIS_URL | Conexión Redis | redis://localhost:6379 |
| JWT_SECRET | Secret para access tokens | (cambiar en producción) |
| JWT_REFRESH_SECRET | Secret para refresh tokens | (cambiar en producción) |
| JWT_EXPIRES_IN | Expiración access token | 15m |
| JWT_REFRESH_EXPIRES_IN | Expiración refresh token | 7d |
| PORT | Puerto backend | 3001 |
| FRONTEND_URL | CORS origins (separados por coma) | http://localhost:3000 |
| RESEND_API_KEY | API key de Resend para emails | — |
| NEXT_PUBLIC_API_URL | URL del backend desde el frontend | http://localhost:3001 |

---

## Comandos útiles

```bash
# Ver logs del backend
docker logs ticket_backend -f

# Ver logs del frontend
docker logs ticket_frontend -f

# Acceder a Prisma Studio (GUI de base de datos)
docker exec -it ticket_backend npx prisma studio

# Re-ejecutar seed
docker exec ticket_backend npx ts-node prisma/seed.ts

# Reiniciar solo el backend
docker-compose restart backend

# Rebuild completo
docker-compose down && docker-compose up --build -d
```

---

## Producción — Railway

| Servicio | Nombre en Railway | URL |
|----------|-------------------|-----|
| Frontend | worthy-light | https://ticket.elementalpro.cl |
| Backend | ticket-elemental | https://ticket-elemental-production.up.railway.app |

---

## Desarrollo local (sin Docker)

```bash
# Backend
cd backend
cp .env.example .env  # configurar DATABASE_URL
npm install
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run start:dev

# Frontend (en otro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

© 2026 Elemental Pro — Todos los derechos reservados
