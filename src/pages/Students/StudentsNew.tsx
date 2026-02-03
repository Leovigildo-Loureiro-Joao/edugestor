import { StudentForm } from "../../components/students/StudentForm";
import { useNavigate } from 'react-router-dom';
import { alunosService } from "../../services/database/alunosService.ts";
import { useState } from 'react';
import { ModalMatricula } from '../../components/finance/ModalMatricula.tsx';
import { useAlert } from "../../components/ui/AlertBadge.tsx";

export const StudentNew = () => {
    const navigate = useNavigate();
    const [novoAlunoId, setNovoAlunoId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { showAlert } = useAlert(); 

    const handleSubmit = async (formData: any) => {
        try {
            setLoading(true);
            // Cria o aluno primeiro
            const alunoCriado = await alunosService.saveStudent(formData);
            
            if (alunoCriado) {
                setNovoAlunoId(alunoCriado);
                // Mostra o modal de matrícula após criar o aluno
                navigate("/financeiro/matricula/"+alunoCriado)
            } else {
                throw new Error('Não foi possível obter o ID do aluno criado');
            }
        } catch (error) {
            console.error('Erro ao criar aluno:', error);
             showAlert({
            type: 'error',
            title: 'Erro ao criar aluno',
            message: 'Verifique os dados e tente novamente',
            duration: 5000
            });
            
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div>
                <StudentForm 
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('/alunos')}
                    loading={loading}
                />
            </div>

            
        </>
    );
};


