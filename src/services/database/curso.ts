import { CourseFormData } from "../../types/curso";
import { supabase } from "../supabase/config";

export const cursosService={
    async create(course:CourseFormData) {
      const { data, error } = await supabase.from("cursos")
        .insert(course)
         .select();

        if (error) throw error;
        return data;
    },
    async getCourse() {
      const { data, error } = await supabase.from("cursos")
        .select("*,alunos(curso),turmas(nome_turma)")
        if (error) throw error;
        return data;
    },
    async getCourseId(id:string) {
      const { data, error } = await supabase.from("cursos")
        .select("*,alunos(curso),turmas(nome_turma)")
        .eq("id=",id);
        if (error) throw error;
        return data[0];
    }
}