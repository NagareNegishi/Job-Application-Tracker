#!/bin/bash

# Standard defensive bash scripting
set -uo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

echo "DEBUG: Testing DNS before firewall changes..."
dig api.github.com +short || echo "DNS FAILED before any iptables changes"
curl -s --connect-timeout 5 https://api.github.com/zen || echo "CURL FAILED (exit: $?)"


# # 1. Extract Docker DNS info BEFORE any flushing
# DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# 1. Read Docker DNS NAT rules BEFORE any flush
#    Docker injects 4 rules: UDP DNAT, UDP SNAT, TCP DNAT, TCP SNAT
#    The ephemeral ports are different every startup.
# UDP_DNS_DEST=$(iptables-save -t nat | grep DOCKER_OUTPUT | grep udp | grep -o '127\.0\.0\.11:[0-9]*' || true)
# TCP_DNS_DEST=$(iptables-save -t nat | grep DOCKER_OUTPUT | grep tcp | grep -o '127\.0\.0\.11:[0-9]*' || true)
# UDP_DNS_SPORT=$(iptables-save -t nat | grep DOCKER_POSTROUTING | grep udp | grep -o ':[0-9]*$' | tr -d ':' || true)
# TCP_DNS_SPORT=$(iptables-save -t nat | grep DOCKER_POSTROUTING | grep tcp | grep -o ':[0-9]*$' | tr -d ':' || true)


# Flush existing rules and delete existing ipsets. Clean slate before applying new rules.
iptables -F
iptables -X
# iptables -t nat -F
# iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true




# # 3. Rebuild Docker DNS NAT rules using the ports captured above
# if [ -n "$UDP_DNS_DEST" ] && [ -n "$TCP_DNS_DEST" ]; then
#     echo "Rebuilding Docker DNS NAT rules..."
#     iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
#     iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
#     # DNAT: redirect port 53 -> ephemeral port on 127.0.0.11
#     iptables -t nat -A DOCKER_OUTPUT -d 127.0.0.11 -p udp --dport 53 -j DNAT --to-destination "$UDP_DNS_DEST"
#     iptables -t nat -A DOCKER_OUTPUT -d 127.0.0.11 -p tcp --dport 53 -j DNAT --to-destination "$TCP_DNS_DEST"
#     # SNAT: rewrite source port on replies back to 53
#     [ -n "$UDP_DNS_SPORT" ] && iptables -t nat -A DOCKER_POSTROUTING -s 127.0.0.11 -p udp --sport "$UDP_DNS_SPORT" -j SNAT --to-source :53
#     [ -n "$TCP_DNS_SPORT" ] && iptables -t nat -A DOCKER_POSTROUTING -s 127.0.0.11 -p tcp --sport "$TCP_DNS_SPORT" -j SNAT --to-source :53
#     # Wire the chains into the nat OUTPUT hook
#     iptables -t nat -A OUTPUT -j DOCKER_OUTPUT
#     iptables -t nat -A POSTROUTING -j DOCKER_POSTROUTING
# else
#     echo "WARNING: No Docker DNS NAT rules found — DNS may not work"
# fi



# # 2. Selectively restore ONLY internal Docker DNS resolution. Puts back the Docker DNS NAT rules saved at the start
# if [ -n "$DOCKER_DNS_RULES" ]; then
#     echo "Restoring Docker DNS rules..."
#     iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
#     iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
#     echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
# else
#     echo "No Docker DNS rules to restore"
# fi


# First allow DNS and localhost before any restrictions

# Need DNS for hostname resolution
# Allow outbound DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT

# Need SSH for git operations over SSH
# Allow outbound SSH
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow inbound SSH responses
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT

# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset with CIDR support (Creates a set that stores IP ranges, Essential for the whitelist approach)
ipset create allowed-domains hash:net

# GitHub publishes their IP ranges at api.github.com/meta. (Essential if you use GitHub)
# This fetches them dynamically and adds all web/api/git ranges to the whitelist.
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
    echo "ERROR: Failed to fetch GitHub IP ranges"
    exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
    echo "ERROR: GitHub API response missing required fields"
    exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
    if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
        exit 1
    fi
    echo "Adding GitHub range $cidr"
    ipset add allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)




# # api.nuget.org and globalcdn.nuget.org are on Akamai CDN.
# # Akamai IPs rotate, so we resolve them fresh here — immediately before dotnet restore runs.
# # NuGet themselves advise domain-allowlisting over IP-allowlisting (no stable CIDR list exists).
# echo "Resolving NuGet CDN IPs (Akamai-backed, resolved fresh to avoid rotation)..."
# for domain in "api.nuget.org" "globalcdn.nuget.org" "dist.nuget.org" "www.nuget.org"; do
#     echo "Resolving $domain..."
#     ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
#     if [ -z "$ips" ]; then
#         echo "WARNING: Failed to resolve $domain — skipping (may cause dotnet restore to fail)"
#     else
#         while read -r ip; do
#             if [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
#                 echo "Adding $ip for $domain"
#                 ipset add allowed-domains "$ip" 2>/dev/null || true
#             fi
#         done < <(echo "$ips")
#     fi
# done


    # "api.nuget.org" \
    # "www.nuget.org" \
    # "globalcdn.nuget.org" \
    # "dist.nuget.org" \

# Resolve and add other allowed domains
# registry.npmjs.org — essential for npm installs
# api.anthropic.com — essential for Claude Code to function
# 4 domains for NuGet to function
# Other 3 are for VS Code extension marketplace access





# Resolve and add other allowed domains
# registry.npmjs.org — essential for npm installs
# api.anthropic.com — essential for Claude Code to function
# Other 3 are for VS Code extension marketplace access
for domain in \
    "registry.npmjs.org" \
    "api.anthropic.com" \
    "marketplace.visualstudio.com" \
    "vscode.blob.core.windows.net" \
    "update.code.visualstudio.com"; do
    echo "Resolving $domain..."
    ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
    if [ -z "$ips" ]; then
        echo "ERROR: Failed to resolve $domain"
        exit 1
    fi
    
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "ERROR: Invalid IP from DNS for $domain: $ip"
            exit 1
        fi
        echo "Adding $ip for $domain"
        ipset add allowed-domains "$ip"
    done < <(echo "$ips")
done


# Get host IP from default route
# Detects Docker host's IP and allows traffic to/from the host subnet. Essential
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

# Set up remaining iptables rules
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT


# Set default policies to DROP first
# Everything not explicitly allowed above is dropped. Essential
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP


# First allow established connections for already approved traffic
# Allows the response packets through without re-checking the whitelist. Essential — without this, TCP handshakes break.
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Then allow only specific outbound traffic to allowed domains, allow outbound to anything in the ipset
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Explicitly REJECT all other outbound traffic for immediate feedback
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited


# confirms a non-whitelisted site is blocked, and GitHub is reachable.
echo "Firewall configuration complete"
echo "Verifying firewall rules..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
    exit 1
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi