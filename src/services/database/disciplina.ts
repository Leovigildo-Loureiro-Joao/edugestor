import { Disciplina } from "../../types";
import { supabase } from "../database/db";

const disciplina ={
    async create(disciplina:Disciplina){
        supabase.from("disciplina")
        .insert(
            disciplina
        );
    }
}