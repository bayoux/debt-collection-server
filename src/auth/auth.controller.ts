import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, TokenPairDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить JWT-токены' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'Неверный логин или пароль' })
  login(@Body() dto: LoginDto): Promise<TokenPairDto> {
    return this.authService.login(dto);
  }

  // POST /api/v1/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Обновить access-токен' })
  @ApiOkResponse({ schema: { properties: { access: { type: 'string' } } } })
  refresh(@CurrentUser() payload: any) {
    return this.authService.refresh(payload.sub);
  }

  // POST /api/v1/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Завершить сессию (инвалидация на клиенте)' })
  logout(@Body() _dto: LogoutDto) {
    // Stateless JWT — client simply discards the token.
    // For production: add a token blacklist (Redis) here.
    return;
  }

  // GET /api/v1/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  me(@CurrentUser() user: User): Promise<User> {
    return this.authService.getMe(user.id);
  }
}
