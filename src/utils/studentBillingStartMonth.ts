import type { Student } from '../types/aluno';
import { instituicaoIdValue } from './getInstituicaoID';

const STORAGE_KEY = 'student_billing_start_month_map';

type BillingStartStudentLike = Pick<Partial<Student>, 'numero_estudante' | 'ano_lectivo' | 'instituicao_id'>;

const canUseStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const buildScopeKey = (instituicaoId?: string) =>
  `${STORAGE_KEY}_${instituicaoId || instituicaoIdValue() || 'global'}`;

const buildEntryKey = (student?: BillingStartStudentLike | null) => {
  const numero = Number(student?.numero_estudante);
  const anoLectivo = String(student?.ano_lectivo || '').trim();

  if (!Number.isFinite(numero) || !anoLectivo) return '';

  return `${numero}::${anoLectivo}`;
};

const readScopedMap = (scopeKey: string): Record<string, string> => {
  if (!canUseStorage()) return {};

  try {
    const raw = localStorage.getItem(scopeKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeScopedMap = (scopeKey: string, data: Record<string, string>) => {
  if (!canUseStorage()) return;

  localStorage.setItem(scopeKey, JSON.stringify(data));
};

export const getStudentBillingStartMonth = (student?: BillingStartStudentLike | null): string => {
  const entryKey = buildEntryKey(student);
  if (!entryKey) return '';

  const scopedKey = buildScopeKey(student?.instituicao_id);
  const scopedMap = readScopedMap(scopedKey);
  return String(scopedMap[entryKey] || '').trim();
};

export const setStudentBillingStartMonth = (
  student: BillingStartStudentLike | null | undefined,
  month: string
): boolean => {
  const entryKey = buildEntryKey(student);
  const normalizedMonth = String(month || '').trim();

  if (!entryKey || !normalizedMonth) return false;

  const scopedKey = buildScopeKey(student?.instituicao_id);
  const scopedMap = readScopedMap(scopedKey);
  scopedMap[entryKey] = normalizedMonth;
  writeScopedMap(scopedKey, scopedMap);
  return true;
};

export const clearStudentBillingStartMonth = (student?: BillingStartStudentLike | null): boolean => {
  const entryKey = buildEntryKey(student);
  if (!entryKey) return false;

  const scopedKey = buildScopeKey(student?.instituicao_id);
  const scopedMap = readScopedMap(scopedKey);

  if (!(entryKey in scopedMap)) return false;

  delete scopedMap[entryKey];
  writeScopedMap(scopedKey, scopedMap);
  return true;
};
