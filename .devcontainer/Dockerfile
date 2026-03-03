FROM mcr.microsoft.com/devcontainers/dotnet:2-10.0

# install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Install dotnet-ef global tool as vscode user
USER vscode
RUN dotnet tool install -g dotnet-ef
ENV PATH="$PATH:/home/vscode/.dotnet/tools"


# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment this line to install global node packages.
# RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && npm install -g <your-package-here>" 2>&1