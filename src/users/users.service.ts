import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateAdminUserDto,
  CreateUserDto,
  GetUserDto,
  UserResponseDto,
} from './dto';
import { UserMapper } from './mappers';
import {
  getPaginationArgs,
  getPaginationMeta,
  hashPassword,
  IPaginatedResult,
  PaginationParams,
  PagingDataResponse,
} from '../common';
import { UserEntity } from './entities';
import { PrismaService } from 'src/database';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userMapper: UserMapper,
  ) {}

  async create(payload: CreateUserDto): Promise<UserResponseDto> {
    const created = await this.prisma.user.create({
      data: payload,
      include: { tenant: true },
    });

    if (!created) {
      throw new Error('Error creating user');
    }

    return this.userMapper.entityToResponseDto(
      this.userMapper.modelToEntity(created),
    );
  }

  async createAdmin(payload: CreateAdminUserDto): Promise<UserResponseDto> {
    const exists = await this.exists(payload.email);

    if (exists) {
      throw new ConflictException('User email exists');
    }

    // hash password
    const hash = await hashPassword(payload.password);

    const created = await this.prisma.user.create({
      data: {
        ...payload,
        password: hash,
        isActive: true,
        isVerified: true,
      },
    });

    if (!created) {
      throw new Error('Error creating user');
    }

    return created;
  }

  async exists(email: string): Promise<boolean> {
    const exists = await this.prisma.user.findUnique({
      where: { email },
      select: { userId: true },
    });

    return !!exists;
  }

  async update(
    userId: string,
    payload: { isVerified?: boolean; verificationCode?: string | null },
  ): Promise<boolean> {
    const updated = await this.prisma.user.update({
      where: { userId },
      data: {
        verificationCode: payload.verificationCode,
        ...(payload.isVerified !== undefined &&
          payload.isVerified !== null && {
            isVerified: payload.isVerified,
          }),
      },
    });

    return !!updated;
  }

  async findOne(filter: GetUserDto): Promise<UserResponseDto> {
    const result = await this.prisma.user.findFirst({
      where: filter,
      include: { tenant: true },
    });

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return this.userMapper.entityToResponseDto(
      this.userMapper.modelToEntity(result),
    );
  }

  async findOneWithSelect(
    filter: GetUserDto & { userId?: string },
    select: {
      password: boolean;
      verificationCode: boolean;
    },
  ): Promise<UserEntity & { updatedPhoneNumber?: string }> {
    const result = await this.prisma.user.findFirst({
      where: filter,
      select: {
        ...select,
        userId: true,
        isVerified: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return result as any;
  }

  async findAllPaging(
    filter?: GetUserDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<UserResponseDto>> {
    const query: Prisma.UserWhereInput = {
      ...filter,
      ...(filter?.fullName && {
        fullName: { contains: filter.fullName, mode: 'insensitive' },
      }),
      ...(filter?.email && {
        email: { contains: filter.email, mode: 'insensitive' },
      }),
    };

    const orderBy: Prisma.UserOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const include: Prisma.UserInclude = {
      tenant: true,
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: query,
        include,
        orderBy,
        skip,
        take,
      }),
      this.prisma.user.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    const data = results.map((res) =>
      this.userMapper.entityToResponseDto(this.userMapper.modelToEntity(res)),
    );

    return new PagingDataResponse(data, meta);
  }

  async getById(userId: string): Promise<UserResponseDto> {
    const result = await this.prisma.user.findUnique({
      where: { userId },
      include: { tenant: true },
    });

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return this.userMapper.entityToResponseDto(
      this.userMapper.modelToEntity(result),
    );
  }
}
