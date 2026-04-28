import { Injectable } from '@nestjs/common';
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(requestingUser: any) {
    const companyFilter =
      requestingUser.role !== UserRole.SUPER_ADMIN
        ? { companyId: requestingUser.companyId }
        : {};

    const techFilter =
      requestingUser.role === UserRole.TECHNICIAN
        ? { assignedToId: requestingUser.id }
        : {};

    const baseWhere = { ...companyFilter, ...techFilter };

    const [
      totalOpen,
      totalInProgress,
      totalPending,
      totalOnSite,
      totalResolved,
      totalValidated,
      totalClosed,
      totalTickets,
      criticalTickets,
      highTickets,
      ticketsByCategory,
      ticketsByCompany,
      ticketsByTechnician,
      recentTickets,
      ticketsTrend,
      avgResolutionTime,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.IN_PROGRESS } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.PENDING } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.ON_SITE } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.RESOLVED } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.VALIDATED } }),
      this.prisma.ticket.count({ where: { ...baseWhere, status: TicketStatus.CLOSED } }),
      this.prisma.ticket.count({ where: baseWhere }),
      this.prisma.ticket.count({ where: { ...baseWhere, priority: TicketPriority.CRITICAL } }),
      this.prisma.ticket.count({ where: { ...baseWhere, priority: TicketPriority.HIGH } }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
      }),
      requestingUser.role === UserRole.SUPER_ADMIN
        ? this.prisma.ticket.groupBy({
            by: ['companyId'],
            _count: { companyId: true },
            orderBy: { _count: { companyId: 'desc' } },
          })
        : Promise.resolve([]),
      this.prisma.ticket.groupBy({
        by: ['assignedToId'],
        where: { ...baseWhere, assignedToId: { not: null } },
        _count: { assignedToId: true },
        orderBy: { _count: { assignedToId: 'desc' } },
        take: 10,
      }),
      this.prisma.ticket.findMany({
        where: baseWhere,
        include: {
          company: { select: { name: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.getTicketsTrend(baseWhere),
      this.getAvgResolutionTime(baseWhere),
    ]);

    // Enrich technician data
    const technicianIds = ticketsByTechnician
      .filter((t) => t.assignedToId)
      .map((t) => t.assignedToId as string);

    const technicians = await this.prisma.user.findMany({
      where: { id: { in: technicianIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const techMap = Object.fromEntries(technicians.map((t) => [t.id, t]));

    // Enrich company data
    let companiesData: any[] = [];
    if (ticketsByCompany.length > 0) {
      const companyIds = ticketsByCompany.map((c) => c.companyId);
      const companies = await this.prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      });
      const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]));
      companiesData = ticketsByCompany.map((c) => ({
        company: companyMap[c.companyId],
        count: c._count.companyId,
      }));
    }

    return {
      summary: {
        total: totalTickets,
        open: totalOpen,
        inProgress: totalInProgress,
        pending: totalPending,
        onSite: totalOnSite,
        resolved: totalResolved,
        validated: totalValidated,
        closed: totalClosed,
        critical: criticalTickets,
        high: highTickets,
      },
      byCategory: ticketsByCategory.map((c) => ({
        category: c.category,
        count: c._count.category,
      })),
      byCompany: companiesData,
      byTechnician: ticketsByTechnician.map((t) => ({
        technician: techMap[t.assignedToId],
        count: t._count.assignedToId,
      })),
      recentTickets,
      trend: ticketsTrend,
      avgResolutionHours: avgResolutionTime,
      sla: await this.getSlaMetrics(baseWhere),
    };
  }

  private async getSlaMetrics(baseWhere: any) {
    const now = new Date();

    // Active tickets (not resolved/validated/closed) with a defined SLA
    const activeWithSla = await this.prisma.ticket.findMany({
      where: {
        ...baseWhere,
        slaHours: { not: null },
        status: {
          notIn: [TicketStatus.RESOLVED, TicketStatus.VALIDATED, TicketStatus.CLOSED],
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        slaHours: true,
        createdAt: true,
        assignedTo: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    });

    const overdue = activeWithSla.filter((t) => {
      const deadline = new Date(t.createdAt);
      deadline.setHours(deadline.getHours() + t.slaHours!);
      return now > deadline;
    });

    // Compliance: resolved tickets where resolvedAt <= slaDeadline
    const resolvedWithSla = await this.prisma.ticket.findMany({
      where: {
        ...baseWhere,
        slaHours: { not: null },
        resolvedAt: { not: null },
        status: { in: [TicketStatus.RESOLVED, TicketStatus.VALIDATED, TicketStatus.CLOSED] },
      },
      select: { createdAt: true, resolvedAt: true, slaHours: true },
      take: 200,
    });

    const compliant = resolvedWithSla.filter((t) => {
      const deadline = new Date(t.createdAt);
      deadline.setHours(deadline.getHours() + t.slaHours!);
      return new Date(t.resolvedAt!) <= deadline;
    });

    const complianceRate =
      resolvedWithSla.length > 0
        ? Math.round((compliant.length / resolvedWithSla.length) * 100)
        : null;

    // Enrich overdue with hours overdue
    const overdueEnriched = overdue
      .map((t) => {
        const deadline = new Date(t.createdAt);
        deadline.setHours(deadline.getHours() + t.slaHours!);
        return {
          ...t,
          hoursOverdue: Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60)),
        };
      })
      .sort((a, b) => b.hoursOverdue - a.hoursOverdue)
      .slice(0, 8);

    return {
      overdueCount: overdue.length,
      complianceRate,
      overdueTickets: overdueEnriched,
    };
  }

  private async getTicketsTrend(baseWhere: any) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const tickets = await this.prisma.ticket.findMany({
      where: { ...baseWhere, createdAt: { gte: last30Days } },
      select: { createdAt: true, status: true },
    });

    const trend: Record<string, { date: string; created: number; resolved: number }> = {};

    tickets.forEach((ticket) => {
      const date = ticket.createdAt.toISOString().split('T')[0];
      if (!trend[date]) trend[date] = { date, created: 0, resolved: 0 };
      trend[date].created++;
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        trend[date].resolved++;
      }
    });

    return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getAvgResolutionTime(baseWhere: any): Promise<number> {
    const resolved = await this.prisma.ticket.findMany({
      where: { ...baseWhere, status: TicketStatus.RESOLVED, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 100,
    });

    if (resolved.length === 0) return 0;

    const totalHours = resolved.reduce((sum, t) => {
      const diff = t.resolvedAt!.getTime() - t.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return Math.round(totalHours / resolved.length);
  }
}
