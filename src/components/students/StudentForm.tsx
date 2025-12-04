import { FaMoneyBill, FaPeopleCarry } from "react-icons/fa";
import { FaPeopleLine } from "react-icons/fa6";
import { FiActivity, FiCalendar, FiHome, FiMail, FiPhone, FiUsers, FiFileText, FiSave, FiUser, FiBook } from "react-icons/fi";
import { RxPerson } from "react-icons/rx";
import { Student, StudentFormData, StudentFormProps } from "../../types";
import { useState, useEffect } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { turmaService } from "../../services/database/turmas.ts";
import { cursosService } from "../../services/database/curso.ts";
import { Turma } from "../../types/turma";
import { Course } from "../../types/curso";
import { Select } from "../ui/Select.jsx";

// ✅ Chave para localStorage
const getStorageKey = (studentId?: string) => 
  studentId ? `edugestor_draft_${studentId}` : 'edugestor_new_student_draft';

export const SelectTyped = Select as unknown as React.ComponentType<any>;

export const StudentForm = ({ student, onSubmit, onCancel, loading = false }: StudentFormProps) => {
  const isEditing = !!student;
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState<Turma[]>([]);
  const storageKey = getStorageKey(student?.id);
  
  // Estado interno do formulário - REMOVIDO campo 'horario'
  const initialData: Student = student ? {
    nome_completo: student.nome_completo || '',
    data_nascimento: student.data_nascimento || '',
    nome_pai: student.nome_pai || '',
    nome_mae: student.nome_mae || '',
    contacto_principal: student.contacto_principal || '',
    contacto_secundario: student.contacto_secundario || '',
    email: student.email || '',
    endereco: student.endereco || '',
    turma_id: student.turma_id || '',
    numero_estudante: student.numero_estudante || 0,
    data_matricula: student.data_matricula || '',
    propina: student.propina || 0,
    estado: student.estado || 'ativo',
    sexo: student.sexo || 'M',
    curso: student.curso || '',
    classe_escolar: student.classe_escolar || '',
    cartao_pago: student.cartao_pago || false,
    turmas: student.turmas || undefined,
  } : {
    nome_completo: '',
    data_nascimento: '',
    nome_pai: '',
    nome_mae: '',
    contacto_principal: '',
    contacto_secundario: '',
    numero_estudante: 0,
    email: '',
    endereco: '',
    turma_id: '',
    propina: 0,
    data_matricula: '',
    estado: 'ativo',
    sexo: 'M',
    curso: '',
    classe_escolar: '',
    cartao_pago: false,
    turmas: undefined,
  };

  const { 
    data: formData, 
    setData: setFormData, 
    lastSave, 
    saveDraft, 
    clearDraft,
    hasUnsavedChanges 
  } = useAutoSave(storageKey, initialData, 2000);

  // ✅ Carregar cursos e turmas
  useEffect(() => {
    loadCursos();
    loadTurmas();
  }, []);

  // ✅ Filtrar turmas quando o curso mudar
  useEffect(() => {
    if (formData.curso && turmas.length > 0) {
      const turmasDoCurso = turmas.filter(turma => 
        turma.cursos.nome === formData.curso
      );
      setTurmasFiltradas(turmasDoCurso);
      
      // ✅ Se a turma atual não pertence ao curso selecionado, limpar turma
      if (formData.turma_id) {
        const turmaAtual = turmas.find(t => t.id === formData.turma_id);
        if (turmaAtual && turmaAtual.cursos.nome !== formData.curso) {
          setFormData(prev => ({ ...prev, turma_id: '' }));
        }
      }
    } else {
      setTurmasFiltradas([]);
      setFormData(prev => ({ ...prev, turma_id: '' }));
    }
  }, [formData.curso, turmas]);

  const loadCursos = async () => {
    try {
      const res = await cursosService.getCourse();
      setCursos(res ?? []);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const loadTurmas = async () => {
    try {
      const res = await turmaService.getTurmas();
      setTurmas(res ?? []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  // ✅ Limpar rascunho após submit bem-sucedido
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Submetendo formulário:', formData);
    
    // Limpar rascunho antes de submeter
    clearDraft();
    
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleChangeSel = (field: string, value: any) => {
    setFormData((prev: StudentFormData) => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  const handleManualSave = () => {
    saveDraft();
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm('Tem alterações não salvas. Deseja realmente cancelar?')) {
      return;
    }
    clearDraft();
    onCancel();
  };

  const title = isEditing ? 'Editar Aluno' : 'Novo Aluno';

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow-sm">
        {/* Header com auto-save */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSave && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiSave className="text-green-500" />
                <span>Salvo: {new Date(lastSave).toLocaleTimeString()}</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white"
            >
              <FiSave />
              Salvar Rascunho
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Coluna Esquerda */}
          <div className="flex flex-col gap-6">
            {/* Nome Completo */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_completo" className="text-sm font-medium text-gray-700">
                Nome Completo *
              </label>
              <div className="relative">
                <RxPerson className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="Informe o nome completo" 
                  name="nome_completo" 
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Data de Nascimento */}
            <div className="flex flex-col gap-2">
              <label htmlFor="data_nascimento" className="text-sm font-medium text-gray-700">
                Data de Nascimento *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="date" 
                  name="data_nascimento"
                  id="data_nascimento"
                  value={formData.data_nascimento}
                  max={new Date(new Date().getFullYear() - 4, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* ✅ SEXO - Agora usando componente Select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Sexo *
              </label>
              <SelectTyped 
                vect={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' }
                ]} 
                icon={FiUser}
                onChange={(value: string) => handleChangeSel('sexo', value)}
                value={formData.sexo}
                placeholder="Selecione o sexo"
              />
            </div>
            
            {/* Nome do Pai */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_pai" className="text-sm font-medium text-gray-700">
                Nome do Pai
              </label>
              <div className="relative">
                <FaPeopleCarry className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  value={formData.nome_pai}
                  placeholder="Nome completo do pai" 
                  name="nome_pai" 
                  id="nome_pai"
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {/* Nome da Mãe */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_mae" className="text-sm font-medium text-gray-700">
                Nome da Mãe
              </label>
              <div className="relative">
                <FaPeopleCarry className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="Nome completo da mãe" 
                  name="nome_mae" 
                  value={formData.nome_mae}
                  onChange={handleChange}
                  id="nome_mae"
                />
              </div>
            </div>

            {/* ✅ CURSO - Agora usando componente Select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Curso *
              </label>
              <SelectTyped 
                vect={cursos.map(curso => (
                 curso.nome
               ))} 
                icon={FiFileText}
                onChange={(value: string) => handleChangeSel('curso', value)}
                value={formData.curso}
                placeholder="Selecione o curso"
                disabled={cursos.length === 0}
              />
              {cursos.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Carregando cursos...
                </p>
              )}
            </div>

            {/* Data de Matrícula */}
            <div className="flex flex-col gap-2">
              <label htmlFor="data_matricula" className="text-sm font-medium text-gray-700">
                Data de Matrícula *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="date" 
                  name="data_matricula" 
                  id="data_matricula"
                  value={formData.data_matricula}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="flex flex-col gap-2">
              <label htmlFor="endereco" className="text-sm font-medium text-gray-700">
                Endereço
              </label>
              <div className="relative">
                <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <textarea 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" 
                  placeholder="Endereço completo" 
                  name="endereco" 
                  id="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="flex flex-col gap-6">
            {/* Contacto Telefónico Principal */}
            <div className="flex flex-col gap-2">
              <label htmlFor="contacto_principal" className="text-sm font-medium text-gray-700">
                Contacto Telefónico Principal
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="+244 XXX XXX XXX" 
                  name="contacto_principal" 
                  value={formData.contacto_principal}
                  onChange={handleChange}
                  id="contacto_principal"
                  
                />
              </div>
            </div>

            {/* Contacto Telefónico Secundário */}
            <div className="flex flex-col gap-2">
              <label htmlFor="contacto_secundario" className="text-sm font-medium text-gray-700">
                Contacto Telefónico Secundário
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="+244 XXX XXX XXX" 
                  name="contacto_secundario" 
                  value={formData.contacto_secundario}
                  onChange={handleChange}
                  id="contacto_secundario"
                />
              </div>
            </div>
            
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="email" 
                  placeholder="exemplo@email.com" 
                  value={formData.email}
                  name="email" 
                  id="email"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Propina */}
            <div className="flex flex-col gap-2">
              <label htmlFor="propina" className="text-sm font-medium text-gray-700">
                Propina *
              </label>
              <div className="relative">
                <FaMoneyBill className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="number" 
                  placeholder="Quanto pagará por propina" 
                  name="propina" 
                  id="propina"
                  value={formData.propina}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* ✅ CLASSE ESCOLAR - Usando componente Select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Classe Escolar *
              </label>
              <SelectTyped 
                vect={['Pré', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª']} 
                icon={FiBook}
                onChange={(value: string) => handleChangeSel('classe_escolar', value)}
                value={formData.classe_escolar}
                placeholder="Selecione a classe"
              />
            </div>
            
            {/* ✅ TURMA - Agora usando componente Select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Turma *
              </label>
              <SelectTyped 
                vect={turmasFiltradas.map(turma => ({
                  value: turma.id,
                  label: turma.nome_turma
                }))} 
                icon={FiUsers}
                onChange={(value: string) => handleChangeSel('turma_id', value)}
                value={{
                  value: formData.turma_id,
                  label: formData.turmas?.nome_turma
                }}
                placeholder={formData.curso ? 'Selecione a turma' : 'Selecione primeiro o curso'}
                disabled={!formData.curso || turmasFiltradas.length === 0}
              />
              {!formData.curso && (
                <p className="text-xs text-gray-500 mt-1">
                  Selecione um curso para ver as turmas disponíveis
                </p>
              )}
              {formData.curso && turmasFiltradas.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Nenhuma turma disponível para este curso
                </p>
              )}
            </div>

            {/* ✅ ESTADO - Usando componente Select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Estado *
              </label>
              <SelectTyped 
                vect={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'transferido', label: 'Transferido' },
                  { value: 'desistente', label: 'Desistente' }
                ]} 
                icon={FiActivity}
                onChange={(value: string) => handleChangeSel('estado', value)}
                value={formData.estado}
                placeholder="Selecione o estado"
              />
            </div>

            {/* Cartão Pago */}
            <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg">
              <input 
                type="checkbox" 
                name="cartao_pago"
                id="cartao_pago"
                checked={formData.cartao_pago}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="cartao_pago" className="text-sm font-medium text-gray-700">
                Cartão já foi pago?
              </label>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button 
            type="button" 
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : (isEditing ? 'Atualizar Aluno' : 'Salvar Aluno')}
          </button>
        </div>
      </form>
    </>
  );
};