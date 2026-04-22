import { PrismaClient, UserRole, TicketStatus, TicketPriority, TicketType, TicketCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Elemental Pro Help Desk database...\n');

  // ============================================
  // COMPANIES
  // ============================================
  console.log('📦 Creating companies...');

  const elementalPro = await prisma.company.upsert({
    where: { slug: 'elemental-pro' },
    update: {},
    create: {
      name: 'Elemental Pro',
      slug: 'elemental-pro',
      description: 'Empresa principal de tecnología: redes, CCTV, fibra óptica y soporte TI',
      email: 'contacto@elementalpro.cl',
      phone: '+56 51 234 5678',
      address: 'Av. Balmaceda 1234, La Serena',
      isActive: true,
    },
  });

  const laSerena = await prisma.company.upsert({
    where: { slug: 'municipalidad-la-serena' },
    update: {},
    create: {
      name: 'Municipalidad de La Serena',
      slug: 'municipalidad-la-serena',
      description: 'Cliente institucional — gestión de cámaras municipales y redes',
      email: 'sistemas@laserena.cl',
      phone: '+56 51 220 0000',
      address: 'Prat 446, La Serena',
      isActive: true,
    },
  });

  const tierraAmarilla = await prisma.company.upsert({
    where: { slug: 'municipalidad-tierra-amarilla' },
    update: {},
    create: {
      name: 'Municipalidad de Tierra Amarilla',
      slug: 'municipalidad-tierra-amarilla',
      description: 'Cliente institucional — monitoreo CCTV y soporte TI',
      email: 'ti@tierraamarilla.cl',
      phone: '+56 52 278 0000',
      address: 'Lautaro 399, Tierra Amarilla',
      isActive: true,
    },
  });

  const slepAtacama = await prisma.company.upsert({
    where: { slug: 'slep-atacama' },
    update: {},
    create: {
      name: 'SLEP Atacama',
      slug: 'slep-atacama',
      description: 'Servicio Local de Educación Pública — conectividad y soporte',
      email: 'ti@slepatacama.cl',
      phone: '+56 52 278 5000',
      address: 'Atacama 250, Copiapó',
      isActive: true,
    },
  });

  console.log('  ✅ 4 companies created\n');

  // ============================================
  // USERS
  // ============================================
  console.log('👥 Creating users...');

  const hashPw = async (password: string) => bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'ppinto@elementalpro.cl' },
    update: {},
    create: {
      email: 'ppinto@elementalpro.cl',
      password: await hashPw('Admin1234!'),
      firstName: 'Pablo',
      lastName: 'Pinto',
      role: UserRole.SUPER_ADMIN,
      phone: '+56 9 9999 0001',
      companyId: elementalPro.id,
      isActive: true,
    },
  });

  const adminEP = await prisma.user.upsert({
    where: { email: 'gerencia@elementalpro.cl' },
    update: {},
    create: {
      email: 'gerencia@elementalpro.cl',
      password: await hashPw('Admin1234!'),
      firstName: 'Carlos',
      lastName: 'Rojas',
      role: UserRole.ADMIN,
      phone: '+56 9 9999 0002',
      companyId: elementalPro.id,
      isActive: true,
    },
  });

  const tec1 = await prisma.user.upsert({
    where: { email: 'tecnico1@elementalpro.cl' },
    update: {},
    create: {
      email: 'tecnico1@elementalpro.cl',
      password: await hashPw('Tecnico1234!'),
      firstName: 'Miguel',
      lastName: 'Fernández',
      role: UserRole.TECHNICIAN,
      phone: '+56 9 9999 0003',
      companyId: elementalPro.id,
      isActive: true,
    },
  });

  const tec2 = await prisma.user.upsert({
    where: { email: 'tecnico2@elementalpro.cl' },
    update: {},
    create: {
      email: 'tecnico2@elementalpro.cl',
      password: await hashPw('Tecnico1234!'),
      firstName: 'Diego',
      lastName: 'Salinas',
      role: UserRole.TECHNICIAN,
      phone: '+56 9 9999 0004',
      companyId: elementalPro.id,
      isActive: true,
    },
  });

  const tec3 = await prisma.user.upsert({
    where: { email: 'tecnico3@elementalpro.cl' },
    update: {},
    create: {
      email: 'tecnico3@elementalpro.cl',
      password: await hashPw('Tecnico1234!'),
      firstName: 'Andrés',
      lastName: 'Vega',
      role: UserRole.TECHNICIAN,
      phone: '+56 9 9999 0005',
      companyId: elementalPro.id,
      isActive: true,
    },
  });

  const adminLS = await prisma.user.upsert({
    where: { email: 'admin@laserena.cl' },
    update: {},
    create: {
      email: 'admin@laserena.cl',
      password: await hashPw('Admin1234!'),
      firstName: 'Daniela',
      lastName: 'Morales',
      role: UserRole.ADMIN,
      phone: '+56 9 9999 0006',
      companyId: laSerena.id,
      isActive: true,
    },
  });

  const opLS = await prisma.user.upsert({
    where: { email: 'operador@laserena.cl' },
    update: {},
    create: {
      email: 'operador@laserena.cl',
      password: await hashPw('Operador1234!'),
      firstName: 'Valentina',
      lastName: 'Castro',
      role: UserRole.OPERATOR,
      phone: '+56 9 9999 0007',
      companyId: laSerena.id,
      isActive: true,
    },
  });

  const adminTA = await prisma.user.upsert({
    where: { email: 'admin@tierraamarilla.cl' },
    update: {},
    create: {
      email: 'admin@tierraamarilla.cl',
      password: await hashPw('Admin1234!'),
      firstName: 'Roberto',
      lastName: 'Gutiérrez',
      role: UserRole.ADMIN,
      phone: '+56 9 9999 0008',
      companyId: tierraAmarilla.id,
      isActive: true,
    },
  });

  const opTA = await prisma.user.upsert({
    where: { email: 'operador@tierraamarilla.cl' },
    update: {},
    create: {
      email: 'operador@tierraamarilla.cl',
      password: await hashPw('Operador1234!'),
      firstName: 'Patricia',
      lastName: 'López',
      role: UserRole.OPERATOR,
      phone: '+56 9 9999 0009',
      companyId: tierraAmarilla.id,
      isActive: true,
    },
  });

  const clientSLEP = await prisma.user.upsert({
    where: { email: 'ti@slepatacama.cl' },
    update: {},
    create: {
      email: 'ti@slepatacama.cl',
      password: await hashPw('Cliente1234!'),
      firstName: 'Jorge',
      lastName: 'Peña',
      role: UserRole.CLIENT,
      phone: '+56 9 9999 0010',
      companyId: slepAtacama.id,
      isActive: true,
    },
  });

  console.log('  ✅ 10 users created\n');

  // ============================================
  // TICKETS
  // ============================================
  console.log('🎫 Creating realistic tickets...');

  const ticketDefs = [
    // 1
    {
      title: 'Cámara PTZ sin señal en sector centro histórico',
      description: 'La cámara PTZ ubicada en la intersección de Av. Balmaceda con Prat ha dejado de transmitir señal desde las 08:30 hrs. El NVR reporta pérdida de stream. Se revisó el switch y el puerto está activo. Posible falla en el encoder o daño en cableado UTP.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.CAMERAS,
      location: 'Av. Balmaceda esq. Prat, La Serena — Poste #12',
      cameraId: 'CAM-PTZ-001',
      ipAddress: '192.168.10.101',
      slaHours: 4,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec1.id,
      tags: ['ptz', 'señal', 'urgente'],
    },
    // 2
    {
      title: 'Corte de fibra óptica en sector Av. El Santo',
      description: 'Se reporta pérdida total de conectividad en el tramo de fibra óptica entre el nodo central y el gabinete secundario en Av. El Santo #234. Afecta a 3 cámaras y 2 switches de acceso. Posiblemente causado por trabajos viales en la zona.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.CRITICAL,
      type: TicketType.INCIDENT,
      category: TicketCategory.FIBER_OPTIC,
      location: 'Av. El Santo 234, La Serena — Frente a plaza',
      slaHours: 2,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec1.id,
      tags: ['fibra', 'corte', 'critico', 'vialidad'],
    },
    // 3
    {
      title: 'Video Wall sin imagen en sala CENCO',
      description: 'El video wall de 4x4 pantallas en la sala de control CENCO no muestra imagen en las pantallas del cuadrante inferior derecho (posiciones 3-3, 3-4, 4-3, 4-4). Las otras pantallas funcionan normalmente. El sistema DSS Pro muestra error de renderizado.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.CRITICAL,
      type: TicketType.INCIDENT,
      category: TicketCategory.VIDEO_WALL,
      location: 'CENCO — Sala de Control Principal, Piso 2',
      slaHours: 2,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec2.id,
      tags: ['cenco', 'videowall', 'dss', 'critico'],
    },
    // 4
    {
      title: 'Servidor DSS Pro sin acceso remoto',
      description: 'Desde las 14:00 hrs no es posible acceder remotamente al servidor DSS Pro (IP: 192.168.1.10). El servidor físicamente está encendido pero no responde ping. Se intentó acceso local desde la misma red sin éxito. Posible falla en tarjeta de red o configuración firewall.',
      status: TicketStatus.PENDING,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.DSS_PRO,
      location: 'Sala de Servidores — Rack 2, Unidad 4',
      ipAddress: '192.168.1.10',
      slaHours: 4,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec3.id,
      tags: ['dss', 'servidor', 'acceso-remoto'],
    },
    // 5
    {
      title: 'Switch principal sin conectividad VLAN 19',
      description: 'El switch CISCO Catalyst 2960 ubicado en el gabinete del sector norte ha perdido conectividad en la VLAN 19 (cámaras). Las otras VLANs (admin y voz) funcionan normalmente. Se requiere revisión de configuración de trunk y spanning tree.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.NETWORK,
      location: 'Gabinete Norte — Sector Mercado La Recova',
      ipAddress: '192.168.1.254',
      slaHours: 4,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec1.id,
      tags: ['switch', 'vlan', 'cisco', 'trunk'],
    },
    // 6
    {
      title: 'Cámara fija con imagen borrosa y desenfocada',
      description: 'La cámara ID CAM-FX-023 ubicada en el acceso al estadio La Portada presenta imagen borrosa. Se realizó zoom digital pero el problema persiste, indicando falla en lente o actuador de foco. Imagen inútil para identificación.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      type: TicketType.INCIDENT,
      category: TicketCategory.CAMERAS,
      location: 'Estadio La Portada — Acceso principal Norte',
      cameraId: 'CAM-FX-023',
      ipAddress: '192.168.10.123',
      slaHours: 8,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec2.id,
      tags: ['camara', 'lente', 'estadio'],
    },
    // 7
    {
      title: 'NVR modelo Hikvision no graba en canal 8-16',
      description: 'El NVR Hikvision DS-7716NI-I4 ubicado en la subcomisaría de Balmaceda no está registrando grabaciones en los canales 8 al 16. Los canales 1-7 graban normalmente. Al revisar el disco duro, muestra espacios vacíos en los segmentos de estos canales.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.NVR,
      location: 'Subcomisaría Balmaceda — Sala de Equipos',
      ipAddress: '192.168.20.50',
      slaHours: 4,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec3.id,
      tags: ['nvr', 'hikvision', 'grabacion', 'canal'],
    },
    // 8
    {
      title: 'Enlace inalámbrico intermitente sector Tierra Amarilla centro',
      description: 'El enlace Ubiquiti PtP entre el nodo central y la antena del sector centro de Tierra Amarilla presenta pérdida de paquetes mayor al 30%. Afecta a 8 cámaras conectadas aguas abajo. Posible interferencia o desalineamiento por viento.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.NETWORK,
      location: 'Edificio Municipal Tierra Amarilla — Techo',
      ipAddress: '10.0.0.5',
      slaHours: 4,
      companyId: tierraAmarilla.id,
      creatorId: opTA.id,
      assignedToId: tec2.id,
      tags: ['ubiquiti', 'enlace', 'interferencia', 'ptp'],
    },
    // 9
    {
      title: 'Falla eléctrica en gabinete exterior sector costanera',
      description: 'El gabinete exterior en la costanera sufrió falla eléctrica afectando al UPS y al switch interno. Los equipos quedaron sin energía. Se requiere revisión del supresor de picos y reemplazo del fusible principal.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.CRITICAL,
      type: TicketType.INCIDENT,
      category: TicketCategory.NETWORK,
      location: 'Costanera del Mar — Gabinete #3 frente a hotel',
      slaHours: 2,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec1.id,
      tags: ['electrico', 'ups', 'gabinete', 'costanera'],
    },
    // 10
    {
      title: 'Mantención preventiva cámaras campus Colegio Gabriela Mistral',
      description: 'Mantención preventiva trimestral para las 12 cámaras instaladas en el campus del Colegio Gabriela Mistral. Incluye limpieza de lentes, revisión de cableado, actualización de firmware NVR y verificación de grabaciones.',
      status: TicketStatus.PENDING,
      priority: TicketPriority.LOW,
      type: TicketType.MAINTENANCE,
      category: TicketCategory.CAMERAS,
      location: 'Colegio Gabriela Mistral — Av. Aguirre 1100',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      slaHours: 24,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec2.id,
      tags: ['mantencion', 'preventiva', 'colegio'],
    },
    // 11
    {
      title: 'Instalación de 6 cámaras en nuevo acceso Municipalidad',
      description: 'Instalación de 6 nuevas cámaras IP Hikvision 8MP en el nuevo acceso peatonal de la Municipalidad de Tierra Amarilla. Incluye tendido de cableado UTP cat6A, configuración en NVR existente y parametrización en DSS Pro.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      type: TicketType.INSTALLATION,
      category: TicketCategory.CAMERAS,
      location: 'Municipalidad de Tierra Amarilla — Acceso Norte',
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      slaHours: 24,
      companyId: tierraAmarilla.id,
      creatorId: adminTA.id,
      assignedToId: tec3.id,
      tags: ['instalacion', 'hikvision', 'ampliacion'],
    },
    // 12
    {
      title: 'Cámara sin imagen en acceso a sala de clases SLEP',
      description: 'La cámara en el pasillo del bloque A del liceo administrado por SLEP Atacama no muestra imagen desde hace 2 días. La cámara tiene LED de estado activo. Posible falla en cable o en el switch de piso.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      type: TicketType.INCIDENT,
      category: TicketCategory.CAMERAS,
      location: 'Liceo SLEP — Bloque A, Pasillo principal',
      cameraId: 'CAM-SLEP-004',
      ipAddress: '172.16.1.44',
      slaHours: 8,
      companyId: slepAtacama.id,
      creatorId: clientSLEP.id,
      assignedToId: tec1.id,
      tags: ['slep', 'liceo', 'camara'],
    },
    // 13
    {
      title: 'Actualización de firmware en switches de red sector norte',
      description: 'Actualización programada del firmware en los 4 switches Cisco Catalyst del sector norte de La Serena. Se requiere ventana de mantenimiento nocturna para minimizar impacto. Backup de configuración previo obligatorio.',
      status: TicketStatus.CLOSED,
      priority: TicketPriority.LOW,
      type: TicketType.MAINTENANCE,
      category: TicketCategory.NETWORK,
      location: 'Sector Norte — Gabinetes 1, 2, 3 y 4',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      slaHours: 24,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec3.id,
      tags: ['cisco', 'firmware', 'switch', 'mantencion'],
    },
    // 14
    {
      title: 'Servidor de monitoreo sin disco duro disponible',
      description: 'El servidor de monitoreo del CENCO reporta que el disco duro de 8TB tiene menos del 5% de espacio libre. Se requiere urgente expansión de almacenamiento o purga de grabaciones antiguas según política de retención (30 días).',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      type: TicketType.INCIDENT,
      category: TicketCategory.SERVERS,
      location: 'CENCO — Sala de Servidores',
      ipAddress: '192.168.1.20',
      slaHours: 4,
      companyId: laSerena.id,
      creatorId: adminLS.id,
      assignedToId: tec2.id,
      tags: ['servidor', 'disco', 'almacenamiento', 'cenco'],
    },
    // 15
    {
      title: 'Falla masiva de cámaras por corte de suministro eléctrico',
      description: 'EMERGENCIA: Corte de luz en zona centro-sur dejó sin alimentación a 23 cámaras del sistema. El UPS del gabinete principal duró 45 minutos. Se requiere coordinación urgente con ELIQSA y verificación del estado de los equipos al restablecer el suministro.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.CRITICAL,
      type: TicketType.EMERGENCY,
      category: TicketCategory.CAMERAS,
      location: 'Zona Centro-Sur — Sector Correos, Colón, Brasil',
      slaHours: 2,
      companyId: laSerena.id,
      creatorId: opLS.id,
      assignedToId: tec1.id,
      tags: ['emergencia', 'electrico', 'masivo', 'eliqsa'],
    },
    // 16
    {
      title: 'PTZ cámara Tierra Amarilla plaza no responde a comandos',
      description: 'La cámara PTZ instalada en la plaza de Tierra Amarilla responde visualmente (imagen OK) pero no obedece comandos de movimiento PTZ. El control por protocolo Pelco-D no funciona. Se sospecha falla en RS-485 o en el decoder de la cámara.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      type: TicketType.INCIDENT,
      category: TicketCategory.CAMERAS,
      location: 'Plaza de Tierra Amarilla — Columna central',
      cameraId: 'CAM-PTZ-TA-001',
      ipAddress: '10.0.1.101',
      slaHours: 8,
      companyId: tierraAmarilla.id,
      creatorId: opTA.id,
      assignedToId: tec3.id,
      tags: ['ptz', 'pelco', 'rs485', 'plaza'],
    },
  ];

  const createdTickets: any[] = [];

  for (let i = 0; i < ticketDefs.length; i++) {
    const def = ticketDefs[i];
    const year = new Date().getFullYear();
    const ticketNumber = `EP-${year}-${String(i + 1).padStart(5, '0')}`;

    const createdAt = new Date(Date.now() - (ticketDefs.length - i) * 4 * 60 * 60 * 1000);
    const resolvedAt =
      def.status === TicketStatus.RESOLVED || def.status === TicketStatus.CLOSED
        ? new Date(createdAt.getTime() + (def.slaHours || 4) * 60 * 60 * 1000)
        : null;

    const existing = await prisma.ticket.findFirst({ where: { ticketNumber } });
    if (existing) {
      createdTickets.push(existing);
      continue;
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        type: def.type,
        category: def.category,
        location: def.location,
        cameraId: def.cameraId,
        ipAddress: def.ipAddress,
        slaHours: def.slaHours,
        scheduledAt: def.scheduledAt ? new Date(def.scheduledAt) : null,
        resolvedAt,
        closedAt: def.status === TicketStatus.CLOSED ? resolvedAt : null,
        tags: def.tags,
        companyId: def.companyId,
        creatorId: def.creatorId,
        assignedToId: def.assignedToId,
        createdAt,
        updatedAt: resolvedAt || createdAt,
      },
    });
    createdTickets.push(ticket);
  }

  console.log(`  ✅ ${createdTickets.length} tickets created\n`);

  // ============================================
  // COMMENTS
  // ============================================
  console.log('💬 Creating comments...');

  const commentSets = [
    // Ticket 0 - Cámara PTZ sin señal
    {
      ticketIdx: 0,
      comments: [
        { authorId: opLS.id, content: 'Confirmado desde CENCO, la cámara no aparece en el mapa de monitoreo. Vemos el ícono en rojo desde las 08:30.', isInternal: false },
        { authorId: tec1.id, content: 'Voy en camino al sector. Llevaré cable UTP Cat6 y herramientas de certificación por si hay daño físico.', isInternal: false },
        { authorId: tec1.id, content: 'Revisé el switch del poste, puerto 5 muestra actividad. El problema está en el encoder de la cámara. Necesito escalera y posiblemente encoder de repuesto.', isInternal: true },
        { authorId: adminLS.id, content: '¿Cuánto tiempo estimado para la reparación? Necesito reportar al alcalde.', isInternal: false },
        { authorId: tec1.id, content: 'Estimación: 2-3 horas si el encoder es el problema. Si hay daño en el cable de alimentación puede ser hasta mañana.', isInternal: false },
      ],
    },
    // Ticket 1 - Fibra cortada
    {
      ticketIdx: 1,
      comments: [
        { authorId: opLS.id, content: 'Cámaras CAM-FX-015, CAM-FX-016 y CAM-FX-017 sin señal. Switches SW-NORTE-02 y SW-NORTE-03 también sin respuesta.', isInternal: false },
        { authorId: tec1.id, content: 'Contactado Municipio para coordinar. Voy al sector con kit OTDR para localizar el punto de corte exacto.', isInternal: false },
        { authorId: tec1.id, content: 'OTDR muestra corte a 847 metros del nodo central. Hay excavadora de la empresa constructora que hizo el corte. Foto adjunta.', isInternal: true },
        { authorId: superAdmin.id, content: 'Contactar a empresa constructora para que asuman los costos de reparación. Levantar acta de daño.', isInternal: true },
      ],
    },
    // Ticket 2 - Video Wall CENCO
    {
      ticketIdx: 2,
      comments: [
        { authorId: adminLS.id, content: 'El operador del turno de noche reportó que al inicio del turno ya estaban las pantallas apagadas.', isInternal: false },
        { authorId: tec2.id, content: 'Revisé el controlador DSS Pro. Error: "Render target not available on display 12, 13, 15, 16". Reiniciando módulo de video.', isInternal: true },
        { authorId: tec2.id, content: 'Reinicio del módulo no solucionó. Voy a revisar físicamente los cables DisplayPort de los cuadrantes afectados.', isInternal: false },
        { authorId: opLS.id, content: '¿Cuándo estará listo? Hay reunión del COE mañana a las 09:00 que necesita el video wall completo.', isInternal: false },
        { authorId: tec2.id, content: 'Entendido. Priorizaré para tenerlo listo antes de las 08:00 de mañana.', isInternal: false },
      ],
    },
    // Ticket 4 - Switch VLAN - RESOLVED
    {
      ticketIdx: 4,
      comments: [
        { authorId: opLS.id, content: 'Se perdieron las cámaras del sector norte. Revisar switch urgente.', isInternal: false },
        { authorId: tec1.id, content: 'Accedí al switch vía consola. El puerto trunk hacia el core switch perdió la configuración de allowed VLANs. Agregando VLAN 19...', isInternal: true },
        { authorId: tec1.id, content: 'SOLUCIONADO. El problema era que una actualización de configuración del core switch no incluyó la VLAN 19 en el trunk. Se corrigió y las 12 cámaras del sector volvieron a línea.', isInternal: false },
        { authorId: adminLS.id, content: 'Excelente trabajo. Tiempo de restauración: 1.5 horas. Dentro del SLA. Gracias.', isInternal: false },
      ],
    },
    // Ticket 8 - Falla eléctrica costanera - RESOLVED
    {
      ticketIdx: 8,
      comments: [
        { authorId: adminLS.id, content: 'Se fue la luz en la costanera. El UPS aguantó 45 minutos. Ahora todo apagado.', isInternal: false },
        { authorId: tec1.id, content: 'Coordinando con ELIQSA. Tiempo estimado de reposición: 2-3 horas.', isInternal: false },
        { authorId: tec1.id, content: 'ELÉCTRICO REPUESTO. Revisando equipos al encenderse. Switch encendió OK. Revisando cámaras una a una.', isInternal: true },
        { authorId: tec1.id, content: 'Todo el sistema en línea. 1 UPS necesita reemplazo de batería (estimado 30% de capacidad). Se generará ticket de mantención.', isInternal: false },
        { authorId: adminLS.id, content: 'Gracias por la rápida gestión. Aprobar compra de batería de repuesto.', isInternal: false },
      ],
    },
    // Ticket 14 - Emergencia masiva - RESOLVED
    {
      ticketIdx: 14,
      comments: [
        { authorId: opLS.id, content: 'EMERGENCIA: 23 cámaras zona centro-sur sin señal. Corte eléctrico masivo en el sector.', isInternal: false },
        { authorId: superAdmin.id, content: 'Activando protocolo de emergencia. Tec1 y Tec2 al sector. Contactar ELIQSA línea directa.', isInternal: true },
        { authorId: tec1.id, content: 'En camino con generador de respaldo. Tec2 por otra ruta al gabinete secundario.', isInternal: false },
        { authorId: tec2.id, content: 'UPS del gabinete sur se agotó. Conectando generador portátil para mantener el switch en línea.', isInternal: true },
        { authorId: tec1.id, content: 'ELIQSA reporta que repondrán suministro en 1 hora. Mientras tanto 8 cámaras críticas operan con generador.', isInternal: false },
        { authorId: superAdmin.id, content: 'Excelente coordinación. Suministro repuesto. Todas las cámaras en línea. Cerrando emergencia.', isInternal: false },
        { authorId: adminLS.id, content: 'Gracias al equipo por la respuesta. Solicito informe de incidente para el alcalde.', isInternal: false },
      ],
    },
  ];

  let totalComments = 0;
  for (const set of commentSets) {
    if (!createdTickets[set.ticketIdx]) continue;
    const ticket = createdTickets[set.ticketIdx];

    for (let j = 0; j < set.comments.length; j++) {
      const c = set.comments[j];
      const existing = await prisma.ticketComment.findFirst({
        where: { ticketId: ticket.id, authorId: c.authorId, content: { startsWith: c.content.substring(0, 30) } },
      });
      if (!existing) {
        await prisma.ticketComment.create({
          data: {
            content: c.content,
            isInternal: c.isInternal,
            ticketId: ticket.id,
            authorId: c.authorId,
            createdAt: new Date(ticket.createdAt.getTime() + (j + 1) * 20 * 60 * 1000),
          },
        });
        totalComments++;
      }
    }
  }

  console.log(`  ✅ ${totalComments} comments created\n`);

  // ============================================
  // AUDIT LOGS
  // ============================================
  console.log('📋 Creating audit logs...');

  for (const ticket of createdTickets.slice(0, 5)) {
    await prisma.auditLog.create({
      data: {
        action: 'TICKET_CREATED',
        entity: 'Ticket',
        entityId: ticket.id,
        newValues: { status: ticket.status, priority: ticket.priority },
        userId: ticket.creatorId,
        companyId: ticket.companyId,
        ticketId: ticket.id,
      },
    });
  }

  console.log('  ✅ Audit logs created\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     SEED COMPLETED SUCCESSFULLY!         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  CREDENTIALS                             ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Super Admin:                            ║');
  console.log('║  📧 ppinto@elementalpro.cl               ║');
  console.log('║  🔑 Admin1234!                           ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Técnico:                                ║');
  console.log('║  📧 tecnico1@elementalpro.cl             ║');
  console.log('║  🔑 Tecnico1234!                         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Operador La Serena:                     ║');
  console.log('║  📧 operador@laserena.cl                 ║');
  console.log('║  🔑 Operador1234!                        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Admin Tierra Amarilla:                  ║');
  console.log('║  📧 admin@tierraamarilla.cl              ║');
  console.log('║  🔑 Admin1234!                           ║');
  console.log('╚══════════════════════════════════════════╝');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
