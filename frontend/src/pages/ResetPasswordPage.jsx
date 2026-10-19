import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { PasswordVisibleIcon, PasswordHiddenIcon } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import {
  DevsAuthShell,
  DevsHeroIcon,
  DevsInput,
  DevsButton,
} from '../components/devs/DevsAuthKit';

const OTP_LENGTH = 6;

const BASE_URL = import.meta.env.VITE_SERVER_URL

const passwordRules = {
  required: "Password is required",
  minLength: {
    value: 6,
    message: "Password must be at least 6 characters",
  },
};

const ResetPasswordPage = () => {

    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm();
    const navigate = useNavigate()
    const { isDevs } = useTheme()

    const [pwVisibility, setPwVisibility] = useState(false);
    const [confirmPwVisibility, setConfirmPwVisibility] = useState(false);
    const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));

    const otpRefs = useRef([]);

    useEffect(() => {
      register("otp", {
        required: "This field is required",
        pattern: {
          value: /^[0-9]{6}$/,
          message: "Enter the 6-digit OTP",
        },
      });
    }, [register]);

    const handlePwVisibility = () => {
      setPwVisibility((prev) => !prev);
    }

    const handleConfirmPwVisibility = () => {
      setConfirmPwVisibility((prev) => !prev);
    }

    const handleOtpChange = (index, value) => {
      const digit = value.replace(/[^0-9]/g, "").slice(-1);
      const newDigits = [...otpDigits];
      newDigits[index] = digit;
      setOtpDigits(newDigits);
      setValue("otp", newDigits.join(""), { shouldValidate: true });

      if (digit && index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
    };

    const handleOtpKeyDown = (index, e) => {
      if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    };

    const handleOtpPaste = (e) => {
      const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
      if (!pasted) return;
      e.preventDefault();

      const newDigits = Array(OTP_LENGTH).fill("");
      pasted.split("").forEach((char, i) => (newDigits[i] = char));
      setOtpDigits(newDigits);
      setValue("otp", newDigits.join(""), { shouldValidate: true });
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    };

  const onSubmit = async (data) => {

    let url = `${BASE_URL}/auth/reset-password`;

    try {

      let {otp, resetPassword, confirmPassword } = data;
      let resetToken = localStorage.getItem("resetToken")

      // withCredentials lets the browser accept the fresh auth cookie from the response
      let response = await axios.post(
        url,
        { otp, resetPassword, confirmPassword, resetToken },
        { withCredentials: true }
      );

      // Save the new session token (use the same key your login page uses)
      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
      }
      localStorage.removeItem("resetToken");

      navigate("/home");

    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }


  };

  /* ---------------- Devs Mode ---------------- */
  if (isDevs) {
    return (
      <DevsAuthShell
        hero={false}
        title="Reset password"
        subtitle="Reset your account's password by filling the OTP sent to your email."
      >
        <DevsHeroIcon icon={KeyRound} />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* OTP */}
          <div>
            <label className="block mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
              {"// one-time code"}
            </label>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {otpDigits.map((digit, i) => (
                <motion.input
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  className={`flex-1 min-w-0 max-w-[44px] h-[48px] rounded-xl text-center text-[18px] font-mono font-bold outline-none bg-[var(--bg-input)] text-[var(--devs-cyan)] border transition-all duration-200
                    focus:border-[var(--devs-cyan)] focus:shadow-[0_0_0_3px_rgba(34,240,255,0.15),0_0_20px_rgba(34,240,255,0.35)]
                    ${
                      errors.otp
                        ? "border-[var(--color-error)]"
                        : digit
                        ? "border-[var(--devs-violet)]"
                        : "border-[var(--border-input)]"
                    }`}
                />
              ))}
            </div>
            {errors.otp && (
              <p className="mt-2 text-center font-mono text-[11px] text-[var(--color-error)]">
                ! {errors.otp.message}
              </p>
            )}
          </div>

          <DevsInput
            label="new passkey"
            icon={Lock}
            type={pwVisibility ? "text" : "password"}
            placeholder="New Password"
            error={errors.resetPassword?.message}
            right={
              <button type="button" onClick={handlePwVisibility} className="cursor-pointer">
                {pwVisibility ? <PasswordHiddenIcon /> : <PasswordVisibleIcon />}
              </button>
            }
            {...register("resetPassword", passwordRules)}
          />

          <DevsInput
            label="confirm passkey"
            icon={Lock}
            type={confirmPwVisibility ? "text" : "password"}
            placeholder="Confirm Password"
            error={errors.confirmPassword?.message}
            right={
              <button type="button" onClick={handleConfirmPwVisibility} className="cursor-pointer">
                {confirmPwVisibility ? <PasswordHiddenIcon /> : <PasswordVisibleIcon />}
              </button>
            }
            {...register("confirmPassword", passwordRules)}
          />

          <DevsButton type="submit" loading={isSubmitting} className="mt-1">
            Reset Password
          </DevsButton>
        </form>
      </DevsAuthShell>
    );
  }

  /* ---------------- Classic (light / dark) ---------------- */
  return (
    <div className="resetPasswordPage w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="resetPasswordcontainer w-[350px] h-[520px] border border-[var(--border-container)] ">

    <div className="lockPic w-full h-[120px] flex justify-center items-center ">
            <KeyRound size={100} strokeWidth={1.25} className="text-[var(--text-primary)]" />
    </div>

    <div className="text w-full h-[60px] px-2 text-[var(--text-primary)] text-center ">Reset your account's password by filling the OTP sent to your email. </div>

    <div className="resetForm w-full h-[340px]">
           <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex flex-col  items-center">

        {/* Input field for OTP */}
               <div>
                 <div className="flex justify-center gap-2">
                   {otpDigits.map((digit, i) => (
                     <input
                       key={i}
                       type="text"
                       inputMode="numeric"
                       maxLength={1}
                       value={digit}
                       ref={(el) => { otpRefs.current[i] = el; }}
                       onChange={(e) => handleOtpChange(i, e.target.value)}
                       onKeyDown={(e) => handleOtpKeyDown(i, e)}
                       onPaste={handleOtpPaste}
                       className={`h-[36px] w-[40px] bg-[var(--bg-input)] text-[16px] text-center outline-none text-[var(--text-input)] rounded-[5px] border ${
                         errors.otp ? "border-[var(--color-error)]" : "border-[var(--border-input)]"
                       }`}
                     />
                   ))}
                 </div>
          {errors.otp && (
            <p className="text-red-500 text-sm mt-1 text-center">
              {errors.otp.message}
            </p>
          )}
               </div>


        {/* Input field for reset password */}
                <div className="passwordContainer relative mt-4 ">
          <button type="button" onClick={handlePwVisibility} className="visibility absolute right-[10px] top-[25%] cursor-pointer z-10 ">
            {pwVisibility ? (
              <EyeOff size={20} className="text-[var(--text-muted)]" />
            ) : (
              <Eye size={20} className="text-[var(--text-muted)]" />
            )}
            </button>
          <input
            type={pwVisibility ? "text" : "password"}
            {...register("resetPassword", passwordRules)}
            className={`h-[36px] w-[270px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px]  px-[10px] my-[3px] ${errors.resetPassword ? " border border-[var(--color-error)]" : "border border-[var(--border-input)]" }`}
            placeholder="New Password"
          />
          {errors.resetPassword && (
            <p className="text-red-500 text-sm mt-1">
              {errors.resetPassword.message}
            </p>
          )}
        </div>

        {/* Input field for confirm password */}
        <div className="passwordContainer relative">
          <button type="button" onClick={handleConfirmPwVisibility} className="visibility absolute right-[10px] top-[25%] cursor-pointer z-10 ">
            {confirmPwVisibility ? (
              <EyeOff size={20} className="text-[var(--text-muted)]" />
            ) : (
              <Eye size={20} className="text-[var(--text-muted)]" />
            )}
            </button>
          <input
            type={confirmPwVisibility ? "text" : "password"}
            {...register("confirmPassword", passwordRules)}
            className={`h-[36px] w-[270px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px]  px-[10px] my-[3px] ${errors.confirmPassword ? " border border-[var(--color-error)]" : "border border-[var(--border-input)]" }`}
            placeholder="Confirm Password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>


              <button type="submit" className="confirmBtn w-[270px] h-[32px] my-[25px] rounded-[8px] bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--button-text-on-accent)] text-[14px] font-bold cursor-pointer">Reset Password</button>

           </form>
        </div>

      </div>
    </div>
  )
}

export default ResetPasswordPage
