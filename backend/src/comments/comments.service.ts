import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(ticketId: string, dto: CreateCommentDto, requestingUser: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Only techs/admins can post internal notes
    const isInternal =
      dto.isInternal &&
      [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN].includes(requestingUser.role);

    const comment = await this.prisma.ticketComment.create({
      data: {
        content: dto.content,
        isInternal: isInternal || false,
        ticketId,
        authorId: requestingUser.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
        attachments: true,
      },
    });

    // Update ticket updatedAt
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Notify ticket creator and assignee (excluding the commenter)
    const notifyIds = new Set<string>();
    if (ticket.creatorId !== requestingUser.id) notifyIds.add(ticket.creatorId);
    if (ticket.assignedToId && ticket.assignedToId !== requestingUser.id) notifyIds.add(ticket.assignedToId);

    const authorName = `${requestingUser.firstName} ${requestingUser.lastName}`;
    for (const userId of notifyIds) {
      this.notificationsService.createNotification({
        userId,
        type: 'COMMENT_ADDED',
        title: 'Nuevo comentario',
        message: `${authorName} comentó en el ticket`,
        ticketId,
      }).catch(() => null);
    }

    return comment;
  }

  async findByTicket(ticketId: string, requestingUser: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { ticketId };

    // Clients can't see internal notes
    if (requestingUser.role === UserRole.CLIENT || requestingUser.role === UserRole.OPERATOR) {
      where.isInternal = false;
    }

    return this.prisma.ticketComment.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, content: string, requestingUser: any) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
      include: { ticket: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (
      comment.authorId !== requestingUser.id &&
      requestingUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot edit others comments');
    }

    return this.prisma.ticketComment.update({
      where: { id },
      data: { content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async remove(id: string, requestingUser: any) {
    const comment = await this.prisma.ticketComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (
      comment.authorId !== requestingUser.id &&
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.ticketComment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }
}
