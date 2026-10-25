/**
 * Browser-side Spotify Authorization Code with PKCE.
 * Tokens are session-scoped and never require a client secret.
 * This module does not replace Sage's Spotify playback adapter.
 */
const CLIENT_ID = "7972485daaac4cd9abe7323e0adb3670";
const REDIRECT_URI = "https://kaleidosync.pages.dev/callback";
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const STORAGE_KEY = "kaleidosync.spotify.pkce";

export type SpotifySession = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};

function randomString(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from(bytes, byte => chars[byte % chars.length]).join("");
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function startSpotifyLogin(): Promise<void> {
  const verifier = randomString();
  const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = randomString(32);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier, state }));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "user-read-private user-read-email user-read-playback-state user-read-currently-playing user-modify-playback-state streaming"
  });
  window.location.assign(`${AUTH_URL}?${params.toString()}`);
}

export async function finishSpotifyLogin(search: string): Promise<SpotifySession> {
  const params = new URLSearchParams(search);
  if (params.has("error")) throw new Error(params.get("error_description") || params.get("error") || "Spotify authorization failed");
  const code = params.get("code");
  const state = params.get("state");
  const stored = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!code || !state || !stored) throw new Error("Missing Spotify authorization data. Please restart login.");
  const { verifier, state: expectedState } = JSON.parse(stored) as { verifier: string; state: string };
  if (state !== expectedState) throw new Error("Spotify authorization state mismatch.");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier
    })
  });
  if (!response.ok) throw new Error(`Spotify token exchange failed (${response.status}).`);
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
  const session: SpotifySession = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + token.expires_in * 1000
  };
  sessionStorage.setItem("kaleidosync.spotify.session", JSON.stringify(session));
  return session;
}
