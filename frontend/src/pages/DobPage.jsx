import React from 'react'
import { useForm } from "react-hook-form";
import { useRef } from "react";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Cake } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  DevsAuthShell,
  DevsHeroIcon,
  DevsButton,
  DevsLink,
} from '../components/devs/DevsAuthKit';

axios.defaults.withCredentials = true;

const BASE_URL = import.meta.env.VITE_SERVER_URL

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dates = Array.from({ length: 30 }, (_, i) => i + 1);
const years = Array.from({ length: 2025 - 1925 + 1 }, (_, i) => 2025 - i);

// Devs Mode dropdown styling (native <select>, so keyboard / mobile pickers still work)
const devsSelect = (hasError) =>
  `h-[44px] w-full rounded-xl bg-[var(--bg-input)] text-[var(--text-input)] font-mono text-[13px] px-3 outline-none border transition-all duration-200 cursor-pointer
   ${hasError ? "border-[var(--color-error)]" : "border-[var(--border-input)]"}
   focus:border-[var(--devs-cyan)] focus:shadow-[0_0_0_3px_rgba(34,240,255,0.15),0_0_20px_rgba(34,240,255,0.2)]`;

const DobPage = () => {

  const { isDevs } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const navigate = useNavigate()

  const onSubmit = async (data) => {
    const dob = data.date + "-" + data.month + "-" + data.year

    let url = `${BASE_URL}/auth/add-dob`;
    const token = localStorage.getItem("authToken");

    try {
      let response = await axios.post(url, { dob },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      navigate("/user/confirm-otp")

    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong"
      );
    }

  };

  const formRef = useRef();

  /* ---------------- Devs Mode ---------------- */
  if (isDevs) {
    const hasAnyError = errors.month || errors.date || errors.year;

    return (
      <DevsAuthShell
        hero={false}
        title="Add your date of birth"
        subtitle="This won't be part of your public profile"
        footer={
          <div className="mt-6 flex flex-col items-center gap-3">
            <DevsLink to="/user/signup">Go back</DevsLink>
            <p className="font-mono text-[12px] text-[var(--text-muted)] text-center">
              Have an account?{" "}
              <DevsLink to="/" accent>Log in</DevsLink>
            </p>
          </div>
        }
      >
        <DevsHeroIcon icon={Cake} />

        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-[1.5fr_1fr_1.1fr] gap-2">
            <select
              aria-label="Month"
              {...register("month", { required: "Month is required" })}
              className={devsSelect(!!errors.month)}
            >
              <option value="">Month</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>

            <select
              aria-label="Date"
              {...register("date", { required: "Date is required" })}
              className={devsSelect(!!errors.date)}
            >
              <option value="">Date</option>
              {dates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>

            <select
              aria-label="Year"
              {...register("year", { required: "Year is required" })}
              className={devsSelect(!!errors.year)}
            >
              <option value="">Year</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {hasAnyError && (
            <p className="font-mono text-[11px] text-[var(--color-error)]">
              ! Please select your full date of birth
            </p>
          )}

          <div className="font-mono text-[11px] leading-relaxed text-[var(--text-muted)] text-center">
            <p>You need to enter the date you were born on</p>
            <p className="mt-2">
              Use your own date of birth, even if this account is for a
              business, pet or something else
            </p>
          </div>

          <DevsButton type="submit" loading={isSubmitting}>
            Next
          </DevsButton>
        </form>
      </DevsAuthShell>
    );
  }

  /* ---------------- Classic (light / dark) ---------------- */
  return (
    <div className="dobPage h-[100vh] w-[100vw] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="dobContainer w-[350px] h-[550px] flex flex-col justify-between ">
        <div className="topPart h-[84%] w-full border border-[var(--border-container)]">

          <div className="cake w-full h-[180px] flex flex-col items-center ">
            <Cake size={100} strokeWidth={1.25} className="text-[var(--text-primary)] mt-2" />
            <div className="text mt-1 text-[var(--text-primary)] text-[14px] font-bold">Add your date of birth</div>
            <div className="text2 mt-3 text-[var(--text-primary)] text-[16px]">This won't be part of your public profile</div>
          </div>

          <div className="dobForm w-full h-[60px] ">
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex justify-center items-center gap-1" >

              {/* Month input field */}
              <select
                {...register("month",
                  {
                    required: "Month is required"

                  })}
                className={`h-[36px] w-[100px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px]  px-[10px] my-[3px] ${errors.month ? " border border-[var(--color-error)]" : "border border-[var(--border-select)]"}`}
              >
                <option value="">Month</option>
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>

              {/* Date input field */}
              <select
                {...register("date",
                  {
                    required: "Date is required"

                  })}
                className={`h-[36px] w-[70px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px]  px-[10px] my-[3px] ${errors.date ? " border border-[var(--color-error)]" : "border border-[var(--border-select)]"}`}
              >
                <option value="">Date</option>
                {dates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>

              {/* Year input field */}
              <select
                {...register("year",
                  {
                    required: "Year is required"

                  })}
                className={`h-[36px] w-[80px] bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px]  px-[10px] my-[3px] ${errors.year ? " border border-[var(--color-error)]" : "border border-[var(--border-select)]"}`}
              >
                <option value="">Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

            </form>
          </div>

          <div className="text w-full h-[90px]">
            <p className="text-[12px] text-[var(--text-muted)] text-center mt-1">You need to enter the date you were born on</p>
            <p className="text-[12px] text-[var(--text-muted)] text-center mt-5">Use your own date of birth, even if this account is for a <br />business, pet or something else</p>
          </div>

          <div className="btns w-full h-[125px] flex flex-col justify-center items-center gap-2">
            <div onClick={() => formRef.current.requestSubmit()} className="nextBtn w-[75%] h-[35px] flex justify-center items-center rounded-[10px] bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--text-on-brand)] font-bold cursor-pointer">Next</div>
            <div className="backBtn w-[75%] h-[35px] flex justify-center items-center rounded-[10px] font-bold "><span className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hover)] cursor-pointer"><Link to="/user/signup">Go back</Link></span></div>
          </div>

        </div>
        <div className="bottomPart h-[15%] w-full flex justify-center items-center border border-[var(--border-container)] ">
          <p className="text-[var(--text-primary)] text-[14px] text-center">Have an account? <br /> <span className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hover)] font-bold cursor-pointer"><Link to="/">Log in</Link></span></p>
        </div>
      </div>
    </div>

  )
}

export default DobPage