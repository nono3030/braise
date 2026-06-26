import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <SettingsIcon className="mr-3" /> Configuration du Ramp-up
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volume de départ (emails / jour)
            </label>
            <input 
              type="number" 
              defaultValue={5}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Le nombre d'emails envoyés le premier jour du warm-up.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incrément quotidien
            </label>
            <input 
              type="number" 
              defaultValue={2}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Le nombre d'emails ajoutés chaque jour au volume d'envoi.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite maximale quotidienne
            </label>
            <input 
              type="number" 
              defaultValue={50}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button 
            type="button" 
            className="flex items-center justify-center w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save className="mr-2" size={18} />
            Sauvegarder les paramètres
          </button>
        </form>
      </div>
    </div>
  );
}
