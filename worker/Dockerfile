# CHAOS-PACT cloud Kane execution worker (Render / any Docker host), linux x64.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git unzip xvfb xauth fonts-liberation \
 && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

ENV KANE_CLI_SKIP_BROWSER_DOWNLOAD=1 \
    KANE_CLI_CHROME_PATH=/usr/bin/google-chrome \
    KANE_CLI_CDP_TIMEOUT_MS=60000 \
    KANE_CLI_CDP_RETRIES=2 \
    PORT=8787

RUN npm install -g @testmuai/kane-cli \
 && (kane-cli plugin install remote-execution || echo 'remote-execution plugin unavailable; --remote grid runs will report exit 2')

WORKDIR /app
COPY server.mjs ./
EXPOSE 8787
# xvfb gives testmd/testrun replays a display; `run` additionally passes --headless.
CMD ["xvfb-run", "-a", "node", "server.mjs"]
