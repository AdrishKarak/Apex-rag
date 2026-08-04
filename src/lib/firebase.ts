/**
 * @file src/lib/firebase.ts
 * @description Integrates Firebase Storage for file uploads.
 * 
 * WHY IT'S NEEDED:
 * Facilitates direct uploads of meeting audio files (MP3/WAV) from the user's browser,
 * yielding public URLs that the transcription workers can fetch.
 * 
 * FLOW OF EXECUTION:
 * 1. `uploadFile(file, setProgress)`: Returns a Promise.
 * 2. Creates a storage reference mapped to the file's name inside the bucket.
 * 3. Launches a resumeable upload task (`uploadBytesResumable`).
 * 4. Tracks execution states and triggers progress callbacks using `setProgress`.
 * 5. Upon successful upload completion, fetches the download URL and resolves the promise.
 * 
 * CONNECTIONS:
 * - Loaded by client component modals when creating or uploading audio recordings.
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage"

// Firebase Configuration options parsed from public environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize the Firebase client instance
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage.
 * @param file File object retrieved from input forms
 * @param setProgress State modifier callback to track upload completion percentages
 */
export async function uploadFile(file: File, setProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Generate a bucket reference mapped to the file name
            const storageRef = ref(storage, file.name)
            // Trigger the upload task
            const uploadTask = uploadBytesResumable(storageRef, file)

            // Listen to state alterations to compute upload speed percentages
            uploadTask.on("state_changed", (snapshot) => {
                const progress = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                if (setProgress) {
                    setProgress(progress)
                }
            }, (error) => {
                console.error("Firebase upload error:", error);
                reject(error)
            }, () => {
                // Fetch the public download URL once the upload task finishes
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL as string)
                }).catch((error) => {
                    console.error("Firebase getDownloadURL error:", error);
                    reject(error)
                })
            })
        } catch (error) {
            console.error("Firebase uploadFile error:", error);
            reject(error);
        }
    })
}