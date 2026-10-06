import { IsString, IsOptional, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Se revisó la cámara en terreno, el cable de red estaba dañado.' })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ default: false, description: 'Internal note visible only to technicians' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'Texto corregido del comentario.' })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  content: string;
}
