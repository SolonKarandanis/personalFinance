import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './strategies/jwt.strategy';

const getCurrentUserByContext = (context: ExecutionContext): JwtPayload =>
  context.switchToHttp().getRequest().user;

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getCurrentUserByContext(context),
);
