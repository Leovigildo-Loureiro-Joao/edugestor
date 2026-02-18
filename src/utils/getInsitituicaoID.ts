import { profileService } from "../services/database/profileService"

export const instituicaoIdValue = () => {
    const active = localStorage.getItem("active_instituicao_id");
    if (active) return active;

    const profileRaw = localStorage.getItem("user_profile");
    if (profileRaw) {
        try {
            const profile = JSON.parse(profileRaw);
            if (profile?.instituicao_id) {
                localStorage.setItem("active_instituicao_id", profile.instituicao_id);
                return profile.instituicao_id;
            }
        } catch {
            // ignora erro de parse e segue fallback
        }
    }

    void profileService.getLocalProfile().then((profile) => {
        if (profile?.instituicao_id) {
            localStorage.setItem("active_instituicao_id", profile.instituicao_id);
        }
    });

    return "";
}
