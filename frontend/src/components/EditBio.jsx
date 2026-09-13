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
    className={`w-full h-full bg-[var(--bg-input)] text-[12px] resize-none outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[5px] p-2 ${
      errors.bio
        ? "border border-[var(--color-error)]"
        : "border border-[var(--border-input)]"
    }`}
    placeholder="Write something about yourself..."
  />
  {errors.bio && (
    <p className="text-[var(--color-error)] text-sm mt-1">
      {errors.bio.message}
    </p>
  )}
</div>

  )
}

export default EditBio