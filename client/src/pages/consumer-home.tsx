import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import globeImg from '../assets/images/globe_img.png';

interface LocationModalProps {
  onSetAutomatically: () => void;
  onSetLater: () => void;
}

const LocationModal = ({ onSetAutomatically, onSetLater }: LocationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [buttonText, setButtonText] = useState('Set automatically');

  const handleSetAutomatically = async () => {
    setIsLoading(true);
    setButtonText('Getting location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords);
          setButtonText('Location set!');
          setTimeout(() => {
            setButtonText('Set automatically');
            setIsLoading(false);
            onSetAutomatically();
          }, 1500);
        },
        (error) => {
          console.log('Location error:', error);
          setButtonText('Location access denied');
          setTimeout(() => {
            setButtonText('Set automatically');
            setIsLoading(false);
          }, 2000);
        }
      );
    } else {
      setButtonText('Geolocation not supported');
      setTimeout(() => {
        setButtonText('Set automatically');
        setIsLoading(false);
      }, 2000);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full h-[483px] bg-white shadow-[0px_-5px_6px_rgba(0,0,0,0.10)] rounded-t-[30px] flex flex-col items-center pt-10 px-8 animate-fade-up">
      {/* Location Icon with Globe Image */}
      <div className="absolute -top-[50px] left-1/2 transform -translate-x-1/2 w-[100px] h-[100px] bg-[#4682B4] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(70,130,180,0.3)] animate-pulse-slow">
        <img 
          src={globeImg} 
          alt="Location Globe" 
          className="w-12 h-12 object-contain"
        />
      </div>
      
      {/* Modal Content */}
      <div className="mt-20 text-center w-full">
        <h2 className="text-[#010E42] text-xl font-extrabold mb-4">
          Where are you?
        </h2>
        <p className="text-black text-[15px] font-light mb-10 leading-relaxed max-w-[280px] mx-auto">
          Set your location so you can see merchants available around you
        </p>
        
        {/* Button Container */}
        <div className="flex flex-col gap-5 w-[268px] mx-auto">
          <button 
            onClick={handleSetAutomatically}
            disabled={isLoading}
            className={`w-full h-[52px] rounded-[30px] border-none text-white text-xl font-medium transition-all duration-300 flex items-center justify-center ${
              isLoading 
                ? 'bg-[#3d6fa0] opacity-70' 
                : 'bg-[#4682B4] hover:bg-[#3d6fa0] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(70,130,180,0.3)] active:scale-95'
            }`}
          >
            {buttonText}
          </button>
          
          <button 
            onClick={onSetLater}
            className="w-full h-[52px] rounded-[30px] border border-[#4682B4] bg-transparent text-[#131313] text-xl font-medium transition-all duration-300 flex items-center justify-center hover:bg-[#4682B4] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(70,130,180,0.3)] active:scale-95"
          >
            Set later
          </button>
        </div>
      </div>
    </div>
  );
};

const ConsumerHome = () => {
  const [showLocationModal, setShowLocationModal] = useState(true);

  const handleSetAutomatically = () => {
    setShowLocationModal(false);
    // TODO: Handle location setting and navigate to main dashboard
  };

  const handleSetLater = () => {
    setShowLocationModal(false);
    // TODO: Navigate to main dashboard without location
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      {/* Map Background - Using a real map image as background */}
      <div 
        className="absolute top-0 left-0 w-full h-[474px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=12&size=400x474&maptype=roadmap&style=feature:administrative%7Celement:geometry%7Cvisibility:off&style=feature:administrative.land_parcel%7Cvisibility:off&style=feature:administrative.neighborhood%7Cvisibility:off&style=feature:poi%7Celement:labels.text%7Cvisibility:off&style=feature:poi.business%7Cvisibility:off&style=feature:road%7Celement:labels.icon%7Cvisibility:off&style=feature:road.arterial%7Celement:labels%7Cvisibility:off&style=feature:road.highway%7Celement:labels%7Cvisibility:off&style=feature:road.local%7Cvisibility:off&style=feature:transit%7Cvisibility:off&key=YOUR_API_KEY')`,
          // Fallback gradient if map doesn't load
          background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #1e5f99 100%)'
        }}
      >
        {/* Overlay to ensure modal visibility */}
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      </div>
      
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-10">
        <Link href="/dashboard">
          <div className="w-[60px] h-[60px] bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-95">
            <div className="w-6 h-6 bg-[#666] transform rotate-180" style={{
              clipPath: 'polygon(40% 0%, 40% 35%, 100% 35%, 100% 65%, 40% 65%, 40% 100%, 0% 50%)'
            }}></div>
          </div>
        </Link>
      </div>
      
      {/* Location Setup Modal */}
      {showLocationModal && (
        <LocationModal 
          onSetAutomatically={handleSetAutomatically}
          onSetLater={handleSetLater}
        />
      )}
    </div>
  );
};

export default ConsumerHome;