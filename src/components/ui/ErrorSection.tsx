import { logoBlack } from "../auth/Login";


export const ErrorSection=(info:string,Reload:()=> void)=>{
    return (
      <div className="text-center gap-5 h-full justify-center text-gray-500 flex items-center flex-col ">
        <img src={logoBlack} alt="" className='max-w-36 rounded-full'/>
        {info}
        <button
        onClick={Reload}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800"
      >
        Reload pagina
      </button>
      </div>
    );
}