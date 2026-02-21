import { FaMoneyBill, FaPeopleCarry } from "react-icons/fa";
import { FaPeopleLine } from "react-icons/fa6";
import { 
  FiActivity, FiCalendar, FiHome, FiMail, 
  FiPhone, FiUsers, FiFileText, FiSave, 
  FiUser, FiBook, FiTarget, FiAward, 
  FiClock, FiBookOpen, 
  FiArrowLeft
} from "react-icons/fi";

import { RxPerson } from "react-icons/rx";
import { Student, StudentFormData, StudentFormProps } from "../../types";
import { useState, useEffect } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { turmaService } from "../../services/database/turmas.ts";
import { Turma } from "../../types/turma";
import { Select } from "../ui/Select.jsx";
import { configService } from "../../services/database/config.ts";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { logoBlack } from "../auth/Login.jsx";
import { useConfirmModal } from "../ui/ComfirmModal.tsx";
import { useAlert } from "../ui/AlertBadge.tsx";

// ✅ Chave para localStorage
const getStorageKey = (studentId?: string) => 
  studentId ? `edugestor_draft_${studentId}` : 'edugestor_new_student_draft';

export const SelectTyped = Select as unknown as React.ComponentType<any>;

export const StudentForm = ({ student, onSubmit, onCancel, loading = false }: StudentFormProps) => {
  const isEditing = !!student;
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const navigate=useNavigate()
  const [tipoMatricula, setTipoMatricula] = useState<'regular' | 'reforco_personalizado'>(
    student?.tipo_matricula || 'regular'
  );
  const [ano, setAno] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const storageKey = getStorageKey(student?.id);
  const [submit,setSubmit]=useState(true)
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); 
  const [comfirm, setComfirm] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [update, setUpdate] = useState(false);
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
    numero_estudante: student.numero_estudante || 0,
    data_matricula: student.data_matricula || '',
    propina: student.propina || 0,
    estado: student.estado || 'ativo',
    sexo: student.sexo || 'M',
    classe_escolar: student.classe_escolar || '',
    cartao_pago: student.cartao_pago || false,
    tipo_matricula: student.tipo_matricula || 'regular',
    modalidade_atendimento: student.modalidade_atendimento || 'individual',
    frequencia_semanal: student.frequencia_semanal || 1,
    disciplinas_reforco: student.disciplinas_reforco || [],
    nivel_conhecimento: student.nivel_conhecimento || 'A',
    grupo_aprendizado: student.grupo_aprendizado || 'gama',
    objetivos_academicos: student.objetivos_academicos || '',
    pagamento_em_dia: false,
    ano_lectivo: ano,
    sync_status: "pending"
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
    classe_escolar: '',
    cartao_pago: false,
    tipo_matricula: 'regular',
    modalidade_atendimento: 'individual',
    frequencia_semanal: 1,
    disciplinas_reforco: [],
    nivel_conhecimento: 'A',
    grupo_aprendizado: 'gama',
    objetivos_academicos: '',
    ano_lectivo: "",
    pagamento_em_dia: false,
    sync_status: "pending"

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
    const loadData = async () => {
      await loadTurmas();
      setIsInitialLoad(false);
    };
    loadData();
  }, []);

  // ✅ Definir turma padrão para matrícula regular
  useEffect(() => {
    if (!isInitialLoad && turmas.length > 0 && tipoMatricula === 'regular') {
      if (!formData.turma_id || !turmas.some(turma => turma.id === formData.turma_id)) {
        const primeiraTurmaId = turmas[0].id;
        setFormData((prev: StudentFormData) => ({ 
          ...prev, 
          turma_id: primeiraTurmaId 
        }));
      }
    } else if (tipoMatricula !== 'regular' && formData.turma_id) {
      setFormData((prev: StudentFormData) => ({ ...prev, turma_id: '' }));
    }
  }, [isInitialLoad, turmas, tipoMatricula, formData.turma_id]);

  useEffect(() => {
    setTipoMatricula(formData.tipo_matricula || 'regular');
  }, [formData.tipo_matricula]);

  const loadTurmas = async () => {
    try {
      const res = await turmaService.getTurmas();
      setTurmas(res ?? []);
      const anoLetivo = await configService.getConfigValue("academic", "academic_year");
      setAno(anoLetivo);
      setFormData((prev: StudentFormData) => ({ ...prev, ano_lectivo: prev.ano_lectivo || anoLetivo }));
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  // ✅ Limpar rascunho após submit bem-sucedido
  const handleSubmit = (e: React.FormEvent) => {
    if(submit){
      console.log('📤 Submetendo formulário:', formData);
      e.preventDefault();
      onSubmit(formData);
    }
    clearDraft();
    setSubmit(true)
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setUpdate(true)
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleChangeSel = (field: string, value: any) => {
    setUpdate(true)
    setFormData((prev: StudentFormData) => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  const handleMultiSelect = (field: string, value: string[]) => {
    setFormData((prev: StudentFormData) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleManualSave = () => {
    saveDraft();
  };

  const handleCancel = () => {
    if ((update||hasUnsavedChanges) && !cancel) {
      setUpdate(true)
      setComfirm(true)
      return 
    }else if(cancel){
      setComfirm(false)
      clearDraft();
    }
    onCancel();
  };

  const title = isEditing ? 'Editar Aluno' : 'Novo Aluno';

  // Disciplinas disponíveis
  const disciplinasDisponiveis = [
    'Matemática', 'Português', 'Física', 'Química', 
    'Biologia', 'História', 'Geografia', 'Inglês',
    'Francês', 'Filosofia', 'Educação Visual', 'Educação Física'
  ];

  // Grupos de aprendizado
  const gruposAprendizado = [
    { value: 'gama', label: 'Gama - Aprendizado Rápido' },
    { value: 'beta', label: 'Beta - Ritmo Moderado' },
    { value: 'alfa', label: 'Alfa - Necessita mais tempo' }
  ];

  // Níveis de conhecimento
  const niveisConhecimento = [
    { value: 'A', label: 'A - Excelente' },
    { value: 'B', label: 'B - Bom' },
    { value: 'C', label: 'C - Precisa melhorar' }
  ];

  return (

    <>
      <motion.form
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
         onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Header com auto-save */}
        <div
        className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSave && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <FiSave className="text-green-500" />
                <span>Salvo: {new Date(lastSave).toLocaleTimeString()}</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <FiSave />
              Salvar Rascunho
            </button>
             <button
              onClick={handleCancel}
              className="flex py-2 mt-4 items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
              <FiArrowLeft size={20} />
              <span className="font-medium">Voltar para Alunos</span>
            </button>
          </div>
        </div>
        
        {/* SELEÇÃO DE TIPO DE MATRÍCULA */}
        <div className=" p-6 pt-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <FiTarget className="mr-2" />
            Tipo de Matrícula
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{y:-5, transition:{duration:0.3}}}
              type="button"
              onClick={() => {
                setTipoMatricula('regular');
                handleChangeSel('tipo_matricula', 'regular');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:border-blue-200 ${
                tipoMatricula === 'regular'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-900/40'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-full mr-3 ${
                  tipoMatricula === 'regular' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  <FiUsers />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Turma Regular</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Acompanha turma fixa com disciplinas exatas</div>
                </div>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 ml-11 space-y-1">
                <li>• Segue grade curricular fixa</li>
                <li>• Horários definidos por turma</li>
                <li>• Disciplinas padrão do curso</li>
                <li>• Grupo ABC + Gama/Beta/Alfa</li>
              </ul>
            </motion.button>
            
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
               whileHover={{y:-5, transition:{duration:0.3}}}
              type="button"
              onClick={() => {
                setTipoMatricula('reforco_personalizado');
                handleChangeSel('tipo_matricula', 'reforco_personalizado');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:border-purple-200 ${
                tipoMatricula === 'reforco_personalizado'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-900/40'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-full mr-3 ${
                  tipoMatricula === 'reforco_personalizado' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  <FiUser />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Reforço Personalizado</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Acompanhamento individualizado</div>
                </div>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 ml-11 space-y-1">
                <li>• Disciplinas específicas por aluno</li>
                <li>• Horários flexíveis</li>
                <li>• Foco em dificuldades pontuais</li>
                <li>• Sessões personalizadas</li>
              </ul>
            </motion.button>
          </div>
        </div>
        
        <div className={tipoMatricula=="regular"&&turmas.length==0?"flex justify-center":"grid grid-cols-1 lg:grid-cols-2 gap-8"}>
          
          {
          tipoMatricula=="regular"&&turmas.length==0?
          <>
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}

            className='flex justify-center flex-col items-center w-full h-96'>
                <div className='flex flex-col items-center w-96 text-center'>
                    <img src={logoBlack} alt="" />
                    
                    <h3 className="mt-2 text-md font-medium text-gray-900 dark:text-white">Adicione uma turma para adicionar alunos</h3>
                    <p className="mt-1 text-wrap text-m text-gray-500 dark:text-gray-400">
                      Para aluno regular é obrigatório selecionar uma turma. 
                      Caso deseje adicionar um personalizado, troque o tipo de matrícula.
                    </p>
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium "
                      onClick={()=> {setSubmit(false);navigate("/turmas/nova")}}>Adicionar Turma</button>
                </div>
            </motion.div>
          </>
          :<>
          <div className="flex flex-col gap-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
              <RxPerson className="mr-2" />
              Dados Pessoais
            </h3>
            
            {/* Nome Completo */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nome_completo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome Completo *
              </label>
              <div className="relative">
                <RxPerson className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
                  type="text" 
                  placeholder="Informe o nome completo" 
                  name="nome_completo" 
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e)=>handleChange(e)}
                  required
                />
              </div>
            </div>
            
            {/* Data de Nascimento */}
            <div className="flex flex-col gap-2">
              <label htmlFor="data_nascimento" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de Nascimento *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
                  type="date" 
                  name="data_nascimento"
                  id="data_nascimento"
                  value={formData.data_nascimento}
                  max={new Date(new Date().getFullYear() - 4, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  onChange={handleChange}
                  
                />
              </div>
            </div>

            {/* SEXO */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <label htmlFor="nome_pai" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Pai
              </label>
              <div className="relative">
                <FaPeopleCarry className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
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
              <label htmlFor="nome_mae" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da Mãe
              </label>
              <div className="relative">
                <FaPeopleCarry className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
                  type="text" 
                  placeholder="Nome completo da mãe" 
                  name="nome_mae" 
                  value={formData.nome_mae}
                  onChange={handleChange}
                  id="nome_mae"
                />
              </div>
            </div>

            {/* Data de Matrícula */}
            <div className="flex flex-col gap-2">
              <label htmlFor="data_matricula" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de Matrícula *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
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
              <label htmlFor="endereco" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Endereço
              </label>
              <div className="relative">
                <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <textarea 
                  className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900 dark:text-white" 
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

            {/* Coluna Direita - INFORMAÇÕES ACADÊMICAS E CONTATO */}
            <div className="flex flex-col gap-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                <FiBookOpen className="mr-2" />
                Informações Acadêmicas e Contato
              </h3>
              
              {/* Contacto Telefónico Principal */}
              <div className="flex flex-col gap-2">
                <label htmlFor="contacto_principal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contacto Telefónico Principal
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <input 
                    className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
                    type="text" 
                    placeholder="XXX XXX XXX" 
                    maxLength={9}
                    name="contacto_principal" 
                    value={formData.contacto_principal}
                    onChange={handleChange}
                    id="contacto_principal"
                  />
                </div>
              </div>

              {/* Contacto Telefónico Secundário */}
              <div className="flex flex-col gap-2">
                <label htmlFor="contacto_secundario" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contacto Telefónico Secundário
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <input 
                    className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
                    type="text" 
                    placeholder="XXX XXX XXX" 
                    maxLength={9}
                    name="contacto_secundario" 
                    value={formData.contacto_secundario}
                    onChange={handleChange}
                    id="contacto_secundario"
                  />
                </div>
              </div>
              
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <input 
                    className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
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
                <label htmlFor="propina" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Propina *
                </label>
                <div className="relative">
                  <FaMoneyBill className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <input 
                    className="w-full p-3 pl-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white" 
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

              {/* ✅ CAMPOS ESPECÍFICOS POR TIPO DE MATRÍCULA */}
              {tipoMatricula === 'regular' ? (
                <>
                  {/* TURMA */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Turma *
                    </label>
                    <SelectTyped 
                      vect={turmas.map(turma => ({
                        value: turma.id,
                        label: `${turma.nome_turma} - ${turma.curso_nome || 'Sem curso'}`
                      }))} 
                      icon={FiUsers}
                      onChange={(value: string) => handleChangeSel('turma_id', value)}
                      value={formData.turma_id}
                      placeholder="Selecione uma turma disponível"
                      disabled={turmas.length === 0}
                    />
                    {turmas.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nenhuma turma disponível</p>
                    )}
                  </div>

                  {/* GRUPO DE APRENDIZADO (Gama/Beta/Alfa) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Grupo de Aprendizado *
                    </label>
                    <SelectTyped 
                      vect={gruposAprendizado} 
                      icon={FiAward}
                      onChange={(value: string) => handleChangeSel('grupo_aprendizado', value)}
                      value={formData.grupo_aprendizado}
                      placeholder="Selecione o grupo"
                    />
                  </div>

                  {/* NÍVEL DE CONHECIMENTO (A/B/C) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nível de Conhecimento Atual *
                    </label>
                    <SelectTyped 
                      vect={niveisConhecimento} 
                      icon={FiActivity}
                      onChange={(value: string) => handleChangeSel('nivel_conhecimento', value)}
                      value={formData.nivel_conhecimento}
                      placeholder="Selecione o nível"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* DISCIPLINAS DE REFORÇO (multi-select) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Disciplinas para Reforço *
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto bg-white dark:bg-gray-700/40">
                      {disciplinasDisponiveis.map(disciplina => (
                        <div key={disciplina} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`disciplina-${disciplina}`}
                            checked={formData.disciplinas_reforco?.includes(disciplina) || false}
                            onChange={(e) => {
                              const current = formData.disciplinas_reforco || [];
                              const updated = e.target.checked
                                ? [...current, disciplina]
                                : current.filter((d:string) => d !== disciplina);
                              handleMultiSelect('disciplinas_reforco', updated);
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`disciplina-${disciplina}`} className="text-sm text-gray-700 dark:text-gray-300">
                            {disciplina}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FREQUÊNCIA SEMANAL */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="frequencia_semanal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Frequência Semanal (vezes)
                    </label>
                    <input
                      type="number"
                      name="frequencia_semanal"
                      id="frequencia_semanal"
                      value={formData.frequencia_semanal}
                      onChange={handleChange}
                      min="1"
                      max="5"
                      className="w-full p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* OBJETIVOS ACADÊMICOS */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="objetivos_academicos" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Objetivos Acadêmicos
                    </label>
                    <textarea
                      name="objetivos_academicos"
                      id="objetivos_academicos"
                      value={formData.objetivos_academicos}
                      onChange={handleChange}
                      className="w-full p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm h-24 text-gray-900 dark:text-white"
                      placeholder="Ex: Melhorar notas em matemática, passar no exame..."
                    />
                  </div>
                </>
              )}

              {/* ✅ CLASSE ESCOLAR */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              
              {/* ✅ ESTADO */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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

              {/* Observações Específicas */}
              <div className="flex flex-col gap-2">
                <label htmlFor="observacoes_especificas" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações Específicas
                </label>
                <textarea
                  name="observacoes_especificas"
                  id="observacoes_especificas"
                  value={formData.observacoes_especificas}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm h-20 text-gray-900 dark:text-white"
                  placeholder="Alergias, condições médicas, necessidades especiais..."
                />
              </div>
            </div>
           </>
          }
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
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
        
      </motion.form>
     <ModalComponent/>
    </>
  );
};
