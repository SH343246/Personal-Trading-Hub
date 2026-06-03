FROM python:3.12-slim
WORKDIR /worker
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true
COPY worker /worker
CMD ["python", "-c", "print('worker online')"]
