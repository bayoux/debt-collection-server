import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentActivityLog } from './entities/agent-activity-log.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { DebtCase } from '../debt-cases/entities/debt-case.entity';
import { PtpRecord } from '../ptp/entities/ptp-record.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AgentActivityLog)
    private readonly activityRepo: Repository<AgentActivityLog>,
    @InjectRepository(NotificationLog)
    private readonly notifLogRepo: Repository<NotificationLog>,
    @InjectRepository(DebtCase)
    private readonly caseRepo: Repository<DebtCase>,
    @InjectRepository(PtpRecord)
    private readonly ptpRepo: Repository<PtpRecord>,
  ) {}

  // ── Campaign report ───────────────────────────────────────

  async getCampaignReport(
    dateFrom: string,
    dateTo: string,
    channel: string,
  ): Promise<any[]> {
    const qb = this.notifLogRepo
      .createQueryBuilder('log')
      .select('log."createdAt"::date', 'report_date')
      .addSelect('log."channel"', 'channel')
      .addSelect('COUNT(*)', 'total_sent')
      .addSelect("SUM(CASE WHEN log.\"status\" = 'delivered' THEN 1 ELSE 0 END)", 'total_delivered')
      .where('log."createdAt"::date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('log."createdAt"::date, log."channel"')
      .orderBy('report_date', 'ASC');

    if (channel && channel !== 'all') {
      qb.andWhere('log.channel = :channel', { channel });
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      report_date: r.report_date,
      channel: r.channel,
      total_sent: Number(r.total_sent),
      total_delivered: Number(r.total_delivered),
      total_ptp: 0,
      collected_amount: 0,
    }));
  }

  // ── Agent activity ────────────────────────────────────────

  async getAgentActivity(
    page = 1,
    pageSize = 20,
    filters: { agentId?: string; dateFrom?: string; dateTo?: string } = {},
  ): Promise<{ data: AgentActivityLog[]; total: number }> {
    const qb = this.activityRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.agent', 'agent')
      .orderBy('log.performedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.agentId)
      qb.andWhere('agent.id = :agentId', { agentId: filters.agentId });
    if (filters.dateFrom)
      qb.andWhere('log.performed_at::date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere('log.performed_at::date <= :dateTo', { dateTo: filters.dateTo });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── Dashboard summary ─────────────────────────────────────

  async getDashboardSummary(): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [
      openCases,
      overdueCases,
      amountRow,
      ptpPending,
      ptpKeptThisMonth,
      notifToday,
    ] = await Promise.all([
      this.caseRepo.count({ where: { status: 'new' as any } }),
      this.caseRepo.count({ where: { status: 'overdue' as any } }),
      this.caseRepo
        .createQueryBuilder('c')
        .select('SUM(c.amount)', 'total')
        .where("c.status NOT IN ('closed')")
        .getRawOne(),
      this.ptpRepo.count({ where: { status: 'pending' } }),
      this.ptpRepo
        .createQueryBuilder('p')
        .where("p.status = 'kept'")
        .andWhere('p."createdAt"::date >= :monthStart', { monthStart })
        .getCount(),
      this.notifLogRepo
        .createQueryBuilder('log')
        .where('log."createdAt"::date = :today', { today })
        .getCount(),
    ]);

    const totalOutstanding = Number(amountRow?.total ?? 0);
    const totalClosed = await this.caseRepo.count({ where: { status: 'closed' as any } });
    const totalAll = openCases + overdueCases + totalClosed;
    const collectionRate = totalAll > 0 ? (totalClosed / totalAll) * 100 : 0;

    return {
      total_open_cases: openCases,
      total_overdue_cases: overdueCases,
      total_amount_outstanding: totalOutstanding,
      ptp_pending: ptpPending,
      ptp_kept_this_month: ptpKeptThisMonth,
      notifications_sent_today: notifToday,
      collection_rate_percent: Math.round(collectionRate * 10) / 10,
    };
  }

  async logActivity(
    agentId: string,
    debtCaseId: string,
    actionType: string,
    note?: string,
  ): Promise<AgentActivityLog> {
    return this.activityRepo.save(
      this.activityRepo.create({
        agent: { id: agentId } as any,
        debtCaseId,
        actionType,
        note,
      }),
    );
  }
}
