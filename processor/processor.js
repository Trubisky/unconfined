var socket = require('ws');
var host = new socket.Server({port: 1014}); //Main processor server
var fs = require('fs');
var request = require('request');
const fork = require('child_process').fork; //All of these constants are for forking the sendModule to send transactions
const path = require('path');
const program = path.resolve('sendModule.js');
const parameters = [];
const options = {
  stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ] //Ignore
};
let apikey = "REA8XNQJGH55TTY4K6IM1CB4JXR2ACPQP1"; //Etherscan API Key
let etherscan = "http://api-ropsten.etherscan.io/api?module=account&action=txlist&address=ADDRESS&startblock=0&endblock=99999999&sort=asc&apikey="+apikey;
atrans = {}; //table of active transactions to process, each one contains a small amount of data
eprice = 0; //Price of ethereum
host.on('connection', function connect(ws) {
	ws.on('message', function income(message){
		data = JSON.parse(message);
		if (data["Action"] == "RequestPayment"){ //Merchant's payment request function
			let paymentid = Date.now();
			let rwallet = data["MerchantAddress"];
			let price = data["RequestedAmount"];
			let merch = data["MerchantName"];
			let ctype = data["Currency"];
			if (ctype == "USD"){
				price = price / eprice;
			}		
			price = Math.round(price * Math.pow(10, 18)) / Math.pow(10, 18); //Converrt USD to ETH
			atrans[paymentid] = {checks: 0, amount: price, address: rwallet, merchantsocket: ws, clientsocket: null, directpay: false};	
			let page = fs.readFileSync("/root/NodeAssets/unconfined/client.html");
			page = String(page);
			page = page.replace("*AMOUNT", price);
			page = page.replace("*AMOUNT", price);
			page = page.replace("*AMOUNT", price);
			page = page.replace("*ADDRESS", rwallet); //Generate template page for processor
			page = page.replace("*ID", paymentid);
			page = page.replace("*COMPANY", merch);
			console.log(page);
			fs.writeFile("/root/NodeAssets/unconfined/" + paymentid + ".html", page, (err) => {});
			ws.send(JSON.stringify({Action: "ClientReturn", Value: "http://unconfined.net/" + paymentid + ".html", Tag: paymentid}));
			checkPayment(paymentid); //begin the processing loop after setting up the payment
		}
		if (data["Action"] == "Client"){
			atrans[data["id"]]["clientsocket"] = ws; //attach client webpage to processing loop
		}
		if (data["Action"] == "OneClickPay"){
			let tUser = getUser(data["Token"]);
			if (tUser != null){
				if (getBalance(tUser) >= atrans[data["id"]]["amount"]){
	 				 //User is logged in and balance is high enough
					atrans[data["id"]]["directpay"] = true; //tell processing loop directpay is done
					console.log("Direct payment sent we all gucci");
					sendEther(atrans[data["id"]]["address"], atrans[data["id"]]["amount"]);
					ws.send(JSON.stringify({Action: "update", Value: "OneClick pay success; your status will update momentarily"}));
					editBalance(tUser, -atrans[data["id"]]["amount"];
				}	
				else{
					//Insufficient Balance
					ws.send(JSON.stringify({Action: "update", Value: "Insufficient eth balance for OneClick pay"}));
				}
			}
			else{
				//No current user
				ws.send(JSON.stringify({Action: "update", Value: "No current user, OneClick is not an option"}));
			}
			
			 //Pay merchant
			
			
			
			//code above XXXX
			//Need to test this code and also set up withdrawl from an account with some sorta token shit here
		}
		//structure for oneclick
		//Action: OneClickPay
		//id: payment id
		//Token: token
	});
});
function remove(filename) //delete file
{ try{
	fs.unlink(filename, (err) => {console.log(err);});
}
catch(err) {}
}
function onLoad(){
update();
setInterval(function(){update();}, 30000); //update ether price every 30 seconds
}
function sendEther(address, value){
let child = fork(program, parameters, options);
child.on('message', message => { //fork ether sending module with data for transaction, key and address stored there with the ethjs module
  console.log('message from child:', message);
  child.send({to: address, value: Math.pow(10,18) * value});;
  console.log('sent');
});
}
function update(){
request('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD', function(error, responce, body){
eprice = JSON.parse(body)["USD"];
console.log(eprice); //save ether price to variable
});
}
function checkPayment(id){
let url = etherscan.replace("ADDRESS", atrans[id]["address"]); //set up etherscan address api call
let accepted = false;
request(url, function(error, responce, body){
array = JSON.parse(body)["result"].reverse();
for (i=0;i<10;i++){ //check last 10 transactions latest to oldest
//console.log("checking shit rn");
if (array[i] != null){	
console.log(array[i]["value"]/Math.pow(10,18), atrans[id]["amount"]); //for testing
if ((array[i]["to"].toLowerCase() == atrans[id]["address"].toLowerCase() && (array[i]["value"]/Math.pow(10,18))== atrans[id]["amount"]) || atrans[id]["directpay"]){ 
//^if the balances and addresses match OR directpay has been enabled
//payment accepted
accepted = true;
console.log('ACCEPTED');
try{
atrans[id]["clientsocket"].send(JSON.stringify({Action: "update", Value: "Payment successfully processed - the merchant has been contacted"})); //tell client  payed out
}
catch(err){}
break;
}
}
}
if (!accepted){
atrans[id]["checks"]=atrans[id]["checks"]+1; //document # of loops
try{
atrans[id]["clientsocket"].send(JSON.stringify({Action: "update", Value: "Payment not yet found; Checks: " + atrans[id]["checks"]})); //update client
}
catch(err){}
if (atrans[id]["checks"] < 1440){ //1440 is 24 hours worth of check loops
setTimeout(function(){checkPayment(id);}, 60000);
}
else{
//request never processed
try{
atrans[id]["merchantsocket"].send(JSON.stringify({Action: "PaymentResult", Result: false, Message: "24 hours have passed; No payment has been made - the transaction will now terminate.", Tag: id}));
atrans[id]["clientsocket"].terminate(); //close client and do other shit, tell client no go
}
catch(err){}
remove("/root/NodeAssets/unconfined/" + id + ".html"); //delete client's webpage
atrans[id] = null;
}
}
else{
//finally accepted
console.log('accepted payment');
try{
atrans[id]["merchantsocket"].send(JSON.stringify({Action: "PaymentResult", Result: true, Message: "Payment accepted and has been sent to your account", Tag: id}));
atrans[id]["clientsocket"].terminate(); //payment accepted merchant tadaa
}
catch(err){console.log(err);}
remove("/root/NodeAssets/unconfined/" + id + ".html"); //dalete webpage
atrans[id] = null;
}
//console.log(Number(array[0]["value"]) / Math.pow(10,18));
});	
}
onLoad();

/* data structure
Action: "dent" but more professional (current first one is RequestPayment - RequestPayment structure-
MerchantAddress: the ethereum address of the merchant
RequestedAmount: However much money u want
MerchantName: duh

https://api.etherscan.io/api?module=account&action=txlist&address=0xd95724bf5f05fad4d725c9c6115016403903e7ec&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=REA8XNQJGH55TTY4K6IM1CB4JXR2ACPQP1
SPLIT TO WEBSITE INTERFACE HERE
 */
 activeKeys = {};
 function createAccount(username, password, email, type){
	 if (!fs.existsSync("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data")){
		 let starterAccount = {Username: username, Password: password, Balance: {ETH: 0}, Type: type, Email: email};
		 saveString = JSON.stringify(starterAccount);
		 fs.writeFile("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data", saveString, (err) => {});
		return true;		  //create basic JSON string account
	 }
	 else{
		return false;
	 }
 }
 
 function generateToken(){
	let base = Date.now(); //token generator duh
	return base * .2 + 42;
 }
 function login(username, password){
	 if (!fs.existsSync("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data")){
		return false; 
	 }
	 else{
		 let dat = JSON.parse(fs.readFileSync("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data"));
		if (password == dat["Password"]){
			let nToken = generateToken(); //link token to username based off of the activeKeys table
			activeKeys[nToken] = username;
			return nToken;
		}
		else{
			return false;
		}
	 }
 }
 function getBalance(username){
return JSON.parse(fs.readFileSync("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data"))["Balance"]["ETH"]; //you need a better way to draw balance from the server
 }
 function logout(token){
	activeKeys[token] = null; //delete token/username reference
 }
 
 function getUser(token){
	return activeKeys[token]; //duh
 }
 
 function editBalance(username, change){ //automatically adds as a default
	 let tDat = JSON.parse(fs.readFileSync("/root/NodeAssets/unconfined/accounts/" + username.toLowerCase() + ".data"));
	 tDat["Balance"]["ETH"]+=change;
	 fs.writeFile("/root/NodeAssets/unconfined/accounts/" + tDat["Username"].toLowerCase() + ".data", JSON.stringify(tDat), (err) => {}); //this needs to be tested
 }
 //Login controls above, now website API
 var host2 = new socket.Server({port: 1013});
 host2.on('connection', function connect(ws) {//the below is just the website controls
	ws.on('message', function income(message){
		data = JSON.parse(message);
		if (data["Action"] == "Register"){
			let result = createAccount(data["username"], data["password"], data["email"], data["type"]);
			if (result){
				ws.send(JSON.stringify({Action: "alert", Message: "Successfully created account! you may now proceed to the login page"}));
			}
			else{
				ws.send(JSON.stringify({Action: "alert", Message: "Error: username taken"}));
			}
		}
		else if(data["Action"] == "Login"){
			let result = login(data["username"], data["password"]);
			if (result != false){
				ws.send(JSON.stringify({Action: "alert", Message: "Successfully logged in"}));	
				ws.send(JSON.stringify({Action: "LoginReturn", Result: true, Token: result}));	
				console.log(result);
			}
			else{
				ws.send(JSON.stringify({Action: "LoginReturn", Result: false}));
				ws.send(JSON.stringify({Action: "alert", Message: "Error: Invalid username / password"}));
			}
		}
		else if (data["Action"] == "MailList"){
			let list = fs.readFileSync("/root/NodeAssets/unconfined/mail.txt");
			if (data["email"].includes("@") && data["email"].includes(".") && !list.includes(data["email"])){
			list+=data["email"]+"/";
			fs.writeFile("/root/NodeAssets/unconfined/mail.txt", list, (err) => {});	
			ws.send(JSON.stringify({Action: "alert", Message: "Successfully joined our mailing list! Thnak you for the interest in the project."}));
			}	
		}
		else if (data["Action"] == "User"){
			ws.send(JSON.stringify({Action: "User", User: getUser(data["Token"])}));
		}
		else if (data["Action"] == "ClientAccount"){
			let us = getUser(data["Token"]);
			if (us != null){
				ws.send(JSON.stringify({account: us, balance: getBalance(us)}));
				console.log('sent');
			}
			console.log('null');
		}
	});
});
//editBalance("Trubisky", -.1);

 //a = createAccount("Jusko", "ABC123");
 //setTimeout(function(){ console.log(getBalance("Jusko")); }, 500);
//sendEther("0x18330c7C3edDCbeEbD6DE57c107836C265Da388e", 0.04734);

 