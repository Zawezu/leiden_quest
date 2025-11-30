# This is the Dockerfile for the frontend container
# It uses the official Nginx image as the base and runs the html application on nginx


# use the official Nginx image as the base
FROM nginx:latest

# set the working directory in the container
WORKDIR /usr/share/nginx/html

COPY . .

# expose the default Nginx HTTP port
EXPOSE 80

# start the Nginx server
CMD ["nginx", "-g", "daemon off;"]
