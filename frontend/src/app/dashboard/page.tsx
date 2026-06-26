import React from 'react';
import { Mail, Activity, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Emails envoyés (Aujourd'hui)</p>
            <p className="text-2xl font-semibold">124</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Taux de placement en Inbox</p>
            <p className="text-2xl font-semibold">98.5%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Spams détectés</p>
            <p className="text-2xl font-semibold">2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
