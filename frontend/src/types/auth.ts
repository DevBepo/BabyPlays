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

export type AuthMeResponse = {
  authenticated: boolean;
  user: AuthUser;
  cliente: ClienteResumo;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResponse = AuthMeResponse;

export type LogoutResponse = {
  message: string;
};
