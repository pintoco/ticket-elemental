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

    // Prevent non-super-admin from escalating roles
    if (dto.role && requestingUser.role !== UserRole.SUPER_ADMIN) {
      if (dto.role === UserRole.SUPER_ADMIN) throw new ForbiddenException('Cannot assign SUPER_ADMIN role');
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

    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      where.companyId = requestingUser.companyId;
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async remove(id: string, requestingUser: any) {
    if (id === requestingUser.id) throw new BadRequestException('Cannot delete your own account');
    await this.findOne(id, requestingUser);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }
}
