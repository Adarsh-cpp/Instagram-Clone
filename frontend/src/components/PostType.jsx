import React from "react";

const PostType = ({ type, icon: Icon, activeTab, setActiveTab }) => {
  const isActive = activeTab === type;

  return (
    <div className="post w-[25%] h-full flex justify-center items-end">
      <button
        onClick={() => setActiveTab(type)}
        aria-label={type}
        className={`insideDiv w-[45px] h-[45px] flex justify-center items-center cursor-pointer border-b-[2px] transition-colors ${
          isActive ? "border-[var(--text-primary)]" : "border-transparent"
        }`}
      >
        <Icon
          size={26}
          strokeWidth={isActive ? 2.25 : 1.75}
          className={`transition-colors ${
            isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}
        />
      </button>
    </div>
  );
};

export default PostType;
