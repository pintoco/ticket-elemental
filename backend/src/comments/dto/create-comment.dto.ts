import { IsString, IsOptional, IsBoolean, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Se revisó la cámara en terreno, el cable de red estaba dañado.' })
  @IsString()
  @MinLength(2)
  content: string;

  @ApiPropertyOptional({ default: false, description: 'Internal note visible only to technicians' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
