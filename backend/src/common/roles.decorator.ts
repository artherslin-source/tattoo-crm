import { SetMetadata } from '@nestjs/common';

export type Role = 'BOSS' | 'BRANCH_MANAGER' | 'ARTIST' | 'MEMBER';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);



