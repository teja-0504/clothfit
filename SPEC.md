 pip install -r requirements.txt


# Build once
docker build -t clothfit .

# Run
docker run -p 5000:5000 clothfit

python server.py   


To run it on another device:

Copy the Docker image:

 docker save clothfit | gzip > clothfit.tar.gz

On the other device (with Docker installed): 

docker load < clothfit.tar.gz

Run:

 docker run -p 5000:5000 clothfit