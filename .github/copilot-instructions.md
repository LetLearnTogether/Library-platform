# Shared VPS Deployment Rules

## Mandatory Deployment Hard Rules

- Every project deployment on the shared VPS MUST be installed only under `/opt`.
- NEVER deploy project files, repositories, Docker resources, or runtime data in any other directory on the VPS. Stop the task if an existing deployment is outside `/opt`; do not repair or extend it.
- Deploy each project with its own Docker Compose stack, including isolated frontend, backend, database, and project Nginx containers.
- The project Nginx container may communicate only with the services in its own project stack and may be exposed to the host Nginx.
- The host machine MUST run Nginx as the shared traffic router for every project. Host Nginx must route inbound traffic to the correct project Nginx container; do not replace this shared host Nginx routing with another host-level proxy.
- Do not run database, backend, frontend, or project-Nginx containers from another team's stack. Do not use another team's container names, networks, volumes, secrets, compose files, or ports.
- Touch only this project's containers, networks, volumes, files under this project's deployment directory, and its own host Nginx configuration or upstream entry. NEVER inspect, modify, restart, stop, remove, recreate, or otherwise interfere with containers or infrastructure belonging to another team.
- Before any deployment command, verify the deployment path is under `/opt`, identify this project's exact container names and Compose project, and confirm that the host Nginx configuration change affects only this project's virtual host/upstream.
- Do not run broad Docker cleanup, prune, stop, restart, or removal commands on the shared VPS. Use only explicitly scoped project commands.
- Treat host Nginx, Docker daemon configuration, shared networks, shared volumes, firewall rules, and other teams' resources as protected. Never modify them unless the request explicitly authorizes the exact change and ownership has been established.
- Never publish database ports or expose another team's service. Keep service traffic private and publish only the ports required by this project's Nginx routing.
- Use least-privilege credentials, protected environment files, persistent project-owned volumes, and validated backups before production changes.
- Validate configuration and run health checks before reporting a deployment successful. Do not claim deployment success unless `/opt` deployment, project container isolation, host Nginx routing, and project service health have all been verified.
