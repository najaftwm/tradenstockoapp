import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Phone, Shield, User, FileText } from 'lucide-react';
import { authAPI } from '../services/api';
import logo from '../assets/logo.svg';

const Registration = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Mobile, 2: OTP, 3: Part 1 (Basic Info), 4: Part 2 (KYC Info)
  const [formData, setFormData] = useState({
    mobile: '',
    otp: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    language: '',
    aadhar: '',
    panNo: '',
    city: '',
    address: ''
  });

  // Indian languages list
  const indianLanguages = [
    { value: 'hindi', label: 'Hindi (हिंदी)' },
    { value: 'english', label: 'English' },
    { value: 'bengali', label: 'Bengali (বাংলা)' },
    { value: 'telugu', label: 'Telugu (తెలుగు)' },
    { value: 'marathi', label: 'Marathi (मराठी)' },
    { value: 'tamil', label: 'Tamil (தமிழ்)' },
    { value: 'urdu', label: 'Urdu (اردو)' },
    { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
    { value: 'kannada', label: 'Kannada (ಕನ್ನಡ)' },
    { value: 'odia', label: 'Odia (ଓଡ଼ିଆ)' },
    { value: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { value: 'malayalam', label: 'Malayalam (മലയാളം)' },
    { value: 'assamese', label: 'Assamese (অসমীয়া)' },
    { value: 'maithili', label: 'Maithili (मैथिली)' },
    { value: 'sanskrit', label: 'Sanskrit (संस्कृतम्)' },
    { value: 'kashmiri', label: 'Kashmiri (कॉशुर)' },
    { value: 'konkani', label: 'Konkani (कोंकणी)' },
    { value: 'manipuri', label: 'Manipuri (মৈতৈলোন)' },
    { value: 'nepali', label: 'Nepali (नेपाली)' },
    { value: 'sindhi', label: 'Sindhi (سنڌي)' },
    { value: 'dogri', label: 'Dogri (डोगरी)' },
    { value: 'bodo', label: 'Bodo (बड़ो)' },
    { value: 'santhali', label: 'Santhali (संथाली)' }
  ];
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);
  const [stepTransition, setStepTransition] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [typingFlash, setTypingFlash] = useState(null);
  const [progressBarGlow, setProgressBarGlow] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef(null);
  const glassCardRef = useRef(null);

  // Load animation
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // OTP Resend Timer
  useEffect(() => {
    if (currentStep === 2 && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer, currentStep]);

  // Step transition animation
  useEffect(() => {
    setStepTransition(true);
    const timer = setTimeout(() => setStepTransition(false), 400);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Mouse tracking for spotlight border (desktop only)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glassCardRef.current && window.innerWidth >= 1024) {
        const rect = glassCardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition({ x, y });
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 });
    };

    const handleTouchMove = (e) => {
      if (glassCardRef.current && window.innerWidth < 1024) {
        const touch = e.touches[0];
        if (touch) {
          const rect = glassCardRef.current.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          setMousePosition({ x, y });
        }
      }
    };

    const handleTouchEnd = () => {
      if (window.innerWidth < 1024) {
        setMousePosition({ x: 0, y: 0 });
      }
    };

    const card = glassCardRef.current;
    if (card) {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
      card.addEventListener('touchmove', handleTouchMove);
      card.addEventListener('touchend', handleTouchEnd);
      return () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
        card.removeEventListener('touchmove', handleTouchMove);
        card.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, []);

  // Typing flash effect
  const handleKeyDown = (fieldName) => {
    setTypingFlash(fieldName);
    setTimeout(() => setTypingFlash(null), 150);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validation functions
  const validateMobile = (mobile) => {
    const regex = /^(?:[6789]\d{9})$/;
    return regex.test(mobile);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateAadhar = (aadhaar) => {
    const regex = /^\d{12}$/;
    return regex.test(aadhaar);
  };

  const validatePAN = (pan) => {
    const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return regex.test(pan.toUpperCase());
  };

  const validateName = (name) => {
    const regex = /^[A-Za-z\s-'.]+$/;
    return regex.test(name) && name.trim() !== "";
  };

  // Send OTP
  const sendOTP = async () => {
    if (!validateMobile(formData.mobile)) {
      toast.error('Please enter a valid Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&customerId=C-769541B7B67C491&flowType=SMS&mobileNumber=' + formData.mobile, {
        method: 'POST',
        headers: {
          "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTc2OTU0MUI3QjY3QzQ5MSIsImlhdCI6MTc1MTUyODcxMiwiZXhwIjoxOTA5MjA4NzEyfQ.XFKN0L0h2hHkHvQNDibseOXhsI934FQyo2IKDKomg9TFOqwMOFccJLKOjwyBs4c0bOC_xBmxFNAyew5mSqmq9Q"
        }
      });

      const result = await response.json();
      if (result.responseCode === 200 && result.message === "SUCCESS") {
        localStorage.setItem("trnID", result.data.verificationId);
        toast.success('OTP Sent Successfully.');
        setOtpTimer(60); // Start 60 second timer
        // Trigger success pulse
        setProgressBarGlow(true);
        setTimeout(() => setProgressBarGlow(false), 500);
        setCurrentStep(2);
      } else {
        toast.error('Failed to send OTP.');
      }
    } catch (error) {
      console.error('OTP Error:', error);
      toast.error('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    const otpCode = formData.otp;
    const verificationId = localStorage.getItem("trnID");

    if (!otpCode || !verificationId) {
      toast.error('Missing OTP or Verification ID.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://cpaas.messagecentral.com/verification/v3/validateOtp?countryCode=91&mobileNumber=${formData.mobile}&verificationId=${verificationId}&customerId=C-769541B7B67C491&code=${otpCode}`, {
        method: 'GET',
        headers: {
          "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTc2OTU0MUI3QjY3QzQ5MSIsImlhdCI6MTc1MTUyODcxMiwiZXhwIjoxOTA5MjA4NzEyfQ.XFKN0L0h2hHkHvQNDibseOXhsI934FQyo2IKDKomg9TFOqwMOFccJLKOjwyBs4c0bOC_xBmxFNAyew5mSqmq9Q"
        }
      });

      const result = await response.json();
      if (result.responseCode === 200 && result.data.verificationStatus === "VERIFICATION_COMPLETED") {
        toast.success('OTP verified successfully!');
        // Trigger success pulse
        setProgressBarGlow(true);
        setTimeout(() => setProgressBarGlow(false), 500);
        setCurrentStep(3); // Move to Part 1 of registration
      } else {
        toast.error('OTP verification failed.');
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      toast.error('OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Check username availability
  const checkUsername = async (username) => {
    if (!username) return;
    
    try {
      const prefix = localStorage.getItem("prefix") || "";
      const response = await authAPI.getUserCount(prefix + username);
      if (response !== "0") {
        toast.error('Username already exists');
        setFormData(prev => ({ ...prev, username: '' }));
      }
    } catch (error) {
      console.error('Username check error:', error);
    }
  };

  // Validate Part 1 (Basic Info)
  const validatePart1 = () => {
    if (!validateName(formData.firstName)) {
      toast.error('Please enter a valid first name');
      return false;
    }
    if (!validateName(formData.lastName)) {
      toast.error('Please enter a valid last name');
      return false;
    }
    if (!formData.username || formData.username.trim() === '') {
      toast.error('Please enter a username');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (!formData.language || formData.language.trim() === '') {
      toast.error('Please select a language');
      return false;
    }
    return true;
  };

  // Validate Part 2 (KYC Info)
  const validatePart2 = () => {
    if (!validateAadhar(formData.aadhar)) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return false;
    }
    if (!validatePAN(formData.panNo)) {
      toast.error('Please enter a valid PAN number');
      return false;
    }
    if (!formData.city || formData.city.trim() === '') {
      toast.error('Please enter your city');
      return false;
    }
    return true;
  };

  // Resend OTP
  const resendOTP = async () => {
    if (otpTimer > 0) return;
    await sendOTP();
  };

  // Move to Part 2
  const goToPart2 = () => {
    if (validatePart1()) {
      // Trigger success pulse
      setProgressBarGlow(true);
      setTimeout(() => setProgressBarGlow(false), 500);
      setCurrentStep(4);
    }
  };

  // Get progress percentage
  const getProgress = () => {
    return (currentStep / 4) * 100;
  };

  // Submit registration
  const submitRegistration = async () => {
    if (!validatePart2()) {
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        txtfirstname: formData.firstName,
        txtlastname: formData.lastName,
        txtmob: formData.mobile,
        txtemail: formData.email,
        txtusernm: formData.username,
        txtaadhar: formData.aadhar,
        txtupassword: formData.password,
        txtpanno: formData.panNo.toUpperCase(),
        txtcity: formData.city,
        txtaddress: formData.address,
        txtlanguage: formData.language,
        txtdomainname: localStorage.getItem("prefix") || ""
      };

      const response = await authAPI.register(registrationData);
      if (response === "true") {
        toast.success('User Details Successfully Submitted. Thank you for connecting with us! We will contact you soon.');
        navigate('/login');
      } else {
        toast.error(response || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration Error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className={`space-y-4 sm:space-y-6 transition-all duration-[400ms] ease-in-out ${stepTransition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Phone Number
        </label>
        <div className="flex">
          <div className="flex items-center justify-center px-3 sm:px-4 rounded-l-lg border border-r-0 border-white/5 bg-black/40 text-white text-xs sm:text-sm font-medium">
            +91
          </div>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleInputChange}
            onKeyDown={() => handleKeyDown('mobile')}
            onFocus={() => setFocusedField('mobile')}
            onBlur={() => setFocusedField(null)}
            className="flex-1 pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-r-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
            style={{
              background: focusedField === 'mobile' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              border: typingFlash === 'mobile' 
                ? '1px solid rgba(255, 255, 255, 0.8)' 
                : focusedField === 'mobile' 
                  ? '1px solid #3b82f6' 
                  : '1px solid rgba(255, 255, 255, 0.05)',
              borderLeft: 'none',
              boxShadow: typingFlash === 'mobile'
                ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
                : focusedField === 'mobile' 
                  ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                  : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
            }}
            placeholder="Enter Mobile Number"
            maxLength="10"
            required
          />
        </div>
      </div>

      <button
        onClick={sendOTP}
        disabled={loading}
        className="w-full py-3 sm:py-4 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group button-ripple"
        style={{
          background: 'linear-gradient(to bottom, rgba(96, 165, 250, 1), #2563eb)',
          boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          fontWeight: 700,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm sm:text-base">Sending OTP...</span>
          </div>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '15px' }} className="sm:text-[17px]">Send OTP</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className={`space-y-4 sm:space-y-6 transition-all duration-[400ms] ease-in-out ${stepTransition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="text-center mb-4">
        <p className="text-slate-400 text-sm">Enter the OTP sent to <span className="text-white font-medium">+91 {formData.mobile}</span></p>
      </div>

      <div className="relative">
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('otp')}
          onFocus={() => setFocusedField('otp')}
          onBlur={() => setFocusedField(null)}
          className="w-full px-3 sm:px-4 py-3 sm:py-4 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-center sm:text-[28px] lg:text-[30px] sm:tracking-[1em]"
          style={{
            background: focusedField === 'otp' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'otp' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'otp' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '24px',
            letterSpacing: '0.8em',
            color: '#FFFFFF',
            boxShadow: typingFlash === 'otp'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'otp' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="0000"
          maxLength="4"
          required
        />
      </div>

      {otpTimer > 0 && (
        <p className="text-center text-sm" style={{ color: '#9CA3AF' }}>
          Resend OTP in <span className="font-medium" style={{ color: '#9CA3AF' }}>{otpTimer}s</span>
        </p>
      )}

      <button
        onClick={verifyOTP}
        disabled={loading}
        className="w-full py-4 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
        style={{
          background: 'linear-gradient(to bottom, rgba(96, 165, 250, 1), #2563eb)',
          boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          fontWeight: 700,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Verifying OTP...</span>
          </div>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '17px' }}>Verify & Continue</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </button>

      <button
        onClick={resendOTP}
        disabled={otpTimer > 0 || loading}
        className="w-full py-2.5 sm:py-3 rounded-xl transition-all duration-300 text-xs sm:text-sm font-medium disabled:cursor-not-allowed relative overflow-hidden group"
        style={{
          background: otpTimer === 0 && !loading 
            ? 'linear-gradient(to bottom, rgba(96, 165, 250, 1), #2563eb)' 
            : 'transparent',
          color: otpTimer === 0 && !loading ? 'white' : '#9CA3AF',
          border: otpTimer === 0 && !loading ? 'none' : '1px solid rgba(156, 163, 175, 0.3)',
          boxShadow: otpTimer === 0 && !loading 
            ? 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.4)' 
            : 'none',
          borderTop: otpTimer === 0 && !loading ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
          fontWeight: otpTimer === 0 && !loading ? 700 : 500,
        }}
      >
        {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP'}
        {otpTimer === 0 && !loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        )}
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className={`space-y-3 sm:space-y-4 transition-all duration-[400ms] ease-in-out ${stepTransition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="relative">
          <label 
            className="block mb-2"
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              letterSpacing: '1.5px',
              color: '#6B7280',
            }}
          >
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            onKeyDown={() => handleKeyDown('firstName')}
            onFocus={() => setFocusedField('firstName')}
            onBlur={() => setFocusedField(null)}
            className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
            style={{
              background: focusedField === 'firstName' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              border: typingFlash === 'firstName' 
                ? '1px solid rgba(255, 255, 255, 0.8)' 
                : focusedField === 'firstName' 
                  ? '1px solid #3b82f6' 
                  : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: typingFlash === 'firstName'
                ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
                : focusedField === 'firstName' 
                  ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                  : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
            }}
            placeholder="First Name"
            required
          />
        </div>
        <div className="relative">
          <label 
            className="block mb-2"
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              letterSpacing: '1.5px',
              color: '#6B7280',
            }}
          >
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            onKeyDown={() => handleKeyDown('lastName')}
            onFocus={() => setFocusedField('lastName')}
            onBlur={() => setFocusedField(null)}
            className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
            style={{
              background: focusedField === 'lastName' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              border: typingFlash === 'lastName' 
                ? '1px solid rgba(255, 255, 255, 0.8)' 
                : focusedField === 'lastName' 
                  ? '1px solid #3b82f6' 
                  : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: typingFlash === 'lastName'
                ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
                : focusedField === 'lastName' 
                  ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                  : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
            }}
            placeholder="Last Name"
            required
          />
        </div>
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Email (Optional)
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('email')}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'email' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'email' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'email' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'email'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'email' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="Email Address"
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Username
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('username')}
          onFocus={() => setFocusedField('username')}
          onBlur={(e) => {
            setFocusedField(null);
            checkUsername(e.target.value);
          }}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'username' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'username' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'username' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'username'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'username' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="Username"
          maxLength="10"
          required
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Password
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('password')}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'password' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'password' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'password' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'password'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'password' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="Password"
          required
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Language
        </label>
        <select
          name="language"
          value={formData.language}
          onChange={handleInputChange}
          onFocus={() => setFocusedField('language')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'language' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: focusedField === 'language' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: focusedField === 'language' 
              ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
              : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
          }}
          required
        >
          <option value="" className="bg-[#111827]">Select Language</option>
          {indianLanguages.map((lang) => (
            <option key={lang.value} value={lang.value} className="bg-[#111827]">
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={goToPart2}
        disabled={loading}
        className="w-full py-3 sm:py-4 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group button-ripple"
        style={{
          background: 'linear-gradient(to bottom, rgba(96, 165, 250, 1), #2563eb)',
          boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          fontWeight: 700,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '15px' }} className="sm:text-[17px]">Continue</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className={`space-y-3 sm:space-y-4 transition-all duration-[400ms] ease-in-out ${stepTransition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Aadhar Number
        </label>
        <input
          type="text"
          name="aadhar"
          value={formData.aadhar}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('aadhar')}
          onFocus={() => setFocusedField('aadhar')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'aadhar' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'aadhar' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'aadhar' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'aadhar'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'aadhar' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="Aadhar Number"
          maxLength="12"
          required
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          PAN Number
        </label>
        <input
          type="text"
          name="panNo"
          value={formData.panNo}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('panNo')}
          onFocus={() => setFocusedField('panNo')}
          onBlur={() => setFocusedField(null)}
            className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input uppercase text-sm sm:text-base"
          style={{
            background: focusedField === 'panNo' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'panNo' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'panNo' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'panNo'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'panNo' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            textTransform: 'uppercase',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="PAN Number"
          maxLength="10"
          required
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          City
        </label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('city')}
          onFocus={() => setFocusedField('city')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'city' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'city' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'city' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'city'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'city' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="City"
          required
        />
      </div>

      <div className="relative">
        <label 
          className="block mb-2"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: '#6B7280',
          }}
        >
          Address (Optional)
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          onKeyDown={() => handleKeyDown('address')}
          onFocus={() => setFocusedField('address')}
          onBlur={() => setFocusedField(null)}
          className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 text-white font-medium focus:outline-none registration-input text-sm sm:text-base"
          style={{
            background: focusedField === 'address' ? 'rgba(30, 58, 138, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            border: typingFlash === 'address' 
              ? '1px solid rgba(255, 255, 255, 0.8)' 
              : focusedField === 'address' 
                ? '1px solid #3b82f6' 
                : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: typingFlash === 'address'
              ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 15px rgba(255, 255, 255, 0.4)'
              : focusedField === 'address' 
                ? '0 0 0 1px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.25)' 
                : 'inset 0px 1px 2px 0px rgba(0, 0, 0, 0.6), inset 0px -1px 1px 0px rgba(255, 255, 255, 0.05)',
            transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          placeholder="Address"
        />
      </div>

      <button
        onClick={submitRegistration}
        disabled={loading}
        className="w-full py-3 sm:py-4 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group button-ripple button-green"
        style={{
          background: 'linear-gradient(to bottom, rgba(74, 222, 128, 1), #15803d)',
          boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(34, 197, 94, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          fontWeight: 700,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm sm:text-base">Saving User...</span>
          </div>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '15px' }} className="sm:text-[17px]">Complete Registration</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </button>

      <button
        onClick={() => setCurrentStep(3)}
        className="w-full py-2.5 sm:py-3 rounded-xl text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-medium"
      >
        Go Back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070A] relative overflow-hidden">
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

      {/* Subtle Grid Texture */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.2,
        }}
      ></div>

      {/* Back Button - Top Left */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
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
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[40%_60%] relative z-10">
        {/* Left Side (40% - Hype Side) - Desktop Only */}
        <div className="hidden lg:flex flex-col justify-between p-12 lg:p-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="TradeNstocko Logo" className="w-10 h-10 rounded-lg object-contain" />
            <span className="text-white font-semibold text-lg tracking-tight">Tradenstocko</span>
          </div>

          {/* Headline */}
          <div className="flex-1 flex flex-col items-start pt-16 relative">
            {/* Cyan Ambient Glow behind headline */}
            <div 
              className="absolute -left-20 -top-20 pointer-events-none hidden lg:block"
              style={{
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(6, 182, 212, 0.2) 30%, transparent 70%)',
                filter: 'blur(100px)',
                zIndex: 0,
              }}
            ></div>
            
            <div className={`relative z-10 transition-all duration-1000 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              <div className="flex items-center gap-3 xl:gap-4 flex-wrap">
                <h1 
                  className="text-5xl lg:text-6xl xl:text-7xl font-bold"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '-0.04em',
                    lineHeight: '1.1',
                    color: '#FFFFFF',
                  }}
                >
                  Join the Top 1%<span style={{ color: '#22c55e' }}>.</span>
                </h1>
                
                {/* Traders Joined Badge */}
                <div 
                  className="inline-flex items-center px-3 xl:px-4 py-1.5 xl:py-2 rounded-full backdrop-blur-md"
                  style={{
                    background: 'rgba(20, 25, 35, 0.4)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span className="text-xs xl:text-sm font-medium text-white">
                    🟢 <span className="text-slate-300">2,490 Traders joined today</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="space-y-6">
            <div 
              className={`flex items-center space-x-4 transition-all duration-300 ${
                currentStep >= 1 ? 'text-white' : 'text-slate-500'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="text-lg font-medium">Phone</span>
            </div>
            <div 
              className={`flex items-center space-x-4 transition-all duration-300 ${
                currentStep >= 2 ? 'text-white' : 'text-slate-500'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= 2 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="text-lg font-medium">OTP</span>
            </div>
            <div 
              className={`flex items-center space-x-4 transition-all duration-300 ${
                currentStep >= 3 ? 'text-white' : 'text-slate-500'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= 3 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > 3 ? '✓' : '3'}
              </div>
              <span className="text-lg font-medium">Info</span>
            </div>
            <div 
              className={`flex items-center space-x-4 transition-all duration-300 ${
                currentStep >= 4 ? 'text-white' : 'text-slate-500'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= 4 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                4
              </div>
              <span className="text-lg font-medium">KYC</span>
            </div>
          </div>
        </div>

        {/* Right Side (60% - Form Side) - Glass Card */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative pt-20 sm:pt-24 lg:pt-0">
          {/* Mobile Header - Logo and Headline */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 lg:hidden z-10 w-full max-w-md px-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src={logo} alt="TradeNstocko Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-white font-semibold text-base tracking-tight">Tradenstocko</span>
            </div>
            <div className="text-center mb-4">
              <h1 
                className="text-3xl sm:text-4xl font-bold mb-2"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.04em',
                  lineHeight: '1.1',
                  color: '#FFFFFF',
                }}
              >
                Join the Top 1%<span style={{ color: '#22c55e' }}>.</span>
              </h1>
              <div 
                className="inline-flex items-center px-3 py-1.5 rounded-full backdrop-blur-md mt-2"
                style={{
                  background: 'rgba(20, 25, 35, 0.4)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
              >
                <span className="text-xs font-medium text-white">
                  🟢 <span className="text-slate-300">2,490 Traders joined today</span>
                </span>
              </div>
            </div>
            
            {/* Mobile Step Indicator - Horizontal */}
            <div className="flex items-center justify-center space-x-3 mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      currentStep >= step 
                        ? step === 4 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {currentStep > step ? '✓' : step}
                  </div>
                  {step < 4 && (
                    <div 
                      className={`w-6 h-0.5 mx-1 transition-all duration-300 ${
                        currentStep > step ? 'bg-blue-500' : 'bg-slate-700'
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Breathing Aurora Background - Cyan Orb */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none breathing-aurora-cyan"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(6, 182, 212, 0.2) 30%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'breathingCyan 10s ease-in-out infinite',
              }}
            ></div>
          </div>

          {/* Breathing Aurora Background - Violet Orb */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none breathing-aurora-violet"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.15) 30%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'breathingViolet 12s ease-in-out infinite',
                animationDelay: '2s',
              }}
            ></div>
          </div>

          {/* Deep Blue Ambient Glow behind the Glass Card */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 1,
            }}
          >
            <div 
              className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] lg:w-[1000px] lg:h-[1000px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(30, 58, 138, 0.6) 0%, rgba(37, 99, 235, 0.5) 20%, rgba(6, 182, 212, 0.3) 40%, rgba(0, 0, 0, 0) 70%)',
                filter: 'blur(100px)',
                opacity: 0.5,
                transform: 'translate(40px, -40px)',
              }}
            ></div>
          </div>

          {/* Gradient Border Wrapper with Spotlight Effect */}
          <div 
            ref={glassCardRef}
            className={`w-full max-w-md transition-all duration-1000 relative mt-32 sm:mt-36 lg:mt-0 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
              style={{
                borderRadius: '20px',
                padding: '1px',
                background: (mousePosition.x > 0 && mousePosition.y > 0)
                  ? `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1) 40%, transparent 70%)`
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                zIndex: 2,
                transition: 'background 0.1s ease-out',
              }}
          >
            {/* Glass Card Inner with Noise Texture */}
            <div 
              ref={formRef}
              className="w-full h-full rounded-[19px] sm:rounded-[21px] lg:rounded-[23px] relative overflow-hidden"
              className="glass-card-padding"
              style={{
                backdropFilter: 'blur(40px)',
                backgroundColor: 'rgba(20, 25, 35, 0.6)',
                boxShadow: `
                  inset 1px 1px 0px 0px rgba(255, 255, 255, 0.15),
                  inset -1px -1px 0px 0px rgba(0, 0, 0, 0.4),
                  0px 20px 40px -10px rgba(0, 0, 0, 0.5)
                `,
              }}
            >
              {/* Noise Texture Overlay - Grain Effect (3% opacity) */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                  opacity: 0.03,
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

              {/* Progress Bar */}
              <div className="relative mb-6 sm:mb-8">
                <div 
                  className="h-1 rounded-full overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-in-out"
                    style={{
                      width: `${getProgress()}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
                      boxShadow: progressBarGlow
                        ? '0 0 20px rgba(59, 130, 246, 1), 0 0 40px rgba(6, 182, 212, 0.8)'
                        : '0 0 10px rgba(59, 130, 246, 0.6)',
                      transition: 'box-shadow 0.3s ease-out',
                    }}
                  ></div>
                </div>
              </div>


              {/* Form Content */}
              <div className="relative z-10">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes breathingCyan {
          0%, 100% {
            transform: translate(80px, -80px) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(100px, -60px) scale(1.15);
            opacity: 0.6;
          }
        }

        @keyframes breathingViolet {
          0%, 100% {
            transform: translate(-60px, 60px) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-40px, 80px) scale(1.2);
            opacity: 0.5;
          }
        }

        .button-ripple {
          position: relative;
        }

        .button-ripple:active::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          width: 20px;
          height: 20px;
          left: 50%;
          top: 50%;
          margin-left: -10px;
          margin-top: -10px;
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }

        .button-green:active::after {
          background: rgba(34, 197, 94, 0.6);
        }

        @keyframes ripple {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .registration-input:-webkit-autofill,
        .registration-input:-webkit-autofill:hover,
        .registration-input:-webkit-autofill:focus,
        .registration-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.4) inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white !important;
        }
        
        .registration-input::placeholder {
          font-size: 13px;
          text-transform: none;
          letter-spacing: normal;
          color: #6B7280;
        }
        
        .registration-input {
          font-size: 14px;
          color: white;
        }

        select.registration-input option {
          background: #111827;
          color: white;
        }

        @media (max-width: 640px) {
          .glass-card-padding {
            padding: 20px !important;
          }
        }

        @media (min-width: 640px) {
          .glass-card-padding {
            padding: 32px !important;
          }
        }

        @media (min-width: 1024px) {
          .glass-card-padding {
            padding: 48px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Registration;
