import { useEffect, useRef, useState } from "react"
import { FaChevronDown } from "react-icons/fa6"
import { RxPerson } from "react-icons/rx"

export const Select = ({ vect = [], icon: Icon = RxPerson, onChange, value,multiIcon=false }) => {
    value==""?vect[0]:value
    return <SelectChevron vect={vect} icon={multiIcon&&vect[0].icone||Icon} onChange={onChange} multiIcon={multiIcon} value={value}/>
}

const SelectChevron = ({ vect = [], icon: Icon = RxPerson,multiIcon=false, onChange, value }) => {
    const dropdownRef = useRef(null)
    
    const normalizedVect = vect.map(item => 
        typeof item === 'string' ? { value: item, label: item,icone:item } : item
    )

    const findSelectedItem = (val) => {
        return normalizedVect.find(item => item.value === val) || normalizedVect[0]
    }
    
    const [selected, setSelected] = useState(findSelectedItem(value))
    const [open, setOpen] = useState(false)

    // 🔄 Sincroniza o estado interno quando a prop value muda
    useEffect(() => {
        if (value !== undefined) {
            const newSelected = findSelectedItem(value)
            if (newSelected&&newSelected.value !== selected?.value) {
                setSelected(newSelected)
            }
        }
    }, [value, normalizedVect])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // ⚡ FUNÇÃO BLOQUEADORA DE EVENTOS
    const blockEvent = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
            e.nativeEvent?.stopImmediatePropagation?.()
            return false
        }
    }

    const handleSelect = (item) => {
        setSelected(item)
        setOpen(false)
        
        // Chama onChange com o VALUE do objeto
        onChange?.(item.value)
    }

    const handleToggle = (e) => {
        blockEvent(e)
        setOpen(prev => !prev)
    }

    return (
        <div 
            className="flex flex-col relative  w-full" 
            ref={dropdownRef}
            onClick={blockEvent}
            onMouseDown={blockEvent}
        >
            <button 
                type="button"
                onClick={handleToggle}
                onMouseDown={blockEvent}
                className="flex items-center justify-between p-3 rounded-lg w-full bg-white border border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 dark:focus:ring-blue-500"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-sm dark:text-gray-100 text-gray-700">
                    {(multiIcon && selected?.icone)||(Icon  && <Icon className="text-gray-500 dark:text-gray-200" />)}
                    {selected?.label || "Selecione..."}
                </span>
                <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div 
                    className="absolute top-full mt-1 w-full z-50"
                    onClick={blockEvent}
                    onMouseDown={blockEvent}
                >
                    <ul 
                        className="bg-white dark:bg-gray-800 dark:border-gray-700 border border-gray-200 rounded-lg shadow-sm max-h-60 overflow-y-auto backdrop-blur-sm"
                        role="listbox"
                    >
                        {normalizedVect.map((item, i) => (
                            <li key={i} onClick={blockEvent}>
                                <button 
                                    type="button"
                                    className={`block w-full text-start px-3 py-2 text-sm transition-colors duration-150 ${
                                        selected?.value === item.value 
                                            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' 
                                            : 'text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'
                                    }`}
                                    onClick={(e) => {
                                        blockEvent(e)
                                        handleSelect(item)
                                    }}
                                    onMouseDown={blockEvent}
                                    role="option"
                                    aria-selected={selected?.value === item.value}
                                >
                                   <span className="flex gap-2 items-center">
                                     {typeof item.icone !=='string'?item.icone:""}
                                    <span className="p-">  {item.label}</span>
                                   </span>

                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}