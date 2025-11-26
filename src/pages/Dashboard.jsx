import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Home, FileText, Briefcase, User, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { tradingAPI } from '../services/api';
import MarketWatch from './MarketWatch';
import toast from 'react-hot-toast';
import { fetchAndCacheKYCStatus } from '../utils/kycUtils';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistTab, setWatchlistTab] = useState('indices');
  const [marketData, setMarketData] = useState({});
  const [watchlistData, setWatchlistData] = useState([]);
  const [loading, setLoading] = useState(false);

  const bottomNavItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'orders', icon: FileText, label: 'Orders' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  useEffect(() => {
    if (user?.UserId) {
      fetchMarketData();
      fetchWatchlistData();
      // Fetch and cache KYC status when app loads
      fetchAndCacheKYCStatus(user.UserId).catch(error => {
        console.error('Error fetching KYC status on app load:', error);
      });
    }
  }, [user]);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Fetch market indices data
      // This would be replaced with actual API calls
      const mockMarketData = {
        nifty: { value: '17759.30', change: '+446.40', changePercent: '+2.58%' },
        sensex: { value: '59,537.07', change: '+446.40', changePercent: '+2.58%' },
        niftyBA: { value: '17759.30', change: '+446.40', changePercent: '+2' }
      };
      setMarketData(mockMarketData);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistData = async () => {
    try {
      // Fetch user's watchlist data
      const mockWatchlist = [
        { name: 'NIFTY 100', value: '18,112.40', change: '+445.95', changePercent: '+2.52%' },
        { name: 'NIFTY SMALL CAP', value: '18,112.40', change: '+445.95', changePercent: '+2.52%' },
        { name: 'NIFTY MID CAP', value: '18,112.40', change: '+445.95', changePercent: '+2.52%' }
      ];
      setWatchlistData(mockWatchlist);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleQuickLinkClick = (link) => {
    // Handle quick link navigation
    console.log('Quick link clicked:', link);
  };

  const handleAddToWatchlist = () => {
    // Handle adding new item to watchlist
    console.log('Add to watchlist clicked');
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    switch(tabId) {
      case 'home':
        // Stay on current page, show MarketWatch
        break;
      case 'orders':
        navigate('/orders');
        break;
      case 'portfolio':
        navigate('/portfolio');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-black">

      {/* Main Content - Show MarketWatch when on home tab */}
      <div className="flex-1 pb-20">
        {activeTab === 'home' ? (
          <MarketWatch />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a tab from bottom navigation</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-1 py-2 z-50">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="flex flex-col items-center py-2"
            >
              <item.icon 
                className={`w-6 h-6 mb-1 ${
                  item.id === activeTab ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`text-xs font-medium ${
                item.id === activeTab ? 'text-blue-500' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hidden logout button for testing */}
      {/* <button
        onClick={handleLogout}
        className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Logout
      </button> */}
    </div>
  );
};

export default Dashboard;