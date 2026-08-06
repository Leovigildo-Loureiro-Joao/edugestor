import { profileService } from "../services/database/profileService"
import db from "../services/database/db"

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidInstituicaoId = (value: unknown): value is string =>
  typeof value === "string" && UUID_V4_REGEX.test(value);

const getActiveFromStorage = (): string => {
  const currentUserId = localStorage.getItem("user_id");
  const active = localStorage.getItem("active_instituicao_id");
  let profileInstituicaoId = "";

  const profileRaw = localStorage.getItem("user_profile");
  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      const isCurrentUser = !currentUserId || profile?.id === currentUserId;
      if (isCurrentUser && isValidInstituicaoId(profile?.instituicao_id)) {
        profileInstituicaoId = profile.instituicao_id;
      }
    } catch {
    }
  }

  if (profileInstituicaoId) {
    if (active !== profileInstituicaoId) {
      localStorage.setItem("active_instituicao_id", profileInstituicaoId);
    }
    return profileInstituicaoId;
  }

  if (isValidInstituicaoId(active)) return active;

  return "";
};

export const instituicaoIdValue = (): string => {
  const fromStorage = getActiveFromStorage();
  if (fromStorage) return fromStorage;

  try {
    const sessionRaw = localStorage.getItem("supabase.auth.session");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      const instituicaoId = session?.user?.user_metadata?.instituicao_id;
      if (isValidInstituicaoId(instituicaoId)) {
        localStorage.setItem("active_instituicao_id", instituicaoId);
        return instituicaoId;
      }
    }
  } catch {
  }

  return "";
};

export const resolveInstituicaoId = async (): Promise<string> => {
  const cached = instituicaoIdValue();
  if (cached) return cached;

  try {
    const currentUserId = localStorage.getItem("user_id");
    const profile = await profileService.getLocalProfile();
    const isCurrentUser = !currentUserId || profile?.id === currentUserId;
    const instituicaoId = isCurrentUser ? profile?.instituicao_id : undefined;

    if (isValidInstituicaoId(instituicaoId)) {
      localStorage.setItem("active_instituicao_id", instituicaoId);
      return instituicaoId;
    }

    const fromDb = await db.profiles?.get(currentUserId || "");
    if (fromDb && isValidInstituicaoId(fromDb.instituicao_id)) {
      localStorage.setItem("active_instituicao_id", fromDb.instituicao_id);
      return fromDb.instituicao_id;
    }
  } catch {
  }

  return "";
};
