# CLAUDE.md — Elemental Pro Help Desk

Contexto del proyecto para Claude Code. Lee esto antes de cualquier tarea.

---

## Qué es este sistema

Sistema de tickets técnicos SaaS multi-tenant para **Elemental Pro**, empresa chilena de redes, CCTV, fibra óptica y soporte TI.

- **Elemental Pro** es el **proveedor de servicios** — tiene técnicos que atienden los tickets
- Las demás empresas (Municipalidad La Serena, Tierra Amarilla, SLEP Atacama) son **empresas cliente** que crean y solicitan tickets

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10 (TypeScript) |
| Frontend | Next.js 14 App Router, React 18 |
| Base de datos | PostgreSQL 15 + Prisma 5 |
| Auth | JWT access (15m) + Refresh tokens (7d) con Passport.js |
| Cache | Redis 7 |
| UI | TailwindCSS 3 con clases custom en globals.css |
| Estado | Zustand con persist |
| Queries | TanStack React Query v5 |
| Formularios | react-hook-form + Zod (frontend) / class-validator (backend) |
| Notificaciones | react-hot-toast (Toaster en providers.tsx) |
| Íconos | lucide-react |
| Contenedores | Docker + Docker Compose |

---

## Estructura del proyecto

```
ticket/
├── backend/src/
│   ├── auth/           # JWT + Refresh tokens, guards globales
│   ├── users/          # CRUD usuarios, multi-tenant
│   ├── companies/      # Multi-empresa, create/update
│   ├── tickets/        # Core: estados, prioridades, SLA
│   ├── comments/       # Chat con notas internas
│   ├── dashboard/      # Métricas en tiempo real
│   ├── notifications/  # Notificaciones internas
│   ├── audit-logs/     # Registro de acciones
│   ├── common/         # Decorators, guards, filters, interceptors
│   └── prisma/         # PrismaService (global module)
│
├── backend/prisma/
│   ├── schema.prisma   # Esquema completo de BD
│   └── seed.ts         # Datos de prueba realistas
│
└── frontend/src/
    ├── app/(auth)/login/
    ├── app/(dashboard)/
    │   ├── dashboard/      # KPIs + gráficos Recharts
    │   ├── tickets/        # Lista, detalle, nuevo
    │   ├── companies/      # Gestión empresas con create/edit modal
    │   ├── users/          # Gestión usuarios
    │   ├── notifications/
    │   └── settings/       # Perfil + cambio contraseña
    ├── components/layout/  # Sidebar, Header
    ├── lib/
    │   ├── api.ts          # Axios + interceptor refresh token
    │   └── utils.ts        # cn(), formatDate(), STATUS_CONFIG, PRIORITY_CONFIG...
    ├── store/auth.store.ts  # Zustand auth
    └── types/index.ts       # Interfaces TypeScript
```

---

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `SUPER_ADMIN` | Acceso total, pertenece a Elemental Pro, gestiona todas las empresas |
| `ADMIN` | Gestiona su propia empresa y usuarios |
| `TECHNICIAN` | Atiende tickets asignados (pertenece a Elemental Pro) |
| `OPERATOR` | Crea tickets, ve los de su empresa |
| `CLIENT` | Solo ve sus propios tickets |

---

## Aislamiento multi-tenant

**Regla crítica**: en cada service del backend, verificar `requestingUser.role` antes de cualquier query:
- `SUPER_ADMIN` → sin filtro de companyId
- Todos los demás → `where: { companyId: requestingUser.companyId }`
- `TECHNICIAN` en tickets → `where: { assignedToId: requestingUser.id }`

---

## Patrones importantes

### Guards globales
`JwtAuthGuard` y `RolesGuard` están registrados como `APP_GUARD` en `auth.module.ts`. Son globales — todas las rutas requieren auth por defecto. Usar `@Public()` para excluir rutas.

### Respuesta estándar
`TransformInterceptor` envuelve toda respuesta exitosa en `{ success: true, data: ..., timestamp }`.
`HttpExceptionFilter` formatea errores en `{ success: false, statusCode, message, errors }`.

