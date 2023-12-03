docker buildx build --platform linux/amd64 -t catatmak-bot:v1 .
docker tag {image id} gcr.io/catatmak/catatmak-bot:v1
docker push gcr.io/catatmak/catatmak-bot:v1