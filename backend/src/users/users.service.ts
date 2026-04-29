import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/create-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  avatar: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
  company: { select: { id: true, name: true, slug: true } },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, requestingUser: any) {
    // Only super admin can create users in any company
    if (requestingUser.role !== UserRole.SUPER_ADMIN && dto.companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Cannot create users for other companies');
    }

    // Only SUPER_ADMIN can create TECHNICIAN or SUPER_ADMIN users
    if (
      (dto.role === UserRole.TECHNICIAN || dto.role === UserRole.SUPER_ADMIN) &&
      requestingUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Solo el super administrador puede crear técnicos');
    }

    // TECHNICIAN and SUPER_ADMIN must belong to the main company (Elemental Pro)
    if (dto.role === UserRole.TECHNICIAN || dto.role === UserRole.SUPER_ADMIN) {
      const mainCompany = await this.prisma.company.findFirst({ where: { slug: 'elementalpro' } });
      if (!mainCompany || dto.companyId !== mainCompany.id) {
        throw new BadRequestException('Los técnicos y super administradores solo pueden pertenecer a Elemental Pro');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        ...dto,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
      },
      select: USER_SELECT,
    });
  }

  async findAll(requestingUser: any, filters: { companyId?: string; role?: UserRole; isActive?: boolean }) {
    const where: any = {};

    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      where.companyId = requestingUser.companyId;
    } else if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: any) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');

    if (requestingUser.role !== UserRole.SUPER_ADMIN && user.companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, requestingUser: any) {
    const user = await this.findOne(id, requestingUser);

    if (dto.role !== undefined && requestingUser.role !== UserRole.SUPER_ADMIN) {
      if (dto.role === UserRole.SUPER_ADMIN || dto.role === UserRole.TECHNICIAN) {
        throw new ForbiddenException('Solo SUPER_ADMIN puede asignar roles de técnico o super administrador');
      }
    }

    // SUPER_ADMIN assigning TECHNICIAN/SUPER_ADMIN: target user must belong to Elemental Pro
    if (dto.role === UserRole.TECHNICIAN || dto.role === UserRole.SUPER_ADMIN) {
      const mainCompany = await this.prisma.company.findFirst({ where: { slug: 'elementalpro' } });
      if (!mainCompany || user.companyId !== mainCompany.id) {
        throw new BadRequestException('Los técnicos y super administradores solo pueden pertenecer a Elemental Pro');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, requestingUser: any) {
    if (id !== requestingUser.id && requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot change other user password');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });

    return { message: 'Password updated successfully' };
  }

  async getTechnicians(companyId: string, requestingUser: any) {
    const where: any = {
      role: { in: [UserRole.TECHNICIAN, UserRole.SUPER_ADMIN] },
      isActive: true,
    };

    return this.prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async remove(id: string, requestingUser: any) {
    if (id === requestingUser.id) throw new BadRequestException('No puedes eliminar tu propia cuenta');
    await this.findOne(id, requestingUser);

    if (requestingUser.role === UserRole.SUPER_ADMIN) {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { _count: { select: { createdTickets: true, comments: true } } },
      });
      if (user._count.createdTickets > 0 || user._count.comments > 0) {
        throw new BadRequestException(
          `No se puede eliminar: el usuario tiene ${user._count.createdTickets} ticket(s) y/o comentarios asociados. Desactívalo en su lugar.`,
        );
      }
      await this.prisma.user.delete({ where: { id } });
      return { message: 'Usuario eliminado exitosamente' };
    }

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: 'Usuario desactivado exitosamente' };
  }
}
