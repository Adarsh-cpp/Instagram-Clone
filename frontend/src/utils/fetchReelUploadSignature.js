export const fetchReelUploadSignature = async ({ trimStart, trimDuration, token, baseUrl }) => {
  const res = await fetch(`${baseUrl}/reels/sign-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trimStart, trimDuration }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Could not get upload signature");
  }

  return res.json();
};
