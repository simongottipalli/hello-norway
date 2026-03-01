"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (email.length > 320) {
      setError("Email exceeds maximum length");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Invalid email format");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/otp/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || "OTP sent to your email");
        setStep("otp");
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setSuccessMessage("");

    if (!otp) {
      setError("OTP code is required");
      return;
    }

    const otpNumber = parseInt(otp, 10);
    if (isNaN(otpNumber) || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otpNumber,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage("Login successful! Redirecting...");
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        setError(data.error || "Invalid or expired OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    handleSendOtp();
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Hello Norway</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive a login code"
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "email" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleSendOtp)}
                  disabled={isLoading}
                  aria-label="Email address"
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "email-error" : undefined}
                />
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full"
                aria-label="Send OTP to email"
              >
                {isLoading ? "Sending..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyPress={(e) => handleKeyPress(e, handleVerifyOtp)}
                  disabled={isLoading}
                  aria-label="One-time password"
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "otp-error" : undefined}
                  autoComplete="one-time-code"
                />
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className="w-full"
                aria-label="Verify OTP code"
              >
                {isLoading ? "Verifying..." : "Verify & Login"}
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between text-sm">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setSuccessMessage("");
                  }}
                  disabled={isLoading}
                  className="text-muted-foreground"
                >
                  Change Email
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-muted-foreground"
                  aria-label={
                    resendCooldown > 0
                      ? `Resend available in ${resendCooldown} seconds`
                      : "Resend OTP"
                  }
                >
                  {resendCooldown > 0
                    ? `Resend (${resendCooldown}s)`
                    : "Resend Code"}
                </Button>
              </div>
            </>
          )}

          {error && (
            <div
              id={step === "email" ? "email-error" : "otp-error"}
              className="text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              className="text-sm text-green-600 dark:text-green-400"
              role="status"
              aria-live="polite"
            >
              {successMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
