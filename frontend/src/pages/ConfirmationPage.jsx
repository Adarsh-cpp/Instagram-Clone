import axios from 'axios';
import React, { useEffect } from 'react'
import { useForm } from "react-hook-form";
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ConfirmationPage = () => {

  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const showError = (error) => {
    toast.error(error.response?.data?.message || "Something went wrong");
  };

  const sendOTP = async () => {
    const url = "http://localhost:4000/auth/send-otp";
    const token = localStorage.getItem("authToken");

    try {
      await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("OTP Sent");
    } catch (error) {
      showError(error);
    }
  };

  useEffect(() => {
    sendOTP();
  }, []);

  const onSubmit = async (data) => {
    const url = "http://localhost:4000/auth/verify-otp";
    const token = localStorage.getItem("authToken");

    try {
      await axios.post(url, { otp: data.otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate("/home", {
        state: { message: "Signup Successful!" }
      });
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="confirmationPage h-[100vh] w-[100vw] flex justify-center items-center bg-[#0c1014]">
      <div className="confirmationContainer w-[350px] h-[460px] flex flex-col items-center justify-between ">
        <div className="topPart h-[84%] w-full border border-[#363636]">

          <div className="messagePic w-full h-[120px] flex justify-center items-center">
            <img src="/images/message-logo.png" alt="" className="h-[100px] w-[140px]" />
          </div>

          <div className="text w-full h-[90px]">
            <p className="upperText text-center text-[#ddd4d4] text-[14px] font-bold">Enter confirmation code</p>
            <p className="lowerText text-center text-[#ddd4d4] text-[14px] mt-3">
              Enter the confirmation code that we sent to{" "}
              <span className="gmail italic">{user?.email}</span>.
              <span onClick={sendOTP} className="resendCode text-[#0095f6] hover:text-[#1877f2] font-bold cursor-pointer">Resend code.</span>
            </p>
          </div>

          <div className="otpForm w-full h-[174px]">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex flex-col justify-center items-center">

              <div>
                <input
                  type="text"
                  maxLength={6}
                  {...register("otp", {
                    required: "This field is required",
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: "Enter the 6-digit numeric code",
                    },
                  })}
                  className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px] px-[10px] my-[3px] ${errors.otp ? " border border-[#FF3040]" : "border border-[#555555]"}`}
                  placeholder="Confirmation Code"
                />
                {errors.otp && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.otp.message}
                  </p>
                )}
              </div>

              <button type="submit" className="confirmBtn w-[270px] h-[32px] my-[10px] rounded-[8px] bg-[#0095f6] hover:bg-[#1877f2] text-[#afb2b3] text-[14px] font-bold cursor-pointer">Next</button>

              <div className="backBtn w-[75%] h-[35px] flex justify-center items-center rounded-[10px] font-bold ">
                <span onClick={() => navigate(-1)} className="text-[#0095f6] hover:text-[#1877f2] cursor-pointer">Go back</span>
              </div>

            </form>
          </div>

        </div>

        <div className="bottomPart h-[15%] w-full flex justify-center items-center border border-[#363636] ">
          <p className="text-[#ffffff] text-[14px] text-center">Have an account? <br /> <span className="text-[#0095f6] hover:text-[#1877f2] font-bold cursor-pointer"><Link to="/">Log in</Link></span></p>
        </div>

      </div>
    </div>
  )
}

export default ConfirmationPage