import { FiCalendar } from "react-icons/fi"
import { SyncStatusBadge } from "../../components/ui/SyncStatusBadge"
import { EventosPorMeta } from "../../components/strategy"
import { CalendarWithEvents } from "../../components/dashboad/Calendary"

export const EventoPage = ()=>{
    return  <div className="p-6">
                    <div className='p-4'>
                      <div className='flex items-center gap-3'>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                        <FiCalendar className="mr-2" />
                        Calendário de Eventos
                      </h2>
                      <SyncStatusBadge tableName='evento'></SyncStatusBadge>
                    </div>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                        Gerencie e acompanhe os seus eventos bem como os feriados
                      </p>
                  </div>
                    <div className="space-y-8 p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <EventosPorMeta />
                      <CalendarWithEvents />
                    </div>
                  </div>
}