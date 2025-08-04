// Async wrappers for localStorage

export async function setStep(step) {
  localStorage.setItem("step", step);
}

export async function getStep() {
  return localStorage.getItem("step") || "face";
}

export async function setShouldFaceUser(value) {
  localStorage.setItem("ShouldFaceUser", value);
}

export async function getShouldFaceUser() {
  return localStorage.getItem("ShouldFaceUser") || true;
}

export async function setCapturedFace(dataUrl) {
  localStorage.setItem("capturedFace", dataUrl);
}

export async function getCapturedFace() {
  return localStorage.getItem("capturedFace") || "";
}

export async function setCapturedFront(dataUrl) {
  localStorage.setItem("capturedFront", dataUrl);
}

export async function getCapturedFront() {
  return localStorage.getItem("capturedFront") || "";
}

export async function setCapturedBack(dataUrl) {
  localStorage.setItem("capturedBack", dataUrl);
}

export async function getCapturedBack() {
  return localStorage.getItem("capturedBack") || "";
}

export async function setRetryFace(value) {
  localStorage.setItem("retryFace", value);
}

export async function getRetryFace() {
  return localStorage.getItem("retryFace") || false;
}

export async function setRetryFront(value) {
  localStorage.setItem("retryFront", value);
}

export async function getRetryFront() {
  return localStorage.getItem("retryFront") || false;
}
export async function setRetryBack(value) {
  localStorage.setItem("retryBack", value);
}

export async function getRetryBack() {
  return localStorage.getItem("retryBack") || false;
}

export async function setUsername(value) {
  localStorage.setItem("username", value);
}

export async function getUsername() {
  return localStorage.getItem("username") || '';
}