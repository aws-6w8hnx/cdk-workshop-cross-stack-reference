import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface vpcProps extends cdk.StackProps {
  readonly vpcName: string;
  readonly vpcIdExportPath: string;
}

export class producerStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  constructor(scope: cdk.App, id: string, props: vpcProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'cdk-ss-vpc', {
      maxAzs: 2,
      natGateways: 0,
    });

    const parameter = new ssm.StringParameter(this, 'vpcIdParameter', {
      parameterName:  props.vpcIdExportPath,
      stringValue:    this.vpc.vpcId,
    });
  }
}
