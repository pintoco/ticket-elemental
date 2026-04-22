import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, TicketFilterDto } from './dto/create-ticket.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    return this.ticketsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets with filters and pagination' })
  findAll(@Query() filters: TicketFilterDto, @CurrentUser() user: any) {
    return this.ticketsService.findAll(filters, user);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get tickets for current user' })
  getMyTickets(@CurrentUser() user: any) {
    return this.ticketsService.getMyTickets(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID with full details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a ticket' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ticketsService.remove(id, user);
  }
}
