if (process.send) {
  process.send("Connected.");
}

process.on('message', message => {
  console.log('message from parent:', message);
});