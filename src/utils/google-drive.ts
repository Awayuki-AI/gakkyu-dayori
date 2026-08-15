const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

type GisOauth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; error?: string }) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
  }) => TokenClient;
};

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GisOauth2 } };
  }
}

let gisLoading: Promise<GisOauth2> | null = null;
let accessToken: string | null = null;

declare const __GDAK_GOOGLE_CLIENT_ID__: string;

export function envClientId(): string {
  const injected =
    typeof __GDAK_GOOGLE_CLIENT_ID__ === "string"
      ? __GDAK_GOOGLE_CLIENT_ID__.trim()
      : "";
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const env = typeof fromEnv === "string" ? fromEnv.trim() : "";
  return injected || env;
}

export function isLikelyGoogleClientId(value: string): boolean {
  return /^\S+\.apps\.googleusercontent\.com$/.test(value.trim());
}

export function resolveGoogleClientId(stored: string): string {
  const storedId = stored.trim();
  const envId = envClientId();
  if (isLikelyGoogleClientId(storedId)) return storedId;
  if (isLikelyGoogleClientId(envId)) return envId;
  return storedId || envId;
}

function loadGis(): Promise<GisOauth2> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google.accounts.oauth2);
  }
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const onReady = () => {
      const api = window.google?.accounts?.oauth2;
      if (api) resolve(api);
      else reject(new Error("Googleログイン部品を読み込めませんでした。"));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () =>
        reject(new Error("Googleログイン部品を読み込めませんでした。")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = () =>
      reject(new Error("Googleログイン部品を読み込めませんでした。"));
    document.head.appendChild(script);
  });
  return gisLoading;
}

export function preloadGoogleIdentity(): void {
  void loadGis().catch(() => {
    gisLoading = null;
  });
}

export async function ensureGoogleDriveLogin(clientId: string): Promise<void> {
  await getAccessToken(clientId);
}

async function getAccessToken(clientId: string): Promise<string> {
  if (accessToken) return accessToken;
  const oauth2 = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error("Googleアカウントの許可がキャンセルされました。"));
          return;
        }
        accessToken = resp.access_token;
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(
          new Error(err.message || "Googleアカウントのログインに失敗しました。"),
        );
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export type DriveFileInfo = {
  id: string;
  name: string;
  webViewLink?: string;
};

export async function uploadPdfToDrive(options: {
  clientId: string;
  filename: string;
  pdfBlob: Blob;
}): Promise<DriveFileInfo> {
  const token = await getAccessToken(options.clientId);
  const metadata = JSON.stringify({
    name: options.filename,
    mimeType: "application/pdf",
  });
  const boundary = `gakkyu_${crypto.randomUUID()}`;
  const body = new Blob(
    [
      `--${boundary}\r\n`,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      metadata,
      `\r\n--${boundary}\r\n`,
      "Content-Type: application/pdf\r\n\r\n",
      options.pdfBlob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
  );

  if (res.status === 401) {
    accessToken = null;
    throw new Error("ログインの期限が切れました。もう一度お試しください。");
  }
  if (res.status === 403) {
    throw new Error(
      "Driveへの保存が拒否されました。学校アカウントで弾かれた場合は、管理者の許可が必要なことがあります。",
    );
  }
  if (!res.ok) {
    throw new Error(`Driveへの保存に失敗しました（${res.status}）。`);
  }
  return (await res.json()) as DriveFileInfo;
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function shareDriveFileWithEmail(options: {
  fileId: string;
  email: string;
}): Promise<void> {
  const token = accessToken;
  if (!token) {
    throw new Error("Googleにログインし直してください。");
  }
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(options.fileId)}/permissions?sendNotificationEmail=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "user",
        role: "writer",
        emailAddress: options.email.trim(),
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`学校アカウントへの共有に失敗しました（${res.status}）。`);
  }
}
