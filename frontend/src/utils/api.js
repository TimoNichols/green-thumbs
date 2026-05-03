// Update API_BASE_URL to your machine's local IP for device testing.
// Find it with: ipconfig (Windows) → IPv4 under Wi-Fi
// Replace with your Railway URL for production.
export const API_BASE_URL = "http://10.0.0.152:8000";

export async function analyzeImage(
  photoUri,
  mediaType = "image/jpeg",
  symptom = "None",
  knownSpecies = "",
) {
  const formData = new FormData();
  formData.append("file", {
    uri: photoUri,
    type: mediaType,
    name: "plant.jpg",
  });
  formData.append("symptom", symptom || "None");
  if (knownSpecies) {
    formData.append("known_species", knownSpecies);
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error ${response.status}`);
  }

  return response.json();
}

export async function fetchCare(species, homeEnvironment = null) {
  const formData = new FormData();
  formData.append("species", species);
  if (homeEnvironment) {
    formData.append("home_environment", JSON.stringify(homeEnvironment));
  }
  const response = await fetch(`${API_BASE_URL}/care`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error ${response.status}`);
  }
  return response.json();
}

export async function fetchWaterInterval(waterText) {
  const formData = new FormData();
  formData.append("water_text", waterText);
  const response = await fetch(`${API_BASE_URL}/parse-interval`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error ${response.status}`);
  }
  return response.json();
}

export async function fetchDiagnosis(species, symptom, care = null) {
  const formData = new FormData();
  formData.append("species", species);
  formData.append("symptom", symptom);
  if (care) {
    formData.append("care_data", JSON.stringify(care));
  }
  const response = await fetch(`${API_BASE_URL}/diagnose`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error ${response.status}`);
  }
  return response.json();
}
