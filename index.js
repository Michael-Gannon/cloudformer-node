var AWS = require('aws-sdk');
AWS.config.update({region: process.env['AWS_DEFAULT_REGION'] || 'us-west-2'});

var fs = require('fs'),
    cf = new AWS.CloudFormation(),
    lodash = require('lodash');

var SUCESS_STATES  = ["CREATE_COMPLETE", "UPDATE_COMPLETE"];
var FAILURE_STATES = ["CREATE_FAILED", "DELETE_FAILED", "UPDATE_ROLLBACK_FAILED", "ROLLBACK_FAILED", "ROLLBACK_COMPLETE","ROLLBACK_FAILED","UPDATE_ROLLBACK_COMPLETE","UPDATE_ROLLBACK_FAILED"];
var END_STATES     = SUCESS_STATES.concat(FAILURE_STATES);

var Stack = function(_stackName) {
  this.stackName = _stackName;
}

Stack.prototype.apply = function(templateFile, options, cb) {
  var self = this;
  options = lodash.merge({
    Parameters: {},
    DisableRollback: false,
    Capabilities: [],
    NotificationARNs: [],
    Tags: []
  }, options);

  options.Parameters = lodash.map(options.Parameters, function(v,k) {
    return {ParameterKey: k, ParameterValue: v};
  });

  options.Tags = lodash.map(options.Tags, function(v,k) {
    return {Key: k, Value: v};
  });

  var template = fs.readFileSync(templateFile).toString();
  self.isValidTemplate(template, function(err, valid) {
    if(!valid) {
      return cb('Unable to update ' + self.stackName + ' - ' + err, false);
    }

    self.isDeployed(function(err, deployed) {
      if(deployed) {
        delete options.Tags;
        delete options.DisableRollback;
        self.update(template, options, cb);
      } else {
        self.create(template, options, cb);
      }
    });
  });
};

Stack.prototype.delete = function(cb) {
  var self = this;
  console.log('Deleting stack ' + self.stackName + '...');
  cf.deleteStack({StackName: self.stackName}, function(err, data) {
    self.waitUntilEnd(function(err, succeeded) {
      if(/Stack:.*does not exist/.test(err) || /Stack not up/.test(err)) {
        console.log('Delete complete');
        return cb(null, true);
      }

      return cb(err, succeeded);
    });
  });
};

Stack.prototype.outputs = function(cb) {
  var self = this;
  self.isDeployed(function(err, deployed) {
    if(!deployed) {
      return cb('Stack not up.', null);
    }

    cf.describeStacks({StackName: self.stackName }, function(err, data) {
      if(err) {
        return cb(err.message, null);
      } else if(data.Stacks.length > 1) {
        return cb('Unable to find unique stack by name \'' + self.stackName + '\'', false);
      }

      var outputs = {};
      var AWSOutputs = data.Stacks[0].Outputs;
      AWSOutputs.forEach(function(output) { outputs[output.OutputKey] = output.OutputValue; });
      cb(null, outputs);
    });
  });
};

Stack.prototype.update = function(template, options, cb) {
  var self = this;
  console.log('Initializing stack update of ' + self.stackName + '...');
  options.StackName =  self.stackName;
  options.TemplateBody = template;
  cf.updateStack(options, function(err, data) {
    if(err && !/No updates are to be performed/.test(err.message)) {
      return cb(err.message, false);
    } else if(/No updates are to be performed/.test(err.message)) {
      console.log(err.message);
      return cb(null, true);
    }

    setTimeout(function() {
      self.waitUntilEnd(function(err, complete) {
        if(err) {
          return cb(err, false);
        }

        self.isDeploySuccessful(function(err, succeeded) {
          if(!succeeded) {
            console.log('Unable to update stack. Check log for more information.');
          }

          cb(err, succeeded);
        });
      });
    }, 10 * 1000);

  });
};

Stack.prototype.create = function(template, options, cb) {
  var self = this;
  console.log('Initializing stack creation of ' + self.stackName + '...');
  options.StackName =  self.stackName;
  options.TemplateBody = template;

  cf.createStack(options, function(err, data) {
    if(err) {
      return cb(err.message, false);
    }

    setTimeout(function() {
      self.waitUntilEnd(function(err, complete) {
        if(err) {
          return cb(err, false);
        }

        self.isDeploySuccessful(function(err, succeeded) {
          if(!succeeded) {
            console.log('Unable to deploy template. Check log for more information.');
          }

          cb(err, succeeded);
        });
      });
    }, 10 * 1000);
  });
};

Stack.prototype.waitUntilEnd = function(cb) {
  var self = this;
  self.isDeployed(function(err, deployed) {
    if(!deployed) {
      return cb('Stack not up.', false);
    }

    var printedEvents = {};
    var now = new Date();

    var interval = setInterval(function() {
      cf.describeStackEvents({StackName: self.stackName}, function(err, data) {
        if(err) {
          clearInterval(interval);
          return cb(err.message, false);
        }

        var newEvents = lodash.reject(data.StackEvents, function(event) {
          return event.Timestamp < now || printedEvents[event.EventId];
        });

        newEvents.sort(function(event) {
          return event.Timestamp;
        });

        newEvents.forEach(function(event) {
          console.log(event.Timestamp + ' - ' + event.PhysicalResourceId + ' - ' + event.ResourceType + ' - ' + event.ResourceStatus + (event.ResourceStatusReason ? ' - ' + event.ResourceStatusReason : ''));
          printedEvents[event.EventId] = true;
        });


        cf.describeStacks({StackName: self.stackName }, function(err, data) {
          if(err) {
            clearInterval(interval);
            return cb(err.message, false);
          } else if(data.Stacks.length > 1) {
            clearInterval(interval);
            return cb('Unable to find unique stack by name \'' + self.stackName + '\'', false);
          }

          if(END_STATES.indexOf(data.Stacks[0].StackStatus) != -1) {
            clearInterval(interval);
            cb(null, true);
          }
        });
      });
    }, 20 * 1000);
  });
};

Stack.prototype.isDeployed = function(cb) {
  var self = this;
  return cf.describeStacks({StackName: self.stackName }, function(err, data) {
    if(err) {
      return cb(err.message, false);
    } else if(data.Stacks.length > 1) {
      return cb('Unable to find unique stack by name \'' + self.stackName + '\'', false);
    }
    return cb(null, true);
  });
};

Stack.prototype.isValidTemplate = function(template, cb) {
  cf.validateTemplate({TemplateBody: template}, function(err, data) {
    if(err) {
      return cb(err.message, false);
    }

    return cb(null, true);
  });
};

Stack.prototype.isDeploySuccessful = function(cb) {
  var self = this;
  cf.describeStacks({StackName: self.stackName }, function(err, data) {
    if(err) {
      return cb(err.message, false);
    } else if(data.Stacks.length > 1) {
      return cb('Unable to find unique stack by name \'' + self.stackName + '\'', false);
    }

    var state = data.Stacks[0].StackStatus;
    if(FAILURE_STATES.indexOf(state) !== -1) {
      return cb('Deploy was not successful, final state was \'' + state + '\'', false);
    }

    return cb(null, true);
  });
};

module.exports = Stack;