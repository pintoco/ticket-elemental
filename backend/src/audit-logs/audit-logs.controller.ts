import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('audit-logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('entity') entity?: string,
  ) {
    const where: any = {};
    if (user.role !== UserRole.SUPER_ADMIN) where.companyId = user.companyId;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: { total, page: Number(page), limit: Number(limit) } };
  }
}
