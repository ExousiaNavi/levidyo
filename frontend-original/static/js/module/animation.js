// Improved animation with bounds checking
  export async function animateCardRotation() {
    const card = document.getElementById("animatedCard");
    const container = card.parentElement;

    // Reset position
    card.style.transform = "rotate(0deg)";
    card.style.transition = "transform 0s";

    // Start animation after slight delay
    setTimeout(() => {
      card.style.transition = "transform 1.5s ease-in-out";
      card.style.transform = "rotate(90deg)";

      // Continuous smooth animation
      let isRotated = true;
      setInterval(() => {
        card.style.transition = "transform 1.5s ease-in-out";
        isRotated = !isRotated;
        card.style.transform = isRotated ? "rotate(90deg)" : "rotate(0deg)";
      }, 3000);
    }, 100);
  }

  // Show guide with correct side
  export async function showOrientationGuide(side, guide, sideText, frontContent, backContent) {
    // const guide = document.getElementById("orientationGuide");
    // const sideText = document.getElementById("guideSideText");
    // const frontContent = document.getElementById("frontGuideContent");
    // const backContent = document.getElementById("backGuideContent");

    sideText.textContent = side === "front" ? "Front Side" : "Back Side";
    frontContent.classList.toggle("hidden", side !== "front");
    backContent.classList.toggle("hidden", side === "front");

    guide.classList.remove("hidden");
    await animateCardRotation();
  }