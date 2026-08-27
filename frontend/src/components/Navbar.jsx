import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ currentRoleTitle, language, setLanguage }) => {
  // Destructure logoutUser (matching your AuthContext)
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="bg-white border-b border-gray-300 px-4 py-2 sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* Active Role Title & Active User */}
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-800 text-base sm:text-lg">
            {currentRoleTitle}
          </span>
          {user && (
            <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
              ({user.full_name || user.username})
            </span>
          )}
        </div>

        {/* Desktop Controls (Tablets & Desktops) */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Language Toggle */}
          <div className="flex border border-gray-400 rounded overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-xs font-bold ${
                language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('am')}
              className={`px-3 py-1 text-xs font-bold ${
                language === 'am' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              አማርኛ
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold"
          >
            {language === 'am' ? 'ውጣ' : 'Logout'}
          </button>
        </div>

        {/* Mobile Screen Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 border border-gray-400 rounded text-sm font-bold text-gray-700 bg-gray-50"
          >
            {isOpen ? 'Close ✕' : 'Menu ☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Phones) */}
      {isOpen && (
        <div className="md:hidden mt-2 pt-3 border-t border-gray-200 space-y-3 pb-2">
          {user && (
            <div className="text-xs font-semibold text-gray-600">
              User: {user.full_name || user.username}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">
              {language === 'am' ? 'ቋንቋ' : 'Language'}
            </span>
            <div className="flex border border-gray-400 rounded overflow-hidden">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold ${
                  language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('am')}
                className={`px-3 py-1 text-xs font-bold ${
                  language === 'am' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                አማርኛ
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded text-sm font-bold"
          >
            {language === 'am' ? 'ውጣ' : 'Logout'}
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;