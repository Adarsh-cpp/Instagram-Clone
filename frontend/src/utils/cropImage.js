const MAX_OUTPUT_DIMENSION = 1600; // long edge, in px — plenty for feed/carousel display

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));

    image.src = url;
  });

// Used when a slide was never actively cropped by the user (e.g. they hit
// "Next" without visiting every image in the filmstrip). Returns a centered
// crop area matching the chosen aspect ratio, same as Instagram's default.
export const getDefaultCroppedArea = async (imageSrc, aspect) => {
  const image = await createImage(imageSrc);
  const imgAspect = image.width / image.height;

  let width, height;

  if (imgAspect > aspect) {
    // image is wider than target — crop the sides
    height = image.height;
    width = height * aspect;
  } else {
    // image is taller than target — crop top/bottom
    width = image.width;
    height = width / aspect;
  }

  return {
    x: (image.width - width) / 2,
    y: (image.height - height) / 2,
    width,
    height,
  };
};

export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Scale down if the crop is bigger than we actually need — avoids
  // shipping full-camera-resolution JPEGs for feed-sized display
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = pixelCrop.width * scale;
  canvas.height = pixelCrop.height * scale;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "post.jpg", { type: "image/jpeg" });
        resolve(file);
      },
      "image/jpeg",
      0.85 // explicit quality — smaller files, no visible loss for feed display
    );
  });
}