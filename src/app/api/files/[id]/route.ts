
// src/app/api/files/[id]/route.ts
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return new NextResponse(JSON.stringify({ error: 'File ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // 1. Get file metadata from Firestore
    const fileDocRef = doc(db, 'saved_files', id);
    const fileDocSnap = await getDoc(fileDocRef);

    if (!fileDocSnap.exists()) {
      return new NextResponse(JSON.stringify({ error: 'File not found in Firestore' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const fileData = fileDocSnap.data();
    const downloadURL = fileData.downloadURL;

    if (!downloadURL) {
        return new NextResponse(JSON.stringify({ error: 'File metadata is missing a download URL' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch the file from the Firebase Storage URL on the server-side
    const fileResponse = await fetch(downloadURL);

    if (!fileResponse.ok) {
        const errorBody = await fileResponse.text();
        console.error(`Failed to fetch file from storage: ${fileResponse.statusText}`, errorBody);
        return new NextResponse(JSON.stringify({ error: `Failed to fetch file from storage: ${fileResponse.statusText}`, details: errorBody }), { status: fileResponse.status, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 3. Stream the file content back to the client
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${fileData.name}"`);
    headers.set('Content-Type', fileData.type || 'text/csv');

    return new NextResponse(fileResponse.body, {
        status: 200,
        statusText: 'OK',
        headers,
    });

  } catch (error: any) {
    console.error('Error proxying file:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', message: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
