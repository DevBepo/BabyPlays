FROM python:3.13-slim AS runtime

ARG DJANGO_UID=1000
ARG DJANGO_GID=1000

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid "${DJANGO_GID}" django \
    && useradd --uid "${DJANGO_UID}" --gid "${DJANGO_GID}" --home-dir /app --shell /usr/sbin/nologin --no-create-home django

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=django:django . .

RUN mkdir -p /app/media /app/staticfiles \
    && chown -R django:django /app/media /app/staticfiles

USER django

EXPOSE 8000

CMD ["gunicorn", "setup.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
