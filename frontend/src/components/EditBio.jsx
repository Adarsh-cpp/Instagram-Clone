import React from 'react'
import { useForm } from "react-hook-form";


const EditBio = () => {

       const { register, handleSubmit, formState: { errors }, } = useForm();

  return (
   <div className="w-full h-full rounded-2xl">
  <textarea
    {...register("bio", {
      required: "This field is required",
      maxLength: {
        value: 150,
        message: "Bio must be less than 150 characters",
      },
    })}
    defaultValue="I freeze moments, stealing them from time" // <-- previous bio pre-filled
    rows={3}
    className={`w-full h-full bg-[#121212] text-[12px] resize-none outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[5px] p-2 ${
      errors.bio
        ? "border border-[#FF3040]"
        : "border border-[#555555]"
    }`}
    placeholder="Write something about yourself..."
  />
  {errors.bio && (
    <p className="text-[#FF3040] text-sm mt-1">
      {errors.bio.message}
    </p>
  )}
</div>

  )
}

export default EditBio
