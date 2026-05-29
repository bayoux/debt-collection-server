import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { SchedulerService } from './scheduler.service';
import { ScheduledTask } from './entities/scheduled-task.entity';
import { CreateScheduledTaskDto } from './dto/scheduled-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Scheduler')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('scheduled-tasks')
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  @Post()
  @ApiOperation({ summary: 'Создать задачу рассылки' })
  @ApiCreatedResponse({ type: ScheduledTask })
  create(@Body() dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список запланированных задач' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'task_status', required: false, enum: ['pending', 'sent', 'cancelled', 'failed'] })
  async findAll(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('task_status') taskStatus?: string,
  ) {
    const { data, total } = await this.service.findAll(+page, +pageSize, taskStatus);
    return { count: total, results: data };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить задачу' })
  @ApiOkResponse({ schema: { properties: { status: { type: 'string', example: 'cancelled' } } } })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const task = await this.service.cancel(id);
    return { status: task.taskStatus };
  }
}
