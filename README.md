# Portugal Hidden Bar AR

A Dockerized WebAR experience for a hidden Portugal-themed bar.

The printable black-and-white chest is a custom AR.js pattern marker. When the phone recognizes it, a large **Blue pill or Red pill?** choice appears:

- **Red pill:** opens the dedicated underground bar menu.
- **Blue pill:** opens the public official-drinks page.

## Run locally

```bash
docker compose -f compose.yml up -d
```

Open:

- AR experience: `http://localhost:8080`
- printable anchor: `http://localhost:8080/anchor.html`
- underground menu: `http://localhost:8080/underground-menu.html`
- official drinks: `http://localhost:8080/official-drinks.html`

Camera access normally requires HTTPS. `localhost` is accepted for development, but production must be served behind HTTPS.

## Configuration

```yaml
services:
  hidden-bar-ar:
    image: ghcr.io/YOUR_GITHUB_USER/YOUR_REPOSITORY:latest
    environment:
      PUBLIC_URL: "https://bar.example.com"
      BAR_NAME: "O Cofre Escondido"
      DRINKS: >-
        [
          {"name":"Navegador","detail":"Rum escuro, ananás, canela"},
          {"name":"Maré Alta","detail":"Lima, hortelã, soda"}
        ]
      OFFICIAL_DRINKS: >-
        [
          {"name":"Super Bock","detail":"Portuguese lager"},
          {"name":"Vinho Verde","detail":"Fresh Portuguese white wine"}
        ]
```

`DRINKS` controls the red-pill underground menu. `OFFICIAL_DRINKS` controls the blue-pill public menu. Both variables accept either JSON arrays or pipe-separated drink names.

## Tracking files

- Printable marker: `public/chest-marker-v2.png`
- AR.js pattern: `public/pattern-chest-v2.patt`
- Printable page: `public/anchor.html`

Keep the complete white margin and black border visible. Print at 100% scale, avoid glare, and keep the marker reasonably flat.

## Test checklist

1. Deploy behind HTTPS.
2. Open `/anchor.html` and print at 100% scale.
3. Scan the QR code with a phone.
4. Grant camera access.
5. Point the camera at the complete black-and-white chest marker.
6. Touch the large blue or red pill.
7. Confirm each pill opens its corresponding menu page.
