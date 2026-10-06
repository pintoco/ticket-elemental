# Plan de mejoras — Elemental Pro Help Desk

Revisión realizada el 2026-10-05. Cada etapa se puede desplegar sola.
Marcar `[x]` al completar. La numeración `(N)` referencia los hallazgos de la revisión.

## Etapa 0: Preparación
- [x] Crear rama `develop`
- [ ] ESLint y Prettier en el backend (29)
- [x] Interfaz `AuthUser` y reemplazo de `requestingUser: any` en servicios tocados (25)
- [ ] Base de datos de pruebas (Postgres en Docker) + Jest + Supertest
- [ ] Verificar backups automáticos de Postgres en Railway

## Etapa 1: Cierre de brechas críticas
- [x] Filtrar `isInternal` en `TicketsService.findOne` para OPERATOR y CLIENT (1)
- [x] `buildAccessWhere`/`assertCanAccess` aplicado en tickets, comentarios y adjuntos (2)
  - [x] CLIENT solo ve tickets que creó
  - [x] TECHNICIAN solo ve tickets asignados
- [x] Validar que `assignedToId` sea TECHNICIAN/SUPER_ADMIN activo (3)
- [x] Validar que `assetId` pertenezca a la empresa del ticket (3)
- [x] Whitelist explícita de campos en create/update de tickets (3)
- [x] ADMIN no puede modificar/desactivar/eliminar SUPER_ADMIN ni TECHNICIAN; nadie puede cambiarse su propio rol (4)
- [x] Escapar HTML en emails (7)
- [x] DTO con validación para `PATCH /comments/:id` (20)
- [x] Invalidar refresh token al cambiar contraseña o desactivar usuario (6)
- [x] Quitar contraseña por defecto de Postgres y publicar puertos solo en 127.0.0.1 (8) — falta contraseña de Redis
- [x] Impedir que el seed corra con `NODE_ENV=production` (8)
- [x] Tests unitarios de regresión (22 tests: acceso, escape HTML, tickets, users) (24)

## Etapa 2: Tests y CI
- [x] Tests e2e de aislamiento multi-tenant (24) — `backend/test/access-control.e2e-spec.ts`
- [x] Tests de matriz de roles (tickets, comentarios, usuarios, activos, empresas)
- [x] Test de concurrencia de `ticketNumber` (10 simultáneos) — destapó 500 bajo concurrencia, corregido con advisory lock
- [x] GitHub Actions: typecheck, build, unit + e2e con Postgres, build frontend (28) — falta lint (Etapa 0)
- [x] `npm audit` en CI (informativo) y `nodemailer` eliminado — 17 vulnerabilidades heredadas (1 crítica, 4 altas: multer, platform-express, proxy-addr); requieren subir NestJS, pendiente
- [x] Hook pre-commit nativo (`.githooks`, activar con `sh scripts/setup-hooks.sh`): tsc + tests relacionados

## Etapa 3: Base de datos y rendimiento
- [ ] Índices: Ticket `(companyId,status)`, `assignedToId`, `creatorId`, `createdAt`; TicketComment `ticketId`; Notification `(userId,isRead)`; AuditLog `(companyId,createdAt)`; Attachment `ticketId`, `commentId` (10)
- [ ] Búsqueda con `pg_trgm`/`tsvector` (11)
- [ ] Dashboard: un solo `groupBy` por estado, `take` en `ticketsByCompany` (14)
- [ ] Paginación consistente en users, assets, notifications (21)
- [ ] Mover lógica Prisma de `AuditLogsController` a un service
- [ ] `ticketNumber` con SEQUENCE/tabla de contadores (12)

## Etapa 4: Autenticación robusta
- [ ] Tabla `RefreshToken` (múltiples sesiones) (5)
- [ ] Rotación con detección de reutilización
- [ ] Cookies `httpOnly` + `Secure` + `SameSite` desde el backend (5)
- [ ] `middleware.ts` en Next para proteger rutas (30)
- [ ] Rehidratar `user` desde `/auth/profile` (36)
- [ ] Bloqueo temporal tras N intentos fallidos
- [ ] Política de contraseñas y "olvidé mi contraseña"

## Etapa 5: Archivos y adjuntos
- [ ] Verificar magic bytes con `file-type` (9)
- [ ] Centralizar `fileFilter` y subida en `UploadsModule` (26)
- [ ] Borrar en Cloudinary al eliminar adjunto/comentario/ticket (19)
- [ ] Limpiar huérfanos en subidas parciales
- [ ] Evaluar URLs firmadas para PDFs sensibles

## Etapa 6: Operación y despliegue
- [ ] Dockerfile multi-stage, `USER node` (23)
- [ ] `/health` (`@nestjs/terminus`) + `HEALTHCHECK`
- [ ] `migrate resolve` como paso único (22)
- [ ] Reemplazar `.catch(() => null)` por logs (18)
- [ ] Logs estructurados (pino) y Sentry
- [ ] Headers de seguridad en `next.config.js`, quitar `remotePatterns` de localhost (31)
- [ ] Decidir sobre Redis: usarlo o quitarlo (13)

## Etapa 7: Flujo de tickets y SLA
- [ ] Máquina de estados con transiciones por rol (15)
- [ ] Limpiar `resolvedAt`/`closedAt` al reabrir
- [ ] `slaDueAt` calculado (16)
- [ ] Job de SLA por vencer/vencido
- [ ] Alertas por notificación y email
- [ ] Indicador de SLA en UI y KPI de cumplimiento
- [ ] Notificaciones en tiempo real (SSE/WebSocket) (17)

## Etapa 8: Refactor (continuo)
- [ ] Decorator `@RequestMeta()` (26)
- [ ] Autorización centralizada (`TenantScopeService`/CASL) (27)
- [ ] Tipar `where` con `Prisma.*WhereInput` (25)
- [ ] Frontend: `<Modal>`, `<DataTable>`, `<StatusBadge>`, hooks de queries (32)
- [ ] Dividir páginas de más de 400 líneas
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx` (33)
- [ ] Radix para accesibilidad de modales o quitar dependencias (34)
- [ ] Service worker versionado; verificar `/icon.svg` (35)

## Etapa 9: Funcionalidades nuevas
- [ ] Exportación CSV/Excel
- [ ] Reportes PDF programados por email
- [ ] Plantillas de respuesta rápida
- [ ] Encuesta de satisfacción
- [ ] Tiempo trabajado y bitácora de visitas
- [ ] 2FA (TOTP) para SUPER_ADMIN y ADMIN
- [ ] Tickets por email
- [ ] Base de conocimiento
- [ ] Push (PWA) y WhatsApp para críticos
