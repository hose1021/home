const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export class StorageService {
  async upload(key: string, body: Blob, contentType: string): Promise<string> {
    const url = this.getUploadUrl(key);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body,
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
    return url;
  }

  async delete(key: string): Promise<void> {
    const url = this.getUploadUrl(key);

    await fetch(url, {
      method: "DELETE",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return this.getUploadUrl(key);
  }

  private getUploadUrl(key: string): string {
    return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
  }
}

export const storage = new StorageService();
