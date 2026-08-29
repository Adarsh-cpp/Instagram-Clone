import React from "react";

const PostType = ({ type, imgSrc, activeTab, setActiveTab }) => {
  return (
    <div className="post w-[25%] h-full flex justify-center items-end">
      <button
        onClick={() => setActiveTab(type)}
        className={`insideDiv w-[45px] h-[45px] flex justify-center items-center cursor-pointer border-b-[2px] ${
          activeTab === type ? "border-white" : "border-transparent"
        }`}
      >
        <img src={imgSrc} alt={type} className="w-[30px] h-[30px]" />
      </button>
    </div>
  );
};

export default PostType;
