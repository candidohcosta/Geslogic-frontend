// frontend/src/pages/LandingPage.tsx
import React from 'react';

interface LandingPageProps {
  // Não precisa de props de navegação aqui, pois a navegação é feita no Header.
}

const LandingPage: React.FC<LandingPageProps> = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 text-gray-800 pt-20 pb-20">
      <h1 className="text-4xl font-extrabold text-center mb-6">Simplifique a Gestão dos Seus Eventos</h1>
      <p className="text-lg text-center max-w-2xl mb-10">
        Desde a inscrição de participantes à gestão de documentos, o GesLogic oferece-lhe todas as ferramentas para um evento de sucesso.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mb-12">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
          <img src="https://placehold.co/150x100/a78bfa/ffffff?text=Gestao" alt="Gestão de Eventos" className="rounded-md mb-4" />
          <h3 className="text-xl font-semibold mb-2">Gestão Completa de Eventos</h3>
          <p className="text-gray-700">Crie, personalize e organize os seus eventos com campos dinâmicos e opções de custo flexíveis.</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
          <img src="https://placehold.co/150x100/60a5fa/ffffff?text=Participantes" alt="Gestão de Participantes" className="rounded-md mb-4" />
          <h3 className="text-xl font-semibold mb-2">Inscrições Simplificadas</h3>
          <p className="text-gray-700">Permita que os participantes se registrem facilmente e submetam documentos necessários.</p>
        </div>
      </div>

      <div className="text-center max-w-3xl">
        <h2 className="text-3xl font-bold mb-4">Aumente a Eficiência e o Sucesso dos Seus Eventos!</h2>
        <p className="text-gray-700">
          Com o GesLogic, pode automatizar tarefas, acompanhar inscrições em tempo real e garantir que todos os detalhes estão no lugar. Junte-se a nós e transforme a forma como gere os seus eventos.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
