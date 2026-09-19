import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from "react-hook-form";
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { MessageCircle } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_SERVER_URL

const ConfirmationPage = () => {

  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [email, setEmail] = useState(user?.email || "");

  const showError = (error) => {
    toast.error(error.response?.data?.message || "Something went wrong");
  };

  const sendOTP = async () => {
    const url = `${BASE_URL}/auth/send-otp`;
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
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (user?.email) return;

      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const { data } = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data?.email) {
          setEmail(data.email);
        }
      } catch (error) {
        console.error("Failed to fetch user email:", error);
      }
    };

    fetchUserEmail();
  }, [user]);

  useEffect(() => {
    sendOTP();
  }, []);

  const onSubmit = async (data) => {
    const url = `${BASE_URL}/auth/verify-otp`;
    const token = localStorage.getItem("authToken");

    try {
      await axios.post(url, { otp: data.otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await refreshUser();
      navigate("/home", {
        state: { message: "Signup Successful!" }
      });
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="confirmationPage h-[100vh] w-[100vw] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="confirmationContainer w-[350px] h-[460px] flex flex-col items-center justify-between ">
        <div className="topPart h-[84%] w-full border border-[var(--border-container)]">

          <div className="messagePic w-full h-[120px] flex justify-center items-center">
            <MessageCircle size={100} strokeWidth={1.25} className="text-[var(--text-primary)]" />
          </div>

          <div className="text w-full h-[90px]">
            <p className="upperText text-center text-[var(--text-secondary)] text-[14px] font-bold">Enter confirmation code</p>
            <p className="lowerText text-center text-[var(--text-secondary)] text-[14px] mt-3">
              Enter the confirmation code that we sent to{" "}
              <span className="gmail italic">{email}</span>.
              <span onClick={sendOTP} className="resendCode text-[var(--brand-blue)] hover:text-[var(--brand-blue-hover)] font-bold cursor-pointer">Resend code.</span>
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
                  className={`h-[36px] w-[270px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px] px-[10px] my-[3px] ${errors.otp ? " border border-[var(--color-error)]" : "border border-[var(--border-input)]"}`}
                  placeholder="Confirmation Code"
                />
                {errors.otp && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.otp.message}
                  </p>
                )}
              </div>

              <button type="submit" className="confirmBtn w-[270px] h-[32px] my-[10px] rounded-[8px] bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--button-text-on-accent)] text-[14px] font-bold cursor-pointer">Next</button>

              <div className="backBtn w-[75%] h-[35px] flex justify-center items-center rounded-[10px] font-bold ">
                <span onClick={() => navigate(-1)} className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hover)] cursor-pointer">Go back</span>
              </div>

            </form>
          </div>

        </div>

        <div className="bottomPart h-[15%] w-full flex justify-center items-center border border-[var(--border-container)] ">
          <p className="text-[var(--text-primary)] text-[14px] text-center">Have an account? <br /> <span className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hover)] font-bold cursor-pointer"><Link to="/">Log in</Link></span></p>
        </div>

      </div>
    </div>
  )
}

export default ConfirmationPage