import React, { useRef } from 'react'

const RecommendedFollowingcard = () => {

  const checkboxImageRef = useRef();

  const handleCheckboxClick = (e) => {
    if (e.target.checked)
      checkboxImageRef.current.style.display = "block";
    else
      checkboxImageRef.current.style.display = "none";
  }

  return (
    <div className="recommendedFollowingcard w-[100%] h-[70px] flex justify-between">
        <div className="profileSection w-[75%] sm:w-[40%] h-full flex justify-between items-center  ">
           <div className="w-[30%] h-full flex justify-center items-center ">
           <div className="profilePicSection w-[60px] h-[60px] bg-white rounded-full  overflow-hidden">
               <img src="/images/profile-pic.JPG" alt="" />
                 </div>
              </div> 
             <div className="profileDetails w-[70%] h-full ">
               <div className="username w-full h-[50%] flex items-end px-2  text-[#ddd4d4] text-[14px] font-bold ">adarsh_364_</div>
           <div className="fullname w-full h-[50%] flex items-start px-2  text-[#ddd4d4] text-[14px] ">Adarsh Pattanayak</div>
         </div>
    </div>
              <div className="checkboxsection w-[25%] h-full flex justify-end items-center gap-2 pr-4">
      <label for="checkbox" className="checkboxCircle w-[30px] h-[30px] flex justify-center items-center rounded-full bg-[#363636] cursor-pointer overflow-hidden">
         <img src="/images/tick-icon.png" alt="" ref={checkboxImageRef} className="w-[30px] h-[30px] bg-white hidden" />
          </label>
         <input type="checkbox" onClick={handleCheckboxClick} name="checkbox" id="checkbox" className="hidden" />
                                
           </div>
        </div>
  )
}

export default RecommendedFollowingcard