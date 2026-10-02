// Security headers for the local server (Cloudflare Pages uses public/_headers — keep in sync)
export const SECURITY_HEADERS = {
 "Content-Security-Policy": "default-src 'self'; script-src 'self' 'sha256-kaEog0AsPo4/9apXRMvp5eF3zpfBg9ltlJNNm2KUPio='; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' https://verses.quran.com https://files.zadapps.info blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
 "X-Content-Type-Options": "nosniff",
 "X-Frame-Options": "DENY",
 "Referrer-Policy": "strict-origin-when-cross-origin",
 "Permissions-Policy": "microphone=(self), camera=(), geolocation=(), payment=(), usb=()",
 "Cross-Origin-Opener-Policy": "same-origin"
};
