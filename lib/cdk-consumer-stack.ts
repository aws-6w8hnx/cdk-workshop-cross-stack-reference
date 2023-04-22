import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface consumerStackProps extends cdk.StackProps {
    vpc: ec2.IVpc;
}

export class consumerStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: consumerStackProps) {
        super(scope, id, props);

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
