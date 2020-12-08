  
FROM willhallonline/ansible:2.9-alpine

COPY ./dist/index.js /index.js

# Basic Packages + Sage
RUN apk add --no-cache --virtual .build-deps \
        nodejs yarn rsync \
        g++ make autoconf automake libtool nasm \
        libpng-dev libjpeg-turbo-dev \
    && rm -rf /var/cache/apk/* /tmp/*

# Basic smoke test
# RUN echo 'node --version' && node --version && \
#     echo 'yarn versions' && yarn versions && \
#     echo 'python --version' && python --version && \
#     echo 'ansible --version' && ansible --version && \
#     echo 'rsync --version' && rsync --version

# Dont use this, we have everything precompiled
#RUN yarn install --production --silent --non-interactive

ENTRYPOINT ["node", "/index.js"]