# coinbase-fetcher

Fetches spot prices from the Coinbase Exchange public market-data API
(`GET https://api.exchange.coinbase.com/products/{base}-{quote}/ticker`).

No API key is required — the public endpoint is unauthenticated and rate limited
to ~10 requests/second per IP.
