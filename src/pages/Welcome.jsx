import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, HelpCircle, Settings, TrendingUp, ArrowUp } from 'lucide-react';
import logo from '../assets/logo.svg';

const Welcome = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  // Keep original functionality - DO NOT MODIFY
  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/registration');
  };

  // Cursor spotlight effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Load animation
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Live ticker data
  const tickerData = [
    { symbol: 'BTC', change: '+2.4%', color: 'text-green-400', isPositive: true },
    { symbol: 'NIFTY', change: '-0.1%', color: 'text-red-400', isPositive: false },
    { symbol: 'GOLD', change: '+0.5%', color: 'text-green-400', isPositive: true },
    { symbol: 'ETH', change: '+1.8%', color: 'text-green-400', isPositive: true },
    { symbol: 'SENSEX', change: '+0.3%', color: 'text-green-400', isPositive: true },
    { symbol: 'SILVER', change: '-0.2%', color: 'text-red-400', isPositive: false },
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#030712] relative overflow-hidden"
    >
      {/* Animated Aurora Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animation: 'aurora1 8s ease-in-out infinite' }}></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
             style={{ animation: 'aurora2 10s ease-in-out infinite' }}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl animate-pulse"
             style={{ animation: 'aurora3 12s ease-in-out infinite' }}></div>
      </div>

      {/* Subtle Grid Texture */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      ></div>

      {/* Spotlight Glows - Hidden on mobile */}
      <div className="fixed inset-0 pointer-events-none z-0 hidden lg:block">
        {/* Spotlight behind logo (top left) */}
        <div 
          className="absolute top-0 left-0 w-[600px] h-[600px] opacity-40"
          style={{
            background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.15), transparent 60%)',
          }}
        ></div>
        {/* Spotlight behind phone (center right) */}
        <div 
          className="absolute top-1/2 right-0 w-[800px] h-[800px] opacity-40"
          style={{
            background: 'radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.15), transparent 60%)',
          }}
        ></div>
      </div>

      {/* Cursor Spotlight - Hidden on mobile/touch devices */}
      <div
        className="fixed pointer-events-none z-50 hidden md:block"
        style={{
          left: mousePosition.x - 200,
          top: mousePosition.y - 200,
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          transition: 'opacity 0.3s ease',
        }}
      ></div>

      {/* Glassmorphism Header - Responsive for mobile */}
      <header className="fixed left-1/2 transform -translate-x-1/2 z-40 w-[95%] sm:w-[90%] max-w-[1200px]"
              style={{ top: '8px' }}>
        <div 
          className="backdrop-blur-[20px] bg-white/5 px-2 py-1.5 sm:px-4 sm:py-3 md:px-6 md:py-4 flex items-center justify-between shadow-2xl"
          style={{
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
        >
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            <img src={logo} alt="TradeNstocko Logo" className="w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg object-contain" />
            <span className="text-white font-semibold text-xs sm:text-base md:text-lg tracking-tight">Tradenstocko</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-3 md:space-x-4">
            <button className="text-slate-400 hover:text-blue-400 transition-colors" aria-label="Help">
              <HelpCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>
            <button className="text-slate-400 hover:text-blue-400 transition-colors" aria-label="Settings">
              <Settings className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Vertical Stack on Mobile */}
      <main className="relative z-10 pt-12 sm:pt-24 md:pt-28 lg:pt-32 pb-2 sm:pb-24 px-4 sm:px-6" style={{ minHeight: '100dvh' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-2 sm:gap-10 md:gap-12 items-center lg:items-start">
            {/* Hero Text Section - Center on Mobile, Left on Desktop */}
            <div 
              className={`w-full text-center lg:text-left transition-all duration-1000 mobile-order-1 lg:order-none ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div>
                <h1 
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mx-auto lg:mx-0"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '-0.02em',
                    lineHeight: '0.98',
                    marginBottom: '4px',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #BCCCDC 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    maxWidth: 'fit-content',
                  }}
                >
                  Trade Smarter.
                  <br />
                  Invest Better<span 
                    className="text-[#3B82F6]"
                    style={{
                      textShadow: '0 0 20px #3b82f6',
                      WebkitTextFillColor: '#3B82F6',
                    }}
                  >.</span>
                </h1>
                <p 
                  className="text-sm sm:text-lg md:text-xl font-light tracking-wide leading-relaxed mx-auto lg:mx-0 sub-headline"
                  style={{ 
                    letterSpacing: '0.05em',
                    color: '#CBD5E1',
                    marginBottom: '0',
                    maxWidth: '100%',
                  }}
                >
                  Experience institutional-grade execution with the simplicity of a modern app.
                </p>
              </div>
              
              {/* Action Buttons - Inside text section on Desktop, separate on Mobile */}
              <div className="w-full mobile-order-3 lg:order-none lg:mt-6 hidden lg:block">
                <div className="space-y-4 w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
                  {/* Primary CTA - Neon Gradient with Gem Effect */}
                  <button
                    onClick={handleRegister}
                    className="w-full md:w-auto group relative overflow-hidden bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white font-semibold py-5 px-8 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 btn-primary-gem"
                    style={{
                      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    <UserPlus className="w-5 h-5 flex-shrink-0" />
                    <span>Open New Account</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </button>

                  {/* Secondary CTA - Glass Button */}
                  <button
                    onClick={handleLogin}
                    className="w-full md:w-auto backdrop-blur-xl bg-white/5 border border-white/20 text-white font-semibold py-5 px-8 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    <LogIn className="w-5 h-5 flex-shrink-0" />
                    <span>Login</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Floating Smartphone Mockup - Middle on Mobile, Right on Desktop */}
            <div 
              className={`relative flex items-center justify-center transition-all duration-1000 delay-300 phone-container w-full lg:w-auto mobile-order-2 lg:order-none ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
              }`}
              style={{
                marginBottom: '0',
                marginTop: '0',
              }}
            >
              <div 
                className="relative perspective-1000 phone-scale-wrapper"
              >
                {/* Backlight Glow */}
                <div 
                  className="absolute inset-0 -z-10"
                  style={{
                    transform: 'translateZ(-50px)',
                  }}
                >
                  <div 
                    className="w-full h-full rounded-[3rem] blur-3xl opacity-60"
                    style={{
                      background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
                      transform: 'scale(1.2)',
                    }}
                  ></div>
                </div>

                {/* iPhone 15 Pro Frame */}
                <div 
                  className="relative phone-float"
                  style={{
                    width: 'clamp(200px, 50vw, 280px)',
                    height: 'clamp(415px, 103vw, 580px)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Phone Frame */}
                  <div 
                    className="absolute inset-0 rounded-[3rem] p-2"
                    style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Dynamic Island */}
                    <div 
                      className="absolute top-3 left-1/2 transform -translate-x-1/2 w-32 h-7 rounded-full"
                      style={{
                        background: '#000',
                      }}
                    ></div>

                    {/* Screen Content */}
                    <div 
                      className="absolute inset-2 rounded-[2.5rem] overflow-hidden"
                      style={{
                        background: '#030712',
                      }}
                    >
                      {/* Trading Interface */}
                      <div className="h-full p-6 flex flex-col">
                        {/* Header */}
                        <div className="mb-6">
                          <div className="text-slate-400 text-xs mb-2">Portfolio Value</div>
                          <div className="text-white text-3xl font-bold mb-1">$42,305.00</div>
                          <div className="text-green-400 text-sm font-semibold flex items-center">
                            <ArrowUp className="w-4 h-4 mr-1" />
                            +$1,234.56 (+3.0%)
                          </div>
                        </div>

                        {/* Chart */}
                        <div className="flex-1 relative mb-6">
                          <svg 
                            viewBox="0 0 200 100" 
                            className="w-full h-full"
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
                                <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
                              </linearGradient>
                            </defs>
                            {/* Area under line */}
                            <path
                              d="M 0,80 Q 30,70 50,50 T 100,30 T 150,20 T 200,15 L 200,100 L 0,100 Z"
                              fill="url(#chartGradient)"
                            />
                            {/* Green line */}
                            <path
                              d="M 0,80 Q 30,70 50,50 T 100,30 T 150,20 T 200,15"
                              stroke="#22c55e"
                              strokeWidth="3"
                              fill="none"
                              style={{
                                filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.8))',
                              }}
                            />
                          </svg>
                        </div>

                        {/* Buy Button with Neon Glow */}
                        <div className="relative">
                          {/* Glow behind button */}
                          <div 
                            className="absolute inset-0 rounded-xl blur-xl opacity-60"
                            style={{
                              background: 'rgba(34, 197, 94, 0.6)',
                              transform: 'scale(1.1)',
                            }}
                          ></div>
                          <button
                            className="relative w-full py-4 rounded-xl font-semibold text-white"
                            style={{
                              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.6)',
                            }}
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Below phone on Mobile only */}
            <div className="w-full mobile-order-3 lg:hidden">
              <div className="space-y-2 w-full max-w-md mx-auto">
                {/* Primary CTA - Neon Gradient with Gem Effect */}
                <button
                  onClick={handleRegister}
                  className="w-full md:w-auto group relative overflow-hidden bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 btn-primary-gem mobile-btn"
                  style={{
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  <UserPlus className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Open New Account</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>

                {/* Secondary CTA - Glass Button */}
                <button
                  onClick={handleLogin}
                  className="w-full md:w-auto backdrop-blur-xl bg-white/5 border border-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] mobile-btn"
                >
                  <LogIn className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Live Ticker Tape - Responsive */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t border-white/10 py-1 sm:py-3 overflow-hidden mobile-ticker"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div 
          className="flex"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          <div 
            className="flex space-x-4 sm:space-x-6 md:space-x-8"
            style={{
              animation: 'scroll 30s linear infinite',
            }}
          >
            {/* Multiple sets for seamless infinite scroll */}
            {[...tickerData, ...tickerData, ...tickerData].map((item, index) => (
              <div key={index} className="flex items-center space-x-1 sm:space-x-2 whitespace-nowrap">
                <span className="text-white font-semibold text-xs sm:text-sm">{item.symbol}</span>
                <span className="flex items-center space-x-0.5 sm:space-x-1">
                  <span className={`font-mono ${item.color} text-[10px] sm:text-xs`}>
                    {item.isPositive ? '▲' : '▼'}
                  </span>
                  <span className={`font-mono ${item.color} text-xs sm:text-sm`}>{item.change}</span>
                </span>
                <span className="text-slate-500 text-xs sm:text-sm">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes aurora1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(50px, 50px) scale(1.1); opacity: 0.5; }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(-50px, 30px) scale(1.15); opacity: 0.5; }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(30px, -40px) scale(1.2); opacity: 0.4; }
        }
        @keyframes phoneFloat {
          0% { transform: translateY(0px) rotateY(-15deg) rotateX(8deg); }
          50% { transform: translateY(-15px) rotateY(-15deg) rotateX(8deg); }
          100% { transform: translateY(0px) rotateY(-15deg) rotateX(8deg); }
        }
        @keyframes phoneFloatMobile {
          0% { transform: translateY(0px) rotateY(-5deg) rotateX(3deg); }
          50% { transform: translateY(-10px) rotateY(-5deg) rotateX(3deg); }
          100% { transform: translateY(0px) rotateY(-5deg) rotateX(3deg); }
        }
        .phone-float {
          animation: phoneFloat 6s ease-in-out infinite;
        }
        .phone-scale-wrapper {
          transform: scale(0.45);
        }
        @media (min-width: 640px) {
          .phone-scale-wrapper {
            transform: scale(0.6);
          }
        }
        @media (min-width: 768px) {
          .phone-scale-wrapper {
            transform: scale(0.65);
          }
        }
        @media (min-width: 1024px) {
          .phone-scale-wrapper {
            transform: scale(0.75) translateY(-95px);
          }
          .phone-float {
            animation: phoneFloat 6s ease-in-out infinite;
          }
        }
        @media (max-width: 1023px) {
          .phone-float {
            animation: phoneFloatMobile 6s ease-in-out infinite;
          }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
          50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.8); }
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .mobile-order-1 {
          order: 1;
        }
        .mobile-order-2 {
          order: 2;
        }
        .mobile-order-3 {
          order: 3;
        }
        @media (min-width: 1024px) {
          .mobile-order-1,
          .mobile-order-2,
          .mobile-order-3 {
            order: unset;
          }
        }
        .btn-primary-gem {
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 10px 20px -10px rgba(6, 182, 212, 0.5);
        }
        .btn-primary-gem:hover {
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 10px 20px -10px rgba(6, 182, 212, 0.5),
            0 0 30px rgba(59, 130, 246, 0.6);
        }
        @media (max-width: 640px) {
          .mobile-btn {
            font-size: 13px !important;
          }
          h1 {
            margin-bottom: 4px !important;
          }
          main {
            padding-top: 3rem !important;
            padding-bottom: 0.5rem !important;
            min-height: calc(100dvh - 32px) !important;
            max-height: calc(100dvh - 32px) !important;
            overflow: hidden !important;
          }
          .phone-container {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .mobile-ticker {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
            height: 28px !important;
          }
          .mobile-ticker span {
            font-size: 10px !important;
          }
        }
        @media (min-width: 640px) {
          h1 {
            margin-bottom: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Welcome;
