import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignpackService } from './signpack.service';
import { CreateSignpackDto } from './dto/create-signpack.dto';
import { ParseBoolPipe } from '../common/pipes/parse-bool.pipe';
import { SignUploadDto } from './dto/sign-upload.dto';

@ApiTags('signpacks')
@Controller('signpacks')
export class SignpackController {
  constructor(private readonly svc: SignpackService) {}

  @Post()
  @ApiOperation({ summary: 'Create signpack from uploaded file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.FILE_MAX_BYTES ?? 25 * 1024 * 1024) },
    }),
  )
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, expiresInMinutes: { type: 'number' } } } })
  async create(@UploadedFile() file: Express.Multer.File, @Query() q: CreateSignpackDto) {
    const sp = await this.svc.createFromBuffer(
      { buffer: file?.buffer, originalname: file?.originalname, mimetype: file?.mimetype, size: file?.size },
      q?.expiresInMinutes,
    );
    return {
      id: sp.id,
      token: sp.accessToken,
      status: sp.status,
      expiresAt: sp.expiresAt ?? null,
      links: {
        meta: `/api/signpacks/${sp.id}/meta?token=${sp.accessToken}`,
        original: `/api/signpacks/${sp.id}/original?token=${sp.accessToken}`,
        signed: `/api/signpacks/${sp.id}/signed?token=${sp.accessToken}`,
        sign: `/api/signpacks/${sp.id}/sign?token=${sp.accessToken}`,
        bundle: `/api/signpacks/${sp.id}/bundle.zip?token=${sp.accessToken}`,
        destroy: `/api/signpacks/${sp.id}?token=${sp.accessToken}`,
      },
    };
  }

  @Get(':id/meta')
  async meta(@Param('id') id: string, @Query('token') token: string) {
    const sp = await this.svc.findById(id);
    // token required even for meta to avoid leak of existence
    (this.svc as any)['assertToken']?.(sp, token);
    return {
      id: sp.id,
      status: sp.status,
      expiresAt: sp.expiresAt ?? null,
      createdAt: sp.createdAt,
      updatedAt: sp.updatedAt,
      hasSigned: !!sp.signedPath,
      destroyedAt: sp.destroyedAt ?? null,
    };
  }

  @Get(':id/original')
  @HttpCode(HttpStatus.OK)
  async original(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    const sp = await this.svc.findById(id);
    (this.svc as any)['assertToken']?.(sp, token);
    const stream = this.svc.streamFile(sp.originalPath);
    res.setHeader('Content-Type', sp.originalMime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sp.originalName || 'original.bin'}"`);
    stream.pipe(res);
  }

  @Get(':id/signed')
  @HttpCode(HttpStatus.OK)
  async signed(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    const sp = await this.svc.findById(id);
    (this.svc as any)['assertToken']?.(sp, token);
    if (!sp.signedPath) throw new BadRequestException('Signed file not available');
    const stream = this.svc.streamFile(sp.signedPath);
    res.setHeader('Content-Type', sp.signedMime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sp.signedName || 'signed.bin'}"`);
    stream.pipe(res);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Upload signed file (multipart) or provide remoteUrl JSON' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.FILE_MAX_BYTES ?? 25 * 1024 * 1024) },
    }),
  )
  async sign(
    @Param('id') id: string,
    @Query('token') token: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SignUploadDto,
  ) {
    if (file?.buffer?.length) {
      const sp = await this.svc.uploadSignedFromBuffer(id, token, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return { id: sp.id, status: sp.status };
    }
    if (body?.remoteUrl) {
      const sp = await this.svc.uploadSignedFromRemote(id, token, body.remoteUrl);
      return { id: sp.id, status: sp.status };
    }
    throw new BadRequestException('Provide multipart file or { remoteUrl }');
  }

  @Get(':id/bundle.zip')
  async bundle(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('destroy', ParseBoolPipe) destroy: boolean,
    @Res() res: Response,
  ) {
    const sp = await this.svc.findById(id);
    (this.svc as any)['assertToken']?.(sp, token);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="bundle-${sp.id}.zip"`);
    const zip = this.svc.streamBundleZip(sp);
    zip.pipe(res);
    res.on('finish', async () => {
      if (destroy) {
        try { await this.svc.destroy(id, token); } catch {}
      }
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('token') token: string) {
    await this.svc.destroy(id, token);
  }
}

