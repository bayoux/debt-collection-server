import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'agent_ivanov' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 's3cr3t', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh: string;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived access token (15 min)' })
  access: string;

  @ApiProperty({ description: 'Long-lived refresh token (7 days)' })
  refresh: string;
}
