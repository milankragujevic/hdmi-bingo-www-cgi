window.cgiUri = "/cgi-bin/web.cgi";
//window.cgiUri = "ajax.do";
var userUri = "/cgi-bin/user.cgi";
//var userUri = "user.do";

function EventObject(name){
	this.name = name;
}

function EventListener(src, handle){
	this.src = src;
	this.handle = handle;
}

var EventObjectSupport = {
		NetworkInfoFetched: new EventObject("NetworkInfoFetched"), 
		SystemInfoFetched: new EventObject("SystemInfoFetched"), 
		VideoInfoFetched: new EventObject("VideoInfoFetched"), 
		AudioInfoFetched: new EventObject("AudioInfoFetched"),
		VirtualAPFetched: new EventObject("VirtualAPFetched"),
		WlanConnInfoFetched: new EventObject("WlanConnInfoFetched"),
		LanguageChanged: new  EventObject("LanguageChanged"),
		FirmVersionInfoFetched: new EventObject("FirmVersionInfoFetched"),
		VirtualAPSetupChanged: new EventObject("VirtualAPSetupChanged"),
		VirtualAPBridgeChanged: new EventObject("VirtualAPBridgeChanged"),
		VideoRatioChanged: new EventObject("VideoRatioChanged"),
		TVSystemChanged: new EventObject("TVSystemChanged"),
		ScaleVideoOutputChanged: new EventObject("ScaleVideoOutputChanged"),
		VideoFullScreentChanged: new EventObject("VideoFullScreentChanged"),
		Video1080P24HZChanged: new EventObject("Video1080P24HZChanged"),
		VGAOutputChanged: new EventObject("VGAOutputChanged"),
		AudioDRCChanged: new EventObject("AudioDRCChanged"),
		HDMIOutputChanged: new EventObject("HDMIOutputChanged"),
		HDMILipSyncChanged: new EventObject("HDMILipSyncChanged"),
		DeviceFriendlyNameChanged : new EventObject("DeviceFriendlyNameChanged"),
		AccessPointListFetched : new EventObject("AccessPointListFetched"),
		FirmwareInfoFetched: new EventObject("FirmwareInfoFetched"),
		HDCPKeyInfoFetched: new EventObject("HDCPKeyInfoFetched"),
		P2PStatusInfoFetched: new EventObject("P2PStatusInfoFetched"),
		P2PStatusChanged: new EventObject("P2PStatusChanged"),
		VideoProtectInfoFetched: new EventObject("VideoProtectInfoFetched"),
		VideoProtectChanged: new EventObject("VideoProtectChanged"),
};

var EventMgr = {
	eventMap: new Object,
	addListener: function (eventObj, listener){
		if(this.eventMap[eventObj.name] == null){
			this.eventMap[eventObj.name] = new Array;
		}
		this.eventMap[eventObj.name].push(listener);
	},
	removeListener: function(eventObj, listener){
		if(this.eventMap[eventObj.name] != null){
			var index = -1;
			for(var i=0; i<this.eventMap[eventObj.name].length; i++){
				if(this.eventMap[eventObj.name][i] == listener){
					index = i;
					break;
				}
			}
			if(index != -1){
				this.eventMap[eventObj.name].splice(index, 1);
			}
		}
	},
	fireEvent: function(src, eventObj, extra){
		//alert(eventObj.name);
		if(this.eventMap[eventObj.name] != null){
			for(var i=0; i<this.eventMap[eventObj.name].length; i++){
				//alert(this.eventMap[eventObj.name][i].src == src);
				if(this.eventMap[eventObj.name][i].src == src){
					this.eventMap[eventObj.name][i].handle(src, eventObj, extra);
				}
			}
		}
	}
};

function EventSelector(){
	
}

EventSelector.prototype.waitAll = function(eventSrc, events, callback){
	var eventsState = new Object;
	for(var i=0; i<events.length; i++){
		eventsState[events[i]] = 0;
	}
	var listeners = new Array;
	for(var i=0; i<events.length; i++){
		var listener = new EventListener(eventSrc, function(src, eventObj, extra){
			eventsState[eventObj] = 1;
		});
		EventMgr.addListener(events[i], listener);
		listeners[i] = listener;
	};
	var poll = function() {
		var allInvoked = true;
		for ( var i = 0; i < events.length; i++) {
			if (eventsState[events[i]] == 0) {
				allInvoked = false;
				break;
			}
		}
		if (allInvoked) {
			if(callback != null){
				callback();
			}
			for(var i=0; i<events.length; i++){
				EventMgr.removeListener(events[i], listeners[i]);
			};
			return;
		} else {
			setTimeout(poll, 250);
		}
	};
	setTimeout(poll, 250);
};

