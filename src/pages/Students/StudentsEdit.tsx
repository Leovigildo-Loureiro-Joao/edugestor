
import { useState } from "react";
import { StudentForm } from "../../components/students/StudentForm";
import { alunosService } from "../../services/database/alunosService.ts";
import { Student } from "../../types";
import { useNavigate, useParams } from 'react-router-dom'
import { PageLoader } from "../../components/ui/PageLoader";

export const StudentEdit = ()=>{

    const { id } = useParams();
    const navigate=useNavigate();
    const [loading, setLoading]=useState(true);
    const [alunoExistente, setAlunoExistente]=useState<Student|null>(null);
    alunosService.getStudentById(id||"").then((student)=> {
        loading&&setLoading(false);
        setAlunoExistente(student);
    })
    if(!loading&& !alunoExistente){
        return <div className="p-4 text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Aluno não encontrado</div>
    }else if(loading&& !alunoExistente){
        return <PageLoader title="Abrindo edição do aluno" subtitle="Carregando dados do aluno..." />;
  
    }else if(alunoExistente)
    return <>
        <div>
          <StudentForm 
            student={alunoExistente}
            onSubmit={(data) => alunosService.updateStudent(alunoExistente.id, data).then(() => navigate('/alunos')) }
            onCancel={() => navigate('/alunos')}
            />
        </div>
    </>
  
    
}
