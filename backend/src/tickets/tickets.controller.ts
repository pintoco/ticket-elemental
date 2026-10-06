import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, TicketFilterDto } from './dto/create-ticket.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';

@ApiTags('tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.ticketsService.create(dto, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets with filters and pagination' })
  findAll(@Query() filters: TicketFilterDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findAll(filters, user);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get tickets for current user' })
  getMyTickets(@CurrentUser() user: AuthUser) {
    return this.ticketsService.getMyTickets(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID with full details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.ticketsService.update(id, dto, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 5 images to a ticket' })
  addAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.ticketsService.addAttachments(id, files, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a ticket' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.ticketsService.remove(id, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }
}
