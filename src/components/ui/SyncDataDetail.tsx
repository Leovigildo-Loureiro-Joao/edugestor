import { motion } from 'framer-motion';
import { FiAlertCircle, FiBook, FiUser } from 'react-icons/fi';
import { useState } from 'react';
import { aulaService } from '../../services/database/planoAulasService';
import { SyncStatusBadge } from './SyncStatusBadge';
import { Aula } from '../../types/aula';
import { BaseEntity } from '../../types/base';

interface SyncDataDetailProps {
  syncStats: number;
  onlineStatus: boolean;
  handleForceSync: () => void;
  table: string;
  data: BaseEntity[];
}

export const SyncDataDetail: React.FC<SyncDataDetailProps> = ({syncStats, onlineStatus,handleForceSync,table,data}) => {
  const [isExpanded, setExpanded] = useState(false);


  const DetalheData=(table:string,data:any,index:number)=>{
    switch(table){
      case 'aulas':
        return <motion.div
                    key={data.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                            rounded-lg border border-orange-100 dark:border-orange-900/50"
                    >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                                    flex items-center justify-center">
                        <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {data.tema_aula} • {data.disciplina}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {data.hora_inicio} • {data.hora_fim || 'Sem horario'}
                        </div>
                        </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
                    </span>
                    </motion.div>
    case 'avaliacoes':
            return <motion.div
                    key={data.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                            rounded-lg border border-orange-100 dark:border-orange-900/50"
                    >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                                    flex items-center justify-center">
                        <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {data.disciplina} • Nota {data.nota}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {data.tipo_avaliacao} • {data.periodo}
                        </div>
                        </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
                    </span>
                    </motion.div>
    case 'frequencias':      
            return <motion.div
                    key={data.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                            rounded-lg border border-orange-100 dark:border-orange-900/50"
                    >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                                    flex items-center justify-center">
                        <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            Frequencia de {data.aluno_nome} • {data.disciplina}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {data.data_frequencia} • {data.status}
                        </div>
                        </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
                    </span>
                    </motion.div>
        case 'alunos': 
            return <motion.div
            key={data.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                    rounded-lg border border-orange-100 dark:border-orange-900/50"
        >
            <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                            flex items-center justify-center">
                <FiUser className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
                <div className="font-medium text-gray-900 dark:text-white">
                {data.nome_completo}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                {data.numero_estudante} • {data.turma_nome || 'Sem turma'}
                </div>
            </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                        bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
            {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
            </span>
        </motion.div>
    case 'cursos':
        return <motion.div
        key={data.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                rounded-lg border border-orange-100 dark:border-orange-900/50"
    >
        <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                        flex items-center justify-center">
            <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
            <div className="font-medium text-gray-900 dark:text-white">
            {data.nome_curso}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.departamento} • {data.duracao} semestres
            </div>
        </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
        </span>
    </motion.div>

    case 'turmas':
        return <motion.div
        key={data.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                rounded-lg border border-orange-100 dark:border-orange-900/50"
    >
        <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                        flex items-center justify-center">
            <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
            <div className="font-medium text-gray-900 dark:text-white">
            {data.nome_turma}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.curso_nome} • {data.ano_letivo}
            </div>
        </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
        </span>
    </motion.div>
    case "metas":
        return <motion.div
        key={data.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                rounded-lg border border-orange-100 dark:border-orange-900/50"
    >
        <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                        flex items-center justify-center">
            <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
            <div className="font-medium text-gray-900 dark:text-white">
            {data.titulo}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.descricao}
            </div>
        </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                    bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
        {data.id.startsWith('local_') ? 'Novo' : 'Alterado'}
        </span>
    </motion.div>
      default:
        return ;
  }
}

    function getInfo(table:string){
        switch (table) {
            case "alunos":
                return "aluno"
            case "turmas":
                return "turma"
            case "aulas":
                return "aula"
            case "frequencias":
                return "frequencia"
            case "metas":
                return "meta"
            case "avaliacoes":
                return "avaliação"
            default:
                return table
        }
    }

    return syncStats > 0 && ( <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden mb-6"
    >
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 
                    border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <FiAlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                {syncStats} {getInfo(table)}{syncStats !== 1 ? 's' : ''} pendente{syncStats !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400/80">
                {!onlineStatus 
                    ? 'Conecte-se à internet para sincronizar os dados.'
                    : 'Estes registros foram modificados offline e aguardam sincronização.'}
                </p>
            </div>
            </div>

            {(
            <div className="flex gap-2">
                <button
                onClick={handleForceSync}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white 
                        font-medium rounded-lg text-sm transition-colors"
                >
                Sincronizar Agora
                </button>
                <button
                onClick={() => {setExpanded(!isExpanded)}}
                className="px-4 py-2 border border-orange-300 dark:border-orange-700 
                        text-orange-700 dark:text-orange-400 font-medium rounded-lg 
                        text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 
                        transition-colors"
                >
                {isExpanded?"Ocultar":"Ver Detalhes"}
                </button>
            </div>
            )}
        </div>

        {/* Detalhes Expandíveis */}
        <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0 }}
            className="overflow-hidden"
        >
            <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
            <div className="space-y-3">
                {
                    
                data.filter(dat => dat.sync_status === 'pending')
                .slice(0, 3)
                .map((dat, index) => (
                    <DetalheData table={table} data={dat} index={index}/>    
                ))}
                
                {syncStats > 3 && (
                <div className="text-center">
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                    + {syncStats - 3} mais pendentes
                    </span>
                </div>
                )}
            </div>
            </div>
        </motion.div>
        </div>
    </motion.div>
        )}
