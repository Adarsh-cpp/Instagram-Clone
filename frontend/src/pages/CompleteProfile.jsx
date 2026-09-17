import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

const BASE_URL = import.meta.env.VITE_SERVER_URL

const CompleteProfile = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        "${BASE_URL}/auth/add-username",
        { username: data.username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/home");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] bg-[var(--bg-app)] flex justify-center items-center">
      <form onSubmit={handleSubmit(onSubmit)} className="w-[270px] flex flex-col items-center">
        <h2 className="text-[var(--text-primary)] text-[18px] font-bold mb-4">Choose a username</h2>
        <input
          {...register("username", {
            required: "This field is required",
            pattern: { value: usernameRegex, message: "Enter a valid username" },
          })}
          className={`h-[36px] w-full bg-[var(--bg-input)] text-[12px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px] px-[10px] my-[3px] ${errors.username ? "border border-[var(--color-error)]" : "border border-[var(--border-input)]"}`}
          placeholder="Username"
        />
        {errors.username && <p className="text-[var(--color-error)] text-sm mt-1">{errors.username.message}</p>}
        <button type="submit" className="w-full h-[32px] my-[10px] rounded-[8px] bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--text-on-brand)] text-[14px] font-bold cursor-pointer">
          Continue
        </button>
      </form>
    </div>
  );
};

export default CompleteProfile;