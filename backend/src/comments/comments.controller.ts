import { Controller, Get, Post, Patch, Delete, Body, Param, Req, ParseUUIDPipe, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';

@ApiTags('comments')
@ApiBearerAuth('access-token')
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  create(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.commentsService.create(ticketId, dto, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  findByTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.findByTicket(ticketId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.update(id, dto.content, user);
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 5 images to a comment' })
  addAttachments(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.commentsService.addAttachments(id, files, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.commentsService.remove(id, user, { ip: req.ip, userAgent: req.get('user-agent') });
  }
}
