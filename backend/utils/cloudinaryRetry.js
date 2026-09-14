// retries a Cloudinary asset deletion in the background without blocking the
// response — free-tier storage is limited, so we don't want orphaned assets
// piling up just because Cloudinary was slow/flaky at the moment of deletion
export const deleteCloudinaryAssetWithRetry = async (
  publicId,
  resourceType = "image",
  attempt = 1,
  maxAttempts = 5,
  cloudinaryClient
) => {
  try {
    await cloudinaryClient.uploader.destroy(publicId, {
      resource_type: resourceType,
      timeout: 120000,
    });
    if (attempt > 1) {
      console.log(`Cloudinary ${resourceType} deletion succeeded on attempt ${attempt}:`, publicId);
    }
  } catch (err) {
    if (attempt >= maxAttempts) {
      console.error(
        `Cloudinary ${resourceType} deletion FAILED after ${maxAttempts} attempts — manual cleanup needed:`,
        publicId,
        err?.message || err
      );
      return;
    }

    const delayMs = 2000 * attempt;
    const logFn = attempt >= 3 ? console.warn : console.log;
    logFn(
      `Cloudinary ${resourceType} deletion attempt ${attempt} timed out, retrying in ${delayMs}ms:`,
      publicId
    );

    setTimeout(() => {
      deleteCloudinaryAssetWithRetry(publicId, resourceType, attempt + 1, maxAttempts, cloudinaryClient);
    }, delayMs);
  }
};