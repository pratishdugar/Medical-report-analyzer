#!/bin/sh
# Runs once when the Postgres volume is first created.
# The app connects as a NOSUPERUSER NOBYPASSRLS role so row-level security is
# always enforced; the superuser is only used for administration.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE sehat LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE DATABASE sehat OWNER sehat;
REVOKE ALL ON DATABASE sehat FROM PUBLIC;
SQL
