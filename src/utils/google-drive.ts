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

/** キャッシュしたアクセストークンを破棄する（再ログイン用） */
export function resetGoogleDriveAuth(): void {
  accessToken = null;
}

function oauthErrorMessage(resp: { error?: string }): string {
  switch (resp.error) {
    case "access_denied":
      return (
        "Googleアカウントの許可が拒否されました。\n" +
        "セキュリティ通知後は https://myaccount.google.com/permissions でこのアプリを削除し、もう一度「Googleドライブに保存」を押してください。\n" +
        "「Google hasn't verified this app」と出たら「詳細」→「（アプリ名）に移動（安全ではないページ）」で続行できます（個人用のテストアプリです）。"
      );
    case "popup_closed":
      return "ログイン画面が閉じられました。もう一度お試しください。";
    default:
      return resp.error
        ? `Googleアカウントのログインに失敗しました（${resp.error}）。`
        : "Googleアカウントの許可がキャンセルされました。";
  }
}

function gisErrorMessage(err: { type?: string; message?: string }): string {
  if (err.type === "popup_failed_to_open") {
    return "ログイン画面がポップアップブロックされました。ブラウザで localhost:5173 のポップアップを許可してください。";
  }
  return err.message || "Googleアカウントのログインに失敗しました。";
}

async function requestAccessToken(
  clientId: string,
  prompt: "" | "consent",
): Promise<string> {
  const oauth2 = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(oauthErrorMessage(resp)));
          return;
        }
        accessToken = resp.access_token;
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(new Error(gisErrorMessage(err)));
      },
    });
    client.requestAccessToken({ prompt });
  });
}

type GetTokenOptions = {
  /** 同意画面を必ず表示する（セキュリティ通知後の再許可など） */
  forceConsent?: boolean;
};

async function getAccessToken(
  clientId: string,
  options: GetTokenOptions = {},
): Promise<string> {
  if (accessToken && !options.forceConsent) return accessToken;
  if (options.forceConsent) accessToken = null;

  try {
    return await requestAccessToken(clientId, options.forceConsent ? "consent" : "");
  } catch (firstErr) {
    if (options.forceConsent) throw firstErr;
    accessToken = null;
    return requestAccessToken(clientId, "consent");
  }
}

export async function ensureGoogleDriveLogin(clientId: string): Promise<void> {
  await getAccessToken(clientId);
}

export type DriveFileInfo = {
  id: string;
  name: string;
  webViewLink?: string;
};

async function driveApiErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    const reason = data.error?.errors?.[0]?.reason;
    const detail = data.error?.message;
    if (res.status === 403 && reason === "accessNotConfigured") {
      return "Google Cloud で Drive API が有効になっていません。API とサービスから Drive API を有効にしてください。";
    }
    if (res.status === 403 && reason === "insufficientPermissions") {
      return "Drive への権限がありません。もう一度「Googleドライブに保存」を押し、許可画面で続行してください。";
    }
    if (detail) return `Driveへの保存に失敗しました: ${detail}`;
  } catch {
    /* ignore parse errors */
  }
  if (res.status === 403) {
    return "Driveへの保存が拒否されました。個人Googleで保存しているか、OAuthのテストユーザーに自分のアドレスが入っているか確認してください。";
  }
  return `Driveへの保存に失敗しました（${res.status}）。`;
}

async function uploadPdfWithToken(
  token: string,
  filename: string,
  pdfBlob: Blob,
): Promise<Response> {
  const metadata = JSON.stringify({
    name: filename,
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
      pdfBlob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  return fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
  );
}

export async function uploadPdfToDrive(options: {
  clientId: string;
  filename: string;
  pdfBlob: Blob;
}): Promise<DriveFileInfo> {
  let token = await getAccessToken(options.clientId);
  let res = await uploadPdfWithToken(token, options.filename, options.pdfBlob);

  if (res.status === 401) {
    accessToken = null;
    token = await getAccessToken(options.clientId, { forceConsent: true });
    res = await uploadPdfWithToken(token, options.filename, options.pdfBlob);
  }

  if (res.status === 401) {
    accessToken = null;
    throw new Error("ログインの期限が切れました。もう一度お試しください。");
  }
  if (!res.ok) {
    throw new Error(await driveApiErrorMessage(res));
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
