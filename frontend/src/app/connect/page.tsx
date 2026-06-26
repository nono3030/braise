import React from 'react';
import { Link2, ShieldCheck } from 'lucide-react';

export default function Connect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link2 size={32} />
          </div>
          <h1 className="text-2xl font-bold">Connecter une boîte email</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Braise utilise les Mots de Passe d'Application pour interagir en toute sécurité avec votre compte.
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse Email
            </label>
            <input 
              type="email" 
              placeholder="votre.email@gmail.com"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de Passe d'Application
            </label>
            <input 
              type="password" 
              placeholder="••••••••••••••••"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-2 flex items-start">
              <ShieldCheck size={14} className="mr-1 mt-0.5 text-green-600 shrink-0" />
              Vos identifiants sont chiffrés (AES-256) avant d'être stockés dans notre base de données.
            </p>
          </div>

          <button 
            type="button" 
            className="w-full bg-blue-600 text-white font-medium p-3 rounded-md hover:bg-blue-700 transition-colors mt-4"
          >
            Connecter et Démarrer le Warm-up
          </button>
        </form>
      </div>
    </div>
  );
}
