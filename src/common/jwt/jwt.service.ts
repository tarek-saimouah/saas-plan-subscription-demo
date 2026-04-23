import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtDecodedEntity } from '../entities';

@Injectable()
export class JwtServiceUtils {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(payload: {
    userId: string;
    tenantId?: string;
    email?: string;
    role?: string;
    isExpires?: boolean;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, role, email, tenantId, isExpires = true } = payload;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          ...(role && { role }),
          ...(tenantId && { tenantId }),
          ...(email && { email }),
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          ...(isExpires && {
            expiresIn: this.configService.get<string>(
              'JWT_ACCESS_EXPIRE',
            ) as any,
          }),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_REFRESH_EXPIRE',
          ) as any,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateAccessToken(payload: {
    userId: string;
    tenantId?: string;
    email?: string;
    role?: string;
    isExpires?: boolean;
  }): Promise<string> {
    const { userId, role, email, tenantId, isExpires = true } = payload;

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        ...(role && { role }),
        ...(tenantId && { tenantId }),
        ...(email && { email }),
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        ...(isExpires && {
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRE') as any,
        }),
      },
    );

    return accessToken;
  }

  async generateVerificationToken(payload: {
    userId: string;
    type: 'registration' | 'forget_password';
  }): Promise<string> {
    const { userId, type } = payload;

    const verificationToken = await this.jwtService.signAsync(
      {
        sub: userId,
        type,
      },
      {
        secret: this.configService.get<string>('JWT_VERIFICATION_TOKEN_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_VERIFICATION_TOKEN_EXPIRE',
        ) as any,
      },
    );

    return verificationToken;
  }

  verifyAccessToken(token: string): JwtDecodedEntity | null {
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });

    if (!decoded) return null;

    return {
      userId: decoded.sub,
      role: decoded.role,
      tenantId: decoded?.tenantId,
      email: decoded?.email,
    };
  }

  verifyVerificationToken(token: string):
    | (JwtDecodedEntity & {
        type: 'registration' | 'forget_password';
      })
    | null {
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_VERIFICATION_TOKEN_SECRET'),
    });

    if (!decoded) return null;

    return {
      userId: decoded.sub,
      role: decoded.role,
      type: decoded.type,
      email: decoded.email,
      tenantId: decoded.tenantId,
    };
  }

  decodeAccessToken(token: string): JwtDecodedEntity | null {
    const decoded = this.jwtService.decode(token);

    if (!decoded) return null;

    return {
      userId: decoded.sub,
      role: decoded.role,
      email: decoded?.email,
      tenantId: decoded?.tenantId,
    };
  }

  decodeVerificationToken(token: string):
    | (JwtDecodedEntity & {
        type: 'registration' | 'forget_password';
      })
    | null {
    const decoded = this.jwtService.decode(token);

    if (!decoded) return null;

    return {
      userId: decoded.sub,
      role: decoded.role,
      type: decoded.type,
      email: decoded.email,
      tenantId: decoded.tenantId,
    };
  }
}
