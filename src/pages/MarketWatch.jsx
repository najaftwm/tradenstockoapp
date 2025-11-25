import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, TrendingUp, ArrowLeft, X, Check, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradingAPI } from '../services/api';
import OrderModal from '../components/OrderModal';
import { useAuth } from '../hooks/useAuth.jsx';
import { useWebSocket } from '../hooks/useWebSocket';

const MarketWatch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Build tabs dynamically based on localStorage values
  // Define this function BEFORE useState hooks that use it
  const buildTabs = () => {
    const tabs = [];
    
    // Check localStorage for trading permissions
    const isMCXTrade = localStorage.getItem('IsMCXTrade') === 'true';
    const isNSETrade = localStorage.getItem('IsNSETrade') === 'true';
    const isCDSTrade = localStorage.getItem('IsCDSTrade') === 'true';
    const tradeInCrypto = localStorage.getItem('Trade_in_crypto') === 'true';
    const tradeInForex = localStorage.getItem('Trade_in_forex') === 'true';
    const tradeInCommodity = localStorage.getItem('Trade_in_commodity') === 'true';
    
    // Add MCX tab if enabled
    if (isMCXTrade) {
      tabs.push({ id: 'MCX', label: 'MCX Futures' });
    }
    
    // Add NSE tab if enabled
    if (isNSETrade) {
      tabs.push({ id: 'NSE', label: 'NSE Futures' });
    }
    
    // Add OPT (CDS) tab if enabled
    if (isCDSTrade) {
      tabs.push({ id: 'OPT', label: 'OPTION' });
    }
    
    // Add Crypto tab if enabled
    if (tradeInCrypto) {
      tabs.push({ id: 'CRYPTO', label: 'Crypto' });
    }
    
    // Add Forex tab if enabled
    if (tradeInForex) {
      tabs.push({ id: 'FOREX', label: 'Forex' });
    }
    
    // Add Commodity tab if enabled
    if (tradeInCommodity) {
      tabs.push({ id: 'COMMODITY', label: 'Commodity' });
    }
    
    return tabs;
  };
  
  // Initialize activeTab based on available tabs
  const [activeTab, setActiveTab] = useState(() => {
    const tabs = buildTabs();
    return tabs.length > 0 ? tabs[0].id : 'MCX';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [selectedTokens, setSelectedTokens] = useState(new Set());
  const [usdToInrRate, setUsdToInrRate] = useState(88.65); // Default fallback rate
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  
  const mountedRef = useRef(true);
  const updateCountRef = useRef(0);
  const searchTimeoutRef = useRef(null);
  const exchangeRateIntervalRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const tabRefs = useRef({});
  
  const [tabs, setTabs] = useState(() => buildTabs());
  
  // Function to update tabs based on current localStorage values
  const updateTabs = useCallback(() => {
    const newTabs = buildTabs();
    setTabs(newTabs);
    
    // If current activeTab is not in the new tabs, switch to first available tab
    if (newTabs.length > 0 && !newTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(newTabs[0].id);
    }
  }, [activeTab]);
  
  // Update tabs when user object changes (happens after refresh)
  useEffect(() => {
    updateTabs();
  }, [user, updateTabs]);
  
  // Listen for custom event when user data is refreshed
  useEffect(() => {
    const handleUserDataRefreshed = () => {
      // Rebuild tabs when user data is refreshed
      updateTabs();
    };
    
    window.addEventListener('userDataRefreshed', handleUserDataRefreshed);
    
    // Also check periodically (every 10 seconds) to catch localStorage changes
    const intervalId = setInterval(() => {
      const newTabs = buildTabs();
      const currentTabsString = JSON.stringify(tabs.map(t => t.id).sort());
      const newTabsString = JSON.stringify(newTabs.map(t => t.id).sort());
      
      if (currentTabsString !== newTabsString) {
        updateTabs();
      }
    }, 10000); // Reduced from 2000ms to 10000ms (10 seconds)
    
    return () => {
      window.removeEventListener('userDataRefreshed', handleUserDataRefreshed);
      clearInterval(intervalId);
    };
  }, [tabs, updateTabs]);
  
  // Fetch USD to INR exchange rate
  const fetchExchangeRate = useCallback(async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.INR) {
        setUsdToInrRate(data.rates.INR);
        console.log('USD to INR rate updated:', data.rates.INR);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Keep using the previous rate or default
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    // Fetch exchange rate on mount and set up periodic updates (every 5 minutes)
    fetchExchangeRate();
    exchangeRateIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchExchangeRate();
      }
    }, 5 * 60 * 1000); // Update every 5 minutes
    
    return () => {
      mountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (exchangeRateIntervalRef.current) {
        clearInterval(exchangeRateIntervalRef.current);
      }
      // WebSocket cleanup is handled by the shared service
    };
  }, [fetchExchangeRate]);

  // Update market data with live prices for MCX/NSE (original format)
  const updateMarketData = useCallback((result) => {
    if (!result || !result.instrument_token) {
      return;
    }

    const tokenToFind = result.instrument_token.toString();
    
    setMarketData(prev => {
      const newData = { ...prev };
      let updated = false;
      
      // Handle zero values like the original code
      const bid = result.bid === "0" || result.bid === 0 ? result.last_price : result.bid;
      const ask = result.ask === "0" || result.ask === 0 ? result.last_price : result.ask;
      const newBuy = parseFloat(ask) || 0;
      const newSell = parseFloat(bid) || 0;
      const newLtp = parseFloat(result.last_price) || 0;
      
      // Search through all tabs to find matching token
      Object.keys(newData).forEach(tabKey => {
        if (newData[tabKey] && Array.isArray(newData[tabKey])) {
          newData[tabKey] = newData[tabKey].map(token => {
            // Match by SymbolToken (convert both to string for comparison)
            if (token.SymbolToken?.toString() === tokenToFind) {
              // Only update if values actually changed
              if (token.buy !== newBuy || token.sell !== newSell || token.ltp !== newLtp) {
                updated = true;
                updateCountRef.current++;
                
                return {
                  ...token,
                  buy: newBuy,
                  sell: newSell,
                  ltp: newLtp,
                  chg: parseFloat(result.change) || 0,
                  high: parseFloat(result.high_) || 0,
                  low: parseFloat(result.low_) || 0,
                  open: parseFloat(result.open_) || token.open || 0,
                  close: parseFloat(result.close_) || token.close || 0, // Preserve close price
                  oi: result.oi || 0,
                  volume: result.volume || 0,
                  prevBuy: token.buy || newBuy,
                  prevSell: token.sell || newSell,
                  prevLtp: token.ltp || newLtp,
                  lastUpdate: Date.now()
                };
              }
            }
            return token;
          });
        }
      });
      
      if (updated) {
        setLastUpdate(Date.now());
        return newData;
      }
      
      return prev; // Prevent unnecessary re-render
    });
  }, []);

  // Update market data for FX WebSocket (Crypto/Forex/Commodity tick format)
  const updateFXMarketData = useCallback((tickData) => {
    if (!tickData || !tickData.type || tickData.type !== 'tick' || !tickData.data) {
      return;
    }

    const { Symbol, BestBid, BestAsk, Bids, Asks } = tickData.data;
    
    if (!Symbol) return;

    // Get USD prices from tick data
    const bestBidPriceUSD = BestBid?.Price || 0;
    const bestAskPriceUSD = BestAsk?.Price || 0;
    
    // Convert USD prices to INR using real-time exchange rate
    const bestBidPrice = bestBidPriceUSD * usdToInrRate;
    const bestAskPrice = bestAskPriceUSD * usdToInrRate;
    
    // Calculate High (max ask price) and Low (min bid price) in USD, then convert to INR
    const highUSD = Asks && Asks.length > 0 
      ? Math.max(...Asks.map(ask => ask.Price || 0))
      : bestAskPriceUSD;
    
    const lowUSD = Bids && Bids.length > 0
      ? Math.min(...Bids.map(bid => bid.Price || 0))
      : bestBidPriceUSD;

    // Convert High and Low to INR
    const high = highUSD * usdToInrRate;
    const low = lowUSD * usdToInrRate;

    // Calculate total volumes (volumes don't need conversion)
    const totalBidVolume = Bids ? Bids.reduce((sum, bid) => sum + (bid.Volume || 0), 0) : 0;
    const totalAskVolume = Asks ? Asks.reduce((sum, ask) => sum + (ask.Volume || 0), 0) : 0;

    // Calculate LTP (Last Traded Price) in INR - midpoint of best bid/ask
    const ltp = bestBidPrice && bestAskPrice ? (bestBidPrice + bestAskPrice) / 2 : (bestBidPrice || bestAskPrice || 0);
    
    setMarketData(prev => {
      const newData = { ...prev };
      let updated = false;
      
      // Search through current tab's tokens to find matching symbol
      if (newData[activeTab] && Array.isArray(newData[activeTab])) {
        newData[activeTab] = newData[activeTab].map(token => {
          // Match by SymbolName (the Symbol from tick data should match SymbolName)
          const symbolName = token.SymbolName?.split('_')[0] || token.SymbolName;
          if (symbolName === Symbol || token.SymbolName === Symbol) {
            // Calculate LTP in USD (midpoint of best bid/ask)
            const ltpUSD = bestBidPriceUSD && bestAskPriceUSD ? (bestBidPriceUSD + bestAskPriceUSD) / 2 : (bestBidPriceUSD || bestAskPriceUSD || 0);
            
            // Calculate change (difference from previous LTP in INR and USD)
            // Use the stored previous LTP, not the current one
            const prevLtp = token.ltp || 0;
            const prevLtpUSD = token.ltpUSD || 0;
            const change = prevLtp > 0 ? ltp - prevLtp : 0;
            const changeUSD = prevLtpUSD > 0 ? ltpUSD - prevLtpUSD : 0;
            
            // Only update if values actually changed
            if (token.buy !== bestAskPrice || token.sell !== bestBidPrice || token.ltp !== ltp ||
                token.buyUSD !== bestAskPriceUSD || token.sellUSD !== bestBidPriceUSD) {
              updated = true;
              updateCountRef.current++;
              
              return {
                ...token,
                buy: bestAskPrice,
                sell: bestBidPrice,
                ltp: ltp,
                buyUSD: bestAskPriceUSD,
                sellUSD: bestBidPriceUSD,
                ltpUSD: ltpUSD,
                chg: change,
                chgUSD: changeUSD,
                high: high,
                low: low,
                open: token.open || 0, // Preserve open price
                close: token.close || 0, // Preserve close price
                closeUSD: token.closeUSD || (token.close > 0 && usdToInrRate > 0 ? token.close / usdToInrRate : 0), // Preserve closeUSD
                volume: totalBidVolume + totalAskVolume,
                prevBuy: token.buy || bestAskPrice,
                prevSell: token.sell || bestBidPrice,
                prevLtp: prevLtp,
                prevLtpUSD: prevLtpUSD,
                lastUpdate: Date.now()
              };
            }
          }
          return token;
        });
      }
      
      if (updated) {
        setLastUpdate(Date.now());
        return newData;
      }
      
      return prev; // Prevent unnecessary re-render
    });
  }, [activeTab, usdToInrRate]);

  // Check if current tab uses FX WebSocket (Crypto, Forex, Commodity)
  const isFXWebSocketTab = useCallback(() => {
    return ['CRYPTO', 'FOREX', 'COMMODITY'].includes(activeTab);
  }, [activeTab]);

  // Use shared WebSocket service
  const isFX = isFXWebSocketTab();
  const tokensArray = Array.from(selectedTokens);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    if (!mountedRef.current) return;
    
    // Handle different message formats based on WebSocket type
    if (isFX) {
      // FX WebSocket sends tick data
      updateFXMarketData(data);
    } else {
      // MCX/NSE WebSocket sends market data
      updateMarketData(data);
    }
  }, [isFX, updateMarketData, updateFXMarketData]);

  // Subscribe to shared WebSocket service
  const { isConnected: wsConnected } = useWebSocket(
    isFX ? [] : tokensArray, // Only pass tokens for MCX/NSE
    handleWebSocketMessage,
    isFX // Use FX WebSocket for Crypto/Forex/Commodity
  );

  // Initial load
  useEffect(() => {
    if (user?.UserId) {
      loadSelectedTokens();
    }
  }, [user?.UserId, activeTab]);

  // Load selected tokens from backend
  const loadSelectedTokens = async () => {
    setLoading(true);
    try {
      const exchangeMap = {
        'MCX': 'mcx',
        'NSE': 'nse', 
        'OPT': 'cds',
        'CRYPTO': 'crypto',
        'FOREX': 'forex',
        'COMMODITY': 'commodity'
      };
      
      const exchangeKey = exchangeMap[activeTab];
      const response = await tradingAPI.getSelectedTokens(user.UserId, exchangeKey);
      
      // Parse the response (assuming it's a JSON string)
      const tokens = typeof response === 'string' ? JSON.parse(response) : response;
      
      console.log(`Loaded ${tokens.length} selected tokens for ${activeTab}:`, tokens);
      
      // Convert to the format expected by the component
      const formattedTokens = tokens.map(token => {
        const ltp = parseFloat(token.ltp || 0);
        const ltpUSD = parseFloat(token.ltpUSD || 0);
        const close = parseFloat(token.cls || token.close || 0);
        // For FX symbols, calculate closeUSD from close INR if needed
        // For non-FX, closeUSD might not be needed, but calculate it anyway for consistency
        const isFXSymbol = ['CRYPTO', 'FOREX', 'COMMODITY'].includes(token.ExchangeType || activeTab);
        let closeUSD = parseFloat(token.closeUSD || 0);
        if (closeUSD === 0 && close > 0 && isFXSymbol && usdToInrRate > 0) {
          // Convert close price from INR to USD for FX symbols
          closeUSD = close / usdToInrRate;
        }
        
        return {
          SymbolToken: token.SymbolToken?.toString(),
          SymbolName: token.SymbolName,
          ExchangeType: token.ExchangeType || activeTab,
          Lotsize: token.Lotsize || token.Lotsize,
          buy: parseFloat(token.buy || 0),
          sell: parseFloat(token.sell || 0),
          ltp: ltp,
          ltpUSD: ltpUSD,
          chg: parseFloat(token.chg || 0),
          chgUSD: parseFloat(token.chgUSD || 0),
          high: parseFloat(token.high || 0),
          low: parseFloat(token.low || 0),
          open: parseFloat(token.opn || token.open || 0),
          close: close,
          closeUSD: closeUSD,
          oi: parseFloat(token.ol || 0),
          volume: parseFloat(token.vol || 0),
          prevLtp: ltp, // Initialize with current LTP (will be updated by WebSocket)
          prevLtpUSD: ltpUSD, // Initialize with current LTP USD (will be updated by WebSocket)
          lastUpdate: Date.now()
        };
      });
      
      setMarketData(prev => ({
        ...prev,
        [activeTab]: formattedTokens
      }));
      
      // Update selected tokens set
      const tokenSet = new Set(formattedTokens.map(t => t.SymbolToken));
      setSelectedTokens(tokenSet);
      
      // WebSocket will automatically connect via useWebSocket hook
      
    } catch (error) {
      console.error('Error loading selected tokens:', error);
      // Fallback to empty data
      setMarketData(prev => ({
        ...prev,
        [activeTab]: []
      }));
    } finally {
      setLoading(false);
    }
  };

  // Search symbols
  const searchSymbols = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Get refId from user object or localStorage
    const refId = user.Refid || localStorage.getItem('Refid');
    
    if (!refId) {
      console.error('No Refid found for user');
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      // Map tab IDs to API extype values
      const extypeMap = {
        'MCX': 'MCX',
        'NSE': 'NSE',
        'OPT': 'OPT',
        'CRYPTO': 'CRYPTO',
        'FOREX': 'FOREX',
        'COMMODITY': 'COMMODITY'
      };
      
      const extype = extypeMap[activeTab] || activeTab;
      const response = await tradingAPI.getSymbols(extype, query, refId);
      const symbols = typeof response === 'string' ? JSON.parse(response) : response;
      
      console.log(`Found ${symbols.length} symbols for query "${query}":`, symbols);
      
      setSearchResults(symbols);
    } catch (error) {
      console.error('Error searching symbols:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add token to watchlist
  const addTokenToWatchlist = async (token, symbolName, lotSize) => {
    try {
      // Map tab IDs to exchange types for saveToken API
      const exchangeTypeMap = {
        'MCX': 'MCX',
        'NSE': 'NSE',
        'OPT': 'OPT',
        'CRYPTO': 'CRYPTO',
        'FOREX': 'FOREX',
        'COMMODITY': 'COMMODITY'
      };
      
      const exchangeType = exchangeTypeMap[activeTab] || activeTab;
      await tradingAPI.saveToken(symbolName, token, user.UserId, exchangeType, lotSize);
      
      console.log(`Added token ${token} (${symbolName}) to watchlist`);
      
      // Reload the selected tokens
      await loadSelectedTokens();
      
    } catch (error) {
      console.error('Error adding token to watchlist:', error);
    }
  };

  // Remove token from watchlist
  const removeTokenFromWatchlist = async (token) => {
    try {
      await tradingAPI.deleteToken(token, user.UserId);
      
      //console.log(`Removed token ${token} from watchlist`);
      
      // Update local state immediately
      setMarketData(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(t => t.SymbolToken !== token)
      }));
      
      // Update selected tokens set
      setSelectedTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(token);
        return newSet;
      });
      
    } catch (error) {
      console.error('Error removing token from watchlist:', error);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setSearchResults([]);
    setFilterQuery('');
    
    // Scroll to top of market data list when tab changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // Scroll the selected tab into view in the tabs container
    setTimeout(() => {
      const tabElement = tabRefs.current[tabId];
      if (tabElement && tabsContainerRef.current) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);
  };
  
  // Also scroll to top when activeTab changes (handles programmatic changes)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // Scroll active tab into view when activeTab changes
    setTimeout(() => {
      const tabElement = tabRefs.current[activeTab];
      if (tabElement && tabsContainerRef.current) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);
  }, [activeTab]);


  // Handle search modal open
  const handleSearchModalOpen = async () => {
    setShowSearchModal(true);
    setSearchQuery('');
    setSearchResults([]);
    setModalLoading(true);
    
    // Get refId from user object or localStorage
    const refId = user.Refid || localStorage.getItem('Refid');
    
    // Load initial suggestions when modal opens
    try {
      // Map tab IDs to API extype values
      const extypeMap = {
        'MCX': 'MCX',
        'NSE': 'NSE',
        'OPT': 'OPT',
        'CRYPTO': 'CRYPTO',
        'FOREX': 'FOREX',
        'COMMODITY': 'COMMODITY'
      };
      
      const extype = extypeMap[activeTab] || activeTab;
      const response = await tradingAPI.getSymbols(extype, 'null', refId);
      const symbols = typeof response === 'string' ? JSON.parse(response) : response;
      setSearchResults(symbols); // Show all symbols as suggestions
    } catch (error) {
      console.error('Error loading initial suggestions:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (query.length >= 2) {
        searchSymbols(query);
      } else {
        setSearchResults([]);
      }
    }, 300);
  };

  // Handle symbol selection in search modal
  const handleSymbolSelect = async (symbol) => {
    const isSelected = selectedTokens.has(symbol.instrument_token.toString());
    
    if (isSelected) {
      await removeTokenFromWatchlist(symbol.instrument_token.toString());
    } else {
      await addTokenToWatchlist(
        symbol.instrument_token.toString(),
        symbol.tradingsymbol,
        symbol.lot_size
      );
    }
  };

  // Manual reconnect is handled by the shared WebSocket service
  const handleManualReconnect = () => {
    // The shared service handles reconnection automatically
    console.log('Reconnection is handled automatically by the shared WebSocket service');
  };

  // Open order modal when symbol is clicked
  const handleSymbolClick = (symbol) => {
    // Store symbol data in localStorage
    if (symbol && symbol.SymbolToken) {
      localStorage.setItem("SymbolLotSize", symbol.Lotsize || 1);
      localStorage.setItem("selected_token", symbol.SymbolToken);
      localStorage.setItem("selected_script", symbol.SymbolName);
      localStorage.setItem("selectedlotsize", symbol.Lotsize || 1);
      localStorage.setItem("selected_exchange", symbol.ExchangeType || 'MCX');
    }
    // Open modal with symbol data
    setSelectedSymbol(symbol);
    setShowOrderModal(true);
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price || 0);
    if (isNaN(numPrice)) return '0';
    return Math.round(numPrice).toString();
  };

  // Parse and format date from symbol name (e.g., "31DEC" -> "31 DEC")
  const parseAndFormatDate = (dateString) => {
    if (!dateString) return null;
    
    // Match pattern like "31DEC", "15JAN", etc. (1-2 digits followed by 3 letters)
    const match = dateString.match(/^(\d{1,2})([A-Z]{3})$/i);
    if (match) {
      const day = match[1];
      const month = match[2].toUpperCase();
      return `${day} ${month}`;
    }
    
    return null;
  };

  // Format FX price - MT5 style formatting with fixed decimal places per exchange type
  const formatFXPrice = (price, exchangeType = null, symbolName = null) => {
    if (!price || price === 0) return '-';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '-';
    
    const exchange = exchangeType || activeTab;
    const absPrice = Math.abs(numPrice);
    const symbol = symbolName || '';
    
    // Check if it's a JPY pair (ends with JPY) - MT5 shows 3 decimals for JPY pairs
    const isJPYPair = symbol.toUpperCase().includes('JPY') || symbol.toUpperCase().endsWith('JPY');
    
    // FOREX: 5 decimals for most pairs, 3 decimals for JPY pairs (MT5 standard)
    if (exchange === 'FOREX') {
      if (isJPYPair) {
        return numPrice.toFixed(3); // JPY pairs: 3 decimals (e.g., 115.567)
      }
      return numPrice.toFixed(5); // Other forex pairs: 5 decimals (e.g., 1.12345)
    }
    
    // CRYPTO: Variable precision based on price magnitude (MT5 style)
    if (exchange === 'CRYPTO') {
      if (absPrice >= 1000) {
        return numPrice.toFixed(2); // Large crypto prices: 2 decimals
      } else if (absPrice >= 1) {
        return numPrice.toFixed(5); // Medium crypto prices: 5 decimals
      } else if (absPrice >= 0.01) {
        return numPrice.toFixed(5); // Small crypto prices: 5 decimals
      } else if (absPrice >= 0.0001) {
        return numPrice.toFixed(6); // Very small: 6 decimals
      } else {
        return numPrice.toFixed(8); // Extremely small: 8 decimals
      }
    }
    
    // COMMODITY: Variable precision based on price magnitude (MT5 style)
    if (exchange === 'COMMODITY') {
      if (absPrice >= 1000) {
        return numPrice.toFixed(2); // Large commodity prices: 2 decimals
      } else if (absPrice >= 1) {
        return numPrice.toFixed(5); // Medium commodity prices: 5 decimals
      } else if (absPrice >= 0.01) {
        return numPrice.toFixed(5); // Small commodity prices: 5 decimals
      } else {
        return numPrice.toFixed(6); // Very small: 6 decimals
      }
    }
    
    // Default: 5 decimals for other FX types
    return numPrice.toFixed(5);
  };

  const getExchangeName = (symbolName) => {
    if (activeTab === 'MCX') return 'MCX';
    if (activeTab === 'NSE') return 'NSE';
    if (activeTab === 'OPT') return 'NSE';
    if (activeTab === 'CRYPTO') return 'CRYPTO';
    if (activeTab === 'FOREX') return 'FOREX';
    if (activeTab === 'COMMODITY') return 'COMMODITY';
    return activeTab;
  };

  // Get price color based on movement
  const getPriceColor = (current, previous) => {
    const curr = parseFloat(current || 0);
    const prev = parseFloat(previous || curr);
    
    if (curr > prev) return 'text-green-400';
    if (curr < prev) return 'text-red-400';
    return 'text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02050a] flex items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div 
            className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
            }}
          ></div>
          <div 
            className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
            }}
          ></div>
        </div>
        <div className="text-center relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"
            style={{
              boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)',
            }}
          ></div>
          <p className="text-white font-medium" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Loading market data...</p>
        </div>
      </div>
    );
  }

  const currentSymbols = marketData[activeTab] || [];
  
  // Filter symbols by SymbolName based on filterQuery
  const filteredSymbols = filterQuery.trim() === '' 
    ? currentSymbols 
    : currentSymbols.filter(symbol => {
        const symbolName = symbol.SymbolName || '';
        return symbolName.toLowerCase().includes(filterQuery.toLowerCase());
      });

  return (
    <div className="h-screen bg-[#02050a] relative overflow-hidden flex flex-col">
      {/* Premium Background Effects */}
      {/* Global Ambient Illumination - Very Soft & Diffused */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle Radial Gradient from Center - Depth Effect */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[1400px] h-[1400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(2, 5, 10, 0.95) 0%, rgba(2, 5, 10, 1) 60%, rgba(2, 5, 10, 1) 100%)',
            opacity: 0.8,
          }}
        ></div>
        {/* Top-left: Very Subtle Light Source */}
        <div 
          className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[200px] opacity-5"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          }}
        ></div>
        {/* Bottom-right: Very Subtle Accent */}
        <div 
          className="absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full blur-[200px] opacity-4"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
          }}
        ></div>
        {/* Center: Very Gentle Ambient */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full blur-[220px] opacity-3"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
          }}
        ></div>
        {/* Global Ambient Light - Very Diffused */}
        <div 
          className="absolute inset-0 opacity-4"
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(6, 182, 212, 0.04) 0%, transparent 50%)',
            filter: 'blur(150px)',
          }}
        ></div>
      </div>

      {/* Metallic Brushed Texture - Very Subtle */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 animated-grid"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.004) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.004) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.2,
          mixBlendMode: 'overlay',
        }}
      ></div>

      {/* Fixed Header with Premium Glassmorphism */}
      <div className="flex-shrink-0 relative z-10">
        <div 
          className="backdrop-blur-[20px] bg-white/3 border-b border-white/8 relative"
          style={{
            boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Very subtle top highlight */}
          <div 
            className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
            }}
          ></div>
          <div className="px-4 sm:px-6 py-3 sm:py-4 relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex-1 sm:flex-initial">
                  <h1 
                    className="text-xl sm:text-2xl relative"
                    style={{
                      background: 'linear-gradient(to right, #E0E0E0, #D0D9E0)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      textShadow: '0px 1px 2px rgba(0, 0, 0, 0.4)',
                      textRendering: 'optimizeLegibility',
                    }}
                  >
                    MarketWatch
                  </h1>
                  <p 
                    className="text-xs sm:text-sm hidden sm:block mt-1.5" 
                    style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      color: '#B0B0B0',
                      letterSpacing: '0.03em',
                      fontWeight: 400,
                      fontSize: '0.75rem',
                      textRendering: 'optimizeLegibility',
                    }}
                  >
                    Real-time market data
                  </p>
                </div>
              </div>
              <div className="w-full sm:flex-1 sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search by symbol..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-all"
                    style={{
                      background: 'rgba(20, 25, 35, 0.3)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.2)',
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 400,
                      textRendering: 'optimizeLegibility',
                    }}
                    placeholderStyle={{
                      color: 'rgba(200, 200, 200, 0.6)',
                      fontWeight: 300,
                      fontSize: '0.875rem',
                    }}
                  />
                  <style>{`
                    input::placeholder {
                      color: rgba(200, 200, 200, 0.6) !important;
                      font-weight: 300 !important;
                      font-size: 0.875rem !important;
                    }
                  `}</style>
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                      e.target.style.boxShadow = 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                      e.target.style.boxShadow = 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.2)';
                    }}
                  />
                  <button
                    onClick={handleSearchModalOpen}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition-all duration-200 flex-shrink-0 subtle-pulsing-button"
                    style={{
                      background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(14, 116, 144, 0.9))',
                      boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(6, 182, 212, 0.2), 0 0 6px rgba(6, 182, 212, 0.15)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(6, 182, 212, 0.3), 0 0 8px rgba(6, 182, 212, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(6, 182, 212, 0.2), 0 0 6px rgba(6, 182, 212, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <Plus className="w-4 h-4 text-white" style={{ filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.5))' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Tabs - Premium Glassmorphism Container */}
      <div 
        ref={tabsContainerRef}
        className="flex-shrink-0 relative z-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 sm:px-6 py-3"
      >
        <div 
          className="flex gap-2 rounded-2xl backdrop-blur-[24px] p-1.5 relative"
          style={{
            background: 'rgba(20, 25, 35, 0.35)',
            border: '1px solid rgba(6, 182, 212, 0.12)',
            boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.25), 0 2px 8px rgba(6, 182, 212, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Very subtle inner highlight */}
          <div 
            className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none rounded-t-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 50%, transparent 100%)',
            }}
          ></div>
          {(() => {
            // Reorder tabs: active tab first, then others
            const activeTabData = tabs.find(tab => tab.id === activeTab);
            const otherTabs = tabs.filter(tab => tab.id !== activeTab);
            const reorderedTabs = activeTabData ? [activeTabData, ...otherTabs] : tabs;
            
            return reorderedTabs.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) {
                    tabRefs.current[tab.id] = el;
                  }
                }}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex-1 min-w-[100px] sm:min-w-[120px] py-2.5 px-4 text-xs sm:text-sm transition-all duration-150 whitespace-nowrap rounded-xl ${
                  activeTab === tab.id
                    ? ''
                    : ''
                }`}
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  textRendering: 'optimizeLegibility',
                  ...(activeTab === tab.id ? {
                    background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.4), rgba(14, 116, 144, 0.4))',
                    boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    textShadow: '0px 0px 5px rgba(100, 200, 255, 0.3)',
                  } : {
                    background: 'transparent',
                    color: '#A0B0C0',
                    fontWeight: 400,
                    opacity: 0.8,
                  })
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
                    e.currentTarget.style.color = '#B0C0D0';
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transition = 'all 0.1s ease-out';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#A0B0C0';
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[75%] h-[1.5px] rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
                      boxShadow: '0 0 4px rgba(6, 182, 212, 0.6)',
                    }}
                  ></div>
                )}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Scrollable Market Data List - Premium Glassmorphism Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-6 pb-4 marketwatch-scroll">
        {filteredSymbols.length > 0 ? (
          <div 
            className="rounded-2xl backdrop-blur-[24px] mt-4 overflow-hidden relative"
            style={{
              background: 'rgba(20, 25, 35, 0.4)',
              border: '1px solid rgba(6, 182, 212, 0.15)',
              boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.35), 0 4px 16px rgba(6, 182, 212, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Noise Texture Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                opacity: 0.03,
                mixBlendMode: 'overlay',
                borderRadius: '1rem',
              }}
            ></div>
            {/* Premium Table Header */}
            <div 
              className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 border-b"
              style={{
                background: 'rgba(20, 25, 35, 0.6)',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(255, 255, 255, 0.06)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              {/* Very subtle inner highlight */}
              <div 
                className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
                }}
              ></div>
              <div className="grid grid-cols-[2.5fr_1fr_1fr] gap-4 sm:gap-5 text-xs uppercase relative z-10" style={{ 
                fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#C0C8D0',
                textTransform: 'uppercase',
                textRendering: 'optimizeLegibility',
              }}>
                <div className="text-left">SYMBOLS</div>
                <div className="text-center">BID</div>
                <div className="text-center">ASK</div>
              </div>
            </div>
            
            <div className="bg-transparent relative z-10">
            {filteredSymbols.map((symbol) => {
              // Check if this is a Crypto/Forex/Commodity tab (FX tabs)
              const isFXTab = ['CRYPTO', 'FOREX', 'COMMODITY'].includes(activeTab);
              
              let changeValue, ltpValue, prevLtpValue, changePercent;
              
              if (isFXTab) {
                // For FX symbols, use USD prices for percentage calculation
                const ltpUSD = parseFloat(symbol.ltpUSD || 0);
                // Get close price in USD (convert from INR close if needed, or use stored closeUSD)
                const closeINR = parseFloat(symbol.close || 0);
                const storedCloseUSD = parseFloat(symbol.closeUSD || 0);
                const closeUSD = storedCloseUSD > 0 ? storedCloseUSD : (closeINR > 0 && usdToInrRate > 0 ? closeINR / usdToInrRate : 0);
                
                // For display: show intraday change (from previous tick) - this is what chgUSD represents
                const prevLtpUSD = parseFloat(symbol.prevLtpUSD || 0);
                // Use chgUSD if available (intraday change), otherwise calculate from prevLtp
                const chgUSDValue = parseFloat(symbol.chgUSD !== undefined ? symbol.chgUSD : 0);
                changeValue = chgUSDValue !== 0 ? chgUSDValue : (prevLtpUSD > 0 ? (ltpUSD - prevLtpUSD) : 0);
                
                ltpValue = ltpUSD;
                prevLtpValue = prevLtpUSD || ltpUSD;
                
                // For percentage: ALWAYS use close price as base (standard trading calculation)
                // Percentage = ((Current Price - Close Price) / Close Price) * 100
                if (closeUSD > 0 && ltpUSD > 0) {
                  // Calculate change from close for percentage calculation
                  const changeFromCloseUSD = ltpUSD - closeUSD;
                  changePercent = ((changeFromCloseUSD / closeUSD) * 100).toFixed(2);
                } else {
                  // If close price not available, cannot calculate accurate percentage
                  changePercent = '0.00';
                }
              } else {
                // For MCX/NSE/OPT, use INR prices
                ltpValue = parseFloat(symbol.ltp || 0);
                const closePrice = parseFloat(symbol.close || 0);
                const prevLtp = parseFloat(symbol.prevLtp || 0);
                
                // For display: use chg from WebSocket (this is change from close for MCX/NSE)
                // If chg is 0 or not available, calculate from prevLtp for intraday change display
                const chgFromWS = parseFloat(symbol.chg || 0);
                changeValue = chgFromWS !== 0 ? chgFromWS : (prevLtp > 0 ? (ltpValue - prevLtp) : 0);
                
                prevLtpValue = prevLtp || ltpValue;
                
                // For percentage: ALWAYS use close price as base (standard trading calculation)
                // Percentage = ((Current Price - Close Price) / Close Price) * 100
                if (closePrice > 0 && ltpValue > 0) {
                  // Calculate change from close for percentage calculation
                  const changeFromClose = ltpValue - closePrice;
                  changePercent = ((changeFromClose / closePrice) * 100).toFixed(2);
                } else if (chgFromWS !== 0 && closePrice === 0) {
                  // Fallback: if WebSocket provides chg (which is change from close) but close is 0,
                  // derive close price: close = ltp - chg, then calculate percentage
                  const derivedClose = chgFromWS;
                  if (derivedClose > 0) {
                    changePercent = chgFromWS
                  } else {
                    changePercent = '0.00';
                  }
                } else {
                  // If close price not available and can't derive it, cannot calculate accurate percentage
                  changePercent = '0.00';
                }
              }
              
              const isPositive = changeValue >= 0;
              const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';
              
              // Format prices based on exchange type
              let bidDisplay, askDisplay;
              const symbolNameParts = symbol.SymbolName?.split('_') || [];
              const symbolDisplay = symbolNameParts[0] || 'N/A';
              
              // Extract and format date for MCX, NSE, OPT tabs
              const showDate = ['MCX', 'NSE', 'OPT'].includes(activeTab);
              const datePart = showDate && symbolNameParts.length > 1 ? symbolNameParts[1] : null;
              const formattedDate = datePart ? parseAndFormatDate(datePart) : null;
              
              if (isFXTab) {
                const exchangeType = symbol.ExchangeType || activeTab;
                const symbolName = symbol.SymbolName || '';
                const bidPrice = parseFloat(symbol.sellUSD || symbol.sell || 0);
                const askPrice = parseFloat(symbol.buyUSD || symbol.buy || 0);
                bidDisplay = bidPrice > 0 ? formatFXPrice(bidPrice, exchangeType, symbolName) : '-';
                askDisplay = askPrice > 0 ? formatFXPrice(askPrice, exchangeType, symbolName) : '-';
              } else {
                // MCX/NSE/OPTIONS: Show raw prices without rounding
                const bidPrice = parseFloat(symbol.sell || 0);
                const askPrice = parseFloat(symbol.buy || 0);
                bidDisplay = bidPrice > 0 ? bidPrice.toString() : '-';
                askDisplay = askPrice > 0 ? askPrice.toString() : '-';
              }
              
              // Premium table layout for all exchanges
              return (
                <div
                  key={symbol.SymbolToken}
                  className="grid grid-cols-[2.5fr_1fr_1fr] gap-4 sm:gap-5 px-4 sm:px-6 py-3.5 border-b border-white/2 hover:bg-white/3 active:bg-white/5 transition-all duration-150 cursor-pointer group touch-manipulation relative"
                  onClick={() => handleSymbolClick(symbol)}
                  style={{
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    borderColor: 'rgba(6, 182, 212, 0.08)',
                    textRendering: 'optimizeLegibility',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 58, 138, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  
                  {/* SYMBOLS Column - Premium Typography */}
                  <div className="flex items-center min-w-0 relative z-10">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      textRendering: 'optimizeLegibility',
                    }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="text-lg sm:text-xl text-white"
                          style={{
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                            textRendering: 'optimizeLegibility',
                          }}
                        >
                          {symbolDisplay}
                        </span>
                        {formattedDate && (
                          <span 
                            className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full transition-all duration-200"
                            style={{
                              background: '#2B5A8F',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              color: '#FFFFFF',
                              fontWeight: 500,
                              fontSize: '0.625rem',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              textRendering: 'optimizeLegibility',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3A6BA0';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#2B5A8F';
                            }}
                          >
                            {formattedDate}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs pr-2" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 400,
                          color: '#8090A0',
                          fontSize: '0.7rem',
                          textRendering: 'optimizeLegibility',
                        }}>{symbol.ExchangeType}</span>
                        <span className="text-xs" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 400,
                          color: '#8090A0',
                          fontSize: '0.7rem',
                          textRendering: 'optimizeLegibility',
                        }}>Lot : {symbol.Lotsize}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* BID Column - Sculpted Red Gradient Button */}
                  <div className="text-center flex items-center justify-center relative z-10">
                    <div 
                      className="px-4 py-2.5 rounded-full min-w-[95px] transition-all duration-200 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(127, 29, 29, 1) 0%, rgba(153, 27, 27, 1) 50%, rgba(185, 28, 28, 1) 100%)',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2), inset -3px 0px 10px rgba(239, 68, 68, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 6px rgba(220, 38, 38, 0.12)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.25), inset -3px 0px 12px rgba(239, 68, 68, 0.35), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 8px rgba(220, 38, 38, 0.15)';
                        e.currentTarget.style.transform = 'scale(1.005)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2), inset -3px 0px 10px rgba(239, 68, 68, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 6px rgba(220, 38, 38, 0.12)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {/* Specular highlight */}
                      <div 
                        className="absolute top-0 left-0 w-1/3 h-full pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent)',
                          borderRadius: '9999px',
                        }}
                      ></div>
                      <span className="text-white text-sm whitespace-nowrap block text-center relative z-10" style={{ 
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                        fontWeight: 700,
                        color: '#FFFFFF',
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                        textRendering: 'optimizeLegibility',
                      }}>
                        {bidDisplay}
                      </span>
                    </div>
                  </div>
                  
                  {/* ASK Column - Sculpted Green Gradient Button */}
                  <div className="text-center flex items-center justify-center relative z-10">
                    <div 
                      className="px-4 py-2.5 rounded-full min-w-[95px] transition-all duration-200 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(20, 83, 45, 1) 0%, rgba(22, 101, 52, 1) 50%, rgba(22, 163, 74, 1) 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2), inset -3px 0px 10px rgba(34, 197, 94, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 6px rgba(34, 197, 94, 0.12)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.25), inset -3px 0px 12px rgba(34, 197, 94, 0.35), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 8px rgba(34, 197, 94, 0.15)';
                        e.currentTarget.style.transform = 'scale(1.005)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2), inset -3px 0px 10px rgba(34, 197, 94, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.3), 0 0 6px rgba(34, 197, 94, 0.12)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {/* Specular highlight */}
                      <div 
                        className="absolute top-0 left-0 w-1/3 h-full pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent)',
                          borderRadius: '9999px',
                        }}
                      ></div>
                      <span className="text-white text-sm whitespace-nowrap block text-center relative z-10" style={{ 
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                        fontWeight: 700,
                        color: '#FFFFFF',
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                        textRendering: 'optimizeLegibility',
                      }}>
                        {askDisplay}
                      </span>
                    </div>
                  </div>
                  
                </div>
              );
            })}
            </div>
          </div>
        ) : currentSymbols.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4 mt-8">
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl"></div>
              <div 
                className="relative backdrop-blur-[20px] rounded-full p-4 sm:p-5 border"
                style={{
                  background: 'rgba(20, 25, 35, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                }}
              >
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: 'linear-gradient(180deg, #FFFFFF 0%, #BCCCDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              No symbols found
            </h3>
            <p className="text-slate-400 text-sm mb-6 sm:mb-8 max-w-sm leading-relaxed px-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              No symbols match your search "<span className="font-semibold text-white">{filterQuery}</span>"
            </p>
            <button
              onClick={() => setFilterQuery('')}
              className="px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 touch-manipulation"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.6), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4 mt-8">
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl"></div>
              <div 
                className="relative backdrop-blur-[20px] rounded-full p-4 sm:p-5 border"
                style={{
                  background: 'rgba(20, 25, 35, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                }}
              >
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: 'linear-gradient(180deg, #FFFFFF 0%, #BCCCDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              No symbols in watchlist
            </h3>
            <p className="text-slate-400 text-sm mb-6 sm:mb-8 max-w-sm leading-relaxed px-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Add symbols to your <span className="font-semibold text-white">{activeTab}</span> watchlist to start tracking live market data and prices
            </p>
            <button
              onClick={handleSearchModalOpen}
              className="px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 touch-manipulation"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.6), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
              }}
            >
              Add Symbols
            </button>
          </div>
        )}
      </div>

      {/* Search Modal - Premium Glassmorphism */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div 
            className="rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl backdrop-blur-[20px] relative"
            style={{
              background: 'rgba(20, 25, 35, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Noise Texture Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                opacity: 0.03,
                mixBlendMode: 'overlay',
                borderRadius: '1rem',
              }}
            ></div>
            {/* Inner highlight */}
            <div 
              className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none rounded-t-2xl"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
              }}
            ></div>
            <div className="flex justify-between items-center mb-4 sm:mb-5 relative z-10">
              <div className="flex-1 min-w-0 pr-2">
                <h3 
                  className="text-xl sm:text-2xl font-bold mb-1"
                  style={{
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #BCCCDC 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textRendering: 'optimizeLegibility',
                  }}
                >
                  Search & Add Symbol
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 hidden sm:block" style={{ 
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  textRendering: 'optimizeLegibility',
                }}>Find and add symbols to your watchlist</p>
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-slate-400 hover:text-white transition-all p-2 rounded-xl flex-shrink-0 touch-manipulation relative z-10"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 sm:mb-5 relative z-10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all backdrop-blur-xl"
                  style={{
                    background: 'rgba(20, 25, 35, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.2), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    fontWeight: 400,
                    textRendering: 'optimizeLegibility',
                  }}
                  placeholderStyle={{
                    color: 'rgba(200, 200, 200, 0.6)',
                    fontWeight: 300,
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid rgba(59, 130, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.4), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.2), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)';
                  }}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto -mx-2 px-2 relative z-10">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mx-auto mb-4" style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}></div>
                  <p className="text-slate-400 text-sm font-medium" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>Loading suggestions...</p>
                </div>
              ) : searchLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mx-auto mb-4" style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}></div>
                  <p className="text-slate-400 text-sm font-medium" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((symbol) => {
                    const isSelected = selectedTokens.has(symbol.instrument_token.toString());
                    const symbolParts = symbol.tradingsymbol?.split('_') || [symbol.name];
                    
                    return (
                      <div
                        key={symbol.instrument_token}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-200 touch-manipulation ${
                          isSelected 
                            ? '' 
                            : ''
                        }`}
                        onClick={() => handleSymbolSelect(symbol)}
                        style={{
                          background: isSelected 
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(6, 182, 212, 0.1))'
                            : 'rgba(20, 25, 35, 0.4)',
                          border: isSelected 
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isSelected 
                            ? '0 0 20px rgba(34, 197, 94, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                            : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          textRendering: 'optimizeLegibility',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(59, 130, 246, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(20, 25, 35, 0.4)';
                            e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)';
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-white font-bold text-sm truncate" style={{ 
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                            fontWeight: 700,
                            textRendering: 'optimizeLegibility',
                          }}>
                            {symbolParts[0] || symbol.name}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {symbolParts[1] && (
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  color: '#60A5FA',
                                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                  fontWeight: 500,
                                  textRendering: 'optimizeLegibility',
                                }}
                              >
                                {symbolParts[1]}
                              </span>
                            )}
                            <span className="text-xs text-slate-400" style={{ 
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              fontWeight: 400,
                              textRendering: 'optimizeLegibility',
                            }}>
                              Lot: <span className="font-semibold text-slate-300">{symbol.lot_size}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center ml-2 flex-shrink-0">
                          {isSelected ? (
                            <div 
                              className="flex items-center text-emerald-400 space-x-2 px-3 py-1.5 rounded-xl"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(6, 182, 212, 0.2))',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)',
                              }}
                            >
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-semibold hidden sm:inline">Added</span>
                            </div>
                          ) : (
                            <div 
                              className="p-2 rounded-xl transition-all duration-200"
                              style={{
                                background: 'linear-gradient(135deg, rgba(6, 182, 212, 1), rgba(59, 130, 246, 1))',
                                boxShadow: '0 0 20px rgba(6, 182, 212, 0.5), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.7), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.5), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-16">
                  <div className="text-slate-400 text-sm mb-2" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>No symbols found for</div>
                  <div className="text-white font-bold text-base mb-3" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>"{searchQuery}"</div>
                  <div className="text-slate-400 text-xs" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>Try a different search term</div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-slate-400 text-sm mb-2" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>Popular symbols for</div>
                  <div className="text-white font-bold text-base mb-3" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>{activeTab}</div>
                  <div className="text-slate-400 text-xs" style={{ 
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    textRendering: 'optimizeLegibility',
                  }}>Start typing to search</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedSymbol(null);
        }}
        symbol={selectedSymbol}
        user={user}
        onOrderPlaced={() => {
          // Refresh market data or handle order placement
        }}
      />
      
      {/* Premium Custom Styles */}
      <style>{`
        /* Import Inter Font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        /* Global Typography System */
        * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Animated Grid Pattern - Very Slow & Subtle */
        @keyframes gridParallax {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 50px 50px;
          }
        }
        
        .animated-grid {
          animation: gridParallax 30s linear infinite;
        }
        
        /* Very Subtle Pulsing Plus Button */
        @keyframes subtlePulse {
          0%, 100% {
            box-shadow: inset 0px 1px 0px 0px rgba(255, 255, 255, 0.15), 0 0 8px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: inset 0px 1px 0px 0px rgba(255, 255, 255, 0.18), 0 0 10px rgba(6, 182, 212, 0.25);
          }
        }
        
        .subtle-pulsing-button {
          animation: subtlePulse 4s ease-in-out infinite;
        }
        
        /* Ghosted Ultra-Thin Scrollbar - Almost Invisible */
        .marketwatch-scroll::-webkit-scrollbar {
          width: 3px;
        }
        
        .marketwatch-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        
        .marketwatch-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.2);
          border-radius: 10px;
        }
        
        .marketwatch-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.4);
          box-shadow: 0 0 4px rgba(6, 182, 212, 0.3);
        }
        
        /* Firefox scrollbar */
        .marketwatch-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.2) transparent;
        }
        
        /* Smooth scrolling */
        .marketwatch-scroll {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default MarketWatch;