
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { Link, useNavigate } from 'react-router-dom';
import axios from "axios";
import { toast } from 'react-toastify';



const SignupPage = () => {

    const { register, handleSubmit, formState: { errors }, } = useForm();
    const navigate = useNavigate();


   const emailOrMobileRegex = /^(?:[6-9]\d{9}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/i;
   const fullNameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
   const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

    const [pwVisibility, setPwVisibility] = useState(false);

      const handlePwVisibility = () => {
        setPwVisibility((prev) => !prev);
      }


  const onSubmit = async (data) => {
  try {
    const url = "http://localhost:4000/auth/signup";
    const response = await axios.post(url, {
      contact: data.contact,
      username: data.username,
      fullname: data.fullname,
      password: data.password,
    });

    // Save token in localStorage
    const token = response.data.token;
    localStorage.setItem("authToken", token);

    navigate("/user/dob"); // Redirect on success
  } catch (error) {
     toast.error(
      error.response?.data?.message || "Something went wrong"
    );
  }
};



  return (
   <div className="signupPage h-[100vh] w-[100vw] bg-[#0c1014] flex justify-center">
        <div className="container h-full w-[900px] flex justify-center">
          <div className="imgContainer h-full w-[550px] hidden lg:flex justify-center items-center ">
            <img src="/images/loginPage-img.png" alt="" />
          </div>
          <div className="signupContainer h-full w-[350px] flex items-center">
            <div className="signupBox w-full h-[80%]">
              <div className="logoSection w-full h-[100px] flex flex-col items-center">
                <img src="/images/instagram-logo.png" alt="" className=" h-[51px]" />
                <div className="logoText text-center text-[16px] text-[#A8A8A8] font-bold">Sign up to see photos and videos <br /> from your friends.</div>
                </div>

                <div className="formSection w-full min-h-[250px] transition-all ease-in-out duration-500">

                  <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex flex-col items-center pt-[20px]">
        {/*Email/Mobile no Field */}
        <div>
          <input
            {...register("contact", {
              required: "This field is required",
              pattern: {
                value: emailOrMobileRegex,
                message: "Mobile number or email address is required",
              },
            })}
           className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.contact ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Mobile number or email address"
          />
          {errors.contact && (
            <p className="text-[#FF3040] text-sm mt-1">
              {errors.contact.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="passwordContainer relative">
          <button type="button" onClick={handlePwVisibility} className="visibility absolute right-[10px] top-[25%] cursor-pointer z-10 ">
            <img
              src={pwVisibility ? "/images/visibility-off.png" : "/images/visibility-on.png"}
              alt=""
              className="w-[20px] h-[20px] "
            />
            </button>
          <input
            type={pwVisibility ? "text" : "password"}
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.password ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

       {/*  Full name Field  */}
       <div>
          <input
            {...register("fullname", {
              required: "This field is required",
              pattern: {
                value: fullNameRegex,
                message: "Fullname",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.fullname ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Fullname"
          />
          {errors.fullname && (
            <p className="text-[#FF3040] text-sm mt-1">
              {errors.fullname.message}
            </p>
          )}
        </div>
    
    {/*  username Field  */}
    <div>
          <input
            {...register("username", {
              required: "This field is required",
              pattern: {
                value: usernameRegex,
                message: "Username",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.username ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Username"
          />
          {errors.username && (
            <p className="text-[#FF3040] text-sm mt-1">
              {errors.username.message}
            </p>
          )}
        </div>
     
        {/* Submit Button */}
        <button
          type="submit"
          className="signupBtn w-[270px] h-[32px] my-[10px] rounded-[8px] bg-[#0095f6] hover:bg-[#1877f2] text-[#ffffff] text-[14px] font-bold cursor-pointer"
        >
          Sign up
        </button>
      </form>
                </div>

            <div className="divisonSection w-full h-[30px] flex justify-center mt-4 ">
              <div className="divisionContainer h-full w-[270px] flex">
                <div className="line1 h-full w-[40%] flex items-center"><hr className="inline-block w-full border border-[#262626]" /></div>
                <div className="text h-full w-[20%] text-white text-[16px] text-center ">OR</div>
                <div className="line2 h-full w-[40%] flex items-center"><hr className="inline-block w-full border border-[#262626]" /></div>
              </div>
            </div>
          
          <div className="facebook w-full h-[80px]">
            <div className="top h-[50%] w-full flex justify-center items-center text-[rgb(53,121,234)] hover:text-[rgb(20,100,255)]  text-[14px] font-bold cursor-pointer ">
              <img src="/images/facebook-logo.png" alt="" className="w-[30px] h-[20px]" /> Log in with Facebook
            </div>
            <div className="bottom h-[50%] w-full flex justify-center items-center text-[#FAFAFA] text-[14px] hover:text-[#7D7D7D] cursor-pointer font-bold "><Link to="/user/forgot-password">Forgotten your password?</Link></div>
          </div>
          
          <div className="signup w-full h-[90px] text-white text-[14px] flex justify-center items-center">Have an account? <span className="text-[rgb(53,121,234)] hover:text-[rgb(20,100,255)]  font-bold cursor-pointer"> &nbsp;<Link to="/"> Log in</Link></span></div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default SignupPage