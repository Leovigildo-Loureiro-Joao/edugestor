
import { FaPeopleCarry } from "react-icons/fa";
import { FaPeopleLine } from "react-icons/fa6";
import { FiActivity, FiCalendar, FiHome, FiMail, FiPhone, FiUsers, FiFileText, FiSave } from "react-icons/fi";
import { RxPerson } from "react-icons/rx";
import { Student, StudentFormData, StudentFormProps } from "../../types";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";

// ✅ Chave para localStorage
const getStorageKey = (studentId?: string) => 
  studentId ? `edugestor_draft_${studentId}` : 'edugestor_new_student_draft';

// ✅ Interface para o histórico
interface FormHistory {
  timestamp: number;
  data: StudentFormData;
  action: 'auto-save' | 'manual-save';
}

export const StudentForm = ({ student, onSubmit, onCancel, loading = false }: StudentFormProps) => {
  const isEditing = !!student;
  const storageKey = getStorageKey(student?.id);
  
  // Estado interno do formulário
 const initialData: StudentFormData = student ? {
    nome_completo: student.nome_completo || '',
    data_nascimento: student.data_nascimento || '',
    numero_bi: student.numero_bi || '',
    nome_pai: student.nome_pai || '',
    nome_mae: student.nome_mae || '',
    contacto_telefone: student.contacto_telefone || '',
    email: student.email || '',
    endereco: student.endereco || '',
    turma_id: student.turma_id || '',
    data_matricula: student.data_matricula || '',
    estado: student.estado || 'ativo'
  } : {
    nome_completo: '',
    data_nascimento: '',
    numero_bi: '',
    nome_pai: '',
    nome_mae: '',
    contacto_telefone: '',
    email: '',
    endereco: '',
    turma_id: '',
    data_matricula: '',
    estado: 'ativo'
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

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualSave = () => {
    saveDraft();
  };



  const handleCancel = () => {
    // ✅ Perguntar antes de cancelar se há mudanças não salvas
    if (hasUnsavedChanges && !window.confirm('Tem alterações não salvas. Deseja realmente cancelar?')) {
      return;
    }
    clearDraft();
    onCancel();
  };

  const title = isEditing ? 'Editar Aluno' : 'Novo Aluno';

  return (
    <>
     
   
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
       {/* Header com auto-save */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">Preencha os dados do aluno</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Indicador de auto-save */}
          {lastSave && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FiSave className="text-green-500" />
              <span>Salvo: {new Date(lastSave).toLocaleTimeString()}</span>
            </div>
          )}
          
          {/* Botão de salvar manualmente */}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          {/* Número do BI */}
          <div className="flex flex-col gap-2">
            <label htmlFor="numero_bi" className="text-sm font-medium text-gray-700">
              Número do BI *
            </label>
            <div className="relative">
              <FiFileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input 
                className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                type="text" 
                value={formData.numero_bi}
                placeholder="Ex: 123456789LA123" 
                name="numero_bi" 
                id="numero_bi"
                onChange={handleChange}
                required
              />
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
          
          {/* Contacto Telefónico */}
          <div className="flex flex-col gap-2">
            <label htmlFor="contacto_telefone" className="text-sm font-medium text-gray-700">
              Contacto Telefónico *
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
        </div>

        {/* Coluna Direita */}
        <div className="flex flex-col gap-6">
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
          
          {/* Endereço */}
          <div className="flex flex-col gap-2">
            <label htmlFor="endereco" className="text-sm font-medium text-gray-700">
              Endereço *
            </label>
            <div className="relative">
              <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input 
                className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                type="text" 
                placeholder="Endereço completo" 
                name="endereco" 
                id="endereco"
                value={formData.endereco}
                onChange={handleChange}
                required
              />
            </div>
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
                <option value="10A">10ª Classe - Turma A</option>
                <option value="10B">10ª Classe - Turma B</option>
                <option value="11A">11ª Classe - Turma A</option>
                <option value="11B">11ª Classe - Turma B</option>
                <option value="12A">12ª Classe - Turma A</option>
                <option value="12B">12ª Classe - Turma B</option>
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
                required
              />
            </div>
          </div>
          
          {/* Estado */}
          <div className="flex flex-col gap-2">
            <label htmlFor="estado" className="text-sm font-medium text-gray-700">
              Estado *
            </label>
            <div className="relative">
              <FiActivity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <select 
                className="w-full p-3 pl-10 rounded-lg bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none" 
                name="estado"
                value={formData.estado}
                id="estado"
                onChange={handleChange}
                required
              >
                <option value="ativo">Ativo</option>
                <option value="transferido">Transferido</option>
                <option value="desistente">Desistente</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
        <button 
          type="button" 
          onClick={() => handleCancel()}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
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