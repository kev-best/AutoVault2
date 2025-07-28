# Render Deployment Guide for AutoVault2

## Step-by-Step Setup Instructions

### 1. Prepare Your Repository
- Make sure `serviceAccountKey.json` is in `.gitignore` ✅ (already done)
- Commit and push your updated `firebase-admin.js` changes
- Do NOT commit the `render-env-variables.txt` file

### 2. Set Up Environment Variables on Render

1. Go to your Render dashboard: https://render.com
2. Navigate to your AutoVault2 service
3. Go to **Environment** tab
4. Add the following environment variables:

#### Firebase Configuration:
```
FIREBASE_PROJECT_ID = autovault-449
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@autovault-449.iam.gserviceaccount.com
FIREBASE_CLIENT_ID = 110621050153512850758
FIREBASE_PRIVATE_KEY_ID = f1b907f530f241f34afcfc97d8be21754e32d778
FIREBASE_CLIENT_X509_CERT_URL = https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40autovault-449.iam.gserviceaccount.com
```

#### Firebase Private Key (IMPORTANT):
```
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCz5HNnrN00u3K/
ClmqehrPJ1mSnCRHyTmBLiqTz7GigDTmqP5rtqUBghDVsW+398aJbjJvYyOF7jy
efwlw4WaEsU8wn6t+IC4WUi1OvopiVUGSoVQdmJ/IGeiqDFa8Rg4a5HRINNzVrMR
vFzMA01CSrXzdtvpSIE9m1L1pVOnBGSjtGdOlhjG9M+IrUKbj8lryDZWDYswJNrz
6E4FnZveX7TqXXF0erodI1EYkSQwIfbi3WAd0gq2uYZBz92ubTRXuoo2WPx7TALU
VPlMoGE0YpKp9h4fqV6w4GJHrNpP/GD6DuxyYyzULRZfeoAAXvDY3smfVzaq/cKZ
wklZyV51AgMBAAECggEABeu19KqW2T52J12C2AHXvXfQQmaez9fzkfKD1W8oRMaU
AmLrlLMxlH+iU/0OIxshL64gJ9uqPZ8AQlLLfr6xrgGCJl7MZpNwQSEHKJfZVfak
KsHXI2/SDBcX8h2RCko3HtxDf1uSOhCXcjT95OUS7OSimnHGCSaOwmVTVKxtVWjc
dw1SnjwG/Go7LJ7tDpOnHdhnSnHrX+dbleVXEfqddywhSzw2AxVkG7rotl+SCJ4s
IN0jtpoJhHXIDx+4XYqw5hS3AN84DE1kw/9yWHWsVjPCJ4hRkaOA0s2dRW8snbwO
KXb8IT5adindPFIaluXZO1UhHTUewj6XhIfGHQJXIQKBgQDgk5TscGw3th8pm7PF
a/wSBwFQaBYQ7KvQfdvg+p51sPaxY+rKA+zilaTTffFz0jaD1SHUQRrqP4GjU/e2
X8unTe2JOcYA4gfMcr5fHmC69KCMxycuh4Cj9oFIw2d/geBFyu0+KeVlaTogn9je
3zOSx+j8TZj569usau8omezrmQKBgQDNEERPmdgUhZfc5MYEyAA6t45jg7hcBTIg
+xn1unKxp9IcpIiUxXvHfh22EFL4n2iSYbqHQ6S3fZd7zfHZidjsfJ0Lt5e9WMTb
bF0ABagdbAP39yptwoU/YTA1/rMDG+LpwAbJrAJiHpjU+FJcDj8sFD2NbXy6Y5Yv
7DVwpivzPQKBgFOS+Hfo+ozdDMnKNOOCZSM8UiPfKF8SBHqpa9tUyQWZXqTzPxwA
y/YipF1EYEeu8jSra1R3ChIkohTrGaNYEQzo9j38LxCDDU3rYac6QdsxUFIzhwRM
zvW1tbUjau/LoG+4rgNVShYsS8J6WhXO0H2OQckrA4P2XyDSBsCAT+f5AoGARsMB
P5Kv/MzozaHoLwgxBBIJQY/Xk3F7jeP4XlI7d9CYcafZNbU79GgxqnzRlNe1RyYQ
LtMJyQO+vUsg1Nd7koehzcRJyV4TeEBZi0NoctauO+f/rSZ9wpQwBcHhVgZOdCj+
bqM7o045oOwbx4ZnCDfn0aDhdJQe5GSXQEsnSWUCgYEAmXjOT2UIrtWo8wjBv5/4
KX8NBBLxJa4E0bXUTLbSiAXmgDa77nxoHYHMJq0sLAjjBA0W1t7S7jQ/2AGolDrw
JgPfyrgzbYiolva+md2pdehTQapVDPBH3elTH8nZfr5foOKhGWC/8PEe0V+AChRP
NZEqYXMom2CnG3DPYdLNXnc=
-----END PRIVATE KEY-----
```

**IMPORTANT for FIREBASE_PRIVATE_KEY:**
- Copy the ENTIRE private key including the BEGIN and END lines
- Make sure to include all the `\n` characters exactly as they appear
- Render will handle the newline conversion automatically

### 3. Additional Environment Variables (if you use them):
```
MONGODB_URI = your_mongodb_connection_string
MARKETCHECK_API_KEY = your_marketcheck_api_key  
GOOGLE_MAPS_API_KEY = your_google_maps_api_key
TWILIO_ACCOUNT_SID = your_twilio_sid
TWILIO_AUTH_TOKEN = your_twilio_token
TWILIO_PHONE_NUMBER = your_twilio_phone
```

### 4. Deploy on Render

1. **Connect Repository**: Link your GitHub repository to Render
2. **Build Command**: `npm install`
3. **Start Command**: `npm start` or `node server.js`
4. **Environment**: Node
5. **Auto-Deploy**: Enable for automatic deployments on push

### 5. Troubleshooting

**If you still get authentication errors:**

1. **Check Environment Variables**: Make sure all variables are set correctly
2. **Verify Private Key**: The private key should be one long string with `\n` characters
3. **Test Locally**: Make sure your local version works first
4. **Check Logs**: Look at Render's deployment logs for specific errors

**Common Issues:**
- **Newlines in Private Key**: Make sure `\n` characters are preserved
- **Missing Variables**: Double-check all required Firebase environment variables
- **Project ID Mismatch**: Ensure project ID matches your Firebase project
- **Permissions**: Verify service account has Firestore permissions

### 6. Verification

After deployment, check the logs for:
- ✅ Firebase Admin SDK initialized successfully
- ✅ Firestore connection test passed
- ✅ Your service is live

### 7. Security Notes

- **Never commit** `serviceAccountKey.json` to Git
- **Keep** `render-env-variables.txt` out of version control
- **Use environment variables** for all sensitive data
- **Regenerate keys** if they're ever compromised

### 8. Local Development

For local development, keep using the `serviceAccountKey.json` file. The code will automatically:
- Use environment variables in production (Render)
- Fall back to the JSON file in development (local)

This gives you the best of both worlds: security in production and convenience in development.
