# cloudformer-node

A port of the Ruby AWS CloudFormation tooling https://github.com/kunday/cloudformer

####To install:

  npm install cloudformer-node -g

###JS Usage:

  var s = new Stack('tooling-test');
  s.delete(console.log);
  s.apply('./samples/basic_template.json', {
      Parameters: { AmiId: 'ami-fd9cecc7' },
      DisableRollback: false,
      Capabilities: [],
      NotificationARNs: [],
      Tags: { Name: 'mystack' }
    }, console.log);

###CLI Usage:

  stack-apply -h
  stack-delete -h

