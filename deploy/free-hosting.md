# Free self-hosted deployment

This setup runs the web app, Express API, Socket.IO, and SQLite on one Oracle Cloud Always Free ARM VM. Caddy provides HTTPS, and DuckDNS keeps a free hostname pointed at the VM. The VM must remain available for riders to connect.

## 1. Create the VM

Create an Oracle Cloud account and an Always Free Ampere A1 VM in your home region. The current free allocation allows up to 2 OCPUs and 12 GB of memory, with 200 GB total free block volume. Oracle may report that free host capacity is unavailable in a region; retry later if that happens. Account verification generally requires a phone number and payment card, but the card is not charged unless you upgrade.

Choose an Ubuntu ARM64 image and keep the VM within the Always Free limits. Configure the virtual network to allow inbound TCP ports 22, 80, and 443. Do not expose port 5001 publicly; Docker keeps the app behind Caddy. Oracle also documents idle-instance reclamation, so this free VM does not come with an uptime guarantee.

## 2. Create a free hostname

Create a DuckDNS subdomain and copy its token. Point the VM's public IPv4 address at the subdomain. The included `duckdns` container updates the address every five minutes if it changes.

## 3. Install Docker and deploy

On the VM, install Docker Engine with the Compose plugin using Docker's official Ubuntu installation instructions, then clone this repository. In the repository directory:

```sh
cp .env.example .env
```

Edit `.env` and set:

- `DOMAIN`: the complete DuckDNS hostname, such as `riders-united.duckdns.org`.
- `DUCKDNS_DOMAIN`: the DuckDNS subdomain only, such as `riders-united`.
- `DUCKDNS_TOKEN`: the token from DuckDNS.
- `AUTH_SECRET`: generate a persistent random secret with `openssl rand -hex 32`.

Then start the services:

```sh
docker compose up -d --build
```

The first build compiles the frontend and native SQLite dependency for the VM's ARM64 architecture. SQLite and Caddy's certificate state live in Docker volumes and survive container rebuilds.

Open `https://<your-duckdns-hostname>`. The server serves the frontend and API from the same HTTPS origin, so web clients and Socket.IO use Caddy without cross-origin setup.

## Updates and backups

To update, pull the latest code and run `docker compose up -d --build`. Back up the `riders_data` Docker volume regularly; it contains account credentials and ride history. Keep `.env` private and save `AUTH_SECRET` securely: changing it invalidates all sessions.

## Free-tier limits

Oracle's Always Free resources are subject to capacity and usage limits; Oracle can reclaim idle compute instances under its published policy. DuckDNS supplies free dynamic DNS but is a third-party dependency. This is a no-cost personal deployment, not an uptime-guaranteed service.
