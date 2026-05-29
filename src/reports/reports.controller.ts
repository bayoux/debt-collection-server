import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('campaign')
  @ApiOperation({ summary: 'Отчёт по кампаниям рассылки' })
  @ApiQuery({ name: 'date_from', required: true, example: '2025-05-01' })
  @ApiQuery({ name: 'date_to', required: true, example: '2025-05-31' })
  @ApiQuery({ name: 'channel', required: false, enum: ['whatsapp', 'sms', 'telegram', 'email', 'all'] })
  getCampaignReport(
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Query('channel') channel = 'all',
  ) {
    return this.service.getCampaignReport(dateFrom, dateTo, channel);
  }

  @Get('agent-activity')
  @ApiOperation({ summary: 'Лог активности агентов' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'agent_id', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getAgentActivity(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('agent_id') agentId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const { data, total } = await this.service.getAgentActivity(+page, +pageSize, {
      agentId,
      dateFrom,
      dateTo,
    });
    return { count: total, results: data };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Сводная статистика (dashboard)' })
  getDashboardSummary() {
    return this.service.getDashboardSummary();
  }
}
