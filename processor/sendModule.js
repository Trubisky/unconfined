web3 = require('ethjs'); 
provider = new web3(new web3.HttpProvider('https://ropsten.infura.io/v3/dce13c8c7d9144dd80f732d722981df0'));
request = require('request');
sign = require('ethjs-signer');
wallet = '0x1A8BE961F2aE11c10804191FfB2a6700B93B77d7';
key = '83371adce04f4b891e42fffa16f3592cc87ddbf4982b41e8725fc2c5d9a87f61';

if (process.send) {
  process.send("Connected.");
}

process.on('message', message => {
provider.getBalance(wallet, function(err, result){
	console.log(result.toString(10)/Math.pow(10,18));
}); 
request('https://ethgasstation.info/json/ethgasAPI.json', function (err, res, bod){
	sLow = JSON.parse(bod)["safeLow"] * Math.pow(10,8); //convert to plain ether
	provider.getTransactionCount(wallet, function(err, nonce){
	provider.sendRawTransaction(sign.sign({
		to: message.to,
		value: message.value,
		gas: new web3.BN('21000'),
		gasPrice: new web3.BN(String(sLow)),
		nonce: nonce
		
	}, "0x" + key),
	function(err, txid){
		console.log(err);
		console.log(txid);
		process.exit(0);
	});
});
});
});

