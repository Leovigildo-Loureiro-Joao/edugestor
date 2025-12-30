import { useNavigate } from "react-router-dom";
import { logoBlack } from "../auth/Login"

export const ShowTimeot=()=>{
      const navigate = useNavigate(); // 🔥 ADICIONAR ESTE HOOK

    return <>
              <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="text-center flex flex-col justify-center items-center max-w-md">
                  <img src={logoBlack} alt="" className='max-w-60 rounded-full'/>
                  <h2 className="text-xl font-semibold mb-2">Carregamento lento</h2>
                  <p className="text-gray-600 mb-4">
                    A autenticação está demorando mais que o normal. 
                    Verifique sua conexão ou tente recarregar a página.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800"
                    >
                      Recarregar
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Ir para Login
                    </button>
                  </div>
                </div>
              </div>
    </>
}