# bluegreen

BlueGreen deployments (starting with Docker on AWS).  This is a highly opinionated framework for deploying Docker containers onto AWS.

Initially, we are targeting Elastic Beanstalk multi-container Docker deployments in an autoscale group.  Furthermore, this is designed to target the Web Application profile in an autoscale group with accompanying Elastic Load Balancer.

The Blue-Green environments are swapped by adding/removing the Elastic Beanstalks ELB instance from a global ELB instance (representing the entry point of the application).

In the future, I'd like to migrate this to ECS.  Keep in mind, this represents my current workflow and will mature when I change that workflow or find free time to expand it's functionality.

## Model

`Service`: is a unit of management for an independent service-providing entity.  Typically a single application, like a Node.js web server, but it can also be something like multiple Docker containers that are always deployed together.  These are the core of what BlueGreen manages.

`Version`: each service has zero or more deployable Versions.  A large part of the BlueGreen workflow is specifying what version should be deployed to a target Environment, and whether it should be accessible to a specific Gateway.

`Environments`: where Versions of your Services get deployed.  By default, we use `blue` and `green`, because conceptually, that's the whole point of this framework.  However, we aren't so unimaginative that we don't realize you might also want to deploy to `test` or `qa`.

`Gateways`: these are where your customers (or other services) access your Services.  In BlueGreen, this could simply be a CNAME swap in DNS, or the attaching of an `Environment` to a load balancer.

**Modes of Operation**

BlueGreen assumes that


## Usage

### Using the Command Line

#### Overview commands

Help

```bash
bluegreen help
```

Get overall Statuses of services an environments

```bash
bluegreen ps
```

#### Service commands

List Services
```bash
bluegreen services
```

Create a new service

```bash
bluegreen create service <service>

bluegreen create service www
```

Teardown a service

```bash
bluegreen teardown service <service>

bluegreen teardown service www
```

#### Environment commands

List all environments (regardless of service)
```bash
bluegreen environments
```

List available Environments of a Service
```bash
bluegreen <service> environments

bluegreen www environments
```

Create an environment
```bash
bluegreen <service> create environment <environment>

bluegreen www create environment test
```

Teardown an Environment
```bash
bluegreen <service> teardown environment <environment>

bluegreen www teardown environment test
```


#### Version commands

List available Versions of a Service
```bash
bluegreen <service> versions

bluegreen www versions
```

Delete a Version of a Service
```bash
bluegreen <service> delete version <version>

bluegreen www delete version 0.3.1
```

Create a new Version of a Service
```bash
bluegreen <service> create version <version>

bluegreen www create version

bluegreen www create version 0.3.2
```

Deploy a Version of a Service to an Environment
```bash
bluegreen <service> deploy <version> to <environment>

bluegreen www deploy 0.3.2 to blue
```

#### Gateway commands

List all available Gateways

```bash
bluegreen gateways
```

List all available Gateways for a service

```bash
bluegreen <service> gateways

bluegreen www gateways
```

Create a Gateway

```bash
bluegreen <service> create gateway <name>

bluegreen www create gateway production
```

Teardown a Gateway

```bash
bluegreen <service> teardown gateway <name>

bluegreen www teardown gateway production
```

Swap the Gateways of two environments.  If you are using CNAMEs as your Gateway, this
will just switch `blue` to `green`'s record, and vice versa.

```bash
bluegreen <service> swap [blue] [green]

bluegreen www swap blue green
```

Attach an environment to a Gateway.  If the Gateway is something simple (like a CNAME), this
may simply mean "detach the current environment, and use the new one".  If it's a load balancer,
it will attach both environments to the same load balancer (you might want this for a smoke test).  If you want to detach the old environment and attach the new one, use `swap`.

```bash
bluegreen <service> attach <environment> to <gateway>

bluereen www attach blue to production
```

Detach an environment from a Gateway.

```bash
bluegreen <service> detach <environment> from <gateway>

bluegreen www detach blue from production
```
