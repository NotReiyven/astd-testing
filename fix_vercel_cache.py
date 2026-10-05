import json

with open('vercel.json', 'r') as f:
    data = json.load(f)

data['headers'].append({
    "source": "/units/(.*)",
    "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
})

data['headers'].append({
    "source": "/assets/(.*)",
    "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
})

with open('vercel.json', 'w') as f:
    json.dump(data, f, indent=2)
