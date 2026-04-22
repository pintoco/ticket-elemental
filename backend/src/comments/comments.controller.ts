import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
    @CurrentUser() user: any,
  ) {
    return this.commentsService.create(ticketId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  findByTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.findByTicket(ticketId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.update(id, content, user);
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 5 images to a comment' })
  addAttachments(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.commentsService.addAttachments(id, files, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.commentsService.remove(id, user);
  }
}
