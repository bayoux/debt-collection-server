import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AssignRolesDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/v1/users
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Создать пользователя' })
  @ApiCreatedResponse({ type: User })
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  // GET /api/v1/users
  @Get()
  @ApiOperation({ summary: 'Список пользователей (с пагинацией)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated list' })
  async findAll(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
  ) {
    const { data, total } = await this.usersService.findAll(+page, +pageSize);
    return { count: total, results: data };
  }

  // GET /api/v1/users/:id
  @Get(':id')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiOkResponse({ type: User })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  // PATCH /api/v1/users/:id
  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить пользователя' })
  @ApiOkResponse({ type: User })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  // DELETE /api/v1/users/:id
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пользователя' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  // PUT /api/v1/users/:id/roles
  @Put(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Назначить роли пользователю' })
  @ApiOkResponse({ type: User })
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ): Promise<User> {
    return this.usersService.assignRoles(id, dto);
  }
}
