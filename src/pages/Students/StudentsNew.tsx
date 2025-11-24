
import { StudentForm } from "../../components/students/StudentForm";
import { useNavigate } from 'react-router-dom';
import { studentsService } from "../../services/database/students.ts";

export const StudentNew = ()=>{
        const navigate=useNavigate();
    return <>
        <div>
          <StudentForm 
            onSubmit={(data) => studentsService.createStudent(data).then(() => navigate('/alunos')) }
            onCancel={() => navigate('/alunos')}
            />
        </div>
    </>
}