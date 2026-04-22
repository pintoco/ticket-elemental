import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
  }

  async sendTicketCreated(ticket: any): Promise<void> {
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'https://ticket.elementalpro.cl')
      .split(',')[0]
      .trim();
    const ticketUrl = `${frontendUrl}/tickets/${ticket.id}`;

    const recipients = new Set<string>(['tecnico@elementalpro.cl']);
    if (ticket.creator?.email) recipients.add(ticket.creator.email);
    if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);

    const PRIORITY_LABELS: Record<string, string> = {
      LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
    };
    const PRIORITY_COLORS: Record<string, string> = {
      LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f97316', CRITICAL: '#ef4444',
    };
    const TYPE_LABELS: Record<string, string> = {
      INCIDENT: 'Incidente', MAINTENANCE: 'Mantención',
      INSTALLATION: 'Instalación', EMERGENCY: 'Emergencia',
    };
    const CATEGORY_LABELS: Record<string, string> = {
      CAMERAS: '📷 Cámaras', FIBER_OPTIC: '🔌 Fibra Óptica', NETWORK: '🌐 Red',
      SERVERS: '🖥️ Servidores', VIDEO_WALL: '📺 Video Wall',
      DSS_PRO: '💾 DSS Pro', NVR: '🎬 NVR', OTHER: '⚙️ Otro',
    };

    const priorityLabel = PRIORITY_LABELS[ticket.priority] ?? ticket.priority;
    const priorityColor = PRIORITY_COLORS[ticket.priority] ?? '#6b7280';
    const typeLabel = TYPE_LABELS[ticket.type] ?? ticket.type;
    const categoryLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;
    const assignedLabel = ticket.assignedTo
      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
      : 'Sin asignar';
    const createdAt = new Date(ticket.createdAt).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Elemental Pro Help Desk</p>
                  <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;">Nuevo Ticket Registrado</h1>
                </td>
                <td align="right">
                  <span style="background:#1e293b;color:#94a3b8;font-family:monospace;font-size:14px;padding:8px 14px;border-radius:8px;">${ticket.ticketNumber}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Priority banner -->
        <tr>
          <td style="background:${priorityColor};padding:10px 32px;">
            <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;">
              🔔 Prioridad: ${priorityLabel} &nbsp;·&nbsp; ${typeLabel} &nbsp;·&nbsp; ${categoryLabel}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;">

            <!-- Title -->
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">${ticket.title}</h2>
            <p style="margin:0 0 24px;color:#64748b;font-size:13px;">Creado el ${createdAt} · Empresa: <strong>${ticket.company?.name ?? ''}</strong></p>

            <!-- Description -->
            <div style="background:#f8fafc;border-left:4px solid #3b82f6;border-radius:4px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap;">${ticket.description}</p>
            </div>

            <!-- Info grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Creado por</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;font-weight:600;">${ticket.creator?.firstName ?? ''} ${ticket.creator?.lastName ?? ''}</p>
                  <p style="margin:0;color:#64748b;font-size:12px;">${ticket.creator?.email ?? ''}</p>
                </td>
                <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Técnico asignado</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;font-weight:600;">${assignedLabel}</p>
                  ${ticket.assignedTo ? `<p style="margin:0;color:#64748b;font-size:12px;">${ticket.assignedTo.email}</p>` : ''}
                </td>
              </tr>
              ${ticket.location ? `
              <tr>
                <td colspan="2" style="padding:0 0 12px;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">📍 Ubicación</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;">${ticket.location}</p>
                </td>
              </tr>` : ''}
              ${ticket.cameraId ? `
              <tr>
                <td colspan="2" style="padding:0 0 12px;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">📷 ID Cámara</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;font-family:monospace;">${ticket.cameraId}</p>
                </td>
              </tr>` : ''}
              ${ticket.ipAddress ? `
              <tr>
                <td colspan="2" style="padding:0 0 12px;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">🖥️ Dirección IP</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;font-family:monospace;">${ticket.ipAddress}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td colspan="2" style="padding:0 0 12px;">
                  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">⏱ SLA</p>
                  <p style="margin:0;color:#1e293b;font-size:14px;">${ticket.slaHours} horas</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;">
              <a href="${ticketUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Ver Ticket en el Sistema →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Elemental Pro — Redes, CCTV, Fibra Óptica y Soporte TI<br>
              Este es un correo automático. No responda directamente a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      const { error } = await this.resend.emails.send({
        from: 'Elemental Pro Help Desk <soporte@elementalpro.cl>',
        to: [...recipients],
        subject: `[${ticket.ticketNumber}] Nuevo ticket: ${ticket.title}`,
        html,
      });

      if (error) {
        this.logger.error(`Error enviando email para ticket ${ticket.ticketNumber}`, error);
      } else {
        this.logger.log(`Email enviado para ticket ${ticket.ticketNumber} → ${[...recipients].join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Error enviando email para ticket ${ticket.ticketNumber}`, error);
    }
  }
}
