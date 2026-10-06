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
import { AuthUser } from '../common/types/auth-user';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/create-user.dto';

const PRIVILEGED_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.TECHNICIAN];

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

  // Only SUPER_ADMIN may touch SUPER_ADMIN or TECHNICIAN accounts.
  private assertCanManage(targetRole: UserRole, requestingUser: AuthUser) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN && PRIVILEGED_ROLES.includes(targetRole)) {
      throw new ForbiddenException('Solo el super administrador puede gestionar técnicos y super administradores');
    }
  }

  async create(dto: CreateUserDto, requestingUser: AuthUser) {
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

  async findAll(requestingUser: AuthUser, filters: { companyId?: string; role?: UserRole; isActive?: boolean }) {
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

  async findOne(id: string, requestingUser: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');

    if (requestingUser.role !== UserRole.SUPER_ADMIN && user.companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, requestingUser: AuthUser) {
    const user = await this.findOne(id, requestingUser);
    const isSelf = id === requestingUser.id;
    const isManager = requestingUser.role === UserRole.SUPER_ADMIN || requestingUser.role === UserRole.ADMIN;

    if (!isSelf) {
      if (!isManager) throw new ForbiddenException('Access denied');
      this.assertCanManage(user.role, requestingUser);
    } else if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      // Users may edit their own profile but never their own role or status.
      if (dto.role !== undefined || dto.isActive !== undefined) {
        throw new ForbiddenException('No puedes modificar tu propio rol o estado');
      }
    }

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

    const revokeSessions = dto.isActive === false || (dto.role !== undefined && dto.role !== user.role);

    return this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(revokeSessions ? { refreshToken: null } : {}) },
      select: USER_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, requestingUser: AuthUser) {
    if (id !== requestingUser.id && requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot change other user password');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed, refreshToken: null } });

    return { message: 'Password updated successfully' };
  }

  async getTechnicians(companyId: string, requestingUser: AuthUser) {
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

  async remove(id: string, requestingUser: AuthUser) {
    if (id === requestingUser.id) throw new BadRequestException('No puedes eliminar tu propia cuenta');
    const target = await this.findOne(id, requestingUser);
    this.assertCanManage(target.role, requestingUser);

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

    await this.prisma.user.update({ where: { id }, data: { isActive: false, refreshToken: null } });
    return { message: 'Usuario desactivado exitosamente' };
  }
}
