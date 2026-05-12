import type { Student } from "../types/aluno";
import { getStudentBillingStartMonth } from "./studentBillingStartMonth";

const MONTH_MAP: Record<string, string> = {
  janeiro: 'Jan',
  fevereiro: 'Fev',
  marco: 'Mar',
  março: 'Mar',
  abril: 'Abr',
  maio: 'Mai',
  junho: 'Jun',
  julho: 'Jul',
  agosto: 'Ago',
  setembro: 'Set',
  outubro: 'Out',
  novembro: 'Nov',
  dezembro: 'Dez',
  jan: 'Jan',
  fev: 'Fev',
  mar: 'Mar',
  abr: 'Abr',
  mai: 'Mai',
  jun: 'Jun',
  jul: 'Jul',
  ago: 'Ago',
  set: 'Set',
  out: 'Out',
  nov: 'Nov',
  dez: 'Dez'
};

const MONTH_INDEX_BY_ABBR: Record<string, number> = {
  Jan: 0,
  Fev: 1,
  Mar: 2,
  Abr: 3,
  Mai: 4,
  Jun: 5,
  Jul: 6,
  Ago: 7,
  Set: 8,
  Out: 9,
  Nov: 10,
  Dez: 11
};

type StudentLike = Pick<
  Student,
  "ano_lectivo" | "tipo_matricula" | "estado" | "numero_estudante" | "instituicao_id"
>;

const normalizeToken = (value?: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const toMonthAbbr = (value?: string) => {
  const token = normalizeToken(String(value || "").split(" ")[0]);
  return MONTH_MAP[token] || String(value || "").slice(0, 3);
};

export const parseAcademicYear = (anoLectivo?: string) => {
  const match = String(anoLectivo || "").match(/(\d{4})\D+(\d{4})/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    return null;
  }

  return { startYear, endYear };
};

export const normalizeAcademicYear = (value?: string) => {
  const parsed = parseAcademicYear(value);
  if (parsed) return `${parsed.startYear}-${parsed.endYear}`;

  const year = Number(String(value || "").trim());
  if (Number.isFinite(year) && year > 0) {
    return `${year}-${year + 1}`;
  }

  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};

export const resolveAcademicActivationDate = (
  aluno: Pick<StudentLike, "ano_lectivo" | "numero_estudante" | "instituicao_id">,
  fallbackMonth = "Set"
) => {
  const parsedYear = parseAcademicYear(aluno.ano_lectivo);
  if (!parsedYear) return null;

  const configuredStartMonth = toMonthAbbr(getStudentBillingStartMonth(aluno));
  const startMonth = configuredStartMonth || toMonthAbbr(fallbackMonth) || "Set";
  const monthIndex = MONTH_INDEX_BY_ABBR[startMonth];

  if (monthIndex == null) return null;

  const targetYear = monthIndex >= 8 ? parsedYear.startYear : parsedYear.endYear;
  return new Date(targetYear, monthIndex, 1);
};

export const isFutureAcademicActivation = (
  aluno: Pick<StudentLike, "ano_lectivo" | "numero_estudante" | "instituicao_id">,
  refDate = new Date()
) => {
  const activationDate = resolveAcademicActivationDate(aluno);
  if (!activationDate) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  activationDate.setHours(0, 0, 0, 0);

  return activationDate.getTime() > today.getTime();
};

export const resolveStudentAcademicStatus = (
  aluno: StudentLike,
  refDate = new Date()
): Student["estado"] => {
  if (aluno.estado === "transferido" || aluno.estado === "desistente") {
    return aluno.estado;
  }

  if (aluno.tipo_matricula !== "regular") {
    return aluno.estado;
  }

  if (isFutureAcademicActivation(aluno, refDate)) {
    return "inativo";
  }

  return aluno.estado === "pendente" || aluno.estado === "inativo"
    ? "ativo"
    : aluno.estado;
};