function GetXmlHttpObject() {
	var xmlHttp = null;
	try {
		// Firefox, Opera 8.0+, Safari
		xmlHttp = new XMLHttpRequest();
	} catch (e) {
		// Internet Explorer
		try {
			xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
		}
	}
	var proxy = new Object;
	proxy.xmlHttp = xmlHttp;
	proxy.open = function(method, url, async) {
		xmlHttp.open(method, url, async);
	};
	proxy.setRequestHeader = function(key, val) {
		xmlHttp.setRequestHeader(key, val);
	};
	proxy.send = function(params) {
		xmlHttp.onreadystatechange = function() {
			proxy.readyState = proxy.xmlHttp.readyState;
			//alert(proxy.readyState);
			try {
				proxy.status = proxy.xmlHttp.status;
			} catch (e) {

			}
			try {
				proxy.responseText = proxy.xmlHttp.responseText;
			} catch (e) {

			}
			proxy.onreadystatechange();
		};
		xmlHttp.setRequestHeader("If-Modified-Since", "0");
		xmlHttp.send(params);
	};
	return proxy;
}

var CommandSupport = {
	commandResultKey : "CommandResultKey",
	defaultPreFilter : new Filter(function(src, command, request, context) {
		
	}),
	defaultPostFilter : new Filter(function(src, command, request, context) {
		var lastMsg = context.getAttribute(CommandSupport.commandResultKey);
		//alert(command);
		var resolver = CommandResultResolverMap[command];
		//alert(resolver);
		if(resolver != null){
			var msgObj = resolver.resolve(src, command, lastMsg);
			context.setAttribute(CommandSupport.commandResultKey, msgObj);
		}
		else{
			//alert("no result resolver");
		}
	}),
	sendCommand : function(src, command, preFilters, postFilters) {
		if (preFilters == null) {
			preFilters = new Array;
		}
		if (postFilters == null) {
			postFilters = new Array;
		}
		preFilters.push(this.defaultPreFilter);
		postFilters.push(this.defaultPostFilter);
		this._sendCommand(src, command, preFilters, postFilters);
	},
	_sendCommand : function(src, command, preFilters, postFilters) {
		var request = GetXmlHttpObject();
		//var cmd = command.replace(/\+/g, "%2B");
		//var url = "ajax.do?command=" + cmd;
		//var cmd = command;
		//var url="/cgi-bin/web.cgi?command=" + cmd;
		//alert(url);
		var cmd = null;
		if( window.cgiUri == "ajax.do"){
			cmd = command.replace(/\+/g, '%2B');
		}
		else{
			cmd = command;
		}
		//cmd = command.replace(/\[ ]/g, '%20');
		var url = window.cgiUri + "?command=" + cmd;
		//alert(url);
		request.open("GET", url, true);
		request.setRequestHeader("If-Modified-Since", "0");
		request.setRequestHeader("Cache-Control", "no-cache");
		var context = new FilterContext;
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					CommandSupport.handleCommand(src, command, request, postFilters,
							context);
				}
			}
		};
		if (preFilters != null) {
			for ( var i = 0; i < preFilters.length; i++) {
				preFilters[i].doFilter(src, command, request, context);
			}
		}
		setTimeout(function(){
			request.send(null);
		}, 500);
		//request.send(null);
	},
	handleCommand : function(src, command, request, postFilters, context) {
		if (postFilters != null) {
			context.setAttribute(CommandSupport.commandResultKey, request.responseText);
			for ( var i = 0; i <postFilters.length; i++) {
				postFilters[i].doFilter(src, command, request, context);
				//alert(request.responseText);
			}
		}
	}
};

