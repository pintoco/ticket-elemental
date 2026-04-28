import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, UpdateAssetDto, AssetFilterDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssetDto, requestingUser: any) {
    const companyId = dto.companyId || requestingUser.companyId;

    if (requestingUser.role !== UserRole.SUPER_ADMIN && companyId !== requestingUser.companyId) {
      throw new ForbiddenException('Cannot create assets for other companies');
    }

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only admins can create assets');
    }

    return this.prisma.asset.create({
      data: {
        name: dto.name,
        type: dto.type,
        status: dto.status,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        ipAddress: dto.ipAddress,
        macAddress: dto.macAddress,
        location: dto.location,
        floor: dto.floor,
        notes: dto.notes,
        companyId,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : undefined,
        lastMaintenanceAt: dto.lastMaintenanceAt ? new Date(dto.lastMaintenanceAt) : undefined,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
      },
      include: this.getAssetIncludes(),
    });
  }

  async findAll(filters: AssetFilterDto, requestingUser: any) {
    const where: any = {};

    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      where.companyId = requestingUser.companyId;
    } else if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.asset.findMany({
      where,
      include: this.getAssetIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: any) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        ...this.getAssetIncludes(),
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            assignedTo: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      asset.companyId !== requestingUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, requestingUser: any) {
    const asset = await this.findOne(id, requestingUser);

    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only admins can update assets');
    }

    const updateData: any = { ...dto };
    if (dto.installedAt) updateData.installedAt = new Date(dto.installedAt);
    if (dto.lastMaintenanceAt) updateData.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    if (dto.warrantyUntil) updateData.warrantyUntil = new Date(dto.warrantyUntil);

    return this.prisma.asset.update({
      where: { id },
      data: updateData,
      include: this.getAssetIncludes(),
    });
  }

  async remove(id: string, requestingUser: any) {
    if (
      requestingUser.role !== UserRole.SUPER_ADMIN &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only admins can delete assets');
    }

    const asset = await this.findOne(id, requestingUser);

    const ticketCount = await this.prisma.ticket.count({ where: { assetId: asset.id } });
    if (ticketCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el activo tiene ${ticketCount} ticket(s) asociado(s). Retírelo o cambie su estado a Retirado.`,
      );
    }

    await this.prisma.asset.delete({ where: { id } });
    return { message: 'Asset deleted successfully' };
  }

  private getAssetIncludes() {
    return {
      company: { select: { id: true, name: true, slug: true } },
      _count: { select: { tickets: true } },
    };
  }
}
