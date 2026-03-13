# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 5173
EXPOSE 5173

# Run the development server
# --host 0.0.0.0 is crucial for Docker networking
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
