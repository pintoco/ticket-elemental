import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Company slug already in use');

    return this.prisma.company.create({ data: dto });
  }

  async findAll(requestingUser: any) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      return this.prisma.company.findMany({
        where: { id: requestingUser.companyId },
        include: { _count: { select: { users: true, tickets: true } } },
      });
    }

    return this.prisma.company.findMany({
      include: { _count: { select: { users: true, tickets: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: any) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN && id !== requestingUser.companyId) {
      throw new ForbiddenException('Access denied');
    }

    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, tickets: true } },
        users: {
          select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
          take: 10,
        },
      },
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, requestingUser: any) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN && id !== requestingUser.companyId) {
      throw new ForbiddenException('Access denied');
    }

    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async getStats(requestingUser: any) {
    const companyId = requestingUser.role !== UserRole.SUPER_ADMIN ? requestingUser.companyId : undefined;
    const where = companyId ? { id: companyId } : {};

    return this.prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            tickets: { where: { status: { not: 'CLOSED' } } },
          },
        },
      },
    });
  }
}
