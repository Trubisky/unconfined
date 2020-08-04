//cookie functions
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
function checkCookie(val) {
    var username = getCookie(val);
    if (username != "") {
        return username;
    } else {
        return false;
    }
}
//end of cookie shit
var socket = new WebSocket("ws://207.246.82.89:1013");
socket.onopen = function(evt){

};
socket.onmessage = function(send) {
data = JSON.parse(send.data);
if (data["Action"] == "alert"){
alert(data["Message"]);
}
else if(data["Action"] == "LoginReturn"){
if (data["Result"]){
setCookie("Token", data["Token"], 2);
window.location.replace("http://unconfined.net/index.html");
}
}
}
function login(){
user = document.getElementById("username").value;
pass = document.getElementById("password").value;
if (user != null && pass != null){
socket.send(JSON.stringify({Action: "Login", username: user, password: pass}));
}
}
