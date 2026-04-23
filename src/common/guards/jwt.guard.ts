import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtServiceUtils } from '../jwt';
import { PUBLIC_KEY } from '../decorators';
import { JwtDecodedEntity } from '../entities';
import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtServiceUtils,
    @InjectPinoLogger('JwtGuard')
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    try {
      // check if public
      const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }

      if (!token) {
        throw new UnauthorizedException();
      }

      const decodedUser: JwtDecodedEntity | null =
        this.jwtService.verifyAccessToken(token);

      if (!decodedUser) {
        throw new UnauthorizedException();
      }

      request.user = decodedUser;

      return true;
    } catch (err) {
      this.logger.error(`error while verifying token ${err}`);
      throw new UnauthorizedException();
    }
  }
}
