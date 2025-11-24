import { FaPeopleCarry } from "react-icons/fa";
import { FaPeopleLine } from "react-icons/fa6";
import { FiActivity, FiCalendar, FiHome, FiMail, FiPhone, FiUsers, FiFileText, FiSave, FiUser, FiBook } from "react-icons/fi";
import { RxPerson } from "react-icons/rx";
import { Student, StudentFormData, StudentFormProps } from "../../types";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { turmaService } from "../../services/database/turmas.ts";
import { Turma } from "../../types/turma";
import { Select } from "../ui/Select.jsx";
import { AlunoData } from "../../types/aluno.ts";

// ✅ Chave para localStorage
const getStorageKey = (studentId?: string) => 
  studentId ? `edugestor_draft_${studentId}` : 'edugestor_new_student_draft';

const SelectTyped = Select as unknown as React.ComponentType<any>;


export const StudentForm = ({ student, onSubmit, onCancel, loading = false }: StudentFormProps) => {
  const isEditing = !!student;
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const storageKey = getStorageKey(student?.id);
  
  // Estado interno do formulário
  const initialData: StudentFormData = student ? {
    nome_completo: student.nome_completo || '',
    data_nascimento: student.data_nascimento || '',
    nome_pai: student.nome_pai || '',
    nome_mae: student.nome_mae || '',
    contacto_principal: student.contacto_principal || '',
    contacto_secundario: student.contacto_secundario || '',
    email: student.email || '',
    endereco: student.endereco || '',
    turma_id: student.turma_id || '',
    numero_estudante: student.numero_estudante || '',
    data_matricula: student.data_matricula || '',
    estado: student.estado || 'ativo',
    sexo: student.sexo || 'M',
    curso: student.curso || 'REGULAR',
    classe_escolar: student.classe_escolar || '',
    periodo: student.periodo || 'Manhã',
    horario: student.horario || '',
    cartao_pago: student.cartao_pago || false
  } : {
    nome_completo: '',
    data_nascimento: '',
    nome_pai: '',
    nome_mae: '',
    contacto_principal: '',
    contacto_secundario: '',
    numero_estudante: '',
    email: '',
    endereco: '',
    turma_id: '',
    data_matricula: '',
    estado: 'ativo',
    sexo: 'M',
    curso: 'REGULAR',
    classe_escolar: '',
    periodo: 'Manhã',
    horario: '',
    cartao_pago: false
  };

  const { 
    data: formData, 
    setData: setFormData, 
    lastSave, 
    saveDraft, 
    clearDraft,
    hasUnsavedChanges 
  } = useAutoSave(storageKey, initialData, 2000);

  // ✅ Limpar rascunho após submit bem-sucedido
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Submetendo formulário:', formData);
    
    // Limpar rascunho antes de submeter
    clearDraft();
    
    onSubmit(formData);
  };

    useEffect(() => {
      loadTurmas();
    }, []);
  
    const loadTurmas = async () => {
      try {
        const res = await turmaService.getTurmas();
        setTurmas(res ?? []);
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
      }
    };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };


  const handleChangeSel = (field: any, value: any) => {
    setFormData((prev: StudentFormData) => ({ ...prev, [field]: value }));
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
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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

            {/* Sexo */}
            <div className="flex flex-col gap-2">
              <label htmlFor="sexo" className="text-sm font-medium text-gray-700">
                Sexo *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <select 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none" 
                  name="sexo"
                  id="sexo"
                  value={formData.sexo}
                  onChange={handleChange}
                  required
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>
            
            {/* Nome do Pai */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_pai" className="text-sm font-medium text-gray-700">
                Nome do Pai *
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
                  required
                />
              </div>
            </div>
            
            {/* Nome da Mãe */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_mae" className="text-sm font-medium text-gray-700">
                Nome da Mãe *
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
                  required
                />
              </div>
            </div>

            {/* Curso */}
            <div className="flex flex-col gap-2">
              <label htmlFor="curso" className="text-sm font-medium text-gray-700">
                Curso *
              </label>
              <div className="relative">
                <FiFileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <select 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none" 
                  name="curso"
                  id="curso"
                  value={formData.curso}
                  onChange={handleChange}
                  required
                >
                  <option value="REGULAR">Regular</option>
                  <option value="Alfabetização">Alfabetização</option>
                  <option value="Reforço">Reforço</option>
                </select>
              </div>
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
                Endereço *
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
                  required
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="flex flex-col gap-6">
            {/* Contacto Telefónico Principal */}
            <div className="flex flex-col gap-2">
              <label htmlFor="contacto_telefone" className="text-sm font-medium text-gray-700">
                Contacto Telefónico Principal *
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="+244 XXX XXX XXX" 
                  name="contacto_telefone" 
                  value={formData.contacto_telefone}
                  onChange={handleChange}
                  id="contacto_telefone"
                  required
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
              {/* Horário */}
            <div className="flex flex-col gap-2">
              <label htmlFor="horario" className="text-sm font-medium text-gray-700">
                Horário *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  type="text" 
                  placeholder="Ex: 08:00 - 12:00" 
                  name="horario" 
                  id="horario"
                  value={formData.horario}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            {/* Classe Escolar */}
            <div className="flex flex-col gap-2">
              <label htmlFor="classe_escolar" className="text-sm font-medium text-gray-700">
                Classe Escolar *
              </label>
              <SelectTyped 
                vect={['Pré', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª']} 
                icon={FiBook}
                onChange={(value:string) => handleChangeSel('classe', value)}
              />
            </div>
            
            {/* Turma */}
            <div className="flex flex-col gap-2">
              <label htmlFor="turma_id" className="text-sm font-medium text-gray-700">
                Turma *
              </label>
              <div className="relative">
                <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <select 
                  className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none" 
                  name="turma_id"
                  id="turma_id"
                  value={formData.turma_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione a turma</option>
                  {
                    turmas.map((turma)=>(
                      <option key={turma.id} value={turma.id}>{turma.nome_turma}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Período */}
            <div className="flex flex-col gap-2">
              <label htmlFor="periodo" className="text-sm font-medium text-gray-700">
                Período *
              </label>
              <SelectTyped 
                vect={['Manha', 'Tarde', 'Noite']} 
                icon={FiBook}
                onChange={(value:string) => handleChangeSel('periodo', value)}
              />
            </div>
            
           
            
            
            {/* Estado */}
            <div className="flex flex-col gap-2">
              <label htmlFor="estado" className="text-sm font-medium text-gray-700">
                Estado *
              </label>
              <SelectTyped 
                vect={['ativo', 'transferido', 'desistente']} 
                icon={FiActivity}
                onChange={(value:string) => handleChangeSel('estado', value)}
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