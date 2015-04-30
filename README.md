# cloudformer-node

A port of the Ruby AWS CloudFormation tooling https://github.com/kunday/cloudformer

## Installation:

```bash
$ npm install cloudformer-node -g
````

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
