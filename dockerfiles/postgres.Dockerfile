FROM postgis/postgis:17-3.5-alpine

# Install build dependencies for pgvector.
# postgis:17-3.5-alpine is built on Alpine 3.23 with clang-19.
# pg_config --configure hardcodes 'clang-19' so we need the clang19 package
# (which provides /usr/bin/clang-19) rather than the generic 'clang' alias.
RUN apk add --no-cache --virtual .build-deps \
    git \
    build-base \
    clang19 \
    llvm19-dev

# Clone and install pgvector
RUN cd /tmp && \
    git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install

# Cleanup
RUN rm -rf /tmp/pgvector && \
    apk del .build-deps
