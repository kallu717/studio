// src/lib/firestore.ts
import { 
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';

const COLLECTION_NAME = 'saved_files';

export interface SavedFile {
  id?: string;
  name: string;
  ticketName: string;
  uploadedAt: string; // ISO string
  storagePath: string;
  downloadURL: string;
  size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
}

// Function to upload a file and create its record in Firestore
export function uploadFile(
  ticketName: string, 
  file: File, 
  onProgress: (progress: number) => void
): Promise<void> {

  return new Promise((resolve, reject) => {
    if (!ticketName.trim()) {
      return reject(new Error("Ticket name cannot be empty."));
    }
    
    const storagePath = `uploads/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      }, 
      (error) => {
        // Handle unsuccessful uploads
        console.error("Error uploading file:", error);
        // Attempt to delete the file from storage if DB entry fails, to prevent orphans
        deleteObject(storageRef).catch(delErr => console.error("Could not delete orphaned storage file", delErr));
        reject(new Error("File upload failed. Please try again."));
      }, 
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Create a record in Firestore
          await addDoc(collection(db, COLLECTION_NAME), {
            name: file.name,
            ticketName: ticketName,
            storagePath: storagePath,
            downloadURL: downloadURL,
            size: file.size,
            status: 'uploaded',
            uploadedAt: Timestamp.now(),
          });
          resolve();
        } catch (dbError) {
            console.error("Error saving file metadata to Firestore:", dbError);
            reject(new Error("File uploaded, but failed to save metadata."));
        }
      }
    );
  });
}

// Function to get all saved files from Firestore
export async function getFiles(): Promise<SavedFile[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const files: SavedFile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const uploadedAtTimestamp = data.uploadedAt as Timestamp | null;
      // Convert Firestore Timestamp to a simple ISO string for consistency
      const uploadedAt = uploadedAtTimestamp ? uploadedAtTimestamp.toDate().toISOString() : new Date().toISOString();
      
      files.push({
        id: doc.id,
        name: data.name,
        ticketName: data.ticketName,
        uploadedAt: uploadedAt,
        storagePath: data.storagePath,
        downloadURL: data.downloadURL,
        size: data.size,
        status: data.status,
      });
    });
    return files;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw new Error("Could not retrieve files from Firestore.");
  }
}

// Function to delete a file from Firestore and Storage
export async function deleteFile(fileId: string, storagePath: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, fileId);
  const storageRef = ref(storage, storagePath);
  
  try {
    // Attempt to delete from Storage first.
    // We wrap this in a try/catch so that if the file is already gone,
    // we don't throw an error and can still proceed to delete the Firestore doc.
    try {
        await deleteObject(storageRef);
    } catch (storageError: any) {
        // If the error is 'storage/object-not-found', we can safely ignore it
        // because it means the file is already deleted.
        if (storageError.code !== 'storage/object-not-found') {
            // For any other storage error, we re-throw it.
            throw storageError;
        }
        console.log("Storage file not found, proceeding to delete Firestore record.");
    }
    
    // Now, delete the document from Firestore.
    await deleteDoc(docRef);

  } catch (e) {
    console.error("Error during deletion process: ", e);
    throw new Error("Could not complete the deletion.");
  }
}
