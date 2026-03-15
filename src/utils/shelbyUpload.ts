// src/utils/shelbyUpload.ts

// ========== TYPE DEFINITIONS ==========
export interface UploadParams {
  file: File;
  account: any;
  signAndSubmitTransaction: any;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export interface DeleteParams {
  fileName: string;
  account: any;
  signAndSubmitTransaction: any;
  accountAddress: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export interface DownloadParams {
  fileName: string;
  accountAddress: string;
  nodeUrl: string;
  apiKey: string;
  onSuccess?: (blob: Blob) => void;
  onError?: (error: any) => void;
}

// ========== FUNGSI UPLOAD (BUKAN HOOK) ==========
// Fungsi ini akan dipanggil dari komponen dengan useUploadBlobs
export const uploadFile = async ({
  file,
  account,
  signAndSubmitTransaction,
  onSuccess,
  onError
}: UploadParams) => {
  try {
    console.log("📤 Uploading file:", file.name);
    
    const fileData = new Uint8Array(await file.arrayBuffer());
    
    const signer = {
      signAndSubmitTransaction,
      account
    };

    // RETURN PROMISE, BUKAN PAKAI HOOK
    return { signer, fileData, blobName: file.name };
    
  } catch (error) {
    console.error("❌ File read error:", error);
    onError?.(error as Error);
    throw error;
  }
};

// ========== FUNGSI DELETE ==========
export const deleteFile = async ({
  fileName,
  account,
  signAndSubmitTransaction,
  accountAddress,
  onSuccess,
  onError
}: DeleteParams) => {
  try {
    console.log("🗑️ Deleting file:", fileName);
    
    const signer = {
      signAndSubmitTransaction,
      account
    };

    return { signer, accountAddress, blobName: fileName };
    
  } catch (error) {
    console.error("❌ Delete error:", error);
    onError?.(error as Error);
    throw error;
  }
};

// ========== FUNGSI DOWNLOAD ==========
export const downloadFile = async ({
  fileName,
  accountAddress,
  nodeUrl,
  apiKey,
  onSuccess,
  onError
}: DownloadParams): Promise<Blob | null> => {
  try {
    const downloadUrl = `${nodeUrl}/v1/blobs/${accountAddress}/${encodeURIComponent(fileName)}`;
    console.log("📥 Download URL:", downloadUrl);
    
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Download failed:", response.status, errorText);
      throw new Error(`Download failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log("✅ Download successful! Size:", blob.size, "bytes");
    
    // Trigger browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    
    onSuccess?.(blob);
    return blob;
    
  } catch (error) {
    console.error("❌ Download error:", error);
    onError?.(error as Error);
    return null;
  }
};

// ========== FUNGSI PREVIEW ==========
export const previewFile = async ({
  fileName,
  accountAddress,
  nodeUrl,
  apiKey,
  onSuccess,
  onError
}: DownloadParams): Promise<string | null> => {
  try {
    const previewUrl = `${nodeUrl}/v1/blobs/${accountAddress}/${encodeURIComponent(fileName)}`;
    console.log("🔍 Preview URL:", previewUrl);
    
    const response = await fetch(previewUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) throw new Error(`Preview failed: ${response.status}`);
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    onSuccess?.(blob);
    return url;
    
  } catch (error) {
    console.error("❌ Preview error:", error);
    onError?.(error as Error);
    return null;
  }
};

// ========== CHECK IF IMAGE ==========
export const isImageFile = (fileName: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};