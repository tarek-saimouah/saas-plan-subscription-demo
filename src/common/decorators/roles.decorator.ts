import { Reflector } from '@nestjs/core';
import { UserRoleEnum } from '../enums';

export const Roles = Reflector.createDecorator<Array<`${UserRoleEnum}`>>();
