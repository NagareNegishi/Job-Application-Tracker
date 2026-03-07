#!/bin/bash
# resolve-and-restore.sh
# Resolves NuGet CDN IPs just-in-time and adds them to the firewall ipset,
# then immediately runs dotnet restore. This eliminates the Akamai IP rotation
# race condition — IPs are resolved at the moment of use, not minutes earlier.

set -euo pipefail

echo "=== Just-in-time NuGet IP resolution ==="

for domain in "api.nuget.org" "globalcdn.nuget.org" "dist.nuget.org" "www.nuget.org"; do
    echo "Resolving $domain..."
    ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
    if [ -z "$ips" ]; then
        echo "WARNING: Failed to resolve $domain"
        continue
    fi
    while read -r ip; do
        if [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "Adding $ip for $domain"
            # Whitelist the /16 block to cover Akamai CDN IP rotation
            cidr=$(echo "$ip" | awk -F. '{print $1"."$2".0.0/16"}')
            sudo ipset add allowed-domains "$cidr" 2>/dev/null || true
        fi
    done < <(echo "$ips")
done

echo "=== Running dotnet restore ==="
cd JobTrackerApi && dotnet restore --verbosity detailed 2>&1 | tee /tmp/dotnet-restore.log
exit ${PIPESTATUS[0]}