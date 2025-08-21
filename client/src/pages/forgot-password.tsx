import { useState } from "react";
import { useLocation } from "wouter";

// Using direct paths to avoid import issues during development
const logoImage = "/src/assets/images/logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password reset link sent! Please check your email.');
        setLocation("/signin");
      } else {
        alert(data.message || 'Failed to send reset link. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setLocation("/signin");
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="px-6 py-8 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBackToSignIn}
            className="mr-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[#2d3748]">Forgot Password</h1>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logoImage} 
            alt="Brillprime Logo" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-[#2d3748] mb-2">
            Reset Your Password
          </h2>
          <p className="text-[#718096] text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-[#2d3748] font-medium block">
              Email Address
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#718096] w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!email || isLoading}
            className={`w-full py-3 rounded-xl text-white font-medium transition duration-200 ${
              !email || isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#4682B4] hover:bg-[#3a70a0]'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[#718096] text-sm">
            Remember your password?{" "}
            <button
              onClick={handleBackToSignIn}
              className="text-[#4682B4] font-medium hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}