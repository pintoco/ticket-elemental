import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(ticketId: string, dto: CreateCommentDto, requestingUser: any, meta?: { ip?: string; userAgent?: string }) {
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

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'COMMENT_CREATED',
        entity: 'TicketComment',
        entityId: comment.id,
        newValues: { isInternal: comment.isInternal },
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        ticketId,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

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
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      comment.ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

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

  async addAttachments(commentId: string, files: Express.Multer.File[], requestingUser: any, meta?: { ip?: string; userAgent?: string }) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id: commentId },
      include: { ticket: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      comment.ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

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
            commentId,
          },
        });
      }),
    );

    await this.prisma.auditLog.create({
      data: {
        action: 'ATTACHMENT_UPLOADED',
        entity: 'TicketComment',
        entityId: commentId,
        newValues: {
          count: attachments.length,
          files: attachments.map((a) => a.originalName),
        },
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        ticketId: comment.ticketId,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return attachments;
  }

  async remove(id: string, requestingUser: any, meta?: { ip?: string; userAgent?: string }) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
      include: { ticket: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      comment.ticket.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (
      comment.authorId !== requestingUser.id &&
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'COMMENT_DELETED',
        entity: 'TicketComment',
        entityId: id,
        oldValues: { authorId: comment.authorId, isInternal: comment.isInternal },
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        ticketId: comment.ticketId,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    await this.prisma.ticketComment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }
}
