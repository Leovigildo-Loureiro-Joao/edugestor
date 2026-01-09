
import { profileService } from "../services/database/profileService"

export const instituicaoIdValue = () => {
    if(localStorage.getItem("active_instituicao_id")){
        return localStorage.getItem("active_instituicao_id")
    }
    setTimeout(()=>{
        profileService.getLocalProfile();
    },5000)
     if(localStorage.getItem("active_instituicao_id"))
        return localStorage.getItem("active_instituicao_id")
    
}