import { profileService } from "../services/database/profileService"

const DEFAULT_INSTITUICAO_ID = "local_default_instituicao";

export const instituicaoIdValue = () => {
    const currentUserId = localStorage.getItem("user_id");
    const active = localStorage.getItem("active_instituicao_id");
    let profileInstituicaoId = "";

    const profileRaw = localStorage.getItem("user_profile");
    if (profileRaw) {
        try {
            const profile = JSON.parse(profileRaw);
            const isCurrentUser = !currentUserId || profile?.id === currentUserId;
            if (isCurrentUser && profile?.instituicao_id) {
                profileInstituicaoId = profile.instituicao_id;
            }
        } catch {
            // ignora erro de parse e segue fallback
        }
    }

    if (profileInstituicaoId) {
        if (active !== profileInstituicaoId) {
            localStorage.setItem("active_instituicao_id", profileInstituicaoId);
        }
        return profileInstituicaoId;
    }

    if (active && active !== DEFAULT_INSTITUICAO_ID) return active;

    void profileService.getLocalProfile().then((profile) => {
        const isCurrentUser = !currentUserId || profile?.id === currentUserId;
        if (isCurrentUser && profile?.instituicao_id) {
            localStorage.setItem("active_instituicao_id", profile.instituicao_id);
        }
    });

    return active || DEFAULT_INSTITUICAO_ID;
}
