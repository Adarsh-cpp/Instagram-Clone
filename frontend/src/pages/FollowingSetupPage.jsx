import React from 'react'
import { useRef,useState } from "react";
import RecommendedFollowingcard from '../components/RecommendedFollowingcard';


const FollowingSetupPage = () => {

 
 

  return (
    <div className="followingSetupPage h-[100vh] w-[100vw] flex justify-center items-center bg-[#0c1014]">
     <div className="container w-[600px] h-full flex border border-[#363636] ">
        
        <div className="followingSection relative w-full sm:w-[600px] h-full ">

            <div className="mobileNav w-full h-[60px] flex md:hidden  justify-between items-center  ">
                <div className="logo ml-10"><img src="/images/instagram-logo.png" alt="" className="w-[100px] h-[30px]" /></div>
                <div className="searchBar w-[150px]  sm:w-[250px] h-[40px] flex justify-center items-center mr-10 rounded-[15px] overflow-hidden bg-[#363636]">
                    <div className="searchIcon w-[25%] sm:w-[15%] h-full flex justify-center items-center">
                        <img src="/images/search-icon.png" alt="" />
                        </div>
                    <div className="searchInput w-[75%] sm:w-[85%] h-full overflow-hidden">
                        <input type="text" name="search" id="search" className="w-full h-full  px-2 text-white text-[14px] outline-none " autocomplete="off" />
                    </div>
                </div>
            </div>

            <hr className="border border-[#262626] md:hidden " />

            <div className="centerDiv w-full h-[calc(100vh-122px)] md:h-[calc(100vh-4px)]">
                <div className="upperSection w-full h-[20%] flex 0 ">
                    <div className="iconPart w-[18%] h-full flex justify-center items-center ">
                        <img src="/images/emoji-icon.png" alt="" />
                    </div>
                    <div className="textPart w-[67%] h-full flex flex-col justify-center items-start ">
                        <p className="text-[#ddd4d4] text-[14px] sm:text-[16px] font-bold">Find friends and accounts that you like</p>
                        <p className="text-[#ddd4d4] text-[12px] sm:text-[14px]">Try following 3 or more accounts for a personalised experience.</p>
                    </div>
                    <div className="btnPart w-[15%] h-full flex justify-center items-center">
                         <button type="submit" className="loginBtn w-[60px] sm:w-[70px] h-[32px] my-[10px] rounded-[8px] bg-[#0095f6] hover:bg-[#1877f2] text-[#afb2b3] text-[14px] font-bold cursor-pointer">Next</button>
                    </div>
                </div>
                <hr className="border border-[#262626]" />
                <div className="followingCardsContainer w-full h-[80%] overflow-auto ">
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                    <RecommendedFollowingcard/>
                </div>
            </div>
        </div>
     </div>
    </div>
  )
}

export default FollowingSetupPage
