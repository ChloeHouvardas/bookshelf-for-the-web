# Lightweight Threat Model

## MVP Trust Boundary
The app runs locally for one trusted user. The backend still treats every submitted field as untrusted input because the project is intended to become hosted later.

## Initial Risks
- Malicious or malformed URLs.
- Stored text rendered unsafely in the frontend.
- Overly broad CORS during deployment.
- Secrets committed accidentally when external services are added.

## Initial Controls
- Validate URLs and input lengths in API schemas.
- Render user text as text, not HTML.
- Use environment variables for configuration.
- Keep CORS configured for localhost only in development.

