# Ice Wallet

A very simple personal finance app. Allows you to keep track of your incomes and spendings.

# Environment

go, node, npm

# Build
Note: Pre-built backend binary (for linux amd64) and pre-built frontend files (platform independent) available in releases.

Backend: Change directory to `icewallet-backend`. You may want to install all Go project dependencies. Then run `go build`.

Output will be an executable: `icewallet-backend`

Frontend: Change directory to `icewallet-frontend`. Run `npm install` to install all dependencies, and then run `npm run build`.

Output will be a folder: `dist/icewallet-frontend`

# Deployment
Note: You will need to use a webserver such as Nginx and install MongoDB

Deploy frontend: Configure your webserver so that it serves the `icewallet-frontend` folder

Deploy backend:
1. Make sure your MongoDB server is running.
2. Run `icewallet-backend --genkey` to generate a pair of private key and public key. Copy them.
3. Create a `.env` file in the same folder as the backend executable. Here is the file content for your reference: (You need to modify the parameters depending your situation):

```
LISTENING_ADDRESS=127.0.0.1
LISTENING_PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/icewallet
MONGODB_DB=icewallet
PRIVATE_KEY="PUT GENERATED PRIVATE KEY HERE"
PUBLIC_KEY="PUT GENERATED PUBLIC KEY HERE"
CORS_DOMAINS=https://your.domain.com,https://another.domain.com
```

4. Run `icewallet-backend --pwd` to initialize the login password. If you see the message "Password changed successfully" after changing your password, that means the database can be reached correctly. Otherwise, the database or the database URI might have been misconfigured.
5. Run `icewallet-backend` to start the backend server.
6. You may want to configure your webserver so that it runs a reverse-proxy for your backend server.

## Troubleshooting
- An error occured right after the server saying "Loading environment variables...": Did you put the `.env` file in the same working folder as the backend server? Did you edit your `.env` file correctly (following the above template)?
- An error occured right after the server saying "Connecting to database...": Please make sure the MongoDB server is running, and you have configured the MongoDB URI correctly. Make sure you have also included the database user credentials (you may need to set `authSource`) in the URI.
- "Password does not exists, please run with --pwd to set a password": You haven't set a password yet. Run `icewallet-backend --pwd` to set a password.
- "WARNING: The private/public key pair seems to be invalid!": The private/public key pair specified in the `.env` file is not working. Did you copy them correctly? You can run `icewallet-backend --genkey` to generate a new pair of keys.
- Fatal panic: Sorry this is my bad. Please open a issue describing how the problem is triggered.
