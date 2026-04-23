import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  compareHash,
  generateRandomNumericCode,
  hashPassword,
  JwtServiceUtils,
  UserRoleEnum,
} from 'src/common';
import {
  VerifyVerificationTokenRequestDto,
  SignupResponseDto,
  SigninRequestDto,
  SigninResponseDto,
  SignupRequestDto,
} from './dto';
import { UsersService } from '../users';
import { TenantsService } from '../tenants';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtServiceUtils,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  // user

  async signupUser(payload: SignupRequestDto): Promise<SignupResponseDto> {
    const { email, password, tenant, ...rest } = payload;

    // check if user email exists
    const userExists = await this.usersService.exists(email);

    if (userExists) {
      throw new ConflictException('User email exists');
    }

    // check if tenant name exists
    const tenantExists = await this.tenantsService.exists(tenant.name);

    if (tenantExists) {
      throw new ConflictException('Tenant name exists');
    }

    // hash password
    const hashedPassword = await hashPassword(password);

    // generate code
    const code = generateRandomNumericCode(6);

    const userCreated = await this.usersService.create({
      ...rest,
      email,
      password: hashedPassword,
      verificationCode: code,
      role: UserRoleEnum.USER,
    });

    if (!userCreated) {
      throw new Error('Error creating user');
    }

    // create tenant
    const tenantCreated = await this.tenantsService.create(
      userCreated.userId,
      tenant,
    );

    // generate verification token
    const verificationToken = await this.jwtService.generateVerificationToken({
      userId: userCreated.userId,
      type: 'registration',
    });

    // TODO: send code otp
    // log otp for debugging
    this.logger.info({ otpCode: code });

    return {
      verificationToken,
    };
  }

  async signinUser(payload: SigninRequestDto): Promise<SigninResponseDto> {
    const user = await this.usersService.findOneWithSelect(
      {
        email: payload.email,
      },
      {
        password: true,
        verificationCode: false,
      },
    );

    if (!user) {
      throw new NotFoundException('Wrong Credentials');
    }

    // check password

    const passwordMatch = await compareHash(user.password, payload.password);

    if (!passwordMatch) {
      throw new NotFoundException('Wrong Credentials');
    }

    // check if user not verified => generate verification token

    if (!user.isVerified) {
      // generate code
      const code = generateRandomNumericCode(6);

      const verificationToken = await this.jwtService.generateVerificationToken(
        { userId: user.userId, type: 'registration' },
      );

      await this.usersService.update(user.userId, { verificationCode: code });

      // TODO: send code otp
      // log otp for debugging
      this.logger.info({ otpCode: code });

      return {
        verificationToken,
      };
    }

    const [accessToken, userProfile] = await Promise.all([
      this.jwtService.generateAccessToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenant?.tenantId,
      }),
      this.usersService.getById(user.userId),
    ]);

    return {
      accessToken,
      user: userProfile,
    };
  }

  async verifyVerificationToken(
    payload: VerifyVerificationTokenRequestDto,
  ): Promise<SigninResponseDto> {
    const decoded = this.jwtService.verifyVerificationToken(
      payload.verificationToken,
    );

    if (!decoded) {
      throw new BadRequestException('Invalid verification token or code');
    }

    const user = await this.usersService.findOneWithSelect(
      {
        userId: decoded.userId,
      },
      {
        password: false,
        verificationCode: true,
      },
    );

    if (user.verificationCode !== payload.code) {
      throw new BadRequestException('Invalid verification token or code');
    }

    const userProfile = await this.usersService.getById(user.userId);

    // get user and remove verification code

    const accessToken = await this.jwtService.generateAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: userProfile.tenant?.tenantId,
    });

    const updatedUser = await this.usersService.update(decoded.userId, {
      isVerified: true,
      verificationCode: null,
    });

    if (!updatedUser) {
      throw new Error('Error updating user');
    }

    // start the free trial
    void this.subscriptionsService.startTrialForNewUser(
      userProfile.userId,
      userProfile.tenant?.tenantId!,
    );

    return {
      accessToken,
      user: userProfile,
    };
  }
}
