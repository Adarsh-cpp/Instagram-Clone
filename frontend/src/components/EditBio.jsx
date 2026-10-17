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
    className={`w-full h-full bg-[var(--bg-input)] text-[12px] resize-none outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px] p-2 devs:font-mono devs:rounded-2xl devs:p-3 devs:transition-all devs:duration-200 devs:focus:border-[var(--devs-cyan)] devs:focus:shadow-[0_0_0_3px_rgba(34,240,255,0.15),0_0_20px_rgba(34,240,255,0.2)] ${
      errors.bio
        ? "border border-[var(--color-error)]"
        : "border border-[var(--border-input)]"
    }`}
    placeholder="Write something about yourself..."
  />
  {errors.bio && (
    <p className="text-[var(--color-error)] text-sm mt-1 devs:font-mono devs:text-[12px]">
      {errors.bio.message}
    </p>
  )}
</div>

  )
}

export default EditBio