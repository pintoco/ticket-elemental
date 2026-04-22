import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsDateString,
  IsNumber,
  IsIP,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketStatus, TicketType } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Cámara PTZ sin señal en sector centro' })
  @IsString()
  @MinLength(5)
  title: string;

  @ApiProperty({ example: 'La cámara PTZ ubicada en la intersección de Av. Balmaceda no transmite señal...' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ enum: TicketPriority, example: TicketPriority.HIGH })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiProperty({ enum: TicketType, example: TicketType.INCIDENT })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiProperty({ enum: TicketCategory, example: TicketCategory.CAMERAS })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiPropertyOptional({ example: 'Av. Balmaceda esq. Matta, frente al municipio' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'CAM-PT-047' })
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiPropertyOptional({ example: '192.168.10.47' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'uuid-of-technician' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-company' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ example: ['fibra', 'urgente', 'cenco'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TicketFilterDto {
  @IsOptional()
  status?: TicketStatus;

  @IsOptional()
  priority?: TicketPriority;

  @IsOptional()
  type?: TicketType;

  @IsOptional()
  category?: TicketCategory;

  @IsOptional()
  companyId?: string;

  @IsOptional()
  assignedToId?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  dateFrom?: string;

  @IsOptional()
  dateTo?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
