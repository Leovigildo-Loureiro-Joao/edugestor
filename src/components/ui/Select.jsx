import { useEffect, useRef, useState } from "react"
import { FaChevronDown } from "react-icons/fa6"
import { RxPerson } from "react-icons/rx"

export const Select = ({ vect = [], icon: Icon = RxPerson, onChange }) => {
    return <SelectChevron vect={vect} icon={Icon} onChange={onChange} />
}

const SelectChevron = ({ vect = [], icon: Icon = RxPerson, onChange }) => {
    const dropdownRef = useRef(null)
    const [selected, setSelected] = useState(vect[0])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (value) => {
        setSelected(value)
        setOpen(false)
        onChange?.(value)
    }

    return (
        <div className="flex flex-col relative min-w-[200px]" ref={dropdownRef}>
            <button 
                onClick={() => setOpen(!open)} 
                className="flex items-center justify-between p-3 rounded-lg w-full bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-sm text-gray-700">
                    {Icon && <Icon className="text-gray-500" />}
                    {selected}
                </span>
                <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <ul className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm w-full z-50 max-h-60 overflow-y-auto backdrop-blur-sm" role="listbox">
                    {vect.map((value, i) => (
                        <li key={i}>
                            <button 
                                className={`block w-full text-start px-3 py-2 text-sm transition-colors duration-150 ${
                                    selected === value 
                                        ? 'bg-blue-50 text-blue-600' 
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                                onClick={() => handleSelect(value)}
                                role="option"
                                aria-selected={selected === value}
                            >
                                {value}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}