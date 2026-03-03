import { BaseEntity } from "./base";

export interface UserProfile extends BaseEntity {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'teacher' | 'user';
  instituicao_id?: string;
  is_local?: boolean;
  supabase_id?: string;
  full_name?: string;
  nome?: string;
  updated_at: string;
  created_at: string;
}
