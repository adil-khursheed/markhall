FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN addgroup --system --gid 10001 sandbox \
  && adduser --system --uid 10001 --ingroup sandbox sandbox

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py helpers.py runner.py test_app.py ./
USER sandbox

EXPOSE 8000
CMD ["python", "app.py"]
