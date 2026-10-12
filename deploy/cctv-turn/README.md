# CCTV relay server

The PHP website handles login and short-lived WebRTC signaling. Video and sound travel live between the display and teachers. They are never recorded by this feature. A TURN relay helps when school Wi-Fi, mobile networks or firewalls block a direct connection. You need a Linux server with Docker Compose and a public IPv4 address; ordinary shared PHP hosting cannot run this relay service.

Copy this setup bundle onto that Linux server outside its website root, for example `/opt/c122-turn-setup`. Point a DNS name such as `turn.your-school.example` directly at the server IP. Do not put it behind a normal HTTP/CDN proxy.

Run the generator as the same Linux account that will run Docker. Replace the example hostname and IP:

```sh
python3 /opt/c122-turn-setup/setup.py --hostname turn.your-school.example --public-ip 203.0.113.10 --output-dir /opt/c122-turn-private
cd /opt/c122-turn-private
docker compose up -d
```

For a server behind NAT, also pass `--private-ip` with the server's local IPv4 and forward the same ports. Open inbound **3478 UDP/TCP** and **49160–49200 UDP** in the server firewall and hosting security group. Outbound peer traffic must also be allowed.

For restrictive networks, use an existing valid certificate for the TURN hostname and add `--cert /path/fullchain.pem --key /path/privkey.pem`. This adds TLS on **5349 TCP**, which must also be opened. Renew the original certificate, rerun the generator with the renewed files, then run `docker compose restart`. The generator preserves the existing shared secret when rerun.

Copy **only** the generated `cctv-settings.php` to your website's existing `database/` directory. Keep its PHP guard line intact, make it readable by the PHP hosting user, and keep `database/` inaccessible to static requests. Do not replace the whole database directory. The teacher page reports whether relay configuration exists; that indicator does not verify the relay's reachability.

Alternatively, set `C122_CCTV_TURN_URLS` (comma-separated `turn:` / `turns:` URLs), `C122_CCTV_TURN_SECRET`, and optionally `C122_CCTV_STUN_URLS` in the PHP hosting environment. Environment settings override the guarded settings file. Never put the secret in JavaScript, HTML or a public `.env` file.

The website issues temporary TURN credentials and renews them during long sessions. The shared secret stays on servers. The service uses the setup operator's Linux UID, limits allocations, and caps log size. Generated files are private (mode 600); do not upload the TURN configuration, key or secret to your website or include them in a public update ZIP.

Setup creates files; it does not install Docker, obtain certificates, open firewall ports or start a server automatically. Once running, try a teacher phone on mobile data and use «Дууг сонсох» to test sound. Keep the Samsung display's Chrome tab open and the device awake.

References: [WebRTC peer connections](https://webrtc.org/getting-started/peer-connections), [official coturn Docker setup](https://github.com/coturn/coturn/blob/master/docker/coturn/README.md), [coturn authentication and configuration](https://github.com/coturn/coturn/wiki/turnserver).
