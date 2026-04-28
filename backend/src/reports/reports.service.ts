import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// pdfmake 0.3.x high-level API — handles URLResolver/virtualfs internally
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmakeInstance = require('pdfmake/js/index');
pdfmakeInstance.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});
// Suppress "no URL access policy" warning — we only use built-in PDF fonts
pdfmakeInstance.setUrlAccessPolicy(() => false);

const COLORS = {
  primary: '#1e3a5f',
  brand: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  purple: '#7c3aed',
  teal: '#0d9488',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Proceso',
  PENDING: 'Pendiente',
  ON_SITE: 'En Terreno',
  RESOLVED: 'Resuelto',
  VALIDATED: 'Validado',
  CLOSED: 'Cerrado',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: COLORS.brand,
  IN_PROGRESS: COLORS.warning,
  PENDING: '#ea580c',
  ON_SITE: COLORS.purple,
  RESOLVED: COLORS.success,
  VALIDATED: COLORS.teal,
  CLOSED: COLORS.gray,
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: COLORS.gray,
  MEDIUM: COLORS.brand,
  HIGH: '#ea580c',
  CRITICAL: COLORS.danger,
};

const CATEGORY_LABELS: Record<string, string> = {
  CAMERAS: 'Cámaras',
  FIBER_OPTIC: 'Fibra Óptica',
  NETWORK: 'Red',
  SERVERS: 'Servidores',
  VIDEO_WALL: 'Video Wall',
  DSS_PRO: 'DSS Pro',
  NVR: 'NVR',
  OTHER: 'Otro',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateTicketPdf(ticketId: string, requestingUser: any): Promise<Buffer> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        company: true,
        creator: { select: { firstName: true, lastName: true, email: true, role: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
        asset: { select: { name: true, type: true, brand: true, model: true, ipAddress: true } },
        comments: {
          where: { isInternal: false },
          include: {
            author: { select: { firstName: true, lastName: true, role: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        auditLogs: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const fmt = (d: Date | string | null | undefined) => {
      if (!d) return '—';
      const date = new Date(d);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const statusColor = STATUS_COLORS[ticket.status] || COLORS.gray;
    const priorityColor = PRIORITY_COLORS[ticket.priority] || COLORS.gray;

    // Calculate SLA breach
    let slaInfo = '—';
    let slaColor = COLORS.gray;
    if (ticket.slaHours) {
      const slaDeadline = new Date(ticket.createdAt);
      slaDeadline.setHours(slaDeadline.getHours() + ticket.slaHours);
      const resolvedDate = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date();
      const diff = Math.round((resolvedDate.getTime() - slaDeadline.getTime()) / (1000 * 60 * 60));
      if (ticket.resolvedAt) {
        slaInfo = diff <= 0
          ? `Cumplido (${Math.abs(diff)}h antes del límite)`
          : `Incumplido (${diff}h de retraso)`;
        slaColor = diff <= 0 ? COLORS.success : COLORS.danger;
      } else {
        slaInfo = new Date() > slaDeadline
          ? `Vencido — límite era ${fmt(slaDeadline)}`
          : `Vence ${fmt(slaDeadline)}`;
        slaColor = new Date() > slaDeadline ? COLORS.danger : COLORS.warning;
      }
    }

    const docDefinition: any = {
      defaultStyle: { font: 'Helvetica', fontSize: 9, color: '#374151' },
      pageMargins: [40, 50, 40, 50],
      pageSize: 'A4',

      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            text: 'ELEMENTAL PRO',
            fontSize: 14,
            bold: true,
            color: COLORS.primary,
          },
          {
            text: 'INFORME TÉCNICO DE TICKET',
            fontSize: 10,
            color: COLORS.gray,
            alignment: 'right',
            margin: [0, 3, 0, 0],
          },
        ],
      },

      footer: (currentPage: number, pageCount: number) => ({
        margin: [40, 0, 40, 20],
        columns: [
          {
            text: `Generado el ${fmt(new Date())} | Sistema de Tickets Elemental Pro`,
            fontSize: 8,
            color: COLORS.gray,
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            fontSize: 8,
            color: COLORS.gray,
            alignment: 'right',
          },
        ],
      }),

      content: [
        // Divider
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.brand }] },
        { text: ' ', fontSize: 6 },

        // Ticket header
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: ticket.ticketNumber, fontSize: 20, bold: true, color: COLORS.primary },
                { text: ticket.title, fontSize: 12, bold: true, color: '#111827', margin: [0, 4, 0, 0] },
                { text: ticket.company.name, fontSize: 9, color: COLORS.gray, margin: [0, 2, 0, 0] },
              ],
            },
            {
              width: 'auto',
              stack: [
                {
                  table: {
                    body: [
                      [
                        { text: 'ESTADO', fontSize: 7, bold: true, color: 'white', fillColor: statusColor, alignment: 'center', margin: [8, 4, 8, 4] },
                      ],
                      [
                        { text: STATUS_LABELS[ticket.status] || ticket.status, fontSize: 10, bold: true, color: statusColor, alignment: 'center', margin: [8, 2, 8, 4] },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                  },
                },
                { text: ' ', fontSize: 4 },
                {
                  table: {
                    body: [
                      [
                        { text: 'PRIORIDAD', fontSize: 7, bold: true, color: 'white', fillColor: priorityColor, alignment: 'center', margin: [8, 4, 8, 4] },
                      ],
                      [
                        { text: PRIORITY_LABELS[ticket.priority] || ticket.priority, fontSize: 10, bold: true, color: priorityColor, alignment: 'center', margin: [8, 2, 8, 4] },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                  },
                },
              ],
              alignment: 'right',
            },
          ],
        },

        { text: ' ', fontSize: 8 },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: COLORS.border }] },
        { text: ' ', fontSize: 8 },

        // Info grid
        {
          columns: [
            {
              width: '50%',
              stack: [
                this.infoRow('Categoría', CATEGORY_LABELS[ticket.category] || ticket.category),
                this.infoRow('Tipo', ticket.type === 'INCIDENT' ? 'Incidente' : ticket.type === 'MAINTENANCE' ? 'Mantención' : ticket.type === 'INSTALLATION' ? 'Instalación' : 'Emergencia'),
                this.infoRow('Creado por', `${ticket.creator.firstName} ${ticket.creator.lastName}`),
                this.infoRow('Asignado a', ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Sin asignar'),
              ],
            },
            {
              width: '50%',
              stack: [
                this.infoRow('Fecha creación', fmt(ticket.createdAt)),
                this.infoRow('SLA', ticket.slaHours ? `${ticket.slaHours} horas` : '—'),
                this.infoRow('Cumplimiento SLA', slaInfo, slaColor),
                this.infoRow('Tags', ticket.tags.length > 0 ? ticket.tags.join(', ') : '—'),
              ],
            },
          ],
        },

        { text: ' ', fontSize: 8 },

        // Technical fields (only if present)
        ...(ticket.location || ticket.ipAddress || ticket.cameraId || ticket.asset
          ? [
              this.sectionTitle('Información Técnica'),
              {
                columns: [
                  {
                    width: '50%',
                    stack: [
                      ...(ticket.location ? [this.infoRow('Ubicación', ticket.location)] : []),
                      ...(ticket.ipAddress ? [this.infoRow('Dirección IP', ticket.ipAddress)] : []),
                      ...(ticket.cameraId ? [this.infoRow('ID Cámara', ticket.cameraId)] : []),
                    ],
                  },
                  {
                    width: '50%',
                    stack: ticket.asset
                      ? [
                          this.infoRow('Activo', ticket.asset.name),
                          this.infoRow('Marca/Modelo', [ticket.asset.brand, ticket.asset.model].filter(Boolean).join(' ') || '—'),
                          ...(ticket.asset.ipAddress ? [this.infoRow('IP Activo', ticket.asset.ipAddress)] : []),
                        ]
                      : [],
                  },
                ],
              },
              { text: ' ', fontSize: 6 },
            ]
          : []),

        // Timeline
        this.sectionTitle('Historial de Tiempos'),
        {
          table: {
            widths: ['*', '*', '*', '*', '*'],
            body: [
              [
                { text: 'Creado', style: 'tableHeader' },
                { text: 'En Terreno', style: 'tableHeader' },
                { text: 'Resuelto', style: 'tableHeader' },
                { text: 'Validado', style: 'tableHeader' },
                { text: 'Cerrado', style: 'tableHeader' },
              ],
              [
                { text: fmt(ticket.createdAt), alignment: 'center', fontSize: 8 },
                { text: fmt((ticket as any).onSiteAt), alignment: 'center', fontSize: 8 },
                { text: fmt(ticket.resolvedAt), alignment: 'center', fontSize: 8 },
                { text: fmt((ticket as any).validatedAt), alignment: 'center', fontSize: 8 },
                { text: fmt(ticket.closedAt), alignment: 'center', fontSize: 8 },
              ],
            ],
          },
          layout: {
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border,
            fillColor: (row: number) => row === 0 ? COLORS.lightGray : null,
          },
        },

        { text: ' ', fontSize: 8 },

        // Description
        this.sectionTitle('Descripción'),
        { text: ticket.description, fontSize: 9, lineHeight: 1.5, color: '#374151' },

        { text: ' ', fontSize: 8 },

        // Comments
        ...(ticket.comments.length > 0
          ? [
              this.sectionTitle(`Comentarios (${ticket.comments.length})`),
              ...ticket.comments.map((c) => ({
                margin: [0, 0, 0, 8],
                stack: [
                  {
                    columns: [
                      {
                        text: `${c.author.firstName} ${c.author.lastName}`,
                        bold: true,
                        fontSize: 8,
                        color: COLORS.primary,
                      },
                      {
                        text: fmt(c.createdAt),
                        fontSize: 8,
                        color: COLORS.gray,
                        alignment: 'right',
                      },
                    ],
                  },
                  {
                    text: c.content,
                    fontSize: 8,
                    lineHeight: 1.4,
                    margin: [0, 3, 0, 0],
                  },
                  ...(c.attachments.length > 0
                    ? [{ text: `📎 ${c.attachments.length} adjunto(s)`, fontSize: 7, color: COLORS.gray, margin: [0, 2, 0, 0] }]
                    : []),
                  { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 0.3, lineColor: COLORS.border }] },
                ],
              })),
            ]
          : [{ text: 'Sin comentarios.', fontSize: 9, color: COLORS.gray }]),
      ],

      styles: {
        tableHeader: {
          bold: true,
          fontSize: 8,
          color: COLORS.primary,
          alignment: 'center',
          fillColor: COLORS.lightGray,
          margin: [0, 4, 0, 4],
        },
        sectionTitle: {
          fontSize: 9,
          bold: true,
          color: COLORS.primary,
          margin: [0, 0, 0, 6],
        },
      },
    };

    return this.buildPdf(docDefinition);
  }

  private sectionTitle(text: string) {
    return {
      stack: [
        { text, style: 'sectionTitle' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: COLORS.brand }] },
        { text: ' ', fontSize: 4 },
      ],
    };
  }

  private infoRow(label: string, value: string, valueColor?: string) {
    return {
      margin: [0, 0, 0, 5],
      columns: [
        { text: label + ':', bold: true, fontSize: 8, color: COLORS.gray, width: 90 },
        { text: value, fontSize: 8, color: valueColor || '#111827', width: '*' },
      ],
    };
  }

  private buildPdf(docDefinition: any): Promise<Buffer> {
    const doc = pdfmakeInstance.createPdf(docDefinition);
    return doc.getBuffer();
  }
}
