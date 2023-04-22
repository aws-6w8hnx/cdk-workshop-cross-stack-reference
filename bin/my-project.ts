#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { producerStack } from '../lib/cdk-producer-stack';
import { consumerStack } from '../lib/cdk-consumer-stack';
import { ssmSgStack } from '../lib/cdk-consumer-ssm-stack';

const vpcIdSsmtPath = "/cdk/vpc/cross-stacks-reference/vpcId";

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const app = new cdk.App();

const producer_stack = new producerStack(app, 'cdk-producer-stack', {
  env: env,
  vpcName: 'cdk-ss-vpc',
  vpcIdExportPath: vpcIdSsmtPath,
});
cdk.Tags.of(producer_stack).add('auto-delete', 'no');
cdk.Tags.of(producer_stack).add('managedBy', 'cdk');
cdk.Tags.of(producer_stack).add('environment', 'dev');

const consumer_stack = new consumerStack(app, 'cdk-consumer-stack', {
  env: env,
  vpc: producer_stack.vpc,
});
cdk.Tags.of(consumer_stack).add('auto-delete', 'no');
cdk.Tags.of(consumer_stack).add('managedBy', 'cdk');
cdk.Tags.of(consumer_stack).add('environment', 'dev');

const ssm_consumer_stack = new ssmSgStack(app, 'cdk-consumer-ssm-stack', {
  env: env,
  vpcIdExportPath: vpcIdSsmtPath,
});
cdk.Tags.of(consumer_stack).add('auto-delete', 'no');
cdk.Tags.of(consumer_stack).add('managedBy', 'cdk');
cdk.Tags.of(consumer_stack).add('environment', 'dev');
ssm_consumer_stack.addDependency(producer_stack)
