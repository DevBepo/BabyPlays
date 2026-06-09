export type AuthUser = {
  id: number;
  email: string;
};

export type ClienteResumo = {
  id: number;
  nome: string;
  telefone: string;
  ativo: boolean;
};

export type AuthenticatedAuthResponse = {
  authenticated: true;
  user: AuthUser;
  cliente: ClienteResumo | null;
};

export type AnonymousAuthResponse = {
  authenticated: false;
  user: null;
  cliente: null;
};

export type AuthMeResponse = AuthenticatedAuthResponse | AnonymousAuthResponse;

export type AdminMeResponse = {
  id: number;
  email: string;
  nome: string | null;
  is_staff: boolean;
  is_superuser: boolean;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResponse = AuthenticatedAuthResponse;

export type UpdateMePayload = {
  nome?: string;
  telefone?: string;
  email?: string;
};

export type LogoutResponse = {
  message: string;
};
