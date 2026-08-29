
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const OTP_LENGTH = 6;

const ResetPasswordPage = () => {

    const { register, handleSubmit, formState: { errors }, setValue } = useForm();
    const navigate = useNavigate()

    const [pwVisibility, setPwVisibility] = useState(false);
    const [confirmPwVisibility, setConfirmPwVisibility] = useState(false);
    const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));

    const otpRefs = useRef([]);

    // Manually register the "otp" field since its value is assembled from
    // 6 separate boxes rather than a single input
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

    let url = "http://localhost:4000/auth/reset-password";

    try {

      let {otp, resetPassword, confirmPassword } = data;
      let resetToken = localStorage.getItem("resetToken")

      let response = await axios.post(url, { otp, resetPassword, confirmPassword, resetToken});
      navigate("/home");

    } catch (error) {
      alert(error.message);
    }


  };

  return (
    <div className="resetPasswordPage w-[100vw] h-[100vh] flex justify-center items-center bg-[#0c1014]">
      <div className="resetPasswordcontainer w-[350px] h-[520px] border border-[#363636] ">

    <div className="lockPic w-full h-[120px] flex justify-center items-center ">
            <img src="/images/pw-forget-logo.png" alt="" className="w-[14p0px] h-[100px] " />
    </div>

    <div className="text w-full h-[60px] px-2 text-white text-center ">Reset your account's password by filling the OTP sent to your email. </div>

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
                       ref={(el) => (otpRefs.current[i] = el)}
                       onChange={(e) => handleOtpChange(i, e.target.value)}
                       onKeyDown={(e) => handleOtpKeyDown(i, e)}
                       onPaste={handleOtpPaste}
                       className={`h-[36px] w-[40px] bg-[#121212] text-[16px] text-center outline-none text-[#F5F5F5] rounded-[5px] border ${
                         errors.otp ? "border-[#FF3040]" : "border-[#555555]"
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
            <img
              src={pwVisibility ? "/images/visibility-off.png" : "/images/visibility-on.png"}
              alt=""
              className="w-[20px] h-[20px] "
            />
            </button>
          <input
            type={pwVisibility ? "text" : "password"}
            {...register("resetPassword", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.resetPassword ? " border border-[#FF3040]" : "border border-[#555555]" }`}
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
            <img
              src={confirmPwVisibility ? "/images/visibility-off.png" : "/images/visibility-on.png"}
              alt=""
              className="w-[20px] h-[20px] "
            />
            </button>
          <input
            type={confirmPwVisibility ? "text" : "password"}
            {...register("confirmPassword", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.confirmPassword ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Confirm Password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>


              <button type="submit" className="confirmBtn w-[270px] h-[32px] my-[25px] rounded-[8px] bg-[#0095f6] hover:bg-[#1877f2] text-[#afb2b3] text-[14px] font-bold cursor-pointer">Reset Password</button>

           </form>
        </div>

      </div>
    </div>
  )
}

export default ResetPasswordPage