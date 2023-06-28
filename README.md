# How do I pass construct objects for a cross stack reference in a single CDK project?

Reference: https://repost.aws/knowledge-center/cdk-cross-stack-reference

---

## Part 1: Deploy producer_stack:

1. Create a project and invoke cdk init in an empty directory:
```bash
mkdir my-project
cd my-project
cdk init --language typescript
```

2. Rename file from `my-project-stack.ts`  to `cdk-producer-stack.ts`:
```bash
mv lib/my-project-stack.ts lib/cdk-producer-stack.ts
```

3. Import aws library, add the below:
```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
```

4. Define a stack and set a property for the Amazon VPC (for this example producerStack):
```typescript
export class producerStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'cdk-ss-vpc', {
      maxAzs: 2,
      natGateways: 0,
    });
  }
}
```

5. Go to `bin/my-project.ts`, and add below:
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { producerStack } from '../lib/cdk-producer-stack';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const app = new cdk.App();

const producer_stack = new producerStack(app, 'cdk-producer-stack', {
  env: env,
});
cdk.Tags.of(producer_stack).add('auto-delete', 'no');
cdk.Tags.of(producer_stack).add('managedBy', 'cdk');
cdk.Tags.of(producer_stack).add('environment', 'dev');
```

6. Run the commands:
```bash
cdk ls

cdk deploy --all
```

## Part 2: Deploy consumer_stack:
1. Create a new file called: `cdk-consumer-stack.ts` in lib/:
```bash
touch lib/cdk-consumer-stack.ts
```

2. Import aws library, add the below:
```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
```

3. Export an interface called consumerStackProps:
```typescript
export interface consumerStackProps extends cdk.StackProps {
    vpc: ec2.IVpc;
}
```

4. Define a consumer stack:
```typescript
export class consumerStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: consumerStackProps) {
        super(scope, id, props);
```

5. Define a vpc and security group by adding below:
```typescript
        const vpc = props.vpc;

        const SecurityGroup = new ec2.SecurityGroup(this, 'ingressSsh', {
            vpc,
            allowAllOutbound: true,
        });
        SecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(22),
            'allow SSH access from anywhere',
        );
    }
}
```

6. Go to `bin/my-project.ts`, and add below:
```typescript
......
import { consumerStack } from '../lib/cdk-consumer-stack';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const app = new cdk.App();

......

const consumer_stack = new consumerStack(app, 'cdk-consumer-stack', {
  env: env,
  vpc: producer_stack.vpc,
});
cdk.Tags.of(consumer_stack).add('auto-delete', 'no');
cdk.Tags.of(consumer_stack).add('managedBy', 'cdk');
cdk.Tags.of(consumer_stack).add('environment', 'dev');
```

7. A Question for audience:  
Do I need to add a dependency for the two stacks:question: for example: `consumer_stack.addDependency(producer_stack)`.

8. Run the commands:
```bash
cdk ls

cdk deploy --all
```

# Part 3: Deploy ssm_consumer_stack:
1. Create a new file called: `cdk-consumer-ssm-stack.ts` in lib/:
```bash
touch lib/cdk-consumer-ssm-stack.ts
```

2. We need to make a few changes in the producer_stack, open `cdk-producer-stack.ts`, and add the following:
```typescript
...
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface vpcProps extends cdk.StackProps {
  readonly vpcName: string;
  readonly vpcIdExportPath: string;
}


export class producerStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  constructor(scope: cdk.App, id: string, props: vpcProps) {  // change `props?: cdk.StackProps` to `props: vpcProps`

    ...
    // add :point_down:
    const parameter = new ssm.StringParameter(this, 'vpcIdParameter', {
      parameterName:  props.vpcIdExportPath,
      stringValue:    this.vpc.vpcId,
    });
    // add :point_up:
    
  }
}
```

3. Open `bin/my-project.ts`, and add the following:
```typescript
...
const vpcIdSsmtPath = "/cdk/vpc/cross-stacks-reference/vpcId";

const producer_stack = new producerStack(app, 'cdk-producer-stack', {
  env: env,
  vpcName: 'cdk-ss-vpc',
  vpcIdExportPath: vpcIdSsmtPath,
});

const ssm_consumer_stack = new ssmSgStack(app, 'cdk-consumer-ssm-stack', {
...
```


+ Run the commands:
```bash
cdk ls

cdk deploy --all
```


4. Now, open `cdk-consumer-ssm-stack.ts`, and add the below to import aws library,
```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from 'constructs';
```

5. Export an interface called securityGourpProps:
```typescript
export interface securityGourpProps extends cdk.StackProps {
    readonly vpcIdExportPath: string;
}
```

6. Define a new ssmSgStack stack:
```typescript
export class ssmSgStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: securityGourpProps) {
    super(scope, id, props);
```

7. Define a vpcId using the value store in parameter store:
```typescript
    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcIdExportPath);
```

8. As the value is a string, whereas Security Group's vpc is a IVpc, so we need to use FromLookup to convert the string to an Interface. add the below:
```typescript
    const ssVpc = ec2.Vpc.fromLookup(this, 'cdk-ss-vpc',{
        vpcId: vpcId,
        });
```

9. add the following to use the VPC Interface: ssVpc to create a ssmIgressHttp Security Group:
```typescript
    const SecurityGroup = new ec2.SecurityGroup(this, 'ssmIgressHttp', {
        vpc: ssVpc,
        allowAllOutbound: true,
        });
    SecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'allow HTTP traffic from anywhere',
        );
    }
}
```

10. open `bin/my-project.ts`, add the following:
```typescript
...
import { ssmSgStack } from '../lib/cdk-consumer-ssm-stack';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const app = new cdk.App();

const vpcIdSsmtPath = "/cdk/vpc/cross-stacks-reference/vpcId";

const producer_stack = new producerStack(app, 'cdk-producer-stack', {
...

const consumer_stack = new consumerStack(app, 'cdk-consumer-stack', {
...

const ssm_consumer_stack = new ssmSgStack(app, 'cdk-consumer-ssm-stack', {
  env: env,
  vpcIdExportPath: vpcIdSsmtPath,
});
cdk.Tags.of(consumer_stack).add('auto-delete', 'no');
cdk.Tags.of(consumer_stack).add('managedBy', 'cdk');
cdk.Tags.of(consumer_stack).add('environment', 'dev');
```

:bangbang: Ask a Question:question:, Do I need to add stack dependency?

11. add stack dependency:
```typescript
ssm_consumer_stack.addDependency(producer_stack)
```

12. Run the commands:
```bash
cdk ls

cdk deploy --all
```
