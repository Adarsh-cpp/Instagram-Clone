
import axios from 'axios';
import React from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom';



const ForgotPasswordPage = () => {

  const emailOrMobileRegex = /^(?:[6-9]\d{9}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/i;

    const { register, handleSubmit, formState: { errors }, } = useForm();
    const navigate = useNavigate();
        
    const onSubmit = async (data) => {

            let url = "http://localhost:4000/auth/send-reset-otp";

            try {

           let response = await axios.post(url, { contact: data.contact });
           
           let token = response.data.resetToken;
           localStorage.setItem("resetToken", token);

           navigate("/user/reset-password")
              
            } catch (error) {
              alert(error.message)
            }

    };
    

  return (
    <div className="forgotPasswordPage w-[100vw]  h-[100vh] flex justify-center items-center bg-[#0c1014]">
      <div className="forgotPasswordContainer w-[350px] h-[460px] border border-[#363636]">

        <div className="lockPic w-full h-[120px] flex justify-center items-center ">
            <img src="/images/pw-forget-logo.png" alt="" className="w-[14p0px] h-[100px] " />
        </div>

       <div className="text w-full h-[120px] flex flex-col items-center  pl-4 ">
        <div className="upperText text-white font-bold ">Trouble with logging in?</div>
        <div className="lowerText text-[#ddd4d4] text-[14px] text-center mt-4 ">Enter your email address or phone number and <br /> we will send you a link to get back into <br /> your account.</div>
       </div>
    
       <div className="resetForm w-full h-[110px] ">
           <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex flex-col  items-center">

               <div>
          <input
          type="text"
            {...register("contact", {
              required: "This field is required",
              pattern: {
                value: emailOrMobileRegex,
                message: "Enter email or phone",
              },
            })}
            className={`h-[36px] w-[270px] bg-[#121212] text-[12px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px]  px-[10px] my-[3px] ${errors.contact ? " border border-[#FF3040]" : "border border-[#555555]" }`}
            placeholder="Email address or phone number"
          />
          {errors.contact && (
            <p className="text-red-500 text-sm mt-1">
              {errors.contact.message}
            </p>
          )}
              </div>

              <button type="submit" className="confirmBtn w-[270px] h-[32px] my-[10px] rounded-[8px] bg-[#0095f6] hover:bg-[#1877f2] text-[#afb2b3] text-[14px] font-bold cursor-pointer">Send login link</button>

           </form>
        </div>

      <div className="divison w-full h-[30px] flex ">
         <div className="line1 h-full w-[40%] flex items-center"><hr className="inline-block w-full border border-[#262626]" /></div>
                <div className="text h-full w-[20%] text-white text-[16px] text-center ">OR</div>
                <div className="line2 h-full w-[40%] flex items-center"><hr className="inline-block w-full border border-[#262626]" /></div>
      </div>
    
      <div className="signUp w-full h-[80px] flex justify-center pt-4 text-[#0095f6] hover:text-[#1877f2] font-bold cursor-pointer "> <Link to="/user/signup">Create new account.</Link></div>
    
      </div>
    </div>
  )
}

export default ForgotPasswordPage