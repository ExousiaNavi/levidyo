export async function loadModels(modelsLoaded) {
    if (modelsLoaded) return;
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/static/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/static/models"),
      ]);
      modelsLoaded = true;
      console.log("Model is loaded...")
    } catch (error) {
      console.error("Error loading models:", error);
      alert("Failed to load face detection models. Please refresh the page.");
    }
  }

  export async function loadCardModels() {
    console.log("Incase of model detection card...");
  }