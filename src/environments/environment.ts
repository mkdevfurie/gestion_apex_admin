// Production (ng build) : l'admin appelle directement l'API sur Render.
// L'origine de l'admin doit figurer dans WEB_ORIGIN côté API (CORS).
export const environment = {
  apiBaseUrl: 'https://gestion-apex-backend.onrender.com/api',
};
