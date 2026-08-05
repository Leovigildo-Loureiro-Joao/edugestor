import { profileService } from "../services/database/profileService"

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidInstituicaoId = (value: unknown): value is string =>
  typeof value === "string" && UUID_V4_REGEX.test(value);

export const instituicaoIdValue = () => {
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

    void profileService.getLocalProfile().then((profile) => {
        const isCurrentUser = !currentUserId || profile?.id === currentUserId;
        const instituicaoId = profile?.instituicao_id;
        if (isCurrentUser && isValidInstituicaoId(instituicaoId)) {
            localStorage.setItem("active_instituicao_id", instituicaoId);
        }
    });

    return "";
}
