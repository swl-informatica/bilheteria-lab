export type Role = 'BUYER' | 'ADMIN';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  cpf: string;
  birth_date: string;
  role: Role;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  role: Role;
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cpf: row.cpf,
    birthDate: row.birth_date,
    role: row.role,
  };
}

export const USER_COLUMNS = 'u.id, u.name, u.email, u.cpf, u.birth_date, u.role';
