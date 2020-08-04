const fork = require('child_process').fork;
const path = require('path');
const program = path.resolve('sendModule.js');
const parameters = [];
const options = {
  stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
};

const child = fork(program, parameters, options);
child.on('message', message => {
  console.log('message from child:', message);
  child.send({to: '0xef22a8717c161baae099049917f822ea3635527d', value: Math.pow(10,18) * .069});;
  console.log('sent');
});