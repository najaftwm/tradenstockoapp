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

  // Add slash to symbol names for crypto/forex pairs (e.g., "BTCUSDT" -> "BTC/USDT")
  const formatSymbolWithSlash = (symbolName, exchangeType) => {
    if (!symbolName) return 'N/A';
    
    // For crypto, forex, and commodity exchanges, try to add slash
    if (['CRYPTO', 'FOREX', 'COMMODITY'].includes(exchangeType)) {
      // Remove any existing underscores or slashes first
      let cleanSymbol = symbolName.split('_')[0].replace(/\//g, '');
      
      // Common patterns for adding slashes:
      // - 3-letter base + 3-letter quote (e.g., BTCUSDT -> BTC/USDT)
      // - 3-letter base + 4-letter quote (e.g., BTCUSDC -> BTC/USDC)
      // - 4-letter base + 3-letter quote (e.g., USDTBTC -> USDT/BTC)
      // - 3-letter base + 3-letter quote (e.g., EURUSD -> EUR/USD)
      
      // Try to match common currency/crypto patterns
      const patterns = [
        /^([A-Z]{3,4})(USDT|USDC|BTC|ETH|BNB|EUR|GBP|JPY|AUD|CAD|CHF|NZD|XAU|XAG)$/i, // Base + Quote
        /^(USDT|USDC|BTC|ETH|BNB)([A-Z]{3,4})$/i, // Quote + Base (reverse)
      ];
      
      for (const pattern of patterns) {
        const match = cleanSymbol.match(pattern);
        if (match) {
          return `${match[1].toUpperCase()}/${match[2].toUpperCase()}`;
        }
      }
      
      // If no pattern matches, try splitting at common lengths (3-4 chars)
      // For 6-8 character symbols, split in the middle
      if (cleanSymbol.length >= 6 && cleanSymbol.length <= 8) {
        const mid = Math.floor(cleanSymbol.length / 2);
        // Try 3-3, 3-4, 4-3, 4-4 splits
        const splits = [
          [3, cleanSymbol.length - 3],
          [4, cleanSymbol.length - 4],
        ];
        
        for (const [split1, split2] of splits) {
          const part1 = cleanSymbol.substring(0, split1).toUpperCase();
          const part2 = cleanSymbol.substring(split1, split1 + split2).toUpperCase();
          if (part1.length >= 2 && part2.length >= 2) {
            return `${part1}/${part2}`;
          }
        }
      }
    }
    
    // Return original if no formatting needed or pattern not found
    return symbolName.split('_')[0];
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

  const currentSymbols = marketData[activeTab] || [];
  
  // Filter symbols by SymbolName based on filterQuery
  const filteredSymbols = filterQuery.trim() === '' 
    ? currentSymbols 
    : currentSymbols.filter(symbol => {
        const symbolName = symbol.SymbolName || '';
        return symbolName.toLowerCase().includes(filterQuery.toLowerCase());
      });

  const renderModalLoader = (label, subtext = 'This takes only a moment') => {
    const labelText = (label || '').toUpperCase();
    return (
      <div className="py-14 text-center">
        <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div
            className="absolute inset-1 rounded-full border border-transparent border-t-cyan-400/80 border-r-cyan-400/20"
            style={{ animation: 'premiumSpin 1.05s cubic-bezier(0.66, 0, 0.34, 1) infinite' }}
          />
          <div
            className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/25 to-transparent"
            style={{ animation: 'softPulse 2.6s ease-in-out infinite' }}
          />
        </div>
        <p className="mt-7 text-[0.7rem] uppercase tracking-[0.4em] text-slate-300/80">
          {labelText}
        </p>
        <p className="mt-3 text-xs text-slate-400/80">{subtext}</p>
        <div className="mt-5 h-px w-16 mx-auto overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
            style={{ animation: 'lineShimmer 2.4s ease-in-out infinite' }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes premiumSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes softPulse {
          0% { opacity: 0.2; transform: scale(0.92); }
          50% { opacity: 0.65; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.92); }
        }
        @keyframes lineShimmer {
          0% { transform: translateX(-60%); opacity: 0; }
          50% { transform: translateX(10%); opacity: 0.8; }
          100% { transform: translateX(80%); opacity: 0; }
        }
        @keyframes loaderGlow {
          0% { opacity: 0.15; transform: scale(0.98); }
          50% { opacity: 0.35; transform: scale(1.02); }
          100% { opacity: 0.15; transform: scale(0.98); }
        }
      `}</style>
      <div className="min-h-screen sm:h-screen relative flex flex-col bg-app-bg sm:overflow-hidden">
        {/* Subtle background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at top, rgba(0, 81, 255, 0.03) 0%, transparent 50%)' }}></div>

      {/* Phase 2: Header Section - Modern Clean Header - Fixed on Desktop Only */}
      <div className="flex-shrink-0 sm:sticky sm:top-0 z-30" style={{ 
        transform: 'translateZ(0)',
      }}>
        <div 
          className="backdrop-blur-md relative bg-app-surface/80 border-b border-app-border"
        >
          
          <div className="px-4 sm:px-6 py-2 sm:py-2.5 relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex-1 sm:flex-initial">
                  {/* MarketWatch Title - Clean Modern */}
                  <h1 
                    className="text-xl sm:text-2xl font-bold text-app-text-primary"
                  >
                    MarketWatch
                  </h1>
                  {/* Real-time market data Subtitle */}
                  <p 
                    className="text-xs sm:text-sm hidden sm:block mt-1 text-app-text-secondary"
                  >
                    Real-time market data
                  </p>
                </div>
              </div>
              <div className="w-full sm:flex-1 sm:max-w-md">
                <div className="relative">
                  {/* Search Icon */}
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-app-text-tertiary pointer-events-none z-10" />
                  {/* Search Bar - Modern Rounded */}
                  <input
                    type="text"
                    placeholder="Search by symbol..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 rounded-xl text-sm text-app-text-primary bg-app-bg border border-app-border focus:outline-none focus:border-app-blue transition-all"
                    style={{
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    }}
                  />
                  <style>{`
                    input::placeholder {
                      color: rgba(200, 200, 200, 0.7) !important;
                      font-weight: 300 !important;
                      font-size: 0.875rem !important;
                      
                    }
                  `}</style>
                  {/* Plus Button - Glowing Orb Effect with Soft Pulsating Glow */}
                  <button
                    onClick={handleSearchModalOpen}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full transition-all duration-200 flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(14, 116, 144, 1))',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2: Navigation Tabs - Underline Style - Fixed on Desktop Only */}
      <div 
        ref={tabsContainerRef}
        className="flex-shrink-0 sm:sticky sm:top-0 z-30 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 sm:px-6 py-2.5 border-b"
          style={{
          transform: 'translateZ(0)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'rgba(2, 6, 23, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex gap-4 sm:gap-6 items-center justify-center min-w-max">
          {(() => {
            // Don't reorder tabs, show them in original order
            return tabs.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) {
                    tabRefs.current[tab.id] = el;
                  }
                }}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex-shrink-0 py-2.5 px-2 sm:px-3 text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id ? '' : ''
                }`}
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  textRendering: 'optimizeLegibility',
                  ...(activeTab === tab.id ? {
                    // Active Tab - White text with underline
                    color: '#FFFFFF',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                  } : {
                    // Inactive Tab - Muted color
                    color: 'rgba(180, 190, 200, 0.7)',
                    fontWeight: 400,
                  })
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.transition = 'all 0.15s ease-out';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'rgba(180, 190, 200, 0.7)';
                  }
                }}
              >
                {tab.label}
                {/* Underline indicator for active tab */}
                {activeTab === tab.id && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
                      animation: 'slideIn 0.2s ease-out',
                    }}
                  />
                )}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Phase 2: Market Watch Table - Dominant Glassmorphism Panel */}
      <div ref={scrollContainerRef} className="flex-1 sm:overflow-y-auto relative z-10 px-3 sm:px-6 pb-1 sm:pb-4 premium-scrollbar" style={{ 
        transform: 'translateZ(0)', 
        minHeight: 0,
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 border-3 border-app-border rounded-full"></div>
              <div className="absolute inset-0 border-3 border-app-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
            <p className="text-app-text-primary text-sm font-medium">Loading market data...</p>
          </div>
        ) : filteredSymbols.length > 0 ? (
          <div 
            className="rounded-xl sm:rounded-2xl backdrop-blur-[25px] mt-3 sm:mt-4 overflow-hidden relative"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
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
            {/* Table Headers - Desktop Only (Mobile uses card layout) */}
            <div 
              className="hidden sm:block sticky top-0 z-20 px-4 py-3.5 border-b"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Desktop: All columns */}
              <div className="grid grid-cols-[1.5fr_0.9fr_0.9fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.8fr] gap-2 text-sm uppercase relative z-10" style={{ 
                fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                textRendering: 'optimizeLegibility',
              }}>
                <div className="text-left">SYMBOLS</div>
                <div className="text-center">ASK</div>
                <div className="text-center">BID</div>
                <div className="text-center">LTP</div>
                <div className="text-center">CHG</div>
                <div className="text-center">HIGH</div>
                <div className="text-center">LOW</div>
                <div className="text-center">OPEN</div>
                <div className="text-center">CLOSE</div>
                <div className="text-center">OL</div>
                <div className="text-center">VOL</div>
              </div>
            </div>
            
            <div className="bg-transparent relative z-10 py-3 sm:py-0">
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
                  const calculatedPercent = ((changeFromCloseUSD / closeUSD) * 100);
                  // Validate percentage - if unreasonably large (>50%), show 0.00
                  changePercent = (Math.abs(calculatedPercent) <= 50) ? calculatedPercent.toFixed(2) : '0.00';
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
                  const calculatedPercent = ((changeFromClose / closePrice) * 100);
                  // Validate percentage - if unreasonably large (>50%), show 0.00
                  changePercent = (Math.abs(calculatedPercent) <= 50) ? calculatedPercent.toFixed(2) : '0.00';
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
              // Format symbol name with slash for crypto/forex/commodity
              const symbolDisplay = formatSymbolWithSlash(symbolNameParts[0] || 'N/A', symbol.ExchangeType || activeTab);
              
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
              
              // Format additional values
              let ltpDisplay, chgDisplay, highDisplay, lowDisplay, openDisplay, closeDisplay, oiDisplay, volumeDisplay;
              
              if (isFXTab) {
                const exchangeType = symbol.ExchangeType || activeTab;
                const symbolName = symbol.SymbolName || '';
                const ltpPrice = parseFloat(symbol.ltpUSD || symbol.ltp || 0);
                const chgPrice = parseFloat(symbol.chgUSD !== undefined ? symbol.chgUSD : symbol.chg || 0);
                const highPrice = parseFloat(symbol.high || 0);
                const lowPrice = parseFloat(symbol.low || 0);
                const openPrice = parseFloat(symbol.open || 0);
                const closePrice = parseFloat(symbol.closeUSD || symbol.close || 0);
                
                // Validate change value - very strict validation
                const absChg = Math.abs(chgPrice);
                // Must have valid close price to calculate percentage properly
                const hasValidClose = closePrice > 0 && ltpPrice > 0;
                const isReasonableAbsolute = absChg < 50; // USD change shouldn't exceed 50
                const isReasonablePercent = hasValidClose ? (absChg / closePrice) < 0.1 : false; // <10% change from close
                const isReasonableChange = hasValidClose && isReasonableAbsolute && isReasonablePercent;
                
                ltpDisplay = ltpPrice > 0 ? formatFXPrice(ltpPrice, exchangeType, symbolName) : '-';
                chgDisplay = (chgPrice !== 0 && isReasonableChange) ? (chgPrice > 0 ? '+' : '') + formatFXPrice(chgPrice, exchangeType, symbolName) : '-';
                highDisplay = highPrice > 0 ? formatFXPrice(highPrice, exchangeType, symbolName) : '-';
                lowDisplay = lowPrice > 0 ? formatFXPrice(lowPrice, exchangeType, symbolName) : '-';
                openDisplay = openPrice > 0 ? formatFXPrice(openPrice, exchangeType, symbolName) : '-';
                closeDisplay = closePrice > 0 ? formatFXPrice(closePrice, exchangeType, symbolName) : '-';
              } else {
                const ltpPrice = parseFloat(symbol.ltp || 0);
                const chgPrice = parseFloat(symbol.chg || 0);
                const highPrice = parseFloat(symbol.high || 0);
                const lowPrice = parseFloat(symbol.low || 0);
                const openPrice = parseFloat(symbol.open || 0);
                const closePrice = parseFloat(symbol.close || 0);
                
                // Validate change value - very strict validation
                const absChg = Math.abs(chgPrice);
                // Must have valid close price to calculate percentage properly
                const hasValidClose = closePrice > 0 && ltpPrice > 0;
                const isReasonableAbsolute = absChg < 500; // INR change shouldn't exceed 500
                const isReasonablePercent = hasValidClose ? (absChg / closePrice) < 0.1 : false; // <10% change from close
                const isReasonableChange = hasValidClose && isReasonableAbsolute && isReasonablePercent;
                
                ltpDisplay = ltpPrice > 0 ? ltpPrice.toString() : '-';
                chgDisplay = (chgPrice !== 0 && isReasonableChange) ? (chgPrice > 0 ? '+' : '') + chgPrice.toString() : '-';
                highDisplay = highPrice > 0 ? highPrice.toString() : '-';
                lowDisplay = lowPrice > 0 ? lowPrice.toString() : '-';
                openDisplay = openPrice > 0 ? openPrice.toString() : '-';
                closeDisplay = closePrice > 0 ? closePrice.toString() : '-';
              }
              
              const oiValue = parseFloat(symbol.oi || 0);
              const volumeValue = parseFloat(symbol.volume || 0);
              oiDisplay = oiValue > 0 ? oiValue.toLocaleString() : '-';
              volumeDisplay = volumeValue > 0 ? volumeValue.toLocaleString() : '-';
              
              // Determine color for CHG based on positive/negative
              const chgColor = parseFloat(symbol.chg || 0) >= 0 
                ? 'linear-gradient(to bottom right, #27AE60, #2ECC71)' 
                : 'linear-gradient(to bottom right, #C0392B, #E74C3C)';
              
              // Premium table layout for all exchanges
              return (
                <div
                  key={symbol.SymbolToken}
                  className="mb-3 sm:mb-0 rounded-xl sm:rounded-none bg-app-surface/40 sm:bg-transparent border sm:border-0 sm:border-b sm:grid sm:grid-cols-[1.5fr_0.9fr_0.9fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.8fr] sm:gap-2 px-4 sm:px-4 py-4 sm:py-4 transition-all duration-150 cursor-pointer group touch-manipulation relative"
                  onClick={() => handleSymbolClick(symbol)}
                  style={{
                    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    textRendering: 'optimizeLegibility',
                    boxShadow: window.innerWidth < 640 ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(74, 144, 226, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (window.innerWidth >= 640) {
                      e.currentTarget.style.background = '';
                    } else {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.background = 'rgba(74, 144, 226, 0.12)';
                  }}
                  onTouchEnd={(e) => {
                    setTimeout(() => {
                      if (window.innerWidth >= 640) {
                        e.currentTarget.style.background = '';
                      } else {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }
                    }, 150);
                  }}
                >
                  {/* Mobile Layout - Card Style */}
                  <div className="sm:hidden space-y-3">
                    {/* Top Row: Symbol, Ask, Bid */}
                    <div className="flex items-start justify-between gap-3">
                      {/* Symbol Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span 
                            className="text-base text-white font-semibold"
                            style={{
                              color: '#FFFFFF',
                              fontWeight: 600,
                              fontSize: '1rem',
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              textRendering: 'optimizeLegibility',
                            }}
                          >
                            {symbolDisplay}
                          </span>
                          {formattedDate && (
                            <span 
                              className="text-[11px] px-1.5 py-0.5 rounded"
                              style={{
                                background: 'rgba(26, 60, 107, 0.6)',
                                color: '#FFFFFF',
                                fontWeight: 500,
                                fontSize: '0.6875rem',
                                fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                textRendering: 'optimizeLegibility',
                              }}
                            >
                              {formattedDate}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Ask and Bid Buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* ASK Button */}
                        <div 
                          className="px-2 py-1.5 rounded-md transition-all duration-200 relative overflow-hidden flex items-center justify-center min-w-[65px]"
                          style={{
                            background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 1px 4px rgba(46, 204, 113, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          }}
                        >
                          <span className="text-white text-xs whitespace-nowrap block text-center font-semibold" style={{ 
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            color: '#FFFFFF',
                            letterSpacing: '-0.01em',
                            fontVariantNumeric: 'tabular-nums',
                            textRendering: 'optimizeLegibility',
                          }}>
                            {askDisplay}
                          </span>
                        </div>
                        
                        {/* BID Button */}
                        <div 
                          className="px-2 py-1.5 rounded-md transition-all duration-200 relative overflow-hidden flex items-center justify-center min-w-[65px]"
                          style={{
                            background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 1px 4px rgba(231, 76, 60, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          }}
                        >
                          <span className="text-white text-xs whitespace-nowrap block text-center font-semibold" style={{ 
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            color: '#FFFFFF',
                            letterSpacing: '-0.01em',
                            fontVariantNumeric: 'tabular-nums',
                            textRendering: 'optimizeLegibility',
                          }}>
                            {bidDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Row: Chg, High, Low, Ltp - Stacked Labels */}
                    <div className="flex items-stretch justify-between gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 500,
                          fontSize: '0.625rem',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '0.02em',
                        }}>Chg</span>
                        <span className="text-xs font-semibold" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: parseFloat(symbol.chg || 0) >= 0 ? '#2ECC71' : '#E74C3C',
                          textRendering: 'optimizeLegibility',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {chgDisplay}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 500,
                          fontSize: '0.625rem',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '0.02em',
                        }}>High</span>
                        <span className="text-xs text-white font-semibold" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textRendering: 'optimizeLegibility',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {highDisplay}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 500,
                          fontSize: '0.625rem',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '0.02em',
                        }}>Low</span>
                        <span className="text-xs text-white font-semibold" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textRendering: 'optimizeLegibility',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {lowDisplay}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 500,
                          fontSize: '0.625rem',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '0.02em',
                        }}>LTP</span>
                        <span className="text-xs text-white font-semibold" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textRendering: 'optimizeLegibility',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {ltpDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop Layout - Grid */}
                  <div className="hidden sm:contents">
                  {/* SYMBOLS Column - Premium Typography */}
                  <div className="flex items-center min-w-0 relative z-10">
                      <div className="overflow-hidden w-full" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      textRendering: 'optimizeLegibility',
                    }}>
                        <div className="flex items-center gap-2 flex-wrap">
                        <span 
                            className="text-base text-white font-semibold"
                          style={{
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                            textRendering: 'optimizeLegibility',
                          }}
                        >
                          {symbolDisplay}
                        </span>
                        {formattedDate && (
                          <span 
                              className="text-xs px-2 py-1 rounded-full transition-all duration-200"
                            style={{
                              background: '#1A3C6B',
                              color: '#FFFFFF',
                              fontWeight: 500,
                              fontSize: '0.6875rem',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              textRendering: 'optimizeLegibility',
                            }}
                          >
                            {formattedDate}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs pr-1" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 400,
                          color: '#8090A0',
                          fontSize: '0.75rem',
                          textRendering: 'optimizeLegibility',
                        }}>{symbol.ExchangeType}</span>
                        <span className="text-xs" style={{ 
                          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 400,
                          color: '#8090A0',
                          fontSize: '0.75rem',
                          textRendering: 'optimizeLegibility',
                        }}>Lot: {symbol.Lotsize}</span>
                      </div>
                    </div>
                  </div>
                  
                    {/* ASK Column - Green Button */}
                  <div className="text-center flex items-center justify-center relative z-10">
                    <div 
                      className="px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden w-full flex items-center justify-center"
                      style={{
                          background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 2px 10px rgba(46, 204, 113, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <span className="text-white text-sm whitespace-nowrap block text-center font-bold" style={{ 
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 700,
                        color: '#FFFFFF',
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                        textRendering: 'optimizeLegibility',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                      }}>
                        {askDisplay}
                      </span>
                    </div>
                  </div>
                  
                    {/* BID Column - Red Button */}
                  <div className="text-center flex items-center justify-center relative z-10">
                    <div 
                      className="px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden w-full flex items-center justify-center"
                      style={{
                          background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 2px 10px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <span className="text-white text-sm whitespace-nowrap block text-center font-bold" style={{ 
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          fontWeight: 700,
                        color: '#FFFFFF',
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                        textRendering: 'optimizeLegibility',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                      }}>
                        {bidDisplay}
                      </span>
                    </div>
                  </div>
                  
                  {/* LTP Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {ltpDisplay}
                    </span>
                  </div>
                  
                  {/* CHG Column - Professional Text with Color - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: parseFloat(symbol.chg || 0) >= 0 ? '#2ECC71' : '#E74C3C',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {chgDisplay}
                    </span>
                  </div>
                  
                  {/* HIGH Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {highDisplay}
                    </span>
                  </div>
                  
                  {/* LOW Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {lowDisplay}
                    </span>
                  </div>
                  
                  {/* OPEN Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {openDisplay}
                    </span>
                  </div>
                  
                  {/* CLOSE Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {closeDisplay}
                    </span>
                  </div>
                  
                  {/* OL (Open Interest) Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {oiDisplay}
                    </span>
                  </div>
                  
                  {/* VOLUME Column - Professional Text - Hidden on Mobile */}
                  <div className="hidden sm:flex text-center items-center justify-center relative z-10">
                    <span className="text-white text-sm whitespace-nowrap truncate" style={{ 
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      color: '#E0E0E0',
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      textRendering: 'optimizeLegibility',
                    }}>
                      {volumeDisplay}
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
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
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
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
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
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
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
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 2px 0px rgba(0, 0, 0, 0.3)';
                  }}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto -mx-2 px-2 relative z-10">
              {modalLoading ? (
                renderModalLoader('Loading suggestions', 'Curating the best matches')
              ) : searchLoading ? (
                renderModalLoader('Searching', 'Looking across all instruments')
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
                            e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)';
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
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
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
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.2)';
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
        
        /* Premium Grid Overlay - Ultra-Fine with Parallax/Shimmer Animation */
        @keyframes gridParallax {
          0% {
            background-position: 0 0;
            opacity: 0.25;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            background-position: 50px 50px;
            opacity: 0.25;
          }
        }
        
        .premium-grid-overlay {
          animation: gridParallax 40s linear infinite;
        }
        
        
        /* Ultra-Minimalist Scrollbar - Responsive */
        .premium-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .premium-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .premium-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(150, 160, 180, 0.3);
          border-radius: 2px;
        }
        
        .premium-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 144, 226, 0.6);
        }
        
        /* Firefox scrollbar */
        .premium-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(150, 160, 180, 0.3) transparent;
        }
        
        /* Smooth scrolling */
        .premium-scrollbar {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        
        /* Prevent layout shifts during scroll */
        .premium-scrollbar * {
          will-change: auto;
        }
        
        /* Underline animation */
        @keyframes slideIn {
          from {
            transform: scaleX(0);
            opacity: 0;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }
        
        /* Smooth touch interactions */
        @media (max-width: 640px) {
          * {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  </>
);
};

export default MarketWatch;