var CommandStrings = {
	GetAudioControl : "GetAudioControl",
	GetVideoControl : "GetVideoControl",
	GetSystemControl : "GetSystemControl",
	GetNetWorkControl : "GetNetWorkControl",
	GetVirtualAPControl : "GetVirtualAPControl",
	GetWlanConnectInfo : "wlanGetConnectInfo",
	GetFirmVersionInfo : "SystemCommand+getverisoninfo",
	SetVirtualAPSetup : "NetWorkCommand+SetVirtualAPSetup+$",
	SetVirtualAPBridge : "NetWorkCommand+SetVirtualAPBridge+$",
	SetVideoRatio : "VideoCommand+SetVideoRatio+$",
	SetTVSystem : "VideoCommand+SetTVSystem+$",
	SetScaleVideoOutput : "VideoCommand+SetScaleVideoOutput+$",
	SetVideoFullScreent : "VideoCommand+SetVideoFullScreent+$",
	Set1080P24HZ : "VideoCommand+Set1080P24HZ+$",
	SetVGAOutput : "VideoCommand+SetVGAOutput+$",
	SetAudioDRC : "AudioCommand+SetAudioDRC+$",
	SetHDMIOutput : "AudioCommand+SetHDMIOutput+$",
	SetHDMILipSync : "AudioCommand+SetHDMILipSync+$",
	ChangeLanguage : "SystemCommand+changeLanguage+$",
	SetDeviceFriendlyName : "SetDeviceFriendlyName+",
	OnlineUpgrade : "SystemCommand+onlineupgrade",
	UsbUpgrade : "SystemCommand+usbupgrade",
	RestoreFactory : "SystemCommand+restoreToDefault",
	GetAccessPointList : "wlanGetApList",
	GetFirmwareVersionInfo : "SystemCommand+getFirmwareVersion",
	GetHDCPKeyInfo : "SystemCommand+getHDCPKeyStatus",
	GetP2PStatusInfo: "SystemCommand+getP2PStatus",
	SetP2PStatus: "SystemCommand+setP2PStatus",
	GetVideoProtectInfo: "SystemCommand+getVideoProtectStatus",
	SetVideoProtectStatus: "SystemCommand+setVideoProtectStatus"
};


function Filter(doFilter) {
	this.doFilter = doFilter;
}

function FilterContext(){
	this.map = new Object;
}

FilterContext.prototype = {
	setAttribute: function(key, val){
		this.map[key] = val;
	},
	getAttribute: function(key){
		return this.map[key];
	},
	removeAttribute: function(key){
		this.setAttribute(key, null);
	}
};

var MessageResolver = {
	_msgEventMap : {
		"NetWork" : EventObjectSupport.NetworkInfoFetched,
		"System" : EventObjectSupport.SystemInfoFetched,
		"Video" : EventObjectSupport.VideoInfoFetched,
		"Audio" : EventObjectSupport.AudioInfoFetched,
		"VirtualAP" : EventObjectSupport.VirtualAPFetched,
		"Wireless" : EventObjectSupport.WlanConnInfoFetched,
		"FirmVersion" : EventObjectSupport.FirmVersionInfoFetched,
		"Firmware" : EventObjectSupport.FirmwareInfoFetched,
		"HDCPKey" : EventObjectSupport.HDCPKeyInfoFetched,
		"P2PStatus" : EventObjectSupport.P2PStatusInfoFetched,
		"VideoProtectStatus" : EventObjectSupport.VideoProtectInfoFetched
	},
	resolve : function(src, command, message){
		if(message == null)
			return;
		var pos = message.indexOf(":");
		var key = message.substring(0, pos);
		//alert(key);
		var info = message.substring(pos+1);
		var arr = info.split("&&");
		var result = new Array;
		for(var i=0; i<arr.length; i++){
			this._resolveProperty(result, arr[i]);
		}
		
		//alert(result);
		
		var eventObj = this._msgEventMap[key];
		
		if(eventObj != null){
			EventMgr.fireEvent(src, eventObj, result);
		}
	},
	_resolveProperty : function(result, prop){
		if(prop.indexOf(":") != -1){
			var pos = prop.indexOf(":"); 
			var value = prop.substring(pos+1);
			if(value.indexOf("##") == 0){
				var arr = new Array;
				this._resolveMultiValue(value, arr);
				var pair = new Object;
				pair.prop = prop.substring(0,pos);
				pair.value = arr;
				result[result.length] = pair;
			}
			else{
				var pair = new Object;
				pair.prop = prop.substring(0,pos);
				pair.value = value;
				result[result.length] = pair;
			}
		}
	},
	_resolveMultiValue : function(val, arr){
		val = val.substring(2, val.length-2);
		var subArr = val.split("$$");
		for(var j=0; j<subArr.length; j++){
			var pos1 = subArr[j].indexOf("<-$");
			var pos2 = subArr[j].indexOf("->");
			var item = new Object;
			item.text = subArr[j].substring(0, pos1);
			item.value = subArr[j].substring(pos1+"<-$".length, pos2);
			arr.push(item);
		}
	}
};

var SaveResultResolver = {
	_msgEventMap : new Object,
	resolve : function(src, command, message) {
		if (message == null)
			return;
		alert(message);
	}
};

