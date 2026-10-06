import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TicketStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import {
  INTERNAL_NOTE_ROLES,
  assertTicketAccess,
  ticketAccessWhere,
} from '../common/access/ticket-access';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateTicketDto, UpdateTicketDto, TicketFilterDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Generates the next ticketNumber atomically inside a transaction.
  // Uses Serializable isolation in create() to prevent duplicates under concurrency.
  private async generateTicketNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EP-${year}-`;
    const result = await tx.$queryRaw<Array<{ next_seq: number }>>`
      SELECT COALESCE(MAX(CAST(RIGHT("ticketNumber", 5) AS INTEGER)), 0) + 1 AS next_seq
      FROM tickets
      WHERE "ticketNumber" LIKE ${`${prefix}%`}
    `;
    const seq = Number(result[0]?.next_seq ?? 1);
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  // Assignee must be an active Elemental Pro technician; asset must belong to the ticket's company.
  private async validateRelations(
    companyId: string,
    assignedToId?: string | null,
    assetId?: string | null,
  ) {
    if (assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { role: true, isActive: true },
      });
      const validRoles: UserRole[] = [UserRole.TECHNICIAN, UserRole.SUPER_ADMIN];
      if (!assignee || !assignee.isActive || !validRoles.includes(assignee.role)) {
        throw new BadRequestException('El usuario asignado no es un técnico válido');
      }
    }
    if (assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        select: { companyId: true },
      });
      if (!asset || asset.companyId !== companyId) {
        throw new BadRequestException('El activo no pertenece a la empresa del ticket');
      }
    }
  }

  async create(dto: CreateTicketDto, requestingUser: AuthUser, meta?: { ip?: string; userAgent?: string }) {
    const companyId = dto.companyId || requestingUser.companyId;

    if (requestingUser.role !== UserRole.SUPER_ADMIN && companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Cannot create tickets for other companies');
    }

    await this.validateRelations(companyId, dto.assignedToId, dto.assetId);

    const slaDefs: Record<string, number> = { CRITICAL: 2, HIGH: 4, MEDIUM: 8, LOW: 24 };
    const slaHours = dto.slaHours || slaDefs[dto.priority] || 8;

    let ticket: any;
    // Retry loop handles rare Serializable conflicts (P2034) and
    // unique-constraint races (P2002) on ticketNumber
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ticket = await this.prisma.$transaction(async (tx) => {
          const ticketNumber = await this.generateTicketNumber(tx);

          const created = await tx.ticket.create({
            data: {
              title: dto.title,
              description: dto.description,
              priority: dto.priority,
              type: dto.type,
              category: dto.category,
              location: dto.location,
              cameraId: dto.cameraId,
              ipAddress: dto.ipAddress,
              assignedToId: dto.assignedToId,
              assetId: dto.assetId,
              tags: dto.tags,
              companyId,
              creatorId: requestingUser.id,
              ticketNumber,
              slaHours,
              scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            },
            include: this.getTicketIncludes(),
          });

          await tx.auditLog.create({
            data: {
              action: 'TICKET_CREATED',
              entity: 'Ticket',
              entityId: created.id,
              newValues: {
                ticketNumber: created.ticketNumber,
                title: created.title,
                status: created.status,
                priority: created.priority,
                category: created.category,
                type: created.type,
              },
              userId: requestingUser.id,
              companyId: requestingUser.companyId,
              ticketId: created.id,
              ipAddress: meta?.ip,
              userAgent: meta?.userAgent,
            },
          });

          return created;
        }, { isolationLevel: 'Serializable' });

        break;
      } catch (e: any) {
        if (attempt === 2 || (e?.code !== 'P2034' && e?.code !== 'P2002')) throw e;
      }
    }

    this.mailService.sendTicketCreated(ticket).catch(() => null);

    if (ticket.assignedToId && ticket.assignedToId !== requestingUser.id) {
      this.notificationsService.createNotification({
        userId: ticket.assignedToId,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket asignado',
        message: `Se te asignó el ticket ${ticket.ticketNumber}: ${ticket.title}`,
        ticketId: ticket.id,
      }).catch(() => null);
    }

    return ticket;
  }

  async findAll(filters: TicketFilterDto, requestingUser: AuthUser) {
    const { page = 1, limit = 20, search, dateFrom, dateTo, ...rest } = filters;
    const skip = (page - 1) * limit;

    const where: any = ticketAccessWhere(requestingUser);

    if (requestingUser.role === UserRole.SUPER_ADMIN && rest.companyId) {
      where.companyId = rest.companyId;
    }

    if (rest.status) where.status = rest.status;
    if (rest.priority) where.priority = rest.priority;
    if (rest.type) where.type = rest.type;
    if (rest.category) where.category = rest.category;
    if (rest.assignedToId && requestingUser.role !== UserRole.TECHNICIAN) {
      where.assignedToId = rest.assignedToId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { cameraId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: this.getTicketIncludes(),
        orderBy: [{ ticketNumber: 'desc' }],
        skip,
        take: Number(limit),
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, requestingUser: AuthUser) {
    const canSeeInternal = INTERNAL_NOTE_ROLES.includes(requestingUser.role);
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...this.getTicketIncludes(),
        comments: {
          where: canSeeInternal ? undefined : { isInternal: false },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        auditLogs: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    assertTicketAccess(ticket, requestingUser);

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, requestingUser: AuthUser, meta?: { ip?: string; userAgent?: string }) {
    const ticket = await this.findOne(id, requestingUser);

    const canEdit =
      requestingUser.role === UserRole.SUPER_ADMIN ||
      requestingUser.role === UserRole.ADMIN ||
      ticket.assignedToId === requestingUser.id ||
      ticket.creatorId === requestingUser.id;

    if (!canEdit) throw new ForbiddenException('Cannot edit this ticket');

    await this.validateRelations(ticket.companyId, dto.assignedToId, dto.assetId);

    const updateData: Prisma.TicketUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      type: dto.type,
      category: dto.category,
      location: dto.location,
      cameraId: dto.cameraId,
      ipAddress: dto.ipAddress,
      slaHours: dto.slaHours,
      assignedToId: dto.assignedToId,
      assetId: dto.assetId,
      tags: dto.tags,
    };

    if (dto.status === TicketStatus.ON_SITE && !(ticket as any).onSiteAt) {
      updateData.onSiteAt = new Date();
    }
    if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (dto.status === TicketStatus.VALIDATED && !(ticket as any).validatedAt) {
      updateData.validatedAt = new Date();
    }
    if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }
    if (dto.scheduledAt) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }

    // Build diff of actually changed fields
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (dto.status !== undefined && dto.status !== ticket.status) {
      oldValues.status = ticket.status;
      newValues.status = dto.status;
    }
    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      oldValues.priority = ticket.priority;
      newValues.priority = dto.priority;
    }
    if (dto.assignedToId !== undefined && dto.assignedToId !== ticket.assignedToId) {
      oldValues.assignedToId = ticket.assignedToId;
      newValues.assignedToId = dto.assignedToId;
    }
    if (dto.title !== undefined && dto.title !== ticket.title) {
      oldValues.title = ticket.title;
      newValues.title = dto.title;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: this.getTicketIncludes(),
      });
      if (Object.keys(newValues).length > 0) {
        await tx.auditLog.create({
          data: {
            action: 'TICKET_UPDATED',
            entity: 'Ticket',
            entityId: id,
            oldValues,
            newValues,
            userId: requestingUser.id,
            companyId: requestingUser.companyId,
            ticketId: id,
            ipAddress: meta?.ip,
            userAgent: meta?.userAgent,
          },
        });
      }
      return result;
    });

    if (dto.status && dto.status !== ticket.status && ticket.creatorId !== requestingUser.id) {
      const isResolved = dto.status === TicketStatus.RESOLVED;
      this.notificationsService.createNotification({
        userId: ticket.creatorId,
        type: isResolved ? 'TICKET_RESOLVED' : 'TICKET_UPDATED',
        title: isResolved ? 'Ticket resuelto' : 'Ticket actualizado',
        message: `El ticket ${ticket.ticketNumber} ${isResolved ? 'fue resuelto' : `cambió de estado a ${dto.status}`}`,
        ticketId: id,
      }).catch(() => null);
    }

    if (dto.assignedToId && dto.assignedToId !== ticket.assignedToId && dto.assignedToId !== requestingUser.id) {
      this.notificationsService.createNotification({
        userId: dto.assignedToId,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket asignado',
        message: `Se te asignó el ticket ${ticket.ticketNumber}: ${ticket.title}`,
        ticketId: id,
      }).catch(() => null);
    }

    return updated;
  }

  async remove(id: string, requestingUser: AuthUser, meta?: { ip?: string; userAgent?: string }) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete tickets');
    }

    const ticket = await this.findOne(id, requestingUser);

    await this.prisma.$transaction(async (tx) => {
      // Audit log is created first (with no ticketId since the FK cascades to NULL on delete)
      await tx.auditLog.create({
        data: {
          action: 'TICKET_DELETED',
          entity: 'Ticket',
          entityId: id,
          oldValues: {
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
          },
          userId: requestingUser.id,
          companyId: requestingUser.companyId,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      });
      await tx.ticket.delete({ where: { id } });
    });

    return { message: 'Ticket deleted successfully' };
  }

  async getMyTickets(requestingUser: AuthUser) {
    const where: any = { creatorId: requestingUser.id };
    if (requestingUser.role === UserRole.TECHNICIAN) {
      where.assignedToId = requestingUser.id;
      delete where.creatorId;
    }

    return this.prisma.ticket.findMany({
      where,
      include: this.getTicketIncludes(),
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async addAttachments(ticketId: string, files: Express.Multer.File[], requestingUser: AuthUser, meta?: { ip?: string; userAgent?: string }) {
    if (!files || files.length === 0) return [];

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    assertTicketAccess(ticket, requestingUser);

    const attachments = await Promise.all(
      files.map(async (file) => {
        const url = await this.cloudinaryService.uploadFile(file.buffer);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        return this.prisma.attachment.create({
          data: {
            filename: safeName,
            originalName: safeName,
            mimeType: file.mimetype,
            size: file.size,
            url,
            ticketId,
          },
        });
      }),
    );

    await this.prisma.auditLog.create({
      data: {
        action: 'ATTACHMENT_UPLOADED',
        entity: 'Ticket',
        entityId: ticketId,
        newValues: {
          count: attachments.length,
          files: attachments.map((a) => a.originalName),
        },
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        ticketId,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return attachments;
  }

  private getTicketIncludes() {
    return {
      company: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { comments: true, attachments: true } },
    };
  }
}
