// uploadCsvToRTDB.js
import { parse } from "csv-parse/sync";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';


// Resolve the service account path relative to this script's directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(__dirname, "../tttt-ed355-firebase-adminsdk-fbsvc-3946310111.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tttt-ed355-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

// Path to CSV folder (always relative to this script)
const csvFolder = path.resolve(__dirname, "../csv");

// Function to upload individual CSV file
async function uploadCsvFile(filePath, category) {
  try {
    // Read CSV file
    const fileContent = fs.readFileSync(filePath);
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Create object with sanitized item name as key
    const dataToUpload = {};
    records.forEach((row) => {
      if (row.name) {
        // Sanitize the key name to be Firebase-compatible
        const safeKey = row.name.replace(/[.#$\[\]/]/g, '_');
        dataToUpload[safeKey] = row;
      }
    });

    // Upload to components/{category}
    await db.ref(`components/${category}`).set(dataToUpload);

    console.log(`✅ Uploaded ${category} to Firebase RTDB`);
  } catch (error) {
    console.error(`❌ Error uploading ${category}:`, error);
  }
}

// Main function
async function main() {
  try {
    // Delete existing components node
    await db.ref('components').remove();
    console.log('🗑️ Deleted existing components data');

    const files = fs.readdirSync(csvFolder).filter((f) => f.endsWith(".csv"));

    for (const file of files) {
      const category = path.basename(file, ".csv"); // category name = file name without extension
      const filePath = path.join(csvFolder, file);
      await uploadCsvFile(filePath, category);
    }

    console.log("🎯 Successfully uploaded all CSV files!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
