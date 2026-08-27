import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import FloorPlanGrid from './FloorPlanGrid';
import OrderEntry from './OrderEntry';
import OrderStatus from './OrderStatus';

const WaiterWorkspace = () => {
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'order' | 'status'
  const [selectedTable, setSelectedTable] = useState(null);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab('order'); // Auto switch to menu when table is picked
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        currentRoleTitle={language === 'am' ? 'አስተናጋጅ' : 'Waitstaff Workspace'}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Responsive Tab Bar for Phone / Tablet screens */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-around sm:justify-start sm:space-x-4 max-w-7xl mx-auto w-full">
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 text-xs font-bold rounded ${
            activeTab === 'tables' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {language === 'am' ? '1. ጠረጴዛዎች' : '1. Floor Plan'}
          {selectedTable && ` (T-${selectedTable.table_number})`}
        </button>

        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 text-xs font-bold rounded ${
            activeTab === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {language === 'am' ? '2. ትዕዛዝ መመዝገቢያ' : '2. Take Order'}
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 text-xs font-bold rounded ${
            activeTab === 'status' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {language === 'am' ? '3. የትዕዛዝ ሁኔታ' : '3. Live Status'}
        </button>
      </div>

      {/* Main Screen Workspace */}
      <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full flex-1">
        {activeTab === 'tables' && (
          <FloorPlanGrid
            language={language}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
          />
        )}

        {activeTab === 'order' && (
          <OrderEntry
            language={language}
            selectedTable={selectedTable}
            onOrderSent={() => setActiveTab('status')}
          />
        )}

        {activeTab === 'status' && <OrderStatus language={language} />}
      </div>
    </div>
  );
};

export default WaiterWorkspace;