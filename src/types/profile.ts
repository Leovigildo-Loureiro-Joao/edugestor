export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'teacher' | 'user';
  instituicao_id?: string;
  full_name?: string;
  created_at: string;
}