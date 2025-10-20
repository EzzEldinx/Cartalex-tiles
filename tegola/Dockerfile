# tegola/Dockerfile (Final Version)

FROM gospatial/tegola:v0.21.2

# Create the configuration directory inside the image
RUN mkdir -p /etc/tegola

# Copy our corrected config file into the directory we just created
COPY tegola.toml /etc/tegola/tegola.toml