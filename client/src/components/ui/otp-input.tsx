import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function OtpInput({ length, value, onChange, className }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return; // Only allow digits

    const newValue = value.split("");
    newValue[index] = digit;
    
    // Fill in the new value up to current index + 1
    const newOtp = newValue.slice(0, index + 1).join("").padEnd(length, "");
    onChange(newOtp.slice(0, length));

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/\D/g, "").slice(0, length);
    onChange(digits.padEnd(length, ""));
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-12 text-center text-xl font-semibold",
            "border-2 border-gray-300 rounded-xl",
            "focus:border-[#4682B4] focus:ring-2 focus:ring-[#4682B4] focus:ring-opacity-20",
            "focus:outline-none transition-all",
            value[index] ? "border-[#4682B4] bg-blue-50" : "bg-white"
          )}
        />
      ))}
    </div>
  );
}