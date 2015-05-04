# cloudformer-node

A port of the Ruby AWS CloudFormation tooling [https://github.com/kunday/cloudformer](https://github.com/kunday/cloudformer)

Cloudformer attempts to simplify AWS Cloudformation stack creation process in NodeJS projects by providing reusable operations such as apply(create/update), delete, recreate on stack along with validations on templates. Task executions which enforce a stack change will wait until ROLLBACK/COMPLETE or DELETE is signalled on the stack (useful in continuous deployment environments to wait until deployment is successful).

## Installation:

```bash
$ npm install cloudformer-node -g
````

## AWS Environment configuration

Cloudformer depends on the aws-sdk module to query AWS API. You will need to export AWS configuration to environment variables to your .bashrc/.bash_profile or your build server:

    export AWS_ACCESS_KEY=your access key
    export AWS_DEFAULT_REGION=ap-southeast-2
    export AWS_SECRET_ACCESS_KEY=your secret access key

## JS Usage:

```js
var stack = new Stack('tooling-test');
stack.delete(console.log);
stack.apply('./samples/basic_template.json', {
  Parameters: { AmiId: 'ami-fd9cecc7' },
  DisableRollback: false,
  Capabilities: [],
  NotificationARNs: [],
  Tags: { Name: 'mystack' }
}, console.log);
```

## CLI Usage:
```bash
  stack-apply -h
  stack-delete -h
```

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request
