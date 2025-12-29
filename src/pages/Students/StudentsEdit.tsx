
import { useState } from "react";
import { StudentForm } from "../../components/students/StudentForm";
import { alunosService } from "../../services/database/alunosService.ts";
import { Student } from "../../types";
import { useNavigate, useParams } from 'react-router-dom'

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
        return <div>Aluno não encontrado</div>
    }else if(loading&& !alunoExistente){
      
        return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        );
  
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