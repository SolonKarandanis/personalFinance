import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../strategies/jwt.strategy';

// Must run after JwtAuthGuard, which populates req.user from the access
// token. Confirms the token's owner matches the :domainId in the URL, so an
// authenticated user can only act on their own account.
@Injectable()
export class OwnDomainIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload; params: { domainId: string } }>();

    if (req.user.domainId !== req.params.domainId) {
      throw new ForbiddenException('You may only act on your own account');
    }
    return true;
  }
}