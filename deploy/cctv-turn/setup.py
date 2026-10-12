#!/usr/bin/env python3
"""Create private coturn and website settings; never start services or print secrets."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import shutil


def private_write(path, text):
    if path.is_symlink():
        raise ValueError("Refusing to write through a symlink: " + str(path))
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(text)
    path.chmod(0o600)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hostname", required=True, help="TURN DNS name, e.g. turn.school.example")
    parser.add_argument("--public-ip", required=True, help="Public IPv4 of the Linux TURN server")
    parser.add_argument("--private-ip", help="Linux server IPv4 if it sits behind NAT")
    parser.add_argument("--output-dir", required=True, help="Private directory OUTSIDE any website root")
    parser.add_argument("--cert", help="Existing valid full-chain certificate for the TURN hostname")
    parser.add_argument("--key", help="Certificate private key (required with --cert)")
    args = parser.parse_args()
    hostname = args.hostname.lower().rstrip(".")
    if not re.fullmatch(r"(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", hostname) or any(
        not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in hostname.split(".")
    ):
        parser.error("Use a valid DNS hostname, without a URL or port.")
    try:
        public_ip = str(ipaddress.IPv4Address(args.public_ip))
        private_ip = str(ipaddress.IPv4Address(args.private_ip)) if args.private_ip else None
    except ipaddress.AddressValueError:
        parser.error("IP addresses must be valid IPv4 addresses.")
    if bool(args.cert) != bool(args.key):
        parser.error("Provide both --cert and --key, or neither.")
    cert = Path(args.cert).resolve() if args.cert else None
    key = Path(args.key).resolve() if args.key else None
    if cert and (not cert.is_file() or not key.is_file()):
        parser.error("Certificate and private key must already exist.")
    output = Path(args.output_dir).expanduser().resolve()
    script_path = Path(__file__).resolve()
    candidate_root = script_path.parents[2]
    source_root = candidate_root if (candidate_root / "index.php").is_file() else script_path.parent
    if output == source_root or source_root in output.parents:
        parser.error("Generate private settings outside the supplied website source directory.")
    for parent in (output, *output.parents):
        if (parent / "index.php").exists() or (parent / "index.html").exists():
            parser.error("Output appears to be inside a website root. Choose a private server directory.")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.chmod(0o700)
    secret_file = output / ".turn-secret"
    if secret_file.is_symlink():
        parser.error("Secret file must not be a symlink.")
    secret = secret_file.read_text(encoding="utf-8").strip() if secret_file.exists() else secrets.token_hex(32)
    if not re.fullmatch(r"[a-f0-9]{64}", secret):
        parser.error("Existing secret is invalid; preserve it and check this private directory.")
    private_write(secret_file, secret + "\n")
    config = ["listening-port=3478", "min-port=49160", "max-port=49200", "fingerprint",
              "use-auth-secret", "static-auth-secret=" + secret, "realm=" + hostname,
              "server-name=" + hostname, "no-cli", "no-multicast-peers", "no-tcp-relay",
              "stale-nonce=600", "user-quota=16", "total-quota=64", "log-file=stdout",
              "simple-log", "external-ip=" + public_ip + ("/" + private_ip if private_ip else "")]
    if private_ip:
        config.append("relay-ip=" + private_ip)
    urls = ["turn:" + hostname + ":3478?transport=udp", "turn:" + hostname + ":3478?transport=tcp"]
    tls_mount = ""
    if cert:
        tls_dir = output / "tls"
        tls_dir.mkdir(exist_ok=True, mode=0o700)
        tls_dir.chmod(0o700)
        for original, name in ((cert, "fullchain.pem"), (key, "privkey.pem")):
            target = tls_dir / name
            if target.is_symlink():
                parser.error("TLS output must not be a symlink.")
            shutil.copyfile(original, target)
            target.chmod(0o600)
        config += ["tls-listening-port=5349", "cert=/run/cctv-tls/fullchain.pem", "pkey=/run/cctv-tls/privkey.pem", "no-dtls"]
        urls.append("turns:" + hostname + ":5349?transport=tcp")
        tls_mount = "      - ./tls:/run/cctv-tls:ro\n"
    else:
        config += ["no-tls", "no-dtls"]
    private_write(output / "turnserver.conf", "\n".join(config) + "\n")
    # Match Linux host file ownership to the current operator, not the image's nobody UID.
    # The official image's turnserver binary has NET_BIND_SERVICE file capability.
    # Retain Docker's standard capability bounds so the binary can execute normally.
    compose = (
        "services:\n  turn:\n    image: coturn/coturn:4.18.0-r0\n    restart: unless-stopped\n"
        + '    user: "' + str(os.getuid()) + ":" + str(os.getgid()) + '"\n'
        + "    network_mode: host\n"
        + '    command: ["-c", "/run/cctv-turn.conf"]\n    volumes:\n'
        + "      - ./turnserver.conf:/run/cctv-turn.conf:ro\n" + tls_mount
        + "    tmpfs:\n      - /var/lib/coturn:mode=1777\n    logging:\n      driver: json-file\n"
        + '      options:\n        max-size: "10m"\n        max-file: "2"\n'
    )
    private_write(output / "compose.yaml", compose)
    settings = {"turnUrls": urls, "turnSecret": secret, "stunUrls": ["stun:" + hostname + ":3478"]}
    private_write(output / "cctv-settings.php", "<?php http_response_code(404); exit; ?>\n" + json.dumps(settings, indent=2) + "\n")
    print("Created private TURN configuration in " + str(output))
    print("On the Linux TURN server: cd into that directory and run docker compose up -d.")
    print("Copy only cctv-settings.php into the existing website database/ directory.")
    print("Open 3478 UDP/TCP and 49160-49200 UDP" + (", plus 5349 TCP for TLS." if cert else "."))
    print("No server started. No secret printed. Keep the generated directory out of web hosting and ZIPs.")


if __name__ == "__main__":
    main()
