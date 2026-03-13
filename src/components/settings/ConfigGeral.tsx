import { useEffect, useState } from "react";
import { FiCalendar, FiSave, FiX } from "react-icons/fi";
import { Instituicao } from "../../types";
import { Course } from "../../types/curso";
import { Turma } from "../../types/turma";
import { configService } from "../../services/database/config";
import { cursosService } from "../../services/database/curso";
import { instituicaoService } from "../../services/database/insitituicao";
import { turmaService } from "../../services/database/turmas";
import db from "../../services/database/db";
import { generateUniqueId } from "../../utils/idGenarator";
import { emitDbChanged } from "../../utils/emitPendingSync";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { useAlert } from "../ui/AlertBadge";
import { motion } from "framer-motion";
import { SelectTyped } from "../students/StudentForm";

export const ConfiguracoesGerais = () => {
    const [salvando, setSalvando] = useState(false);
    const [salvoComSucesso, setSalvoComSucesso] = useState(false);
    const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
    const [showAnoLetivoModal, setShowAnoLetivoModal] = useState(false);
    const [novoAnoLetivo, setNovoAnoLetivo] = useState("");
    const [abrindoAno, setAbrindoAno] = useState(false);
    const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([]);
    const [cursosDisponiveis, setCursosDisponiveis] = useState<Course[]>([]);
    const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
    const [cursosSelecionados, setCursosSelecionados] = useState<string[]>([]);
    const [desativarCursosNaoSelecionados, setDesativarCursosNaoSelecionados] = useState(false);
    const [desativarTurmasNaoSelecionadas, setDesativarTurmasNaoSelecionadas] = useState(true);
    const [renovarTurmasComNovoId, setRenovarTurmasComNovoId] = useState(false);
    const { showAlert } = useAlert();

    async function carregarDados() {
        const insti = await instituicaoService.getConfig();
        setInstituicao(insti);
    }
    
    useEffect(() => {
        carregarDados();
    }, []);
    
    // Debug para verificar os dados carregados
    useEffect(() => {
        }, [instituicao]);

    async function handelConfigAcademy() {
        setSalvando(true);
        try {
            await instituicaoService.updateConfig(instituicao || {});
            setSalvoComSucesso(true);
            
            // Esconder o aviso após 3 segundos
            setTimeout(() => {
                setSalvoComSucesso(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        } finally {
            setSalvando(false);
        }
    }

    // Função segura para atualizar o estado
    const handleInputChange = (field: keyof Instituicao, value: string) => {
        setInstituicao(prev => ({
            ...(prev || {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Instituicao),
            [field]: value
        }));
    };

    const gerarProximoAnoLetivo = (anoAtual?: string) => {
        const raw = (anoAtual || "").trim();
        const match = raw.match(/(\d{4})\D+(\d{4})/);
        if (match) {
            const inicio = Number(match[1]);
            const fim = Number(match[2]);
            if (Number.isFinite(inicio) && Number.isFinite(fim)) {
                return `${inicio + 1}-${fim + 1}`;
            }
        }
        const anoNum = Number(raw);
        if (Number.isFinite(anoNum) && anoNum > 0) {
            return `${anoNum + 1}-${anoNum + 2}`;
        }
        const anoAtualSistema = new Date().getFullYear();
        return `${anoAtualSistema}-${anoAtualSistema + 1}`;
    };

    const prepararAnoLetivoModal = async () => {
        try {
            const [turmas, cursos] = await Promise.all([
                turmaService.getTurmas(),
                cursosService.getCourses()
            ]);

            const turmasAtivas = (turmas || []).filter((turma) => !turma.deleted);
            const cursosAtivos = (cursos || []).filter((curso) => !curso.deleted);

            setTurmasDisponiveis(turmasAtivas);
            setCursosDisponiveis(cursosAtivos);
            setTurmasSelecionadas(turmasAtivas.filter((turma) => turma.estado === 'ativa').map((turma) => turma.id));
            setCursosSelecionados(cursosAtivos.filter((curso) => curso.ativo).map((curso) => curso.id));
            setNovoAnoLetivo(gerarProximoAnoLetivo(instituicao?.ano_lectivo));
            setShowAnoLetivoModal(true);
        } catch (error) {
            console.error('Erro ao carregar turmas/cursos:', error);
            setShowAnoLetivoModal(true);
        }
    };

    const toggleTurmaSelecionada = (turmaId: string) => {
        setTurmasSelecionadas((prev) =>
            prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId]
        );
    };

    const toggleCursoSelecionado = (cursoId: string) => {
        setCursosSelecionados((prev) =>
            prev.includes(cursoId) ? prev.filter((id) => id !== cursoId) : [...prev, cursoId]
        );
    };

    const handleAbrirNovoAnoLetivo = async () => {
        const anoAlvo = novoAnoLetivo.trim();
        if (!anoAlvo) {
            showAlert({
                type: 'warning',
                title: 'Ano letivo obrigatório',
                message: 'Defina o novo ano letivo antes de continuar.',
                duration: 3500
            });
            return;
        }

        try {
            setAbrindoAno(true);
            const now = new Date().toISOString();
            const instituicaoId = instituicao?.id || instituicaoIdValue();

            await instituicaoService.updateAnoLectivo(anoAlvo);
            await configService.setConfig({
                category: 'academic',
                key_name: 'academic_year',
                value: anoAlvo,
                data_type: 'string',
                description: 'Ano letivo atual',
                updated_by: 'user',
                instituicao_id: instituicaoId
            });

            await db.transaction('rw', db.turmas, db.cursos, db.alunos, db.syncQueue, async () => {
                if (renovarTurmasComNovoId) {
                    for (const turmaId of turmasSelecionadas) {
                        const turma = await db.turmas.get(turmaId);
                        if (!turma || turma.deleted) continue;

                        const {
                            id: _oldId,
                            created_at: _createdAt,
                            updated_at: _updatedAt,
                            sync_status: _syncStatus,
                            deleted: _deleted,
                            ...rest
                        } = turma as any;

                        const novaTurmaId = generateUniqueId();
                        await db.turmas.put({
                            ...rest,
                            id: novaTurmaId,
                            ano_lectivo: anoAlvo,
                            estado: 'ativa',
                            created_at: now,
                            updated_at: now,
                            sync_status: 'pending',
                            deleted: false
                        });

                        await db.syncQueue.add({
                            table: 'turmas',
                            record_id: novaTurmaId,
                            instituicao_id: turma.instituicao_id || instituicaoId,
                            operation: 'upsert',
                            status: 'pending',
                            created_at: now
                        });

                        if (turma.estado !== 'inativa') {
                            await db.turmas.update(turmaId, {
                                estado: 'inativa',
                                updated_at: now,
                                sync_status: 'pending'
                            });

                            await db.syncQueue.add({
                                table: 'turmas',
                                record_id: turmaId,
                                instituicao_id: turma.instituicao_id || instituicaoId,
                                operation: 'upsert',
                                status: 'pending',
                                created_at: now
                            });
                        }
                    }
                } else {
                    for (const turmaId of turmasSelecionadas) {
                        const turma = await db.turmas.get(turmaId);
                        if (!turma || turma.deleted) continue;
                        if (turma.ano_lectivo === anoAlvo) continue;

                        await db.turmas.update(turmaId, {
                            ano_lectivo: anoAlvo,
                            updated_at: now,
                            sync_status: 'pending'
                        });

                        await db.syncQueue.add({
                            table: 'turmas',
                            record_id: turmaId,
                            instituicao_id: turma.instituicao_id || instituicaoId,
                            operation: 'upsert',
                            status: 'pending',
                            created_at: now
                        });
                    }
                }

                if (desativarTurmasNaoSelecionadas) {
                    for (const turma of turmasDisponiveis) {
                        if (turmasSelecionadas.includes(turma.id)) continue;
                        if (turma.deleted || turma.estado === 'inativa') continue;

                        await db.turmas.update(turma.id, {
                            estado: 'inativa',
                            updated_at: now,
                            sync_status: 'pending'
                        });

                        await db.syncQueue.add({
                            table: 'turmas',
                            record_id: turma.id,
                            instituicao_id: turma.instituicao_id || instituicaoId,
                            operation: 'upsert',
                            status: 'pending',
                            created_at: now
                        });
                    }
                }

                for (const curso of cursosDisponiveis) {
                    const deveAtivar = cursosSelecionados.includes(curso.id);
                    if (!desativarCursosNaoSelecionados && !deveAtivar) continue;
                    if (curso.ativo === deveAtivar) continue;

                    await db.cursos.update(curso.id, {
                        ativo: deveAtivar,
                        updated_at: now,
                        sync_status: 'pending'
                    });

                    await db.syncQueue.add({
                        table: 'cursos',
                        record_id: curso.id,
                        instituicao_id: curso.instituicao_id || instituicaoId,
                        operation: 'upsert',
                        status: 'pending',
                        created_at: now
                    });
                }

                const alunosRegulares = await db.alunos
                    .filter(
                        (aluno) =>
                            !aluno.deleted &&
                            (!instituicaoId || aluno.instituicao_id === instituicaoId) &&
                            aluno.tipo_matricula === 'regular'
                    )
                    .toArray();

                for (const aluno of alunosRegulares) {
                    if (aluno.estado === 'inativo' || aluno.estado === 'transferido') continue;

                    await db.alunos.update(aluno.id, {
                        estado: 'inativo',
                        updated_at: now,
                        sync_status: 'pending'
                    });

                    await db.syncQueue.add({
                        table: 'alunos',
                        record_id: aluno.id,
                        instituicao_id: aluno.instituicao_id || instituicaoId,
                        operation: 'upsert',
                        status: 'pending',
                        created_at: now
                    });
                }
            });

            emitDbChanged('instituicao', 'update');
            emitDbChanged('turmas', 'bulk_update');
            emitDbChanged('cursos', 'bulk_update');
            emitDbChanged('alunos', 'bulk_update');

            await carregarDados();
            setShowAnoLetivoModal(false);
            showAlert({
                type: 'success',
                title: 'Ano letivo atualizado',
                message: `Ano letivo definido para ${anoAlvo}.`,
                duration: 3500
            });
        } catch (error) {
            console.error('Erro ao abrir novo ano letivo:', error);
            showAlert({
                type: 'error',
                title: 'Falha ao abrir ano letivo',
                message: 'Não foi possível atualizar o ano letivo. Tente novamente.',
                duration: 5000
            });
        } finally {
            setAbrindoAno(false);
        }
    };

    return (
         <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Informações da Escola
            </h2>
            
            {/* Aviso de salvamento */}
            {salvoComSucesso && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg">
                    Configurações salvas com sucesso!
                </div>
            )}

            <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nome da Escola *
                        </label>
                        <input
                            type="text"
                            value={instituicao?.nome_escola || ''}
                            onChange={(e) => handleInputChange('nome_escola', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ex: Escola Primária"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Telefone *
                        </label>
                        <input
                            type="tel"
                            value={instituicao?.numero_telefone || ''}
                            onChange={(e) => handleInputChange('numero_telefone', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="+244 XXX XXX XXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={instituicao?.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="escola@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            WhatsApp
                        </label>
                        <input
                            type="text"
                            value={instituicao?.whatsapp || ''}
                            onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Número do WhatsApp"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Endereço Completo
                        </label>
                        <textarea
                            value={instituicao?.endereco || ''}
                            onChange={(e) => handleInputChange('endereco', e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Endereço completo da escola"
                        />
                    </div>
<div className="md:col-span-2">
                        <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Abrir Novo Ano Letivo
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                        Atualize o ano letivo e escolha quais turmas/cursos permanecem ativos.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={prepararAnoLetivoModal}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    <FiCalendar size={16} />
                                    Abrir Ano Letivo
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ano Letivo
                        </label>
                        <SelectTyped
                            vect={Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(ano => 
                                `${ano-1}-${ano}`
                            )}  
                            value={instituicao?.ano_lectivo || ''}         
                            onChange={(value: string) => handleInputChange('ano_lectivo', value)}
                        />
                    </div>

                    
                </div>

               

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handelConfigAcademy}
                        disabled={salvando}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiSave size={18} />
                        {salvando ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>

            {showAnoLetivoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Abrir Novo Ano Letivo</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Defina o ano letivo e selecione turmas/cursos que continuam ativos.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAnoLetivoModal(false)}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6"> 
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Novo Ano Letivo
                                </label>
                                <input
                                    type="text"
                                    value={novoAnoLetivo}
                                    onChange={(e) => setNovoAnoLetivo(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ex: 2025-2026"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                        Turmas que permanecem
                                    </h4>
                                    <div className="max-h-64 overflow-auto space-y-2">
                                        {turmasDisponiveis.length === 0 && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Nenhuma turma encontrada.
                                            </p>
                                        )}
                                        {turmasDisponiveis.map((turma) => (
                                            <label key={turma.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={turmasSelecionadas.includes(turma.id)}
                                                    onChange={() => toggleTurmaSelecionada(turma.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>
                                                    {turma.nome_turma || 'Turma'} {turma.ano_lectivo ? `• ${turma.ano_lectivo}` : ''}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                        Cursos que permanecem
                                    </h4>
                                    <div className="max-h-64 overflow-auto space-y-2">
                                        {cursosDisponiveis.length === 0 && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Nenhum curso encontrado.
                                            </p>
                                        )}
                                        {cursosDisponiveis.map((curso) => (
                                            <label key={curso.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={cursosSelecionados.includes(curso.id)}
                                                    onChange={() => toggleCursoSelecionado(curso.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>
                                                    {curso.nome || 'Curso'} {curso.ativo ? '• ativo' : ''}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={desativarCursosNaoSelecionados}
                                    onChange={(e) => setDesativarCursosNaoSelecionados(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Desativar cursos que não forem selecionados
                            </label>

                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={desativarTurmasNaoSelecionadas}
                                    onChange={(e) => setDesativarTurmasNaoSelecionadas(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Desativar turmas que não forem selecionadas
                            </label>

                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={renovarTurmasComNovoId}
                                    onChange={(e) => setRenovarTurmasComNovoId(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Renovar turmas selecionadas com novo ID (mantém histórico)
                            </label>

                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Observação: alunos regulares serão marcados como inativos e precisam de confirmação para voltar a ficar ativos.
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setShowAnoLetivoModal(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleAbrirNovoAnoLetivo}
                                disabled={abrindoAno}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {abrindoAno ? 'Abrindo...' : 'Confirmar Novo Ano'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};
