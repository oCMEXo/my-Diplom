# ADR-004: deployment on AWS

## Decision

One EC2 instance with Docker Compose (API, collab, runner, Redis, Caddy with HTTPS), the database in RDS
PostgreSQL, the front end in S3 behind CloudFront. It is cheaper and simpler, and the runner needs a
Docker daemon anyway, which Fargate does not have.

| Criterion | EC2 + Compose (chosen) | ECS Fargate + ALB |
|---|---|---|
| Complexity | Low: one machine, one compose file | High: services, tasks, load balancer, IAM |
| Cost | Instance + RDS; no load balancer | Plus the ALB and per-second Fargate billing |
| Running code | Docker works directly | A separate EC2 is needed anyway |
| Scaling | Vertical (instance type) | Horizontal |
| For the diploma | Enough for the demo and load tests | More than needed |

## Consequences

Everything lives on one machine, so if it goes down the service stops, but the data in RDS and the local
copies on the clients stay. The thesis describes moving to ECS as a way to grow. Current prices and free
tier terms should be checked before starting.

Note: in the end the live site was deployed to Google Cloud (one VM with the same Docker Compose
approach, see [docs/deploy-gcp.md](../deploy-gcp.md)). The AWS guide was not run on a real account.
