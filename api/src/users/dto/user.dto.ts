import { User, UserStatus } from '../../entities/user.entity';

export class UserDto {
  domainId: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  status: UserStatus;
  createdAt: Date;

  static fromEntity(user: User): UserDto {
    const dto = new UserDto();
    dto.domainId = user.domainId;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.currency = user.currency;
    dto.status = user.status;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