### Clases CSS disponibles (globals.css)
```
.card          — contenedor blanco con borde y sombra
.btn-primary   — botón azul brand
.btn-secondary — botón blanco con borde
.btn-danger    — botón rojo
.input         — campo de texto con focus ring
.select        — select con focus ring
.label         — etiqueta de formulario
.badge         — pill/chip de estado
.sidebar-link  — ítem de navegación lateral
```

### Colores brand (Tailwind)
`brand-50` a `brand-900` (azul), definidos en `tailwind.config.ts`.
Sidebar usa `#0f172a` (sidebar-900 en config).

### API client (frontend)
```typescript
// api.ts exporta:
authApi, ticketsApi, commentsApi, usersApi, companiesApi, dashboardApi, notificationsApi

// El interceptor maneja automáticamente refresh de tokens en 401
// Tokens se leen de cookies: 'accessToken', 'refreshToken'
```

### Auth store (Zustand)
```typescript
const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
// user.role, user.companyId disponibles en todos los componentes
```

---

## Reglas para agregar features

### Nueva página frontend
1. Crear en `frontend/src/app/(dashboard)/nombre/page.tsx`
2. Agregar `'use client'` al inicio
3. Usar `useQuery` de TanStack Query para datos, `useMutation` para cambios
4. Feedback con `toast.success()` / `toast.error()` (react-hot-toast, ya configurado)
5. Agregar la ruta al `PAGE_TITLES` en `(dashboard)/layout.tsx` si corresponde
6. Agregar al `navItems` en `Sidebar.tsx` con roles correctos

### Nuevo endpoint backend
1. Crear DTO con `class-validator` en `dto/`
2. Agregar método en service verificando roles/companyId
3. Agregar ruta en controller con `@Roles()` si no es pública
4. No necesita tocar `auth.module.ts` — los guards ya son globales

### Modal / formulario pattern
Seguir el mismo patrón que `companies/page.tsx`:
- Estado local `modalOpen`, `editingCompany`, `form`
- `useMutation` + `queryClient.invalidateQueries` al terminar
- Overlay `bg-black/40` + `z-50` para el backdrop

---

## Docker — comandos útiles

```bash
# Levantar todo (primera vez, tarda ~5 min)
docker-compose up --build -d

# Ejecutar seed (solo primera vez, después del up)
docker exec ticket_backend sh -c "npx ts-node prisma/seed.ts"

# Ver logs backend
docker logs ticket_backend -f

# Ver logs frontend
docker logs ticket_frontend -f

# Acceder a la BD con Prisma Studio
docker exec -it ticket_backend npx prisma studio

# Rebuild solo backend (después de cambios en backend/)
docker-compose up --build -d backend

# Rebuild solo frontend (después de cambios en frontend/)
docker-compose up --build -d frontend
```

**Importante**: el backend usa `node:20-slim` (no alpine) por compatibilidad con OpenSSL y Prisma.

---

## URLs en desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |

---

## Credenciales de prueba

| Rol | Email | Password |
|-----|-------|----------|
| SUPER_ADMIN | admin@elementalpro.cl | Admin1234! |
| ADMIN EP | gerencia@elementalpro.cl | Admin1234! |
| TECHNICIAN | tecnico1@elementalpro.cl | Tecnico1234! |
| ADMIN La Serena | admin@laserena.cl | Admin1234! |
| OPERATOR La Serena | operador@laserena.cl | Operador1234! |
| ADMIN Tierra Amarilla | admin@tierraamarilla.cl | Admin1234! |
| CLIENT SLEP | ti@slepatacama.cl | Cliente1234! |

---

## SLA por prioridad

| Prioridad | Horas |
|-----------|-------|
| CRITICAL | 2h |
| HIGH | 4h |
| MEDIUM | 8h |
| LOW | 24h |

---

## Notas de implementación conocidas

- `prisma db push` en lugar de `prisma migrate deploy` porque no hay archivos de migración generados
- El `slug` de empresa no se puede modificar una vez creado (no está en `UpdateCompanyDto`)
- Los comentarios internos (`isInternal: true`) solo los ven SUPER_ADMIN, ADMIN y TECHNICIAN
- `NEXT_PUBLIC_API_URL` se baja en build time en Next.js — el default `http://localhost:3001` es correcto para desarrollo local con Docker porque el browser accede desde el host
- El frontend usa `standalone` output de Next.js para la imagen Docker
