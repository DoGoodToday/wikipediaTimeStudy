var stat = "start"

function playChime(){
	return;	
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



function getWikiPage()
{
	let url = "https://en.wikipedia.org/api/rest_v1/page/random/summary"
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
			let obj = JSON.parse(xmlHttp.responseText)
			let articleURL = obj.content_urls.desktop.page
			document.getElementById("wiki").src = articleURL
		} 
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
}


async function flashScreen(){
	var colors = ['blue','red'];	
	var bd = document.getElementsByTagName("body")[0];
	let x = 1
	getWikiPage();
	while(stat!="stop"){
		x=x+1
		let colorInt = x%2;
		bd.style.backgroundColor = colors[colorInt];
		await timeout(500);
		console.log("bbb");
	}	
} 

function clearObStore(db,obStoreName){
	return new Promise((resolve)=>{
		const transaction = db.transaction([obStoreName],'readwrite');
		transaction.onerror = () => {
		  console.log("obstore clear transaction error" +transaction.error);
		};
		
		const objectStore = transaction.objectStore(obStoreName);
		const objectStoreRequest = objectStore.clear();
		objectStoreRequest.onsuccess = (event) => {
			console.log("obstore cleared");
		}
	});		
}


function createObjStore(db){
	const objectStore = db.createObjectStore('log',{keypath:"id",autoIncrement:true});
	objectStore.createIndex('time', 'time', { unique: false });
	objectStore.createIndex('activity', 'activity', { unique: false });
	objectStore.createIndex('idea', 'idea', { unique: false });
	objectStore.createIndex('achieved', 'achieved', { unique: false });
}


function prepareDatabase(version){
	return new Promise((resolve)=>{
		let db;
		const openRequest = indexedDB.open("actionLog", version);
		// create/upgrade the database without version checks
		openRequest.onupgradeneeded = (event) => {
		  db = event.target.result;
		  if (!db.objectStoreNames.contains('log')) { 
				createObjStore(db);
				/*
				const objectStore = db.createObjectStore('log',{keypath:"id",autoIncrement:true});
				objectStore.createIndex('time', 'time', { unique: false });
				objectStore.createIndex('activity', 'activity', { unique: false });
				objectStore.createIndex('idea', 'idea', { unique: false });
				objectStore.createIndex('achieved', 'achieved', { unique: false });
				*/
		  }
		};
		openRequest.onsuccess = (event)=>{
			db=openRequest.result;
			//addToDb(db);
			console.log("success");
			resolve(db);
		};
	});	
}

function addToDb(db,time,activity,idea,achieved){
	const newItem = [{ time: time, activity: activity,idea: idea,achieved: achieved }];
	console.log(db);
	const transaction = db.transaction(['log'],'readwrite');
	transaction.onerror = () => {
      console.log("transaction error" +transaction.error);
    };
	
	const objectStore = transaction.objectStore('log');
	const objectStoreRequest = objectStore.add(newItem[0]);
	objectStoreRequest.onsuccess = (event) => {
		console.log("add success");
	}
	console.log("asdf");
}

function download(db){
	return new Promise((resolve,reject)=>{
		let fileText="time,activity,idea,achieved\n";
		const objectStore = db.transaction(['log']).objectStore('log');
		objectStore.openCursor().onsuccess = (event)=>{
		  const cursor = event.target.result;
		  // Check if there are no (more) cursor items to iterate through
		  if (cursor) {
			const {time,idea,achieved,activity}=cursor.value
			console.log("time:"+time+" idea:"+idea+" ahieved:"+achieved+" activity:"+activity);
			fileText = fileText + '"'+time.replaceAll('"','""')+'",'+'"'+activity.replaceAll('"','""')+'",'+'"'+idea.replaceAll('"','""')+'",'+'"'+achieved.replaceAll('"','""')+'"'+"\n";
			cursor.continue();
		  }else{
			resolve(fileText);
		  }		  
		};
	});
}


document.addEventListener("DOMContentLoaded", async function(event) {
 	let resetBtn = document.getElementById("reset");
	let startBtn = document.getElementById("start");
	let endBtn = document.getElementById("end");
	let downLoadBtn = document.getElementById("download");
	let deleteBtn = document.getElementById("deleteDownload");
	let db;
	let dbVersion=1;
	db = await prepareDatabase(dbVersion);
	
	resetBtn.addEventListener("click",(e)=>resetIt(db));
	
	function resetIt(db){
		let currentdate = new Date(); 
		let datetime = (currentdate.getMonth()+1) + "/"
                +  currentdate.getDate() + "/" 
                + currentdate.getFullYear() + " "  
                + String(currentdate.getHours()).padStart(2,"0") + ":"  
                + String(currentdate.getMinutes()).padStart(2,"0") + ":" 
                + String(currentdate.getSeconds()).padStart(2,"0");
		let actVal = document.getElementById("activity").value
		let idea = document.getElementById("idea").value
		let achieved = document.getElementById("achieved").value
		let newData = datetime+","+actVal+"\n";
		addToDb(db,datetime,actVal,idea,achieved);
		let existingData = (localStorage.getItem('Activity Log')?localStorage.getItem('Activity Log'):"");
		localStorage.setItem("Activity Log",(existingData+newData));
		//console.log(localStorage.getItem('Activity Log'));
		stat="stop";
		document.getElementsByTagName("body")[0].style.backgroundColor = "grey";
		setTimeout(()=>{stat="start";flashScreen();},3*60000);
	}
	
	startBtn.addEventListener("click",()=>{		
		stat="start";
		document.getElementsByTagName("body")[0].style.backgroundColor = "grey";
		setTimeout(flashScreen,5*60000);
	});

	endBtn.addEventListener("click",()=>{		
		stat="stop";
		document.getElementsByTagName("body")[0].style.backgroundColor = "white";
	});

	downLoadBtn.addEventListener("click",(e)=>{downloadIt(db)});
	async function downloadIt(db){
		let fileText = await download(db);
		let e = document.createElement('a');
		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileText));
		e.setAttribute('download',"timeStudyData.csv");
		//e.style.display="none"
		e.textContent="asdf";
		downLoadBtn.after(e);
		console.log("asdf");
		e.click();
		e.remove();
	}

	deleteBtn.addEventListener("click",(e)=>{deleteIt(db)});
	
	async function deleteIt(db){
		downLoadBtn.click();
		let obStoreName="log";
		db = await clearObStore(db,obStoreName);
	}
	
});
//setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
