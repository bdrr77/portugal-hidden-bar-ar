# Portugal Hidden Bar AR

A Dockerized WebAR proof of concept for a hidden Portugal-themed bar.

The printable 10 × 10 cm image contains:

- a pirate chest and Portuguese `azulejo` styling;
- a QR code generated from `PUBLIC_URL`;
- a high-contrast AR.js Hiro marker disguised as the chest lock;
- an AR parchment menu that opens when the user touches the wax seal.

## Push it to GitHub

Create an empty GitHub repository, then from this folder:

```bash
git init
git add .
git commit -m "Initial WebAR hidden bar POC"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USER/YOUR_REPOSITORY.git
git push -u origin main
```

The workflow publishes:

```text
ghcr.io/YOUR_GITHUB_USER/YOUR_REPOSITORY:latest
```

It also publishes SHA and semantic-version tags.

For public anonymous pulls, set the generated package visibility to **Public** in GitHub package settings.

## Run locally

```bash
docker compose -f compose.yml up -d
```

Open:

- AR experience: `http://localhost:8080`
- printable anchor: `http://localhost:8080/anchor.html`

Camera access normally requires **HTTPS**. `localhost` is accepted by modern browsers for development, but production must be served behind an HTTPS reverse proxy.

## Production Compose

Edit `compose.yml`:

```yaml
services:
  hidden-bar-ar:
    image: ghcr.io/YOUR_GITHUB_USER/YOUR_REPOSITORY:latest
    environment:
      PUBLIC_URL: "https://bar.example.com"
      BAR_NAME: "O Cofre Escondido"
```

`PUBLIC_URL` is the address encoded in the QR code. After changing it, reload `/anchor.html` and print a new anchor.

## Configure drinks

`DRINKS` accepts JSON:

```yaml
DRINKS: >-
  [
    {"name":"Porto Tónico","detail":"Porto branco, tónica, limão"},
    {"name":"Ginjinha","detail":"Licor de ginja"}
  ]
```

It also accepts a simple pipe-separated list:

```yaml
DRINKS: "Porto Tónico|Ginjinha|Poncha"
```

## Important tracking detail

The QR code launches the page. The chest lock is the actual high-contrast AR tracking marker.

This is intentional: a QR code changes when `PUBLIC_URL` changes and is not an ideal AR.js pattern target. Keeping the lock marker fixed makes the experience much more reliable while preserving one single 10 × 10 cm printed picture.

## Test checklist

1. Deploy behind HTTPS.
2. Open `/anchor.html` on a desktop and print at 100% scale.
3. Scan the QR with a phone.
4. Grant camera access.
5. Point the camera at the square chest lock.
6. Touch the red seal on the floating parchment.
