import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TicketStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketDto, TicketFilterDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateTicketNumber(): Promise<string> {
    const count = await this.prisma.ticket.count();
    const year = new Date().getFullYear();
    return `EP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateTicketDto, requestingUser: any) {
    const companyId = dto.companyId || requestingUser.companyId;

    if (requestingUser.role !== UserRole.SUPER_ADMIN && companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Cannot create tickets for other companies');
    }

    const ticketNumber = await this.generateTicketNumber();

    // Default SLA based on priority
    const slaDefs = { CRITICAL: 2, HIGH: 4, MEDIUM: 8, LOW: 24 };
    const slaHours = dto.slaHours || slaDefs[dto.priority] || 8;

    return this.prisma.ticket.create({
      data: {
        ...dto,
        companyId,
        creatorId: requestingUser.id,
        ticketNumber,
        slaHours,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: this.getTicketIncludes(),
    });
  }

  async findAll(filters: TicketFilterDto, requestingUser: any) {
    const { page = 1, limit = 20, search, dateFrom, dateTo, ...rest } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Multi-tenant isolation
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      where.companyId = requestingUser.companyId;
    } else if (rest.companyId) {
      where.companyId = rest.companyId;
    }

    // Technicians only see their assigned tickets
    if (requestingUser.role === UserRole.TECHNICIAN) {
      where.assignedToId = requestingUser.id;
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
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
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

  async findOne(id: string, requestingUser: any) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...this.getTicketIncludes(),
        comments: {
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

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, requestingUser: any) {
    const ticket = await this.findOne(id, requestingUser);

    const canEdit =
      requestingUser.role === UserRole.SUPER_ADMIN ||
      requestingUser.role === UserRole.ADMIN ||
      ticket.assignedToId === requestingUser.id ||
      ticket.creatorId === requestingUser.id;

    if (!canEdit) throw new ForbiddenException('Cannot edit this ticket');

    const updateData: any = { ...dto };

    // Handle status transitions with timestamps
    if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }
    if (dto.scheduledAt) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }

    // Log the update
    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_UPDATED',
        entity: 'Ticket',
        entityId: id,
        oldValues: { status: ticket.status, priority: ticket.priority },
        newValues: { status: dto.status, priority: dto.priority },
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        ticketId: id,
      },
    });

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: this.getTicketIncludes(),
    });
  }

  async remove(id: string, requestingUser: any) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete tickets');
    }

    await this.findOne(id, requestingUser);
    await this.prisma.ticket.delete({ where: { id } });
    return { message: 'Ticket deleted successfully' };
  }

  async getMyTickets(requestingUser: any) {
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

  private getTicketIncludes() {
    return {
      company: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { comments: true, attachments: true } },
    };
  }
}
