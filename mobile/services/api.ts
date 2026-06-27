const BASE_URL = 'http://10.173.68.192:8080';
// This is your laptop's IP address — the same one showing in your Expo terminal

// Get one prescription by its ID
export const getPrescription = async (prescriptionId: number) => {
  const response = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}`);
  return response.json();
};

// Get all drugs on a prescription
export const getDrugsOnPrescription = async (prescriptionId: number) => {
  const response = await fetch(`${BASE_URL}/dispensations/prescription/${prescriptionId}`);
  return response.json();
};

// Get remaining (uncollected) drugs
export const getRemainingDrugs = async (prescriptionId: number) => {
  const response = await fetch(`${BASE_URL}/dispensations/prescription/${prescriptionId}/remaining`);
  return response.json();
};