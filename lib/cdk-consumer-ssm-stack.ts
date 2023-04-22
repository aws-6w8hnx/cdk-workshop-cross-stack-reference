import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from 'constructs';

export interface securityGourpProps extends cdk.StackProps {
    readonly vpcIdExportPath: string;
}

export class ssmSgStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: securityGourpProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcIdExportPath);

    const ssVpc = ec2.Vpc.fromLookup(this, 'cdk-ss-vpc',{
        vpcId: vpcId,
        });

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
