import { Disciplina } from "../../types";
import { supabase } from "../supabase/config";

const disciplina ={
    async create(disciplina:Disciplina){
        supabase.from("disciplina")
        .insert(
            disciplina
        );
    }
}