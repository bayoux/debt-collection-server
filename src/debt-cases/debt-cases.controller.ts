import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DebtCasesService } from './debt-cases.service';
import { DebtCase } from './entities/debt-case.entity';
import { DpdSnapshot } from './entities/dpd-snapshot.entity';
import { CreateDebtCaseDto, UpdateDebtCaseDto } from './dto/debt-case.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('DebtCases')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('debt-cases')
export class DebtCasesController {
  constructor(private readonly service: DebtCasesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать дело' })
  @ApiCreatedResponse({ type: DebtCase })
  create(@Body() dto: CreateDebtCaseDto): Promise<DebtCase> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список дел о задолженности' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'in_progress', 'promised', 'closed', 'overdue'] })
  @ApiQuery({ name: 'dpd_min', required: false, type: Number })
  @ApiQuery({ name: 'dpd_max', required: false, type: Number })
  @ApiQuery({ name: 'assigned_agent_id', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('status') status?: string,
    @Query('dpd_min') dpdMin?: string,
    @Query('dpd_max') dpdMax?: string,
    @Query('assigned_agent_id') assignedAgentId?: string,
  ) {
    const { data, total } = await this.service.findAll(+page, +pageSize, {
      status,
      dpdMin: dpdMin !== undefined ? +dpdMin : undefined,
      dpdMax: dpdMax !== undefined ? +dpdMax : undefined,
      assignedAgentId,
    });
    return { count: total, results: data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить дело' })
  @ApiOkResponse({ type: DebtCase })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DebtCase> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить дело (статус, агент)' })
  @ApiOkResponse({ type: DebtCase })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtCaseDto,
  ): Promise<DebtCase> {
    return this.service.update(id, dto);
  }

  @Get(':id/dpd-history')
  @ApiOperation({ summary: 'История DPD по делу' })
  @ApiOkResponse({ type: [DpdSnapshot] })
  getDpdHistory(@Param('id', ParseUUIDPipe) id: string): Promise<DpdSnapshot[]> {
    return this.service.getDpdHistory(id);
  }
}
