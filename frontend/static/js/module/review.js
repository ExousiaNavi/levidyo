export async function showFinalReview(
  idCapturePage,
  finalReviewPage,
  reviewFace,
  reviewFront,
  reviewBack,
  capturedFace,
  capturedFront,
  capturedBack
) {
  if (idCapturePage) idCapturePage.classList.add("hidden");
  if (finalReviewPage) finalReviewPage.classList.remove("hidden");

  if (reviewFace && capturedFace) reviewFace.src = capturedFace;
  if (reviewFront && capturedFront) reviewFront.src = capturedFront;
  if (reviewBack && capturedBack) reviewBack.src = capturedBack;

  const manual = localStorage.getItem("manual");

  const retryFrontEl = document.querySelector("#retryFront");
  const retryBackEl = document.querySelector("#retryBack");

  if (manual === "1" || manual === 1) {
    retryFrontEl?.classList.add("hidden");
    retryBackEl?.classList.add("hidden");
  } else {
    retryFrontEl?.classList.remove("hidden");
    retryBackEl?.classList.remove("hidden");
  }
}
