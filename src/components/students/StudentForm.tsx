import { FaMoneyBill, FaPeopleCarry } from "react-icons/fa";
import { FaPeopleLine } from "react-icons/fa6";
import { 
  FiActivity, FiCalendar, FiHome, FiMail, 
  FiPhone, FiUsers, FiFileText, FiSave, 
  FiUser, FiBook, FiTarget, FiAward, 
  FiClock, FiBookOpen 
} from "react-icons/fi";
import { RxPerson } from "react-icons/rx";
import { Student, StudentFormData, StudentFormProps } from "../../types";
import { useState, useEffect } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { turmaService } from "../../services/database/turmas.ts";
import { cursosService } from "../../services/database/curso.ts";
import { Turma } from "../../types/turma";
import { Course } from "../../types/curso";
import { Select } from "../ui/Select.jsx";
import { configService } from "../../services/database/config.ts";

// ✅ Chave para localStorage
const getStorageKey = (studentId?: string) => 
  studentId ? `edugestor_draft_${studentId}` : 'edugestor_new_student_draft';

export const SelectTyped = Select as unknown as React.ComponentType<any>;

export const StudentForm = ({ student, onSubmit, onCancel, loading = false }: StudentFormProps) => {
  const isEditing = !!student;
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState<Turma[]>([]);
  const [tipoMatricula, setTipoMatricula] = useState<'regular' | 'reforco_personalizado'>(
    student?.tipo_matricula || 'regular'
  );
  const [ano, setAno] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
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
    numero_estudante: student.numero_estudante || 0,
    data_matricula: student.data_matricula || '',
    propina: student.propina || 0,
    estado: student.estado || 'ativo',
    sexo: student.sexo || 'M',
    curso: student.curso || '',
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
    curso: '',
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
      await loadCursos();
      await loadTurmas();
      setIsInitialLoad(false);
    };
    loadData();
  }, []);

  // ✅ Atualizar turma quando curso mudar E quando turmas forem carregadas
  useEffect(() => {
    if (!isInitialLoad && formData.curso && turmas.length > 0 && tipoMatricula === 'regular') {
      const turmasDoCurso = turmas.filter(turma => turma.curso_nome === formData.curso);
      setTurmasFiltradas(turmasDoCurso);
      
      // Se não há turma selecionada OU a turma atual não pertence ao curso selecionado
      if (!formData.turma_id || !turmasDoCurso.some(t => t.id === formData.turma_id)) {
        const primeiraTurmaId = turmasDoCurso[0]?.id || '';
        if (primeiraTurmaId) {
          setFormData((prev: StudentFormData) => ({ 
            ...prev, 
            turma_id: primeiraTurmaId 
          }));
        }
      }
    } else if (tipoMatricula !== 'regular') {
      setTurmasFiltradas([]);
      setFormData((prev: StudentFormData) => ({ 
        ...prev, 
        turma_id: '' 
      }));
    }
  }, [formData.curso, turmas, tipoMatricula, isInitialLoad]);

  // ✅ Efeito especial para setar turma_id inicial quando o curso já vem preenchido
  useEffect(() => {
    if (!isInitialLoad && turmas.length > 0 && formData.curso && !formData.turma_id && tipoMatricula === 'regular') {
      const turmasDoCurso = turmas.filter(turma => turma.curso_nome === formData.curso);
      if (turmasDoCurso.length > 0) {
        const primeiraTurmaId = turmasDoCurso[0].id;
        setFormData((prev: StudentFormData) => ({ 
          ...prev, 
          turma_id: primeiraTurmaId 
        }));
       
        console.log(`🏫 Turma inicial definida: ${primeiraTurmaId} para curso ${formData.curso}`);
      }
    }
  }, [isInitialLoad, turmas, formData.curso, tipoMatricula]);

  useEffect(() => {
    setTipoMatricula(formData.tipo_matricula || 'regular');
  }, [formData.tipo_matricula]);

  const loadCursos = async () => {
    try {
      const res = await cursosService.getCourse();
      setCursos(res ?? []);
      setFormData((prev: StudentFormData) => ({ ...prev, curso: res?.[0]?.nome || '' }));
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const loadTurmas = async () => {
    try {
      const res = await turmaService.getTurmas();
      setTurmas(res ?? []);
      
      // ✅ Se já temos um curso no formData, buscar ano letivo
      if (formData.curso) {
        setAno(await configService.getConfigValue("academic", "academic_year"));
        
        // ✅ Se é edição e já tem turma_id, não fazer nada
        // ✅ Se é novo ou não tem turma_id, vamos definir
        if (!isEditing || !formData.turma_id) {
          const turmasDoCurso = res?.filter(turma => turma.curso_nome === formData.curso) || [];
          if (turmasDoCurso.length > 0) {
            // Usar a turma do student se existir, senão pegar a primeira
            const turmaIdParaUsar = student?.turma_id || turmasDoCurso[0].id;
            if (turmaIdParaUsar && !formData.turma_id) {
              setFormData((prev: StudentFormData) => ({ 
                ...prev, 
                turma_id: turmaIdParaUsar 
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  // ✅ Função específica para quando o curso for alterado
  const handleCursoChange = (cursoValue: string) => {
    setFormData((prev: StudentFormData) => {
      const newFormData = { 
        ...prev, 
        curso: cursoValue 
      };
      
      // Se for matrícula regular e há turmas carregadas
      if (tipoMatricula === 'regular' && turmas.length > 0) {
        const turmasDoCurso = turmas.filter(turma => turma.curso_nome === cursoValue);
        setTurmasFiltradas(turmasDoCurso);
        
        if (turmasDoCurso.length > 0) {
          // Verificar se a turma atual pertence ao novo curso
          const turmaAtual = prev.turma_id ? turmas.find(t => t.id === prev.turma_id) : null;
          const turmaPertenceAoCurso = turmaAtual && turmaAtual.curso_nome === cursoValue;
          
          // Se não pertence ou não tem turma, pegar a primeira do novo curso
          if (!turmaPertenceAoCurso) {
            newFormData.turma_id = turmasDoCurso[0].id;
            console.log(`🔄 Turma definida automaticamente: ${turmasDoCurso[0].id}`);
          }
        } else {
          newFormData.turma_id = '';
        }
      } else if (tipoMatricula !== 'regular') {
        newFormData.turma_id = '';
        setTurmasFiltradas([]);
      }
      
      return newFormData;
    });
    if(!formData.propina)
    setFormData((prev:any)=> ({
      ...prev,
      propina:cursos.find((curs)=>curs.nome==cursoValue)?.preco
    }))
  };

  // ✅ Limpar rascunho após submit bem-sucedido
  const handleSubmit = (e: React.FormEvent) => {
    console.log('📤 Submetendo formulário:', formData);
    e.preventDefault();
    clearDraft();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'curso') {
      // Usar a função específica para mudança de curso
      handleCursoChange(value);
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? Number(value) : value
      }));
    }
  };

  const handleChangeSel = (field: string, value: any) => {
    if (field === 'curso') {
      handleCursoChange(value);
    } else {
      setFormData((prev: StudentFormData) => ({ 
        ...prev, 
        [field]: value 
      }));
    }
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
    if (hasUnsavedChanges && !window.confirm('Tem alterações não salvas. Deseja realmente cancelar?')) {
      return;
    }
    clearDraft();
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
        
        {/* SELEÇÃO DE TIPO DE MATRÍCULA */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiTarget className="mr-2" />
            Tipo de Matrícula
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setTipoMatricula('regular');
                handleChangeSel('tipo_matricula', 'regular');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                tipoMatricula === 'regular'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-full mr-3 ${
                  tipoMatricula === 'regular' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FiUsers />
                </div>
                <div>
                  <div className="font-semibold">Turma Regular</div>
                  <div className="text-sm text-gray-600">Acompanha turma fixa com disciplinas exatas</div>
                </div>
              </div>
              <ul className="text-sm text-gray-600 ml-11 space-y-1">
                <li>• Segue grade curricular fixa</li>
                <li>• Horários definidos por turma</li>
                <li>• Disciplinas padrão do curso</li>
                <li>• Grupo ABC + Gama/Beta/Alfa</li>
              </ul>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setTipoMatricula('reforco_personalizado');
                handleChangeSel('tipo_matricula', 'reforco_personalizado');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                tipoMatricula === 'reforco_personalizado'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-full mr-3 ${
                  tipoMatricula === 'reforco_personalizado' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FiUser />
                </div>
                <div>
                  <div className="font-semibold">Reforço Personalizado</div>
                  <div className="text-sm text-gray-600">Acompanhamento individualizado</div>
                </div>
              </div>
              <ul className="text-sm text-gray-600 ml-11 space-y-1">
                <li>• Disciplinas específicas por aluno</li>
                <li>• Horários flexíveis</li>
                <li>• Foco em dificuldades pontuais</li>
                <li>• Sessões personalizadas</li>
              </ul>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Coluna Esquerda - DADOS PESSOAIS */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <RxPerson className="mr-2" />
              Dados Pessoais
            </h3>
            
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
                  
                />
              </div>
            </div>

            {/* SEXO */}
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

          {/* Coluna Direita - INFORMAÇÕES ACADÊMICAS E CONTATO */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <FiBookOpen className="mr-2" />
              Informações Acadêmicas e Contato
            </h3>
            
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

            {/* ✅ CAMPOS ESPECÍFICOS POR TIPO DE MATRÍCULA */}
            {tipoMatricula === 'regular' ? (
              <>
                {/* CURSO */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Curso *
                  </label>
                  <SelectTyped 
                    vect={cursos.map(curso => curso.nome)} 
                    icon={FiFileText}
                    onChange={(value: string) => handleChangeSel('curso', value)}
                    value={formData.curso}
                    placeholder="Selecione o curso"
                    disabled={cursos.length === 0}
                  />
                  {cursos.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Carregando cursos...</p>
                  )}
                </div>

                {/* TURMA */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Turma *
                  </label>
                  <SelectTyped 
                    vect={formData.curso 
                      ? turmasFiltradas.map(turma => ({
                          value: turma.id,
                          label: turma.nome_turma
                        }))
                      : turmas.map(turma => ({
                          value: turma.id,
                          label: `${turma.nome_turma} - ${turma.curso_nome}`,
                          disabled: true // Desabilita se não tiver curso selecionado
                        }))
                    } 
                    icon={FiUsers}
                    onChange={(value: string) => handleChangeSel('turma_id', value)}
                    value={formData.turma_id}
                    placeholder={formData.curso 
                      ? 'Selecione uma turma disponível' 
                      : '↖️ Selecione um curso primeiro'
                    }
                    disabled={!formData.curso}
                  />
                  {!formData.curso && (
                    <p className="text-xs text-gray-500 mt-1">Selecione um curso para ver as turmas</p>
                  )}
                </div>

                {/* GRUPO DE APRENDIZADO (Gama/Beta/Alfa) */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
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
                  <label className="text-sm font-medium text-gray-700">
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
                  <label className="text-sm font-medium text-gray-700">
                    Disciplinas para Reforço *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
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
                        <label htmlFor={`disciplina-${disciplina}`} className="text-sm">
                          {disciplina}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FREQUÊNCIA SEMANAL */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="frequencia_semanal" className="text-sm font-medium text-gray-700">
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
                    className="w-full p-3 rounded-lg bg-white border border-gray-300 shadow-sm"
                  />
                </div>

                {/* OBJETIVOS ACADÊMICOS */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="objetivos_academicos" className="text-sm font-medium text-gray-700">
                    Objetivos Acadêmicos
                  </label>
                  <textarea
                    name="objetivos_academicos"
                    id="objetivos_academicos"
                    value={formData.objetivos_academicos}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white border border-gray-300 shadow-sm h-24"
                    placeholder="Ex: Melhorar notas em matemática, passar no exame..."
                  />
                </div>
              </>
            )}

            {/* ✅ CLASSE ESCOLAR */}
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
            
            {/* ✅ ESTADO */}
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

            {/* Observações Específicas */}
            <div className="flex flex-col gap-2">
              <label htmlFor="observacoes_especificas" className="text-sm font-medium text-gray-700">
                Observações Específicas
              </label>
              <textarea
                name="observacoes_especificas"
                id="observacoes_especificas"
                value={formData.observacoes_especificas}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-gray-300 shadow-sm h-20"
                placeholder="Alergias, condições médicas, necessidades especiais..."
              />
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