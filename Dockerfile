# 1. Use an official Node.js runtime as a parent image
FROM node:20-alpine AS builder

# 2. Set the working directory in the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json (if available)
#    Only copy these files first to leverage Docker cache for dependencies
COPY src/package.json ./
# Assuming npm, copy package-lock.json if it exists in src/
# COPY src/package-lock.json ./

# 4. Install project dependencies (including devDependencies for build)
RUN npm install

# 5. Copy the rest of the application source code from src/
COPY src/ .

# 6. Compile TypeScript to JavaScript
RUN npm run build

# 7. Prune devDependencies (Optional, but good for smaller image size)
# RUN npm prune --production

# --- Release Stage ---
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy build artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
# If package-lock.json was copied in builder, copy it here too
# COPY --from=builder /usr/src/app/package-lock.json ./package-lock.json

# If you have other assets like .env files or config files that are needed at runtime and are not part of src/
# COPY --from=builder /usr/src/app/config ./config
# Ensure that the actual config/index.ts (not sample) is available if needed, or handle config via ENV variables

# 8. Expose port 9000 (as found in config/index.sample.ts)
EXPOSE 9000

# 9. Define environment variable for production
ENV NODE_ENV production

# 10. Define the command to run your app
# Assuming the main entry point after build is 'dist/index.js' based on package.json "main": "index.js"
CMD ["node", "dist/index.js"]
