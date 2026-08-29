// BioCard.jsx
import React, { useState } from "react";

const BioCard = ({ bioText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 80;
  const shouldTruncate = bioText.length > MAX_LENGTH;

  const toggleReadMore = () => setIsExpanded(!isExpanded);

  const displayText = isExpanded
    ? bioText
    : bioText.slice(0, MAX_LENGTH) + (shouldTruncate ? "..." : "");

  return (
    <div className="bio w-full h-auto text-white text-[14px] sm:text-[18px]">
      <div className="bioContainer w-full px-2 sm:px-6 py-1 leading-relaxed">
        <p className="inline">{displayText}</p>
        {shouldTruncate && (
          <button
            onClick={toggleReadMore}
            className="ml-1 text-[#8ab4ff] hover:text-[#bcd0ff] font-medium cursor-pointer focus:outline-none"
          >
            {isExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
};

export default BioCard;
