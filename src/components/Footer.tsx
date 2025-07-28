// frontend/src/components/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white p-6 mt-auto">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-2">GesLogic</h3>
          <p className="text-gray-400 text-sm">A sua solução completa para gestão de eventos e participantes.</p>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Contactos</h3>
          <p className="text-gray-400 text-sm">
            Email: info@geslogic.com<br />
            Telefone: +351 21 123 4567<br />
            Morada: Rua da Inovação, 123, Lisboa, Portugal
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Siga-nos</h3>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition duration-300">Facebook</a>
            <a href="#" className="text-gray-400 hover:text-white transition duration-300">LinkedIn</a>
            <a href="#" className="text-gray-400 hover:text-white transition duration-300">Instagram</a>
          </div>
        </div>
      </div>
      <div className="text-center text-gray-500 text-xs mt-6 pt-4 border-t border-gray-700">
        &copy; {new Date().getFullYear()} GesLogic. Todos os direitos reservados.
      </div>
    </footer>
  );
};

export default Footer;
