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
import { PtpService } from './ptp.service';
import { PtpRecord } from './entities/ptp-record.entity';
import { CreatePtpDto, UpdatePtpStatusDto } from './dto/ptp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('PTP')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ptp')
export class PtpController {
  constructor(private readonly service: PtpService) {}

  @Post()
  @ApiOperation({ summary: 'Зафиксировать обещание об оплате' })
  @ApiCreatedResponse({ type: PtpRecord })
  create(
    @Body() dto: CreatePtpDto,
    @CurrentUser() user: User,
  ): Promise<PtpRecord> {
    return this.service.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Список обещаний об оплате' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'kept', 'broken'] })
  @ApiQuery({ name: 'debt_case_id', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('status') status?: string,
    @Query('debt_case_id') debtCaseId?: string,
  ) {
    const { data, total } = await this.service.findAll(+page, +pageSize, { status, debtCaseId });
    return { count: total, results: data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Обновить статус PTP' })
  @ApiOkResponse({ type: PtpRecord })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePtpStatusDto,
  ): Promise<PtpRecord> {
    return this.service.updateStatus(id, dto);
  }
}
