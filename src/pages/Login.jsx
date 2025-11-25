import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, Lock, User, Server, TrendingUp } from 'lucide-react';
import { authAPI } from '../services/api';
import { generateDeviceId, getDeviceIP } from '../utils/deviceUtils';
import { useAuth } from '../hooks/useAuth.jsx';
import logo from '../assets/logo.svg';


const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    serverCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const formRef = useRef(null);

  // Load animation
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const deviceId = generateDeviceId();
      const deviceIp = await getDeviceIP();
      const masterRefId = localStorage.getItem('masteruserid') || 'null';
      
      const response = await authAPI.login(
        formData.username,
        formData.password,
        deviceId,
        formData.serverCode || 'undefined',
        masterRefId
      );

      if (response && response.UserId) {
        // Store all user data as per original logic
        const userData = {
          ...response,
          deviceId,
          deviceIp,
          oldpassword: formData.password
        };
        
        // Store ALL individual items in localStorage
        localStorage.setItem("userid", response.UserId || '');
        localStorage.setItem("ClientName", response.ClientName || '');
        localStorage.setItem("oldpassword", formData.password);
        localStorage.setItem("Refid", response.Refid || '');
        localStorage.setItem("isonlinepayment", response.isonlinepayment || '');
        localStorage.setItem("MobileNo", response.MobileNo || '');
        localStorage.setItem("EmailId", response.EmailId || '');
        localStorage.setItem("IsMCXTrade", response.IsMCXTrade || '');
        localStorage.setItem("IsNSETrade", response.IsNSETrade || '');
        localStorage.setItem("IsCDSTrade", response.IsCDSTrade || '');
        localStorage.setItem("TradeEquityUnits", response.TradeEquityUnits || '');
        localStorage.setItem("TradeMCXUnits", response.TradeMCXUnits || '');
        localStorage.setItem("TradeCDSUnits", response.TradeCDSUnits || '');
        localStorage.setItem("profittradestoptime", response.profittradestoptime || '');
        localStorage.setItem("FirstTimeLogin", response.FirstTimeLogin || '');
        localStorage.setItem("ValidTill", response["ValidTill "] || '');
        localStorage.setItem("CreditLimit", response.CreditLimit || '');
        localStorage.setItem("LedgerBalance", response.LedgerBalance || '');
        localStorage.setItem("AllowOrdersCurrentBid", response.AllowOrdersCurrentBid || '');
        localStorage.setItem("AllowFreshEntryHighAndBelow", response.AllowFreshEntryHighAndBelow || '');
        localStorage.setItem("AllowOrdersHighLow", response.AllowOrdersHighLow || '');
        localStorage.setItem("AutoCloseTradesLossesLimit", response.AutoCloseTradesLossesLimit || '');
        localStorage.setItem("auto_close_all_active_trades_when_the_losses_reach", response.auto_close_all_active_trades_when_the_losses_reach || '');
        localStorage.setItem("Maximum_lot_size_allowed_per_single_trade_of_MCX", response.Maximum_lot_size_allowed_per_single_trade_of_MCX || '');
        localStorage.setItem("Minimum_lot_size_required_per_single_trade_of_MCX", response.Minimum_lot_size_required_per_single_trade_of_MCX || '');
        localStorage.setItem("Maximum_lot_size_allowed_per_script_of_MCX_to_be", response.Maximum_lot_size_allowed_per_script_of_MCX_to_be || '');
        localStorage.setItem("Maximum_lot_size_allowed_overall_in_MCX_to_be", response.Maximum_lot_size_allowed_overall_in_MCX_to_be || '');
        localStorage.setItem("Mcx_Brokerage_Type", response.Mcx_Brokerage_Type || '');
        localStorage.setItem("MCX_brokerage_per_crore", response.MCX_brokerage_per_crore || '');
        localStorage.setItem("Mcx_Exposure_Type", response.Mcx_Exposure_Type || '');
        localStorage.setItem("BULLDEX_brokerage", response.BULLDEX_brokerage || '');
        localStorage.setItem("GOLD_brokerage", response.GOLD_brokerage || '');
        localStorage.setItem("SILVER_brokerage", response.SILVER_brokerage || '');
        localStorage.setItem("CRUDEOIL_brokerage", response.CRUDEOIL_brokerage || '');
        localStorage.setItem("COPPER_brokerage", response.COPPER_brokerage || '');
        localStorage.setItem("NICKEL_brokerage", response.NICKEL_brokerage || '');
        localStorage.setItem("ZINC_brokerage", response.ZINC_brokerage || '');
        localStorage.setItem("LEAD_brokerage", response.LEAD_brokerage || '');
        localStorage.setItem("NATURALGAS_brokerage", response.NATURALGAS_brokerage || '');
        localStorage.setItem("ALUMINIUM_brokerage", response.ALUMINIUM_brokerage || '');
        localStorage.setItem("MENTHAOIL_brokerage", response.MENTHAOIL_brokerage || '');
        localStorage.setItem("COTTON_brokerage", response.COTTON_brokerage || '');
        localStorage.setItem("CPO_brokerage", response.CPO_brokerage || '');
        localStorage.setItem("GOLDM_brokerage", response.GOLDM_brokerage || '');
        localStorage.setItem("SILVERM_brokerage", response.SILVERM_brokerage || '');
        localStorage.setItem("SILVERMIC_brokerage", response.SILVERMIC_brokerage || '');
        localStorage.setItem("ALUMINI_brokerage", response.ALUMINI_brokerage || '');
        localStorage.setItem("CRUDEOILM_brokerage", response.CRUDEOILM_brokerage || '');
        localStorage.setItem("LEADMINI_brokerage", response.LEADMINI_brokerage || '');
        localStorage.setItem("NATGASMINI_brokerage", response.NATGASMINI_brokerage || '');
        localStorage.setItem("ZINCMINI_brokerage", response.ZINCMINI_brokerage || '');
        localStorage.setItem("Intraday_Exposure_Margin_MCX", response.Intraday_Exposure_Margin_MCX || '');
        localStorage.setItem("Holding_Exposure_Margin_MCX", response.Holding_Exposure_Margin_MCX || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_BULLDEX_Intraday", response.MCX_Exposure_Lot_wise_BULLDEX_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_BULLDEX_Holding", response.MCX_Exposure_Lot_wise_BULLDEX_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_GOLD_Intraday", response.MCX_Exposure_Lot_wise_GOLD_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_GOLD_Holding", response.MCX_Exposure_Lot_wise_GOLD_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVER_Intraday", response.MCX_Exposure_Lot_wise_SILVER_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVER_Holding", response.MCX_Exposure_Lot_wise_SILVER_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CRUDEOIL_Intraday", response.MCX_Exposure_Lot_wise_CRUDEOIL_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CRUDEOIL_Holding", response.MCX_Exposure_Lot_wise_CRUDEOIL_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ALUMINI_Intraday", response.MCX_Exposure_Lot_wise_ALUMINI_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ALUMINI_Holding", response.MCX_Exposure_Lot_wise_ALUMINI_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CRUDEOILM_Intraday", response.MCX_Exposure_Lot_wise_CRUDEOILM_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CRUDEOILM_Holding", response.MCX_Exposure_Lot_wise_CRUDEOILM_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_LEADMINI_Intraday", response.MCX_Exposure_Lot_wise_LEADMINI_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_LEADMINI_Holding", response.MCX_Exposure_Lot_wise_LEADMINI_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NATGASMINI_Intraday", response.MCX_Exposure_Lot_wise_NATGASMINI_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NATGASMINI_Holding", response.MCX_Exposure_Lot_wise_NATGASMINI_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ZINCMINI_Intraday", response.MCX_Exposure_Lot_wise_ZINCMINI_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ZINCMINI_Holding", response.MCX_Exposure_Lot_wise_ZINCMINI_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_COPPER_Intraday", response.MCX_Exposure_Lot_wise_COPPER_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_COPPER_Holding", response.MCX_Exposure_Lot_wise_COPPER_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NICKEL_Intraday", response.MCX_Exposure_Lot_wise_NICKEL_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NICKEL_Holding", response.MCX_Exposure_Lot_wise_NICKEL_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ZINC_Intraday", response.MCX_Exposure_Lot_wise_ZINC_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ZINC_Holding", response.MCX_Exposure_Lot_wise_ZINC_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_LEAD_Intraday", response.MCX_Exposure_Lot_wise_LEAD_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_LEAD_Holding", response.MCX_Exposure_Lot_wise_LEAD_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NATURALGAS_Intraday", response.MCX_Exposure_Lot_wise_NATURALGAS_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_NATURALGAS_Holding", response.MCX_Exposure_Lot_wise_NATURALGAS_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ALUMINIUM_Intraday", response.MCX_Exposure_Lot_wise_ALUMINIUM_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_ALUMINIUM_Holding", response.MCX_Exposure_Lot_wise_ALUMINIUM_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_MENTHAOIL_Intraday", response.MCX_Exposure_Lot_wise_MENTHAOIL_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_MENTHAOIL_Holding", response.MCX_Exposure_Lot_wise_MENTHAOIL_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_COTTON_Intraday", response.MCX_Exposure_Lot_wise_COTTON_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_COTTON_Holding", response.MCX_Exposure_Lot_wise_COTTON_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CPO_Intraday", response.MCX_Exposure_Lot_wise_CPO_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_CPO_Holding", response.MCX_Exposure_Lot_wise_CPO_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_GOLDM_Intraday", response.MCX_Exposure_Lot_wise_GOLDM_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_GOLDM_Holding", response.MCX_Exposure_Lot_wise_GOLDM_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVERM_Intraday", response.MCX_Exposure_Lot_wise_SILVERM_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVERM_Holding", response.MCX_Exposure_Lot_wise_SILVERM_Holding || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVERMIC_Intraday", response.MCX_Exposure_Lot_wise_SILVERMIC_Intraday || '');
        localStorage.setItem("MCX_Exposure_Lot_wise_SILVERMIC_Holding", response.MCX_Exposure_Lot_wise_SILVERMIC_Holding || '');
        localStorage.setItem("NSE_Brokerage_Type", response.NSE_Brokerage_Type || '');
        localStorage.setItem("Equity_brokerage_per_crore", response.Equity_brokerage_per_crore || '');
        localStorage.setItem("NSE_Exposure_Type", response.NSE_Exposure_Type || '');
        localStorage.setItem("Intraday_Exposure_Margin_EQUITY", response.Intraday_Exposure_Margin_EQUITY || '');
        localStorage.setItem("Holding_Exposure_Margin_EQUITY", response.Holding_Exposure_Margin_EQUITY || '');
        localStorage.setItem("CDS_Brokerage_Type", response.CDS_Brokerage_Type || '');
        localStorage.setItem("CDS_brokerage_per_crore", response.CDS_brokerage_per_crore || '');
        localStorage.setItem("CDS_Exposure_Type", response.CDS_Exposure_Type || '');
        localStorage.setItem("Intraday_Exposure_Margin_CDS", response.Intraday_Exposure_Margin_CDS || '');
        localStorage.setItem("Holding_Exposure_Margin_CDS", response.Holding_Exposure_Margin_CDS || '');
        localStorage.setItem("TotalActive", response.TotalActive || '');
        localStorage.setItem("TotalPending", response.TotalPending || '');
        localStorage.setItem("TotalClosed", response.TotalClosed || '');
        
        // Crypto trading fields
        localStorage.setItem("Trade_in_crypto", response.Trade_in_crypto || '');
        localStorage.setItem("CryptoBrokerageType", response.CryptoBrokerageType || '');
        localStorage.setItem("CryptoBrokerage", response.CryptoBrokerage || '');
        localStorage.setItem("CryptoIntradayMargin", response.CryptoIntradayMargin || '');
        localStorage.setItem("MinLotSingleTradeCrypto", response.MinLotSingleTradeCrypto || '');
        localStorage.setItem("MaxLotSingleTradeCrypto", response.MaxLotSingleTradeCrypto || '');
        localStorage.setItem("MaxLotOverAllTradeCrypto", response.MaxLotOverAllTradeCrypto || '');
        localStorage.setItem("TradeCryptoIntradayClosing", response.TradeCryptoIntradayClosing || '');
        
        // Forex trading fields
        localStorage.setItem("Trade_in_forex", response.Trade_in_forex || '');
        localStorage.setItem("ForexBrokerageType", response.ForexBrokerageType || '');
        localStorage.setItem("ForexBrokerage", response.ForexBrokerage || '');
        localStorage.setItem("ForexIntradayMargin", response.ForexIntradayMargin || '');
        localStorage.setItem("MinLotSingleTradeForex", response.MinLotSingleTradeForex || '');
        localStorage.setItem("MaxLotSingleTradeForex", response.MaxLotSingleTradeForex || '');
        localStorage.setItem("MaxLotOverAllTradeForex", response.MaxLotOverAllTradeForex || '');
        localStorage.setItem("TradeForexIntradayClosing", response.TradeForexIntradayClosing || '');
        
        // Commodity trading fields
        localStorage.setItem("Trade_in_commodity", response.Trade_in_commodity || '');
        localStorage.setItem("CommodityBrokerageType", response.CommodityBrokerageType || '');
        localStorage.setItem("CommodityBrokerage", response.CommodityBrokerage || '');
        localStorage.setItem("CommodityIntradayMargin", response.CommodityIntradayMargin || '');
        localStorage.setItem("MinLotSingleTradeCommodity", response.MinLotSingleTradeCommodity || '');
        localStorage.setItem("MaxLotSingleTradeCommodity", response.MaxLotSingleTradeCommodity || '');
        localStorage.setItem("MaxLotOverAllTradeCommodity", response.MaxLotOverAllTradeCommodity || '');
        localStorage.setItem("TradeCommodityIntradayClosing", response.TradeCommodityIntradayClosing || '');
        
        // Save the complete response object as JSON for easy access
        localStorage.setItem("loginResponse", JSON.stringify(response));
        
        login(userData);
        toast.success(`Welcome back, ${response.ClientName}!`);
        navigate('/dashboard');
      } else if (response === 'false') {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        toast.error('Invalid Login Details. Please Try Again.');
      } else if (response === 'Bloked') {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        toast.error('Sorry Your Account Is Blocked');
      } else {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        toast.error('Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      toast.error('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Live ticker data for social proof
  const tickerData = [
    { symbol: 'BTC', change: '+2.4%', color: 'text-green-400' },
    { symbol: 'ETH', change: '+1.8%', color: 'text-green-400' },
    { symbol: 'SPY', change: '+0.3%', color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-[#02050a] relative overflow-hidden">
      {/* Ambient Lighting Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top-left: Deep Blue */}
        <div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
          }}
        ></div>
        {/* Bottom-right: Emerald Green */}
        <div 
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
          }}
        ></div>
      </div>

      {/* Subtle Grid Texture - Visible through glass */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      ></div>
      
      {/* Visual Bridge Element - Blurred chart line spanning both sides */}
      <div 
        className="fixed top-1/2 left-0 right-0 pointer-events-none z-5 hidden lg:block"
        style={{
          transform: 'translateY(-50%)',
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.3) 20%, rgba(34, 197, 94, 0.3) 80%, transparent 100%)',
          filter: 'blur(2px)',
        }}
      ></div>

      {/* Vignette Effect - Darken corners */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      ></div>

      {/* Back Button - Top Left - Simplified */}
      <div className="absolute top-6 left-6 z-50">
        <button
          onClick={() => navigate('/welcome')}
          className="flex items-center text-[#6B7280] hover:text-white transition-colors"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          <ArrowLeft className="w-3 h-3 mr-2" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Layout - 60/40 Split on Desktop */}
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[60%_40%] relative z-10">
        {/* Left Side (60% - Brand Side) */}
        <div className="hidden lg:flex flex-col justify-between p-12 lg:p-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="TradeNstocko Logo" className="w-10 h-10 rounded-lg object-contain" />
            <span className="text-white font-semibold text-lg tracking-tight">Tradenstocko</span>
          </div>

          {/* Headline - Moved Up */}
          <div className="flex-1 flex items-start pt-16">
            <div className={`transition-all duration-1000 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              <h1 
                className="text-6xl xl:text-7xl font-bold mb-2"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.04em',
                  lineHeight: '1.1',
                  color: '#FFFFFF',
                }}
              >
                Trade Smarter<span style={{ color: '#22c55e' }}>.</span>
              </h1>
              <h2 
                className="text-5xl xl:text-6xl font-bold"
                style={{
                  background: 'linear-gradient(to bottom, #FFFFFF 0%, #22c55e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.15',
                  marginTop: '0',
                  paddingBottom: '4px',
                  display: 'block',
                }}
              >
                Login Securely.
              </h2>
            </div>
          </div>

          {/* Social Proof - Live Tickers */}
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Live Markets</span>
            <div className="flex items-center space-x-4">
              {tickerData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-white font-semibold">{item.symbol}</span>
                  <span className={`font-mono ${item.color}`}>{item.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side (40% - Focus Side) - Glass Card */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
          {/* Stage Light - Deep Blue Orb behind the card (top-right) */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[1000px] h-[1000px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(30, 58, 138, 0.5) 0%, rgba(37, 99, 235, 0.4) 20%, rgba(6, 182, 212, 0.2) 40%, rgba(0, 0, 0, 0) 70%)',
                filter: 'blur(120px)',
                opacity: 0.4,
                transform: 'translate(80px, -80px)',
              }}
            ></div>
          </div>
          
          {/* Atmospheric Nebula - Deep blue haze behind the card */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[900px] h-[900px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(30, 58, 138, 0.4) 0%, rgba(37, 99, 235, 0.3) 20%, rgba(6, 182, 212, 0.2) 40%, rgba(0, 0, 0, 0) 70%)',
                filter: 'blur(100px)',
                opacity: 0.3,
                transform: 'translate(50px, -50px)',
              }}
            ></div>
          </div>
          
          {/* Blue/Cyan Haze - Ambient glow behind the card */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[800px] h-[800px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(6, 182, 212, 0.2) 30%, rgba(0, 0, 0, 0) 70%)',
                filter: 'blur(120px)',
                opacity: 0.2,
              }}
            ></div>
          </div>
          
          {/* Green Haze - Additional ambient glow */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[500px] h-[500px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
                filter: 'blur(100px)',
                transform: 'translate(100px, 100px)',
              }}
            ></div>
          </div>

          {/* Gradient Border Wrapper */}
          <div 
            className={`w-full max-w-md transition-all duration-1000 relative ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            } ${shakeError ? 'animate-shake' : ''}`}
            style={{
              borderRadius: '24px',
              padding: '1px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              zIndex: 2,
            }}
          >
            {/* Glass Card Inner with Noise Texture - Holographic */}
            <div 
              ref={formRef}
              className="w-full h-full rounded-[23px] relative overflow-hidden"
              style={{
                backdropFilter: 'blur(40px)',
                backgroundColor: 'rgba(20, 25, 35, 0.4)',
                padding: '48px',
                boxShadow: `
                  inset 1px 1px 0px 0px rgba(255, 255, 255, 0.1),
                  inset -1px -1px 0px 0px rgba(0, 0, 0, 0.4),
                  0px 20px 40px -10px rgba(0, 0, 0, 0.5)
                `,
              }}
            >
              {/* Noise Texture Overlay - Grain Effect */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
                  opacity: 1,
                  mixBlendMode: 'overlay',
                  borderRadius: '23px',
                }}
              ></div>

              {/* Inner Highlight - Top */}
              <div 
                className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                }}
              ></div>
            {/* Mobile Logo & Title */}
            <div className="lg:hidden text-center mb-8 relative z-10">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <img src={logo} alt="TradeNstocko Logo" className="w-10 h-10 rounded-lg object-contain" />
                <span className="text-white font-semibold text-lg tracking-tight">Tradenstocko</span>
              </div>
              <h1 
                className="text-4xl font-bold mb-2"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.04em',
                  lineHeight: '1.1',
                  color: '#FFFFFF',
                }}
              >
                Trade Smarter<span style={{ color: '#22c55e' }}>.</span>
              </h1>
              <h2 
                className="text-3xl font-bold mb-4"
                style={{
                  background: 'linear-gradient(to bottom, #FFFFFF 0%, #22c55e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.15',
                  marginTop: '0',
                  paddingBottom: '4px',
                  display: 'block',
                }}
              >
                Login Securely.
              </h2>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Username Field */}
              <div className="relative">
                <div 
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                    focusedField === 'username' ? 'text-white' : 'text-slate-400'
                  }`}
                  style={{
                    filter: focusedField === 'username' ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none',
                  }}
                >
                  <User className="w-4 h-4" style={{ width: '18px', height: '18px' }} />
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-4 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none relative login-input"
                  style={{
                    background: focusedField === 'username' ? '#111827' : 'rgba(5, 7, 10, 0.6)',
                    border: focusedField === 'username' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '12px 16px 12px 40px',
                    boxShadow: focusedField === 'username' 
                      ? '0 0 0 1px #3b82f6, 0 0 15px rgba(59, 130, 246, 0.4)' 
                      : 'inset 0px 2px 4px 0px rgba(0, 0, 0, 0.5)',
                  }}
                  placeholder="Username"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div 
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                    focusedField === 'password' ? 'text-white' : 'text-slate-400'
                  }`}
                  style={{
                    filter: focusedField === 'password' ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none',
                  }}
                >
                  <Lock className="w-4 h-4" style={{ width: '18px', height: '18px' }} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-12 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none relative login-input"
                  style={{
                    background: focusedField === 'password' ? '#111827' : 'rgba(5, 7, 10, 0.6)',
                    border: focusedField === 'password' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '12px 40px 12px 40px',
                    boxShadow: focusedField === 'password' 
                      ? '0 0 0 1px #3b82f6, 0 0 15px rgba(59, 130, 246, 0.4)' 
                      : 'inset 0px 2px 4px 0px rgba(0, 0, 0, 0.5)',
                  }}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Submit Button - Emerald Green with Glow */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(to bottom, #22c55e, #15803d)',
                  boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.4)',
                  fontWeight: 700,
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: '17px' }}>Log In</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </button>

              {/* Forgot Password Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                  style={{
                    fontSize: '13px',
                    letterSpacing: '0.5px',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations & Styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Override browser autofill styles */
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus,
        .login-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(5, 7, 10, 0.6) inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white !important;
        }
        
        /* Input placeholder and text styling */
        .login-input::placeholder {
          font-size: 13px;
          text-transform: none;
          letter-spacing: normal;
          color: #6B7280;
        }
        
        .login-input {
          font-size: 14px;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default Login;