SaveResultResolver._msgEventMap[CommandStrings.SetVirtualAPSetup] = EventObjectSupport.VirtualAPSetupChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetVirtualAPBridge] = EventObjectSupport.VirtualAPBridgeChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetVideoRatio] = EventObjectSupport.VideoRatioChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetTVSystem] = EventObjectSupport.TVSystemChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetScaleVideoOutput] = EventObjectSupport.ScaleVideoOutputChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetVideoFullScreent] = EventObjectSupport.VideoFullScreentChanged;
SaveResultResolver._msgEventMap[CommandStrings.Set1080P24HZ] = EventObjectSupport.Video1080P24HZChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetVGAOutput] = EventObjectSupport.VGAOutputChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetAudioDRC] = EventObjectSupport.AudioDRCChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetHDMIOutput] = EventObjectSupport.HDMIOutputChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetHDMILipSync] = EventObjectSupport.HDMILipSyncChanged;
SaveResultResolver._msgEventMap[CommandStrings.SetDeviceFriendlyName] = EventObjectSupport.DeviceFriendlyNameChanged;
//SaveResultResolver._msgEventMap[CommandStrings.SetP2PStatus] = EventObjectSupport.P2PStatusChanged;
//SaveResultResolver._msgEventMap[CommandStrings.SetVideoProtectStatus] = EventObjectSupport.VideoProtectChanged;

var APListResultResolver = {
	_msgEventMap : new Object,
	resolve : function(src, command, message) {
		if (message == null)
			return;
		var resp = message;
		var strArr = resp.split("\n");
		var apList = new Array;
		if(strArr.length > 2){
			for(var i=2; i<strArr.length; i++){
				if(strArr[i] != null && strArr[i] != ""){
					var wifiInfoArr = strArr[i].split(":");
					if(wifiInfoArr[0].length == 0){
						continue;
					}
					var wifi = new Object;
					wifi.ssid = wifiInfoArr[0];
					wifi.securVal = wifiInfoArr[1];
					wifi.securTxt = wifiInfoArr[2];
					wifi.level = wifiInfoArr[3];
					apList[apList.length] = wifi;
				}
			}
		}
		var eventObj = this._msgEventMap[command];
		if(eventObj != null){
			EventMgr.fireEvent(src, eventObj, apList);
		}
	}
};

APListResultResolver._msgEventMap[CommandStrings.GetAccessPointList] = EventObjectSupport.AccessPointListFetched;

var CommandResultResolverMap = new Object;
CommandResultResolverMap[CommandStrings.GetAudioControl] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetVideoControl] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetSystemControl] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetNetWorkControl] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetVirtualAPControl] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetWlanConnectInfo] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetFirmVersionInfo] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetFirmwareVersionInfo] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetHDCPKeyInfo] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetP2PStatusInfo] = MessageResolver;
CommandResultResolverMap[CommandStrings.GetVideoProtectInfo] = MessageResolver;

CommandResultResolverMap[CommandStrings.SetVirtualAPSetup] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetVirtualAPBridge] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetVideoRatio] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetTVSystem] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetScaleVideoOutput] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetVideoFullScreent] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.Set1080P24HZ] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetVGAOutput] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetAudioDRC] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetHDMIOutput] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetHDMILipSync] = SaveResultResolver;
CommandResultResolverMap[CommandStrings.SetDeviceFriendlyName] = SaveResultResolver;
//CommandResultResolverMap[CommandStrings.SetP2PStatus] = SaveResultResolver;
//CommandResultResolverMap[CommandStrings.SetVideoProtectStatus] = SaveResultResolver;

CommandResultResolverMap[CommandStrings.GetAccessPointList] = APListResultResolver;

function sendCommand(command, callback)
{
    var command_xmlhttp = GetXmlHttpObject();
    command_xmlhttp.onreadystatechange = function(){
    	handleCommand(command_xmlhttp, callback);
    };
    var cmd = null;
	if( window.cgiUri == "ajax.do"){
		cmd = command.replace(/\+/g, '%2B');
	}
	else{
		cmd = command;
	}
	var url = window.cgiUri + "?command=" + cmd;
    command_xmlhttp.open("GET", url ,true);
    command_xmlhttp.setRequestHeader("If-Modified-Since","0");
    command_xmlhttp.setRequestHeader("Cache-Control","no-cache");
    command_xmlhttp.send(null);
}

function handleCommand(command_xmlhttp, callback)
{
  if(command_xmlhttp.readyState==4)
    {
      if(command_xmlhttp.status == 200){
    	if(callback == null)
    		return;
		callback(command_xmlhttp);
     }
  }
}
