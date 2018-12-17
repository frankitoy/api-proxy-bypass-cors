api-proxy-bypass-cors
=================

# Installation and usage

1. Run `npm install`
2. Run `node server.js [options]`

## Command line options

```sh
Usage: node server.js [options]

Options:
  -p, --port  Listen on port  [default: "8081"]
  -u, --url   URL to remote api e.g https://remote.url.com/api
```

# Proxied URLs

| Local                     | Remote                    |
|---------------------------|---------------------------|
| http://localhost:8080/api | https://remote.url.com/api|

