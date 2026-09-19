import React from 'react'
import { useForm } from "react-hook-form";
import { useRef } from "react";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Cake } from 'lucide-react';

axios.defaults.withCredentials = true;

const BASE_URL = import.meta.env.VITE_SERVER_URL

const DobPage = () => {

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);
  const years = Array.from({ length: 2025 - 1925 + 1 }, (_, i) => 2025 - i);


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