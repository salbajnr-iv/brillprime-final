import { useEffect } from "react";
import { useLocation } from "wouter";
import logoImage from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Check if user has seen onboarding
      const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
      const user = localStorage.getItem("user");

      // Wait minimum 2 seconds for splash effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (user) {
        // User is logged in, go to appropriate dashboard
        const userData = JSON.parse(user);
        if (userData.role === "CONSUMER") {
          setLocation("/consumer-home");
        } else if (userData.role === "MERCHANT") {
          setLocation("/merchant-dashboard");
        } else if (userData.role === "DRIVER") {
          setLocation("/driver-dashboard");
        } else {
          setLocation("/dashboard");
        }
      } else if (hasSeenOnboarding) {
        // Has seen onboarding but not logged in, go to signin
        setLocation("/signin");
      } else {
        // First time user, start onboarding
        console.log("Splash: Redirecting to onboarding");
        setLocation("/onboarding");
      }
    };

    checkAuthAndRedirect();
  }, [setLocation]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo with effects */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="Brillprime Logo" 
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain animate-bounce"
            style={{ animationDuration: '2s' }}
            onError={(e) => {
              // If image fails to load, show text fallback
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="text-blue-600 text-2xl font-bold">BP</div>';
            }}
          />
        </div>

        {/* Loading animation */}
        <div className="mt-8 flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}